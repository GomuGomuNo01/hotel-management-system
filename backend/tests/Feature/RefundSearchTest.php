<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Refund;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Recherche des remboursements par numéro (RMB-000017) en plus du nom / e-mail.
 */
class RefundSearchTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(string $permission): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $permission]);

        return $admin;
    }

    private function seedTwoRefunds(): array
    {
        $wanted = Refund::factory()->create([
            'client_id' => Client::factory()->create(['first_name' => 'Awa', 'last_name' => 'Koné'])->id,
        ]);
        $other = Refund::factory()->create([
            'client_id' => Client::factory()->create(['first_name' => 'Bob', 'last_name' => 'Traoré'])->id,
        ]);

        return [$wanted, $other];
    }

    public function test_search_by_full_rmb_reference(): void
    {
        [$wanted, $other] = $this->seedTwoRefunds();
        Sanctum::actingAs($this->adminWith('manage_payments'));

        $ref = 'RMB-' . str_pad((string) $wanted->id, 6, '0', STR_PAD_LEFT);

        $ids = collect($this->getJson("/api/admin/refunds?search={$ref}")->assertOk()->json('data'))
            ->pluck('id');

        $this->assertTrue($ids->contains($wanted->id));
        $this->assertFalse($ids->contains($other->id));
    }

    public function test_search_by_bare_number(): void
    {
        [$wanted, $other] = $this->seedTwoRefunds();
        Sanctum::actingAs($this->adminWith('manage_payments'));

        $ids = collect($this->getJson("/api/admin/refunds?search={$wanted->id}")->assertOk()->json('data'))
            ->pluck('id');

        $this->assertTrue($ids->contains($wanted->id));
        $this->assertFalse($ids->contains($other->id));
    }

    public function test_search_by_client_name_still_works(): void
    {
        [$wanted, $other] = $this->seedTwoRefunds();
        Sanctum::actingAs($this->adminWith('manage_payments'));

        $ids = collect($this->getJson('/api/admin/refunds?search=Awa')->assertOk()->json('data'))
            ->pluck('id');

        $this->assertTrue($ids->contains($wanted->id));
        $this->assertFalse($ids->contains($other->id));
    }
}
