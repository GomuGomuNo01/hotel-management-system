<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $orangeSecret = 'test-orange-secret';
    private string $waveSecret   = 'test-wave-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.orange_ci.webhook_secret' => $this->orangeSecret,
            'services.wave_ci.webhook_secret'   => $this->waveSecret,
        ]);
    }

    // ── Orange CI ──────────────────────────────────────────────────

    public function test_orange_webhook_success_confirms_payment_and_reservation(): void
    {
        $payment = $this->makePendingPayment('orange_ci', 'ORG-TESTREF-1');

        $payload   = ['order_id' => 'ORG-TESTREF-1', 'status' => 'SUCCESS', 'amount' => 120000];
        $signature = $this->sign(json_encode($payload), $this->orangeSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('payments', [
            'id'     => $payment->id,
            'status' => 'success',
        ]);

        $this->assertDatabaseHas('reservations', [
            'id'     => $payment->reservation_id,
            'status' => 'confirmed',
        ]);
    }

    public function test_orange_webhook_failure_marks_payment_failed(): void
    {
        $payment = $this->makePendingPayment('orange_ci', 'ORG-TESTREF-2');

        $payload   = ['order_id' => 'ORG-TESTREF-2', 'status' => 'FAILED', 'amount' => 120000];
        $signature = $this->sign(json_encode($payload), $this->orangeSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk();

        $this->assertDatabaseHas('payments', [
            'id'     => $payment->id,
            'status' => 'failed',
        ]);

        // Réservation reste en pending (pas annulée — pas de code auto-cancel dans le webhook)
        $this->assertDatabaseHas('reservations', [
            'id'     => $payment->reservation_id,
            'status' => 'pending',
        ]);
    }

    public function test_orange_webhook_with_invalid_signature_is_rejected(): void
    {
        $this->makePendingPayment('orange_ci', 'ORG-TESTREF-3');

        $payload = ['order_id' => 'ORG-TESTREF-3', 'status' => 'SUCCESS'];

        $this->withHeaders(['X-Webhook-Signature' => 'bad-signature'])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertStatus(401);
    }

    public function test_orange_webhook_without_signature_is_rejected(): void
    {
        $this->makePendingPayment('orange_ci', 'ORG-TESTREF-4');

        $payload = ['order_id' => 'ORG-TESTREF-4', 'status' => 'SUCCESS'];

        $this->postJson('/api/webhooks/orange', $payload)
            ->assertStatus(401);
    }

    public function test_orange_webhook_is_idempotent(): void
    {
        $payment = $this->makePendingPayment('orange_ci', 'ORG-TESTREF-5');

        $payload   = ['order_id' => 'ORG-TESTREF-5', 'status' => 'SUCCESS'];
        $signature = $this->sign(json_encode($payload), $this->orangeSecret);

        // Premier webhook → success
        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk()->assertJson(['success' => true]);

        // Deuxième webhook identique → ignoré (payment n'est plus pending)
        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk()->assertJson(['success' => false]);

        // Un seul paiement en base — pas de doublon
        $this->assertDatabaseCount('payments', 1);
    }

    // ── Wave CI ────────────────────────────────────────────────────

    public function test_wave_webhook_success_confirms_payment_and_reservation(): void
    {
        $payment = $this->makePendingPayment('wave_ci', 'WAV-TESTREF-1');

        $payload   = ['client_reference' => 'WAV-TESTREF-1', 'payment_status' => 'succeeded', 'amount' => 120000];
        $signature = $this->sign(json_encode($payload), $this->waveSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/wave', $payload)
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('payments', [
            'id'     => $payment->id,
            'status' => 'success',
        ]);

        $this->assertDatabaseHas('reservations', [
            'id'     => $payment->reservation_id,
            'status' => 'confirmed',
        ]);
    }

    public function test_wave_webhook_with_invalid_signature_is_rejected(): void
    {
        $this->makePendingPayment('wave_ci', 'WAV-TESTREF-2');

        $payload = ['client_reference' => 'WAV-TESTREF-2', 'payment_status' => 'succeeded'];

        $this->withHeaders(['X-Webhook-Signature' => 'tampered'])
            ->postJson('/api/webhooks/wave', $payload)
            ->assertStatus(401);
    }

    public function test_wave_webhook_with_unknown_reference_is_no_op(): void
    {
        $payload   = ['client_reference' => 'WAV-UNKNOWN-999', 'payment_status' => 'succeeded'];
        $signature = $this->sign(json_encode($payload), $this->waveSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/wave', $payload)
            ->assertOk()
            ->assertJson(['success' => false]);
    }

    // ── Garde-fous de sécurité (Phase 1) ───────────────────────────

    public function test_webhook_rejects_amount_mismatch(): void
    {
        $payment = $this->makePendingPayment('orange_ci', 'ORG-MISMATCH-1'); // attendu : 120000

        // Le provider annonce un succès mais avec un montant divergent.
        $payload   = ['order_id' => 'ORG-MISMATCH-1', 'status' => 'SUCCESS', 'amount' => 5000, 'currency' => 'XOF'];
        $signature = $this->sign(json_encode($payload), $this->orangeSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk();

        // Non confirmé : montant refusé, réservation toujours en attente.
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'failed']);
        $this->assertDatabaseHas('reservations', ['id' => $payment->reservation_id, 'status' => 'pending']);
    }

    public function test_webhook_rejects_expired_payment(): void
    {
        $reservation = Reservation::factory()->create(['status' => 'pending']);
        $payment = Payment::factory()->pending()->create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => 'orange_ci',
            'transaction_reference' => 'ORG-EXPIRED-1',
            'amount'                => 120000,
            'expires_at'            => now()->subMinute(), // déjà expiré
        ]);

        $payload   = ['order_id' => 'ORG-EXPIRED-1', 'status' => 'SUCCESS', 'amount' => 120000];
        $signature = $this->sign(json_encode($payload), $this->orangeSecret);

        $this->withHeaders(['X-Webhook-Signature' => $signature])
            ->postJson('/api/webhooks/orange', $payload)
            ->assertOk();

        // Anti-rejeu : un paiement expiré n'est jamais confirmé.
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('reservations', ['id' => $payment->reservation_id, 'status' => 'pending']);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private function makePendingPayment(string $provider, string $reference): Payment
    {
        $reservation = Reservation::factory()->create(['status' => 'pending']);

        return Payment::factory()->pending()->create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => $provider,
            'transaction_reference' => $reference,
            'amount'                => 120000,
            'expires_at'            => now()->addMinutes(30),
        ]);
    }

    private function sign(string $payload, string $secret): string
    {
        return hash_hmac('sha256', $payload, $secret);
    }
}
