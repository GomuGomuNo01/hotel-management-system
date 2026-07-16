<?php

namespace Tests\Feature;

use App\Events\HotelBroadcast;
use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Synchronisation bidirectionnelle statut commercial ↔ état ménage
 * (RoomObserver) et diffusion temps réel "room.updated".
 */
class RoomStatusSyncTest extends TestCase
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

    public function test_setting_room_to_maintenance_forces_housekeeping_out_of_service(): void
    {
        $room = Room::factory()->create(['status' => 'available', 'housekeeping_status' => 'clean']);
        Sanctum::actingAs($this->adminWith('manage_rooms'));

        $this->putJson("/api/admin/rooms/{$room->id}", ['status' => 'maintenance'])->assertOk();

        $this->assertDatabaseHas('rooms', [
            'id'                  => $room->id,
            'status'              => 'maintenance',
            'housekeeping_status' => 'out_of_service',
        ]);
    }

    public function test_leaving_maintenance_marks_room_dirty_for_housekeeping(): void
    {
        $room = Room::factory()->create(['status' => 'maintenance', 'housekeeping_status' => 'out_of_service']);
        Sanctum::actingAs($this->adminWith('manage_rooms'));

        $this->putJson("/api/admin/rooms/{$room->id}", ['status' => 'available'])->assertOk();

        $this->assertDatabaseHas('rooms', [
            'id'                  => $room->id,
            'status'              => 'available',
            'housekeeping_status' => 'dirty',
        ]);
    }

    public function test_housekeeping_out_of_service_forces_room_maintenance(): void
    {
        $room = Room::factory()->create(['status' => 'available', 'housekeeping_status' => 'clean']);
        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->patchJson("/api/admin/housekeeping/{$room->id}", ['housekeeping_status' => 'out_of_service'])
            ->assertOk()
            ->assertJsonPath('data.status', 'maintenance');

        $this->assertDatabaseHas('rooms', [
            'id'                  => $room->id,
            'status'              => 'maintenance',
            'housekeeping_status' => 'out_of_service',
        ]);
    }

    public function test_housekeeping_back_in_service_makes_room_available(): void
    {
        $room = Room::factory()->create(['status' => 'maintenance', 'housekeeping_status' => 'out_of_service']);
        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->patchJson("/api/admin/housekeeping/{$room->id}", ['housekeeping_status' => 'clean'])
            ->assertOk()
            ->assertJsonPath('data.status', 'available');

        $this->assertDatabaseHas('rooms', [
            'id'                  => $room->id,
            'status'              => 'available',
            'housekeeping_status' => 'clean',
        ]);
    }

    public function test_occupied_room_cannot_be_set_out_of_service(): void
    {
        $room = Room::factory()->create(['status' => 'occupied', 'housekeeping_status' => 'clean']);
        Sanctum::actingAs($this->adminWith('manage_housekeeping'));

        $this->patchJson("/api/admin/housekeeping/{$room->id}", ['housekeeping_status' => 'out_of_service'])
            ->assertStatus(422);

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'occupied']);
    }

    public function test_occupied_room_cannot_be_set_to_maintenance(): void
    {
        $room = Room::factory()->create(['status' => 'occupied', 'housekeeping_status' => 'clean']);
        Sanctum::actingAs($this->adminWith('manage_rooms'));

        $this->putJson("/api/admin/rooms/{$room->id}", ['status' => 'maintenance'])
            ->assertStatus(422);

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'occupied']);
    }

    public function test_room_status_change_broadcasts_room_updated(): void
    {
        $room = Room::factory()->create(['status' => 'available', 'housekeeping_status' => 'clean']);

        Event::fake([HotelBroadcast::class]);

        $room->update(['status' => 'maintenance']);

        Event::assertDispatched(HotelBroadcast::class, function (HotelBroadcast $event) use ($room) {
            return $event->type === 'room.updated'
                && $event->payload['roomId'] === $room->id
                && $event->payload['status'] === 'maintenance'
                && $event->payload['housekeepingStatus'] === 'out_of_service';
        });
    }

    public function test_maintenance_room_is_hidden_from_public_listing(): void
    {
        Room::factory()->create(['status' => 'available', 'room_number' => 'PUB-1']);
        $hidden = Room::factory()->create(['status' => 'maintenance', 'room_number' => 'PUB-2']);

        $numbers = collect($this->getJson('/api/rooms')->assertOk()->json('data'))
            ->pluck('room_number');

        $this->assertTrue($numbers->contains('PUB-1'));
        $this->assertFalse($numbers->contains('PUB-2'));

        $this->getJson("/api/rooms/{$hidden->id}")->assertNotFound();
    }
}
