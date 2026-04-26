<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAdminPasswordRequest;
use App\Http\Requests\Admin\UpdateAdminProfileRequest;
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
     */
    public function update(UpdateAdminProfileRequest $request): JsonResponse
    {
        $admin = $request->user();
        $old   = $admin->only(array_keys($request->validated()));
        $admin->fill($request->validated())->save();

        AuditService::log(
            $admin,
            AuditLog::ACTION_PROFILE_UPDATED,
            'Admin',
            $admin->id,
            $old,
            $admin->fresh()->only(array_keys($request->validated()))
        );

        return $this->success(
            new AdminResource($admin->fresh()->load('permissions')),
            'Profil mis à jour avec succès.'
        );
    }

    /**
     * POST /api/admin/profile/photo
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $admin = $request->user();

        if ($admin->profile_photo && ! str_starts_with($admin->profile_photo, 'http')) {
            Storage::disk('public')->delete($admin->profile_photo);
        }

        $path = $request->file('photo')->store("admins/{$admin->id}", 'public');
        $admin->forceFill(['profile_photo' => $path])->save();

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

        // Revoke other tokens for safety
        $current = $request->user()->currentAccessToken();
        $admin->tokens()->where('id', '!=', $current?->id)->delete();

        return $this->success(message: 'Mot de passe mis à jour.');
    }
}
