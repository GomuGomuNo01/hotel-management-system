<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Client;
use App\Notifications\ResetClientPassword;
use App\Notifications\VerifyClientEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Couvre le cœur sécurité — inscription, connexion, vérification d'e-mail,
 * réinitialisation de mot de passe — qui n'avait aucun test jusqu'ici.
 */
class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    private const STRONG = 'Password1!';

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name'            => 'Awa',
            'last_name'             => 'Koné',
            'email'                 => 'awa@example.com',
            'password'              => self::STRONG,
            'password_confirmation' => self::STRONG,
        ], $overrides);
    }

    // ── Inscription ─────────────────────────────────────────────

    public function test_registration_creates_an_unverified_client_and_sends_verification(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', $this->registerPayload())
            ->assertCreated()
            ->assertJsonPath('data.email_verified', false)
            // Aucun token tant que l'e-mail n'est pas vérifié.
            ->assertJsonMissingPath('data.token');

        $client = Client::where('email', 'awa@example.com')->first();
        $this->assertNotNull($client);
        $this->assertNull($client->email_verified_at);
        Notification::assertSentTo($client, VerifyClientEmail::class);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        Client::factory()->create(['email' => 'awa@example.com']);

        $this->postJson('/api/auth/register', $this->registerPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_registration_rejects_weak_password(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload([
            'password'              => 'faible',
            'password_confirmation' => 'faible',
        ]))->assertStatus(422)->assertJsonValidationErrors('password');
    }

    // ── Connexion ───────────────────────────────────────────────

    public function test_unverified_client_cannot_login(): void
    {
        Client::factory()->unverified()->create([
            'email' => 'awa@example.com', 'password' => self::STRONG,
        ]);

        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => self::STRONG])
            ->assertStatus(403)
            ->assertJsonPath('errors.email_not_verified', true);
    }

    public function test_verified_client_logs_in_and_receives_token(): void
    {
        Client::factory()->create(['email' => 'awa@example.com', 'password' => self::STRONG]);

        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => self::STRONG])
            ->assertOk()
            ->assertJsonPath('data.role', 'client')
            ->assertJsonStructure(['data' => ['user', 'token', 'role']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        Client::factory()->create(['email' => 'awa@example.com', 'password' => self::STRONG]);

        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => 'WrongPass1!'])
            ->assertStatus(401);
    }

    public function test_login_is_locked_after_repeated_failures(): void
    {
        Client::factory()->create(['email' => 'awa@example.com', 'password' => self::STRONG]);

        // 5 tentatives échouées autorisées, puis verrouillage par compte.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => 'WrongPass1!'])
                ->assertStatus(401);
        }

        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => 'WrongPass1!'])
            ->assertStatus(429);

        // Même avec le bon mot de passe, l'accès reste verrouillé le temps du délai.
        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => self::STRONG])
            ->assertStatus(429);
    }

    public function test_resend_verification_is_neutral_for_verified_account(): void
    {
        Notification::fake();
        Client::factory()->create(['email' => 'awa@example.com', 'email_verified_at' => now()]);

        // Ne révèle pas que le compte existe / est déjà vérifié : réponse neutre 200.
        $this->postJson('/api/auth/email/resend', ['email' => 'awa@example.com'])
            ->assertOk();
        $this->postJson('/api/auth/email/resend', ['email' => 'inconnu@example.com'])
            ->assertOk();
    }

    public function test_inactive_admin_cannot_login(): void
    {
        Admin::factory()->create([
            'email' => 'staff@hotel.local', 'password' => self::STRONG, 'is_active' => false,
        ]);

        $this->postJson('/api/auth/login', ['email' => 'staff@hotel.local', 'password' => self::STRONG])
            ->assertStatus(403);
    }

    // ── Session ─────────────────────────────────────────────────

    public function test_me_returns_authenticated_user_and_role(): void
    {
        $client = Client::factory()->create();
        Sanctum::actingAs($client);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'client')
            ->assertJsonPath('data.user.email', $client->email);
    }

    public function test_logout_revokes_the_current_token(): void
    {
        // Jeton réel (pas Sanctum::actingAs) pour vérifier la révocation effective.
        $client = Client::factory()->create();
        $token  = $client->createToken('test')->plainTextToken;
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')->assertOk();

        // Révocation déterministe : le jeton n'existe plus en base.
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    // ── Réinitialisation de mot de passe ────────────────────────

    public function test_forgot_password_is_neutral_and_sends_reset_link(): void
    {
        Notification::fake();
        $client = Client::factory()->create(['email' => 'awa@example.com']);

        $this->postJson('/api/auth/password/forgot', ['email' => 'awa@example.com'])->assertOk();

        Notification::assertSentTo($client, ResetClientPassword::class);
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        $client = Client::factory()->create(['email' => 'awa@example.com', 'password' => self::STRONG]);
        $token  = Password::broker('clients')->createToken($client);

        $this->postJson('/api/auth/password/reset', [
            'token'                 => $token,
            'email'                 => 'awa@example.com',
            'password'              => 'NewPass1!',
            'password_confirmation' => 'NewPass1!',
        ])->assertOk();

        // Le nouveau mot de passe permet de se connecter.
        $this->postJson('/api/auth/login', ['email' => 'awa@example.com', 'password' => 'NewPass1!'])
            ->assertOk();
    }

    public function test_password_reset_rejects_invalid_token(): void
    {
        Client::factory()->create(['email' => 'awa@example.com']);

        $this->postJson('/api/auth/password/reset', [
            'token'                 => 'jeton-bidon',
            'email'                 => 'awa@example.com',
            'password'              => 'NewPass1!',
            'password_confirmation' => 'NewPass1!',
        ])->assertStatus(422);
    }
}
