<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdatePasswordRequest;
use App\Http\Requests\Client\UpdateProfileRequest;
use App\Http\Resources\ClientResource;
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
     * GET /api/profile
     */
    public function show(Request $request): JsonResponse
    {
        return $this->success(new ClientResource($request->user()));
    }

    /**
     * PATCH /api/profile
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $client = $request->user();
        $client->fill($request->validated())->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Profil mis \u00e0 jour avec succ\u00e8s.'
        );
    }

    /**
     * POST /api/profile/photo
     * Resize to 400x400 (center-crop) before storing, so the image is always
     * crisp in every avatar size used in the UI.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $client = $request->user();

        // Delete previous file
        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            Storage::disk('public')->delete($client->profile_photo);
        }

        $file     = $request->file('photo');
        $mime     = $file->getMimeType();
        $tmpPath  = $file->getRealPath();

        // Load source image with GD
        $source = match (true) {
            str_contains($mime, 'png')  => imagecreatefrompng($tmpPath),
            str_contains($mime, 'webp') => imagecreatefromwebp($tmpPath),
            default                      => imagecreatefromjpeg($tmpPath),
        };

        $srcW = imagesx($source);
        $srcH = imagesy($source);

        // Center-crop to square then resize to 400x400
        $size     = min($srcW, $srcH);
        $cropX    = (int) (($srcW - $size) / 2);
        $cropY    = (int) (($srcH - $size) / 2);
        $target   = imagecreatetruecolor(400, 400);

        // Preserve transparency for PNG / WebP
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefilledrectangle($target, 0, 0, 399, 399, $transparent);

        imagecopyresampled($target, $source, 0, 0, $cropX, $cropY, 400, 400, $size, $size);

        imagedestroy($source);

        // Save as high-quality JPEG (smaller file, universal support)
        $dir      = "clients/{$client->id}";
        $filename = 'avatar_' . time() . '.jpg';
        $storagePath = storage_path("app/public/{$dir}");

        if (! is_dir($storagePath)) {
            mkdir($storagePath, 0775, true);
        }

        imagejpeg($target, "{$storagePath}/{$filename}", 90);
        imagedestroy($target);

        $relativePath = "{$dir}/{$filename}";
        $client->forceFill(['profile_photo' => $relativePath])->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Photo de profil mise \u00e0 jour.'
        );
    }

    /**
     * DELETE /api/profile/photo
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $client = $request->user();

        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            Storage::disk('public')->delete($client->profile_photo);
        }

        $client->forceFill(['profile_photo' => null])->save();

        return $this->success(new ClientResource($client->fresh()), 'Photo de profil supprim\u00e9e.');
    }

    /**
     * PATCH /api/profile/password
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $client = $request->user();

        if ($client->password && ! Hash::check($request->string('current_password'), $client->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mot de passe actuel incorrect.'],
            ]);
        }

        $client->forceFill(['password' => Hash::make($request->string('password'))])->save();

        $current = $request->user()->currentAccessToken();
        $client->tokens()->where('id', '!=', $current?->id)->delete();

        return $this->success(message: 'Mot de passe mis \u00e0 jour.');
    }
}
