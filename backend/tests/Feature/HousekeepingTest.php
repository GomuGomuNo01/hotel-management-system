<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HousekeepingTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(string $permission): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $permission]);
        return $admin;
    }

    public function test_checkout_marks_the_room_dirty(): void
    {
        Notification::fake();

        $room        = Room::factory()->create(['status' => 'occupied', 'housekeeping_status' => 'clean']);
        $reservation = Reservation::factory()->checkedIn()->create([
            'room_id'      => $room->id,
            'total_amount' => 100000,
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 100000,
            'status'         => 'success',
        ]);

        $admin = $this->adminWith('manage_checkin_checkout');
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/checkout/{$reservation->id}")->assertOk();

        $this->assertDatabaseHas('rooms', [
            'id'                  => $room->id,
            'status'              => 'available',
            'housekeeping_status' => 'dirty',
        ]);
    }

    public function test_housekeeping_index_requires_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->create());
        $this->getJson('/api/admin/housekeeping')->assertForbidden();
    }

    public function test_index_returns_rooms_and_summary(): void
    {
        Room::factory()->create(['housekeeping_status' => 'dirty']);
        Room::factory()->create(['housekeeping_status' => 'clean']);

        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->getJson('/api/admin/housekeeping')
            ->assertOk()
            ->assertJsonPath('data.summary.dirty', 1)
            ->assertJsonPath('data.summary.clean', 1);
    }

    public function test_admin_can_transition_housekeeping_status_with_audit(): void
    {
        $room = Room::factory()->create(['housekeeping_status' => 'dirty']);
        $admin = $this->adminWith('manage_housekeeping');
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/housekeeping/{$room->id}", ['housekeeping_status' => 'clean'])
            ->assertOk()
            ->assertJsonPath('data.housekeeping_status', 'clean');

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'housekeeping_status' => 'clean']);
        $this->assertDatabaseHas('audit_logs', [
            'entity_type' => 'Room',
            'entity_id'   => $room->id,
            'action_type' => AuditLog::ACTION_HOUSEKEEPING_UPDATED,
        ]);
    }

    public function test_update_rejects_invalid_status(): void
    {
        $room = Room::factory()->create();
        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->patchJson("/api/admin/housekeeping/{$room->id}", ['housekeeping_status' => 'sparkling'])
            ->assertStatus(422);
    }

    public function test_filtering_by_status_returns_only_matching_rooms(): void
    {
        Room::factory()->create(['housekeeping_status' => 'dirty', 'room_number' => 'HK-1']);
        Room::factory()->create(['housekeeping_status' => 'clean', 'room_number' => 'HK-2']);

        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $res   = $this->getJson('/api/admin/housekeeping?housekeeping_status=dirty')->assertOk();
        $rooms = collect($res->json('data.rooms'));

        $this->assertCount(1, $rooms);
        $this->assertSame('HK-1', $rooms->first()['room_number']);
    }

    public function test_badges_endpoint_counts_rooms_to_clean(): void
    {
        Room::factory()->count(2)->create(['housekeeping_status' => 'dirty']);
        Room::factory()->create(['housekeeping_status' => 'clean']);
        Room::factory()->create(['housekeeping_status' => 'in_progress']);

        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->getJson('/api/admin/dashboard/badges')
            ->assertOk()
            ->assertJsonPath('data.housekeeping', 2);
    }

    public function test_badges_housekeeping_count_hidden_without_permission(): void
    {
        Room::factory()->count(3)->create(['housekeeping_status' => 'dirty']);

        // Admin sans la permission housekeeping : compteur à 0 (jamais exposé).
        Sanctum::actingAs($this->adminWith('manage_reservations'));

        $this->getJson('/api/admin/dashboard/badges')
            ->assertOk()
            ->assertJsonPath('data.housekeeping', 0);
    }
}
