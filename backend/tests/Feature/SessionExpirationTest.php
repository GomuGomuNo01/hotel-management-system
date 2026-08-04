<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Expiration glissante des sessions :
 *  - échéance initiale posée à la connexion (30 min, ou 7 j si « remember ») ;
 *  - repoussée à chaque requête authentifiée (SlideTokenExpiration) ;
 *  - un token expiré (inactivité dépassée) est refusé (401).
 */
class SessionExpirationTest extends TestCase
{
    use RefreshDatabase;

    private const STRONG = 'Password1!';

    private function verifiedClient(): Client
    {
        return Client::factory()->create([
            'email'             => 'session@example.com',
            'password'          => self::STRONG,
            'email_verified_at' => now(),
        ]);
    }

    public function test_standard_login_sets_a_30min_idle_expiry(): void
    {
        $client = $this->verifiedClient();

        $this->postJson('/api/auth/login', ['email' => $client->email, 'password' => self::STRONG])
            ->assertOk();

        $token = $client->tokens()->latest('id')->first();
        $this->assertSame('client-token', $token->name);
        $this->assertNotNull($token->expires_at);
        $this->assertEqualsWithDelta(now()->addMinutes(30)->timestamp, $token->expires_at->timestamp, 60);
    }

    public function test_remember_login_sets_a_7day_expiry(): void
    {
        $client = $this->verifiedClient();

        $this->postJson('/api/auth/login', ['email' => $client->email, 'password' => self::STRONG, 'remember' => true])
            ->assertOk();

        $token = $client->tokens()->latest('id')->first();
        $this->assertSame('client-remember', $token->name);
        $this->assertEqualsWithDelta(now()->addDays(7)->timestamp, $token->expires_at->timestamp, 120);
    }

    public function test_activity_slides_the_expiry_forward(): void
    {
        $client = $this->verifiedClient();
        $plain  = $client->createToken('client-token', ['*'], now()->addMinutes(30))->plainTextToken;

        // Simule une échéance proche (5 min) : une requête doit la repousser à ~30 min.
        $token = $client->tokens()->latest('id')->first();
        $token->forceFill(['expires_at' => now()->addMinutes(5)])->save();

        $this->withHeader('Authorization', "Bearer {$plain}")
            ->getJson('/api/profile')
            ->assertOk();

        $token->refresh();
        $this->assertEqualsWithDelta(now()->addMinutes(30)->timestamp, $token->expires_at->timestamp, 60);
    }

    public function test_expired_token_is_rejected(): void
    {
        $client = $this->verifiedClient();
        // Token déjà périmé (inactivité dépassée).
        $plain = $client->createToken('client-token', ['*'], now()->subMinute())->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$plain}")
            ->getJson('/api/profile')
            ->assertStatus(401);
    }
}
