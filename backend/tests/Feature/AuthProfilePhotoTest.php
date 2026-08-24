<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Le profil renvoyé à la connexion alimente l'en-tête de la SPA : c'est lui,
 * et non l'endpoint /profile, qui décide si l'avatar s'affiche ou si l'on
 * retombe sur les initiales.
 *
 * OwnerResource avait perdu `profile_photo` alors qu'Admin et Client
 * l'exposaient : la page de profil du propriétaire montrait bien sa photo,
 * mais la barre du haut affichait ses initiales à chaque connexion.
 */
class AuthProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Password1!';

    /** Les trois rôles exposent une photo absolue dans le profil de connexion. */
    public function test_login_payload_exposes_profile_photo_for_every_role(): void
    {
        $owner = Owner::create([
            'full_name'     => 'Patron Principal',
            'email'         => 'patron@hotel.test',
            'password'      => Hash::make(self::PASSWORD),
            'profile_photo' => 'owners/1/avatar.jpg',
        ]);

        $admin = Admin::create([
            'first_name'           => 'Test',
            'last_name'            => 'Admin',
            'email'                => 'admin@hotel.test',
            'password'             => Hash::make(self::PASSWORD),
            'role'                 => 'manager',
            'is_active'            => true,
            'must_change_password' => false,
            'created_by_owner_id'  => $owner->id,
            'profile_photo'        => 'admins/1/avatar.jpg',
        ]);

        $client = Client::create([
            'first_name'        => 'Awa',
            'last_name'         => 'Koné',
            'email'             => 'awa@hotel.test',
            'password'          => Hash::make(self::PASSWORD),
            'provider'          => 'local',
            'email_verified_at' => now(),
            'profile_photo'     => 'clients/1/avatar.jpg',
        ]);

        foreach ([$owner, $admin, $client] as $account) {
            $photo = $this->postJson('/api/auth/login', [
                'email'    => $account->email,
                'password' => self::PASSWORD,
            ])->assertOk()->json('data.user.profile_photo');

            $this->assertNotNull($photo, "Photo absente du profil de connexion de {$account->email}.");
            $this->assertStringStartsWith('http', $photo, 'La photo doit être une URL absolue.');
            $this->assertStringContainsString('avatar.jpg', $photo);
        }
    }

    /** Un avatar Google est déjà absolu : il ne doit pas être préfixé. */
    public function test_remote_avatar_url_is_left_untouched(): void
    {
        $client = Client::create([
            'first_name'        => 'Awa',
            'last_name'         => 'Koné',
            'email'             => 'google@hotel.test',
            'password'          => Hash::make(self::PASSWORD),
            'provider'          => 'google',
            'email_verified_at' => now(),
            'profile_photo'     => 'https://lh3.googleusercontent.com/a/photo.jpg',
        ]);

        $photo = $this->postJson('/api/auth/login', [
            'email'    => $client->email,
            'password' => self::PASSWORD,
        ])->assertOk()->json('data.user.profile_photo');

        $this->assertSame('https://lh3.googleusercontent.com/a/photo.jpg', $photo);
    }

    /**
     * L'endpoint de profil et le profil de connexion doivent décrire le même
     * propriétaire : ce sont ces deux sérialisations qui avaient divergé.
     */
    public function test_owner_profile_endpoint_matches_login_payload(): void
    {
        $owner = Owner::create([
            'full_name'     => 'Patron Principal',
            'email'         => 'patron@hotel.test',
            'password'      => Hash::make(self::PASSWORD),
            'profile_photo' => 'owners/1/avatar.jpg',
        ]);

        $atLogin = $this->postJson('/api/auth/login', [
            'email'    => $owner->email,
            'password' => self::PASSWORD,
        ])->assertOk()->json('data.user');

        Sanctum::actingAs($owner, ['*']);
        $atProfile = $this->getJson('/api/owner/profile')->assertOk()->json('data');

        $this->assertSame($atLogin['profile_photo'], $atProfile['profile_photo']);
        $this->assertSame($atLogin['full_name'], $atProfile['full_name']);
        $this->assertSame($atLogin['email'], $atProfile['email']);
    }
}
