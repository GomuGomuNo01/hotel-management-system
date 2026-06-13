<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckInOutFlowTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(array $permissions): Admin
    {
        $admin = Admin::factory()->create();
        foreach ($permissions as $key) {
            AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $key]);
        }
        return $admin;
    }

    public function test_checkin_succeeds_for_confirmed_and_fully_paid(): void
    {
        $admin = $this->adminWith(['manage_checkin_checkout']);
        $room  = Room::factory()->create(['status' => 'reserved']);
        $reservation = Reservation::factory()->confirmed()->create([
            'room_id'      => $room->id,
            'total_amount' => 100000,
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 100000,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/checkin/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'checked_in');

        $this->assertSame('checked_in', $reservation->fresh()->status);
        $this->assertSame('occupied', $room->fresh()->status);
    }

    public function test_checkin_is_blocked_when_balance_is_due(): void
    {
        // Réceptionniste sans droit "checkin_with_deposit"
        $admin = $this->adminWith(['manage_checkin_checkout']);
        $reservation = Reservation::factory()->confirmed()->partial()->create(['total_amount' => 100000]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 40000, // solde de 60 000 dû
            'payment_type'   => 'deposit',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/checkin/{$reservation->id}")
            ->assertStatus(403);

        // La réservation reste confirmée (pas de check-in)
        $this->assertSame('confirmed', $reservation->fresh()->status);
    }

    public function test_checkout_succeeds_for_checked_in_and_paid(): void
    {
        $admin = $this->adminWith(['manage_checkin_checkout']);
        $room  = Room::factory()->create(['status' => 'occupied']);
        $reservation = Reservation::factory()->checkedIn()->create([
            'room_id'      => $room->id,
            'total_amount' => 100000,
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 100000,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/checkout/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'checked_out');

        $this->assertSame('checked_out', $reservation->fresh()->status);
        $this->assertSame('available', $room->fresh()->status);
    }
}
