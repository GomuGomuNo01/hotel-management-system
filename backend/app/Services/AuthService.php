<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class AuthService
{
    /**
     * Register a new client.
     * Le compte est créé immédiatement dans MySQL après validation des données.
     * Un e-mail de vérification est envoyé - aucun token n'est émis tant que
     * l'adresse e-mail n'est pas confirmée.
     */
    public function registerClient(array $data): array
    {
        $client = Client::create([
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'email'      => $data['email'],
            'phone'      => $data['phone'] ?? null,
            'password'   => Hash::make($data['password']),
            // email_verified_at reste null jusqu'à confirmation
        ]);

        // Envoi de l'e-mail de vérification (mis en file si QUEUE_CONNECTION=database)
        $client->sendEmailVerificationNotification();

        return ['user' => $client, 'role' => 'client'];
    }

    /**
     * Authenticate a user by email + password only.
     * The role is detected automatically by checking each model table.
     * Priority order: Client -> Admin -> Owner
     *
     * @return array{user: mixed, token: string, role: string}|array{inactive: true}|null
     */
    public function login(string $email, string $password): ?array
    {
        $candidates = [
            'client' => Client::where('email', $email)->first(),
            'admin'  => Admin::where('email', $email)->first(),
            'owner'  => Owner::where('email', $email)->first(),
        ];

        foreach ($candidates as $role => $model) {
            if (! $model) {
                continue;
            }

            if (! Hash::check($password, (string) $model->password)) {
                // Email found but wrong password
                return null;
            }

            if ($model instanceof Admin && ! $model->is_active) {
                return ['inactive' => true];
            }

            // Bloquer la connexion si l'e-mail client n'est pas vérifié
            if ($model instanceof Client && ! $model->hasVerifiedEmail()) {
                return ['email_not_verified' => true, 'email' => $model->email];
            }

            if ($model instanceof Admin) {
                $model->forceFill(['last_login_at' => now()])->save();
                $model->load('permissions');
            }

            $token = $model->createToken("{$role}-token")->plainTextToken;

            return ['user' => $model, 'token' => $token, 'role' => $role];
        }

        // No user found with this email
        return null;
    }

    /**
     * @deprecated Use login() instead - role is now detected automatically.
     */
    public function loginByRole(string $email, string $password, string $role): ?array
    {
        return $this->login($email, $password);
    }

    /**
     * Find or create a client from a Google OAuth user.
     * Alias used by GoogleAuthController.
     */
    public function findOrCreateClientFromGoogle(SocialiteUser $socialUser): array
    {
        return $this->findOrCreateGoogleClient($socialUser);
    }

    /**
     * Find or create a client from a Google OAuth user.
     */
    public function findOrCreateGoogleClient(SocialiteUser $socialUser): array
    {
        $client = Client::where('email', $socialUser->getEmail())->first();

        if ($client) {
            if (! $client->provider) {
                $client->update([
                    'provider'    => 'google',
                    'provider_id' => $socialUser->getId(),
                ]);
            }
        } else {
            $nameParts = explode(' ', $socialUser->getName(), 2);
            $client = Client::create([
                'first_name'    => $nameParts[0],
                'last_name'     => $nameParts[1] ?? '',
                'email'         => $socialUser->getEmail(),
                'provider'      => 'google',
                'provider_id'   => $socialUser->getId(),
                'profile_photo' => $socialUser->getAvatar(),
                'password'      => Hash::make(str()->random(32)),
                'email_verified_at' => now(),
            ]);
        }

        $token = $client->createToken('google-token')->plainTextToken;

        return ['user' => $client, 'token' => $token, 'role' => 'client'];
    }
}
