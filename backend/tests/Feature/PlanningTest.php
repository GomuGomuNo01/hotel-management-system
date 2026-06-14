<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlanningTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithPlanning(): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create([
            'admin_id'       => $admin->id,
            'permission_key' => 'manage_reservations',
        ]);
        return $admin;
    }

    public function test_planning_requires_manage_reservations_permission(): void
    {
        Sanctum::actingAs(Admin::factory()->create());

        $this->getJson('/api/admin/planning')->assertForbidden();
    }

    public function test_planning_returns_rooms_with_overlapping_reservations(): void
    {
        $room = Room::factory()->create();
        $reservation = Reservation::factory()->confirmed()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
        ]);

        Sanctum::actingAs($this->adminWithPlanning());

        $this->getJson('/api/admin/planning?from=' . now()->toDateString() . '&days=14')
            ->assertOk()
            ->assertJsonPath('data.range.days', 14)
            ->assertJsonFragment(['id' => $reservation->id])
            ->assertJsonFragment(['room_number' => $room->room_number]);
    }

    public function test_planning_excludes_cancelled_reservations(): void
    {
        $room = Room::factory()->create();
        Reservation::factory()->create([
            'room_id'        => $room->id,
            'status'         => 'cancelled',
            'check_in_date'  => now()->addDays(2)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
        ]);

        Sanctum::actingAs($this->adminWithPlanning());

        $res  = $this->getJson('/api/admin/planning')->assertOk();
        $rooms = collect($res->json('data.rooms'));
        $target = $rooms->firstWhere('id', $room->id);

        $this->assertNotNull($target);
        $this->assertCount(0, $target['reservations']);
    }

    public function test_planning_excludes_reservations_outside_the_window(): void
    {
        $room = Room::factory()->create();
        // Séjour bien après la fenêtre de 7 jours.
        Reservation::factory()->confirmed()->create([
            'room_id'        => $room->id,
            'check_in_date'  => now()->addDays(20)->toDateString(),
            'check_out_date' => now()->addDays(23)->toDateString(),
        ]);

        Sanctum::actingAs($this->adminWithPlanning());

        $res    = $this->getJson('/api/admin/planning?days=7')->assertOk();
        $target = collect($res->json('data.rooms'))->firstWhere('id', $room->id);

        $this->assertCount(0, $target['reservations']);
    }
}
