<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    use ApiResponse;

    /**
     * Sérialise le profil propriétaire (avec URL absolue de la photo).
     */
    private function present($owner): array
    {
        return [
            'id'            => $owner->id,
            'full_name'     => $owner->full_name,
            'email'         => $owner->email,
            'profile_photo' => $owner->profile_photo
                ? (str_starts_with($owner->profile_photo, 'http')
                    ? $owner->profile_photo
                    : asset('storage/'.ltrim($owner->profile_photo, '/')))
                : null,
        ];
    }

    /**
     * GET /owner/profile
     */
    public function show(Request $request): JsonResponse
    {
        return $this->success($this->present($request->user()), 'Profil propriétaire.');
    }

    /**
     * PUT /owner/profile
     * Le propriétaire peut modifier ses propres informations (nom, e-mail).
     */
    public function update(Request $request): JsonResponse
    {
        $owner = $request->user();

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'email'     => ['required', 'email', 'max:150', Rule::unique('owners', 'email')->ignore($owner->id)],
        ]);

        $old = $owner->only(['full_name', 'email']);
        $owner->update($validated);

        AuditService::log(
            $owner,
            AuditLog::ACTION_PROFILE_UPDATED,
            'Owner',
            $owner->id,
            $old,
            array_merge($owner->only(['full_name', 'email']), ['_performed_by_owner' => $owner->full_name])
        );

        return $this->success($this->present($owner->fresh()), 'Profil mis à jour.');
    }

    /**
     * POST /owner/profile/photo
     * Redimensionne à 400×400 (crop centré) pour un rendu net — même logique
     * que la photo de profil côté administrateur.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $owner = $request->user();

        // Supprimer l'ancienne photo
        if ($owner->profile_photo && ! str_starts_with($owner->profile_photo, 'http')) {
            Storage::disk('public')->delete($owner->profile_photo);
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
        $dir         = "owners/{$owner->id}";
        $filename    = 'avatar_'.time().'.jpg';
        $storagePath = storage_path("app/public/{$dir}");

        if (! is_dir($storagePath)) {
            mkdir($storagePath, 0775, true);
        }

        imagejpeg($target, "{$storagePath}/{$filename}", 90);
        imagedestroy($target);

        $owner->forceFill(['profile_photo' => "{$dir}/{$filename}"])->save();

        return $this->success($this->present($owner->fresh()), 'Photo de profil mise à jour.');
    }

    /**
     * DELETE /owner/profile/photo
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $owner = $request->user();

        if ($owner->profile_photo && ! str_starts_with($owner->profile_photo, 'http')) {
            Storage::disk('public')->delete($owner->profile_photo);
        }

        $owner->forceFill(['profile_photo' => null])->save();

        return $this->success($this->present($owner->fresh()), 'Photo de profil supprimée.');
    }

    /**
     * PUT /owner/profile/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $owner = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => [
                'required', 'string', 'min:8', 'confirmed',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        if (! Hash::check($validated['current_password'], $owner->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $owner->update(['password' => Hash::make($validated['password'])]);

        AuditService::log(
            $owner,
            AuditLog::ACTION_PASSWORD_CHANGED,
            'Owner',
            $owner->id,
            [],
            ['_performed_by_owner' => $owner->full_name]
        );

        return $this->success(null, 'Mot de passe modifié avec succès.');
    }
}
