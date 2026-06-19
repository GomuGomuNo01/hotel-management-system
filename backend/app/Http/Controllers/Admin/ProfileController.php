<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\SecureDocument;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAdminPasswordRequest;
use App\Http\Requests\Admin\UpdateAdminProfileRequest;
use App\Http\Requests\Shared\UploadPhotoRequest;
use App\Http\Resources\AdminResource;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/profile
     */
    public function show(Request $request): JsonResponse
    {
        $admin = $request->user()->load('permissions', 'owner');
        return $this->success(new AdminResource($admin));
    }

    /**
     * PATCH /api/admin/profile
     * Les administrateurs ne peuvent plus modifier leur profil eux-mêmes.
     * Seul le patron peut modifier les informations d'un admin.
     */
    public function update(UpdateAdminProfileRequest $request): JsonResponse
    {
        return $this->error(
            'Votre profil est géré par le propriétaire de l\'hôtel. Contactez-le pour toute modification.',
            403
        );
    }

    /**
     * POST /api/admin/profile/photo
     * Redimensionne à 400×400 (crop centré) pour un rendu net quelle que soit
     * la taille d'affichage de l'avatar dans l'interface.
     */
    public function uploadPhoto(UploadPhotoRequest $request): JsonResponse
    {
        $admin = $request->user();

        // Supprimer l'ancienne photo
        if ($admin->profile_photo && ! str_starts_with($admin->profile_photo, 'http')) {
            Storage::disk('public')->delete($admin->profile_photo);
        }

        $file    = $request->file('photo');
        $mime    = $file->getMimeType();
        $tmpPath = $file->getRealPath();

        // Charger l'image source avec GD
        $source = match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
            str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
            default                      => imagecreatefromjpeg($tmpPath),
        };

        $srcW = imagesx($source);
        $srcH = imagesy($source);

        // Crop carré centré puis redimensionner à 400×400
        $size  = min($srcW, $srcH);
        $cropX = (int) (($srcW - $size) / 2);
        $cropY = (int) (($srcH - $size) / 2);

        $target = imagecreatetruecolor(400, 400);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefilledrectangle($target, 0, 0, 399, 399, $transparent);
        imagecopyresampled($target, $source, 0, 0, $cropX, $cropY, 400, 400, $size, $size);
        imagedestroy($source);

        // Sauvegarder en JPEG haute qualité
        $dir         = "admins/{$admin->id}";
        $filename    = 'avatar_' . time() . '.jpg';
        $storagePath = storage_path("app/public/{$dir}");

        if (! is_dir($storagePath)) {
            mkdir($storagePath, 0775, true);
        }

        imagejpeg($target, "{$storagePath}/{$filename}", 90);
        imagedestroy($target);

        $relativePath = "{$dir}/{$filename}";
        $admin->forceFill(['profile_photo' => $relativePath])->save();

        return $this->success(
            new AdminResource($admin->fresh()->load('permissions')),
            'Photo de profil mise à jour.'
        );
    }

    /**
     * DELETE /api/admin/profile/photo
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $admin = $request->user();

        if ($admin->profile_photo && ! str_starts_with($admin->profile_photo, 'http')) {
            Storage::disk('public')->delete($admin->profile_photo);
        }

        $admin->forceFill(['profile_photo' => null])->save();

        return $this->success(
            new AdminResource($admin->fresh()->load('permissions')),
            'Photo de profil supprimée.'
        );
    }

    /**
     * GET /api/admin/profile/id-document
     * Consultation (lecture seule) de la pièce d'identité de l'admin, fournie
     * par le propriétaire. L'admin ne peut pas la modifier ni la supprimer.
     */
    public function idDocument(Request $request)
    {
        $admin = $request->user();
        $path  = $admin->id_document_path;

        if (! $path || ! SecureDocument::exists($path)) {
            abort(404, 'Aucune pièce d\'identité disponible.');
        }

        return SecureDocument::response($path);
    }

    /**
     * PATCH /api/admin/profile/password
     */
    public function updatePassword(UpdateAdminPasswordRequest $request): JsonResponse
    {
        $admin = $request->user();

        if (! Hash::check($request->string('current_password'), (string) $admin->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mot de passe actuel incorrect.'],
            ]);
        }

        $admin->forceFill([
            'password'             => Hash::make($request->string('password')),
            'must_change_password' => false,
        ])->save();

        // Révoquer les autres tokens pour la sécurité
        $current = $request->user()->currentAccessToken();
        $admin->tokens()->where('id', '!=', $current?->id)->delete();

        // Audit - sans jamais enregistrer le mot de passe en clair
        AuditService::log(
            $admin,
            AuditLog::ACTION_PASSWORD_CHANGED,
            'Admin',
            $admin->id,
            ['password' => '••••••••'],
            ['password' => '••••••••', 'must_change_password' => false, 'changed_at' => now()->toIso8601String()]
        );

        return $this->success(message: 'Mot de passe mis à jour.');
    }
}
