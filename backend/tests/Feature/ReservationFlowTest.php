<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_create_reservation(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['price_per_night' => 50000, 'status' => 'available']);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(), // 3 nuits
            'payment_plan'   => 'full',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.total_amount', 150000); // 3 × 50000

        $this->assertDatabaseHas('reservations', [
            'client_id' => $client->id,
            'room_id'   => $room->id,
            'status'    => 'pending',
        ]);
        // La chambre passe en "reserved"
        $this->assertSame('reserved', $room->fresh()->status);
    }

    public function test_overlapping_dates_are_rejected(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'available']);

        Reservation::factory()->confirmed()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
        ]);

        Sanctum::actingAs($client);

        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(3)->toDateString(), // chevauche
            'check_out_date' => now()->addDays(6)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertStatus(409);
    }

    public function test_back_to_back_stays_are_allowed(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'available']);

        Reservation::factory()->confirmed()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
        ]);

        Sanctum::actingAs($client);

        // Arrivée le jour du départ du séjour précédent : pas un conflit.
        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(5)->toDateString(),
            'check_out_date' => now()->addDays(7)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertCreated();
    }

    public function test_maintenance_room_cannot_be_reserved(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'maintenance']);
        Sanctum::actingAs($client);

        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertStatus(409);
    }

    public function test_rescheduling_into_an_occupied_period_is_rejected(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'available']);

        Reservation::factory()->confirmed()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(10)->toDateString(),
            'check_out_date' => now()->addDays(12)->toDateString(),
        ]);

        $mine = Reservation::factory()->create([
            'client_id'      => $client->id,
            'room_id'        => $room->id,
            'status'         => 'pending',
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
        ]);

        Sanctum::actingAs($client);

        $this->putJson("/api/reservations/{$mine->id}", [
            'check_in_date'  => now()->addDays(11)->toDateString(), // chevauche l'autre séjour
            'check_out_date' => now()->addDays(13)->toDateString(),
        ])->assertStatus(409);
    }

    public function test_past_check_in_date_is_rejected(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create();
        Sanctum::actingAs($client);

        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->subDay()->toDateString(),
            'check_out_date' => now()->addDays(2)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertStatus(422)->assertJsonValidationErrors(['check_in_date']);
    }

    public function test_guest_cannot_create_reservation(): void
    {
        $room = Room::factory()->create();

        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(4)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertStatus(401);
    }
}
