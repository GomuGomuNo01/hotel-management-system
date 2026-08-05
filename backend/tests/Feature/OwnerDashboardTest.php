<?php

namespace Tests\Feature;

use App\Models\Owner;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // les endpoints revenue/occupancy sont mis en cache
    }

    private function seedHotel(): void
    {
        $occupied = Room::factory()->occupied()->create();
        Room::factory()->count(2)->create(['status' => 'available']);

        // Réservation rattachée à une chambre existante (sinon la factory en crée une 4e).
        $reservation = Reservation::factory()->confirmed()->create([
            'room_id'      => $occupied->id,
            'total_amount' => 80000,
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 80000,
            'provider'       => 'cash',
            'status'         => 'success',
            'confirmed_at'   => now(),
        ]);
    }

    public function test_owner_dashboard_stats_aggregates_correctly(): void
    {
        $this->seedHotel();
        Sanctum::actingAs(Owner::factory()->create());

        $this->getJson('/api/owner/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('data.stats.total_rooms', 3)
            ->assertJsonPath('data.stats.occupied_rooms', 1)
            ->assertJsonPath('data.stats.occupancy_rate', 33.3)
            ->assertJsonPath('data.stats.total_revenue', 80000)
            ->assertJsonPath('data.stats.total_reservations', 1);
    }

    public function test_owner_revenue_endpoint_returns_daily_series(): void
    {
        $this->seedHotel();
        Sanctum::actingAs(Owner::factory()->create());

        $response = $this->getJson('/api/owner/dashboard/revenue?days=30')->assertOk();

        $this->assertCount(30, $response->json('data.daily'));
        $this->assertSame(80000.0, (float) $response->json('data.total'));
    }

    public function test_owner_occupancy_endpoint(): void
    {
        $this->seedHotel();
        Sanctum::actingAs(Owner::factory()->create());

        $res = $this->getJson('/api/owner/dashboard/occupancy?days=30')
            ->assertOk()
            ->assertJsonPath('data.total_rooms', 3)
            ->assertJsonPath('data.occupied_rooms', 1);

        // top_rooms doit être une LISTE JSON (jamais une collection Eloquent
        // cachée, qui se désérialiserait en objet et casserait le front), avec
        // uniquement les champs nécessaires.
        $top = $res->json('data.top_rooms');
        $this->assertIsArray($top);
        $this->assertTrue(array_is_list($top));
        $this->assertSame(['id', 'room_number', 'room_type', 'bookings_count'], array_keys($top[0]));
    }

    public function test_dashboard_is_owner_only(): void
    {
        Sanctum::actingAs(\App\Models\Client::factory()->create());

        $this->getJson('/api/owner/dashboard/stats')->assertStatus(403);
    }
}
