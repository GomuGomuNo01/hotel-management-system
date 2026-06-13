<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GdprFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_export_their_personal_data(): void
    {
        $client = Client::factory()->create(['email' => 'jean@example.com']);
        $reservation = Reservation::factory()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $response = $this->getJson('/api/profile/data-export')->assertOk();

        $response->assertJsonPath('profil.email', 'jean@example.com');
        $this->assertSame($reservation->id, $response->json('reservations.0.id'));
        $response->assertHeader('content-disposition');
    }

    public function test_account_deletion_anonymizes_pii_but_keeps_reservations(): void
    {
        $client = Client::factory()->create(['email' => 'todelete@example.com']);
        $reservation = Reservation::factory()->create(['client_id' => $client->id]);
        $token = $client->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/profile', ['current_password' => 'password'])
            ->assertOk();

        $fresh = Client::withTrashed()->find($client->id);
        $this->assertNotNull($fresh->deleted_at);          // soft-deleted
        $this->assertNotNull($fresh->anonymized_at);       // trace RGPD
        $this->assertSame('Compte', $fresh->first_name);   // PII scrubbée
        $this->assertNotSame('todelete@example.com', $fresh->email);
        $this->assertNull($fresh->phone);
        $this->assertSame(0, $fresh->tokens()->count());   // jetons révoqués

        // L'écriture (réservation) est conservée pour la comptabilité
        $this->assertDatabaseHas('reservations', [
            'id'        => $reservation->id,
            'client_id' => $client->id,
        ]);
    }

    public function test_account_deletion_requires_correct_password(): void
    {
        $client = Client::factory()->create();
        Sanctum::actingAs($client);

        $this->deleteJson('/api/profile', ['current_password' => 'mauvais'])
            ->assertStatus(422);

        $this->assertNull($client->fresh()->deleted_at); // toujours actif
    }

    public function test_deleted_client_token_no_longer_authenticates(): void
    {
        $client = Client::factory()->create();
        $token  = $client->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson('/api/profile', ['current_password' => 'password'])
            ->assertOk();

        // Réinitialise le guard pour forcer une ré-résolution du jeton
        // (sinon le harness réutilise l'utilisateur déjà authentifié).
        $this->app['auth']->forgetGuards();

        // Le même jeton est désormais invalide
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/profile')
            ->assertStatus(401);
    }
}
