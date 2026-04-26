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
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/profile — return the authenticated client profile.
     */
    public function show(Request $request): JsonResponse
    {
        return $this->success(new ClientResource($request->user()));
    }

    /**
     * PATCH /api/profile — partial update of the client profile fields.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $client = $request->user();
        $client->fill($request->validated())->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Profil mis à jour avec succès.'
        );
    }

    /**
     * POST /api/profile/photo — upload a new profile photo.
     * Accepts multipart/form-data with field "photo" (jpeg/png/webp, max 4 MB).
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $client = $request->user();

        // Delete the previous file if it lives in our public disk
        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($client->profile_photo);
        }

        $path = $request->file('photo')->store("clients/{$client->id}", 'public');
        $client->forceFill(['profile_photo' => $path])->save();

        return $this->success(
            new ClientResource($client->fresh()),
            'Photo de profil mise à jour.'
        );
    }

    /**
     * DELETE /api/profile/photo — remove the current photo.
     */
    public function deletePhoto(Request $request): JsonResponse
    {
        $client = $request->user();

        if ($client->profile_photo && ! str_starts_with($client->profile_photo, 'http')) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($client->profile_photo);
        }

        $client->forceFill(['profile_photo' => null])->save();

        return $this->success(new ClientResource($client->fresh()), 'Photo de profil supprimée.');
    }

    /**
     * PATCH /api/profile/password — change the password (Google clients have no password
     * to verify, so we just set a new one in that case).
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

        // invalidate all other tokens but keep the current one
        $current = $request->user()->currentAccessToken();
        $client->tokens()->where('id', '!=', $current?->id)->delete();

        return $this->success(message: 'Mot de passe mis à jour.');
    }
}
