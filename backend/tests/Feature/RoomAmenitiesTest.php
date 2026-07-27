<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Robustesse des équipements de chambre : les libellés historiques capitalisés
 * ("WiFi", "Mini-bar") sont normalisés à l'entrée au lieu d'être rejetés.
 */
class RoomAmenitiesTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithRooms(): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => 'manage_rooms']);

        return $admin;
    }

    public function test_normalize_amenities_maps_legacy_labels(): void
    {
        $this->assertSame(
            ['wifi', 'climatisation', 'tv', 'minibar'],
            Room::normalizeAmenities(['WiFi', 'Climatisation', 'TV', 'Mini-bar'])
        );
    }

    public function test_updating_room_with_legacy_amenities_succeeds(): void
    {
        $room = Room::factory()->create(['amenities' => ['WiFi', 'Climatisation', 'TV', 'Mini-bar']]);
        Sanctum::actingAs($this->adminWithRooms());

        // Le formulaire renvoie les valeurs historiques telles quelles.
        $this->putJson("/api/admin/rooms/{$room->id}", [
            'amenities' => ['WiFi', 'Climatisation', 'TV', 'Mini-bar'],
        ])->assertOk();

        $this->assertSame(
            ['wifi', 'climatisation', 'tv', 'minibar'],
            $room->fresh()->amenities
        );
    }

    public function test_creating_room_normalizes_amenities(): void
    {
        Sanctum::actingAs($this->adminWithRooms());

        $this->postJson('/api/admin/rooms', [
            'room_number'     => 'AMN-1',
            'room_type'       => 'double',
            'price_per_night' => 40000,
            'capacity'        => 2,
            'amenities'       => ['WiFi', 'TV'],
        ])->assertCreated();

        $this->assertSame(['wifi', 'tv'], Room::where('room_number', 'AMN-1')->first()->amenities);
    }

    public function test_genuinely_invalid_amenity_is_still_rejected(): void
    {
        $room = Room::factory()->create();
        Sanctum::actingAs($this->adminWithRooms());

        $this->putJson("/api/admin/rooms/{$room->id}", [
            'amenities' => ['jacuzzi'],
        ])->assertStatus(422)->assertJsonValidationErrors(['amenities.0']);
    }
}
