<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class AuthService
{
    public function registerClient(array $data): array
    {
        $client = Client::create([
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'email'      => $data['email'],
            'phone'      => $data['phone'] ?? null,
            'password'   => Hash::make($data['password']),
            'nationality' => $data['nationality'] ?? null,
            'provider'   => 'local',
        ]);

        $token = $client->createToken('client-token')->plainTextToken;

        return ['client' => $client, 'token' => $token];
    }

    public function loginByRole(string $email, string $password, string $role): ?array
    {
        $model = match ($role) {
            'client' => Client::where('email', $email)->first(),
            'admin'  => Admin::where('email', $email)->first(),
            'owner'  => Owner::where('email', $email)->first(),
            default  => null,
        };

        if (! $model || ! Hash::check($password, $model->password)) {
            return null;
        }

        if ($model instanceof Admin && ! $model->is_active) {
            return ['inactive' => true];
        }

        if ($model instanceof Admin) {
            $model->update(['last_login_at' => now()]);
        }

        $token = $model->createToken("{$role}-token")->plainTextToken;

        return ['user' => $model, 'token' => $token, 'role' => $role];
    }

    public function findOrCreateClientFromGoogle(SocialiteUser $googleUser): array
    {
        $existing = Client::where('email', $googleUser->getEmail())->first();

        if ($existing) {
            if ($existing->provider === 'local') {
                $existing->update(['provider_id' => $googleUser->getId()]);
            }
            $token = $existing->createToken('google-token')->plainTextToken;
            return ['client' => $existing, 'token' => $token];
        }

        $nameParts = explode(' ', $googleUser->getName(), 2);
        $client = Client::create([
            'first_name'        => $nameParts[0],
            'last_name'         => $nameParts[1] ?? '',
            'email'             => $googleUser->getEmail(),
            'password'          => null,
            'provider'          => 'google',
            'provider_id'       => $googleUser->getId(),
            'profile_photo'     => $googleUser->getAvatar(),
            'email_verified_at' => now(),
        ]);

        $token = $client->createToken('google-token')->plainTextToken;

        return ['client' => $client, 'token' => $token];
    }
}
