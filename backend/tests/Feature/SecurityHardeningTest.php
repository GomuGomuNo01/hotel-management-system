<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Verrouille les correctifs de sécurité « Phase 0 » :
 *  - l'auto-confirmation de paiement (simulate) est refusée quand le mode
 *    simulation est désactivé (comportement de production) ;
 *  - le token OAuth ne transite plus dans l'URL : il s'obtient via un code
 *    d'échange à usage unique.
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function pendingPayment(): Payment
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create();
        $res    = Reservation::factory()->create(['client_id' => $client->id, 'room_id' => $room->id]);

        return Payment::factory()->pending()->create([
            'client_id'      => $client->id,
            'reservation_id' => $res->id,
            'provider'       => 'orange_ci',
            'expires_at'     => now()->addMinutes(30),
        ]);
    }

    public function test_simulate_is_rejected_when_simulation_disabled(): void
    {
        config(['services.payment.simulation' => false]); // comportement production
        $payment = $this->pendingPayment();

        Sanctum::actingAs($payment->client);

        $this->postJson("/api/payments/{$payment->id}/simulate", ['outcome' => 'success'])
            ->assertStatus(403);

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_simulate_works_in_dev_when_simulation_enabled(): void
    {
        config(['services.payment.simulation' => true]); // comportement dev/test
        $payment = $this->pendingPayment();

        Sanctum::actingAs($payment->client);

        $this->postJson("/api/payments/{$payment->id}/simulate", ['outcome' => 'success'])
            ->assertOk();

        $this->assertSame('success', $payment->fresh()->status);
    }

    public function test_google_exchange_returns_token_once(): void
    {
        Cache::put('oauth_code:ABC123', ['token' => 'tok-secret', 'role' => 'client'], now()->addSeconds(60));

        $this->postJson('/api/auth/google/exchange', ['code' => 'ABC123'])
            ->assertOk()
            ->assertJsonPath('data.token', 'tok-secret')
            ->assertJsonPath('data.role', 'client');

        // Usage unique : le même code ne fonctionne plus.
        $this->postJson('/api/auth/google/exchange', ['code' => 'ABC123'])
            ->assertStatus(422);
    }

    public function test_google_exchange_rejects_unknown_code(): void
    {
        $this->postJson('/api/auth/google/exchange', ['code' => 'does-not-exist'])
            ->assertStatus(422);
    }
}
