<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CancelUnpaidReservationsTest extends TestCase
{
    use RefreshDatabase;

    private function ageReservation(Reservation $reservation, int $hours): void
    {
        DB::table('reservations')
            ->where('id', $reservation->id)
            ->update(['created_at' => now()->subHours($hours)]);
    }

    public function test_it_cancels_a_stale_unpaid_pending_reservation_and_frees_the_room(): void
    {
        config(['reservations.unpaid_timeout_hours' => 24]);

        $room        = Room::factory()->create(['status' => 'reserved']);
        $reservation = Reservation::factory()->create([
            'room_id' => $room->id,
            'status'  => 'pending',
        ]);
        $this->ageReservation($reservation, 48);

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', [
            'id'     => $reservation->id,
            'status' => 'cancelled',
        ]);
        $this->assertDatabaseHas('rooms', [
            'id'     => $room->id,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'entity_type' => 'Reservation',
            'entity_id'   => $reservation->id,
            'action_type' => AuditLog::ACTION_RESERVATION_AUTO_CANCELLED,
        ]);
    }

    public function test_it_leaves_recent_pending_reservations_untouched(): void
    {
        config(['reservations.unpaid_timeout_hours' => 24]);

        $reservation = Reservation::factory()->create(['status' => 'pending']);
        $this->ageReservation($reservation, 2); // récente

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', [
            'id'     => $reservation->id,
            'status' => 'pending',
        ]);
    }

    public function test_it_never_touches_confirmed_or_paid_reservations(): void
    {
        config(['reservations.unpaid_timeout_hours' => 24]);

        $confirmed = Reservation::factory()->confirmed()->create();
        $this->ageReservation($confirmed, 72);

        // Réservation pending ancienne mais avec un paiement réussi (cas défensif).
        $paidPending = Reservation::factory()->create(['status' => 'pending']);
        $this->ageReservation($paidPending, 72);
        Payment::factory()->create([
            'reservation_id' => $paidPending->id,
            'client_id'      => $paidPending->client_id,
            'status'         => 'success',
        ]);

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', ['id' => $confirmed->id,   'status' => 'confirmed']);
        $this->assertDatabaseHas('reservations', ['id' => $paidPending->id, 'status' => 'pending']);
    }

    public function test_dry_run_reports_without_cancelling(): void
    {
        config(['reservations.unpaid_timeout_hours' => 24]);

        $reservation = Reservation::factory()->create(['status' => 'pending']);
        $this->ageReservation($reservation, 48);

        $this->artisan('reservations:cancel-unpaid --dry-run')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', [
            'id'     => $reservation->id,
            'status' => 'pending',
        ]);
    }
}
