<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CancellationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_cancel_within_24h(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'reserved']);
        $reservation = Reservation::factory()->create([
            'client_id' => $client->id,
            'room_id'   => $room->id,
            'status'    => 'pending',
        ]);

        Sanctum::actingAs($client);

        $this->deleteJson("/api/reservations/{$reservation->id}")->assertOk();

        $this->assertSame('cancelled', $reservation->fresh()->status);
        $this->assertSame('available', $room->fresh()->status);
    }

    public function test_cancellation_with_payment_creates_pending_refund(): void
    {
        Notification::fake();

        $client = Client::factory()->create();
        $reservation = Reservation::factory()->confirmed()->create([
            'client_id'    => $client->id,
            'total_amount' => 100000,
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'amount'         => 50000,
        ]);

        Sanctum::actingAs($client);

        $this->deleteJson("/api/reservations/{$reservation->id}")->assertOk();

        $this->assertSame('cancelled', $reservation->fresh()->status);
        $this->assertDatabaseHas('refunds', [
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'status'         => 'pending',
            'amount'         => 50000,
        ]);
    }

    public function test_cancellation_is_blocked_after_24h(): void
    {
        $client = Client::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id' => $client->id,
            'status'    => 'pending',
        ]);
        // Créée il y a plus de 24 h → délai d'annulation dépassé
        $reservation->forceFill(['created_at' => now()->subHours(25)])->save();

        Sanctum::actingAs($client);

        $this->deleteJson("/api/reservations/{$reservation->id}")->assertStatus(403);
        $this->assertSame('pending', $reservation->fresh()->status);
    }
}
