<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Services\ImageOptimizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Les photos de chambre sont redimensionnées et converties en WebP à l'upload :
 * sans cela, le fichier brut de l'appareil photo (jusqu'à 5 Mo autorisés par la
 * validation) serait servi tel quel à chaque visiteur.
 */
class ImageOptimizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('gd') || ! function_exists('imagewebp')) {
            $this->markTestSkipped('GD avec support WebP requis.');
        }
    }

    /** Génère un vrai JPEG de la taille demandée (les fakes de Laravel suffisent ici). */
    private function jpeg(int $width, int $height): UploadedFile
    {
        return UploadedFile::fake()->image('photo.jpg', $width, $height);
    }

    public function test_oversized_image_is_resized_within_bounds(): void
    {
        Storage::fake('public');

        $path = app(ImageOptimizer::class)->store($this->jpeg(4000, 3000), 'rooms');

        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);

        $info = getimagesizefromstring(Storage::disk('public')->get($path));

        $this->assertSame(ImageOptimizer::MAX_DIMENSION, $info[0], 'La largeur doit être ramenée à la borne.');
        $this->assertLessThanOrEqual(ImageOptimizer::MAX_DIMENSION, $info[1]);
    }

    public function test_small_image_is_not_upscaled(): void
    {
        Storage::fake('public');

        $path = app(ImageOptimizer::class)->store($this->jpeg(320, 240), 'rooms');

        $info = getimagesizefromstring(Storage::disk('public')->get($path));

        $this->assertSame(320, $info[0]);
        $this->assertSame(240, $info[1]);
    }

    public function test_uploading_a_room_photo_stores_an_optimised_file(): void
    {
        Storage::fake('public');

        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => 'manage_rooms']);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/rooms', [
            'room_number'     => 'OPT-1',
            'room_type'       => 'double',
            'price_per_night' => 30000,
            'capacity'        => 2,
            'images'          => [$this->jpeg(3000, 2000)],
        ])->assertCreated();

        $stored = Storage::disk('public')->files('rooms');

        $this->assertCount(1, $stored);
        $this->assertStringEndsWith('.webp', $stored[0]);

        $info = getimagesizefromstring(Storage::disk('public')->get($stored[0]));
        $this->assertLessThanOrEqual(ImageOptimizer::MAX_DIMENSION, $info[0]);
    }
}
