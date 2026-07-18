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

    private function agePayment(Payment $payment, int $minutes): void
    {
        DB::table('payments')
            ->where('id', $payment->id)
            ->update(['created_at' => now()->subMinutes($minutes)]);
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

    public function test_it_cancels_fast_when_the_last_payment_failed_beyond_the_short_delay(): void
    {
        config([
            'reservations.unpaid_timeout_hours'          => 24,
            'reservations.failed_payment_timeout_minutes' => 120,
        ]);

        $room        = Room::factory()->create(['status' => 'reserved']);
        $reservation = Reservation::factory()->create(['room_id' => $room->id, 'status' => 'pending']);
        // Réservation récente : le délai « jamais tentée » (24 h) ne s'applique PAS.
        $this->ageReservation($reservation, 1);

        $payment = Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'status'         => 'failed',
            'confirmed_at'   => null,
        ]);
        $this->agePayment($payment, 180); // échec il y a 3 h > 2 h

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('rooms',        ['id' => $room->id,        'status' => 'available']);
        $this->assertDatabaseHas('audit_logs', [
            'entity_type' => 'Reservation',
            'entity_id'   => $reservation->id,
            'action_type' => AuditLog::ACTION_RESERVATION_AUTO_CANCELLED,
        ]);
    }

    public function test_it_keeps_a_reservation_whose_failed_payment_is_still_recent(): void
    {
        config([
            'reservations.unpaid_timeout_hours'          => 24,
            'reservations.failed_payment_timeout_minutes' => 120,
        ]);

        $reservation = Reservation::factory()->create(['status' => 'pending']);
        $this->ageReservation($reservation, 1);

        $payment = Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'status'         => 'failed',
            'confirmed_at'   => null,
        ]);
        $this->agePayment($payment, 30); // échec il y a 30 min < 2 h

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'pending']);
    }

    public function test_it_keeps_a_reservation_retrying_after_a_failure(): void
    {
        config([
            'reservations.unpaid_timeout_hours'          => 24,
            'reservations.failed_payment_timeout_minutes' => 120,
        ]);

        $reservation = Reservation::factory()->create(['status' => 'pending']);
        $this->ageReservation($reservation, 1);

        // Vieil échec…
        $failed = Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'status'         => 'failed',
            'confirmed_at'   => null,
        ]);
        $this->agePayment($failed, 180);

        // …mais une nouvelle tentative est en cours (paiement le plus récent).
        Payment::factory()->pending()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
        ]);

        $this->artisan('reservations:cancel-unpaid')->assertExitCode(0);

        // La dernière tentative n'est pas un échec → on n'annule pas.
        $this->assertDatabaseHas('reservations', ['id' => $reservation->id, 'status' => 'pending']);
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
