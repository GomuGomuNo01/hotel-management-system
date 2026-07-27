<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\HousekeepingTask;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Recouches (ménage en cours de séjour) : planification, traitement, report,
 * et garde « arrivée le jour même » sur une chambre non nettoyée.
 */
class StayoverCleaningTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(string ...$permissions): Admin
    {
        $admin = Admin::factory()->create();
        foreach ($permissions as $key) {
            AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $key]);
        }

        return $admin;
    }

    /** Séjour en cours depuis N jours, nettoyé pour la dernière fois à l'arrivée. */
    private function inHouseStay(int $startedDaysAgo, int $endsInDays, ?string $lastCleanedAt = null): Reservation
    {
        $room = Room::factory()->create([
            'status'              => 'occupied',
            'housekeeping_status' => 'clean',
            'last_cleaned_at'     => $lastCleanedAt,
        ]);

        return Reservation::factory()->checkedIn()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->subDays($startedDaysAgo)->toDateString(),
            'check_out_date' => now()->addDays($endsInDays)->toDateString(),
        ]);
    }

    public function test_command_plans_a_stayover_for_an_ongoing_long_stay(): void
    {
        $reservation = $this->inHouseStay(startedDaysAgo: 2, endsInDays: 3);

        $this->artisan('housekeeping:plan-stayovers')->assertExitCode(0);

        $this->assertTrue(
            HousekeepingTask::where('room_id', $reservation->room_id)
                ->where('type', 'stayover')
                ->where('status', 'pending')
                ->whereDate('scheduled_for', now()->toDateString())
                ->exists()
        );
    }

    public function test_command_is_idempotent(): void
    {
        $this->inHouseStay(startedDaysAgo: 2, endsInDays: 3);

        $this->artisan('housekeeping:plan-stayovers');
        $this->artisan('housekeeping:plan-stayovers');

        $this->assertSame(1, HousekeepingTask::count());
    }

    public function test_no_stayover_on_the_arrival_day(): void
    {
        // Séjour commencé aujourd'hui : pas de recouche le jour de l'arrivée.
        $this->inHouseStay(startedDaysAgo: 0, endsInDays: 4);

        $this->artisan('housekeeping:plan-stayovers');

        $this->assertSame(0, HousekeepingTask::count());
    }

    public function test_no_stayover_on_the_departure_day(): void
    {
        // Le client part aujourd'hui : le départ déclenchera un nettoyage complet.
        $this->inHouseStay(startedDaysAgo: 3, endsInDays: 0);

        $this->artisan('housekeeping:plan-stayovers');

        $this->assertSame(0, HousekeepingTask::count());
    }

    public function test_recently_cleaned_room_is_not_due(): void
    {
        // Fréquence par défaut = 1 jour ; nettoyée aujourd'hui → pas encore due.
        $this->inHouseStay(startedDaysAgo: 3, endsInDays: 3, lastCleanedAt: now()->toDateTimeString());

        $this->artisan('housekeeping:plan-stayovers');

        $this->assertSame(0, HousekeepingTask::count());
    }

    public function test_completing_a_stayover_timestamps_the_room_without_freeing_it(): void
    {
        $reservation = $this->inHouseStay(startedDaysAgo: 2, endsInDays: 3);
        $task = HousekeepingTask::factory()->create([
            'room_id'        => $reservation->room_id,
            'reservation_id' => $reservation->id,
        ]);

        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->postJson("/api/admin/housekeeping/tasks/{$task->id}/complete")->assertOk();

        $this->assertDatabaseHas('housekeeping_tasks', ['id' => $task->id, 'status' => 'done']);

        $room = $reservation->room->fresh();
        $this->assertNotNull($room->last_cleaned_at);
        // La chambre reste occupée : le client est toujours en séjour.
        $this->assertSame('occupied', $room->status);
        $this->assertSame('clean', $room->housekeeping_status);
    }

    public function test_deferring_a_stayover_reschedules_it(): void
    {
        $reservation = $this->inHouseStay(startedDaysAgo: 2, endsInDays: 3);
        $task = HousekeepingTask::factory()->create([
            'room_id'        => $reservation->room_id,
            'reservation_id' => $reservation->id,
        ]);

        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->postJson("/api/admin/housekeeping/tasks/{$task->id}/defer")->assertOk();

        $this->assertDatabaseHas('housekeeping_tasks', ['id' => $task->id, 'status' => 'deferred']);
        // Une nouvelle tâche est planifiée pour le lendemain.
        $this->assertTrue(
            HousekeepingTask::where('room_id', $reservation->room_id)
                ->where('status', 'pending')
                ->where('deferred_count', 1)
                ->whereDate('scheduled_for', now()->addDay()->toDateString())
                ->exists()
        );
    }

    public function test_checkout_cancels_open_stayovers(): void
    {
        $room = Room::factory()->create(['status' => 'occupied', 'housekeeping_status' => 'clean']);
        $reservation = Reservation::factory()->checkedIn()->create([
            'room_id'      => $room->id,
            'total_amount' => 100000,
        ]);
        \App\Models\Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 100000,
            'status'         => 'success',
        ]);
        $task = HousekeepingTask::factory()->create([
            'room_id'        => $room->id,
            'reservation_id' => $reservation->id,
        ]);

        app(\App\Services\ReservationService::class)->checkOut($reservation->fresh());

        $this->assertDatabaseHas('housekeeping_tasks', ['id' => $task->id, 'status' => 'cancelled']);
    }

    public function test_same_day_arrival_on_dirty_room_is_rejected(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'available', 'housekeeping_status' => 'dirty']);
        Sanctum::actingAs($client);

        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->toDateString(),      // arrivée aujourd'hui
            'check_out_date' => now()->addDays(2)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertStatus(409);
    }

    public function test_future_arrival_on_dirty_room_is_allowed(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create(['status' => 'available', 'housekeeping_status' => 'dirty']);
        Sanctum::actingAs($client);

        // Arrivée dans le futur : la chambre sera nettoyée d'ici là.
        $this->postJson('/api/reservations', [
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(3)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
            'payment_plan'   => 'full',
        ])->assertCreated();
    }
}
