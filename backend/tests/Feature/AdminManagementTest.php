<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AuditLog;
use App\Models\Owner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_an_admin_with_permissions(): void
    {
        Mail::fake();
        Sanctum::actingAs(Owner::factory()->create());

        $this->postJson('/api/owner/admins', [
            'first_name'  => 'Awa',
            'last_name'   => 'Koné',
            'email'       => 'awa@hotel.com',
            'role'        => 'receptionist',
            'permissions' => ['manage_reservations', 'manage_checkin_checkout'],
        ])->assertCreated();

        $this->assertDatabaseHas('admins', ['email' => 'awa@hotel.com', 'role' => 'receptionist']);

        $admin = Admin::where('email', 'awa@hotel.com')->first();
        $this->assertDatabaseHas('admin_permissions', [
            'admin_id'       => $admin->id,
            'permission_key' => 'manage_reservations',
        ]);
    }

    public function test_owner_can_list_admins(): void
    {
        $owner = Owner::factory()->create();
        Admin::factory()->create(['email' => 'list@hotel.com', 'created_by_owner_id' => $owner->id]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/owner/admins')
            ->assertOk()
            ->assertJsonFragment(['email' => 'list@hotel.com']);
    }

    public function test_deleting_an_admin_preserves_their_audit_trail(): void
    {
        $owner = Owner::factory()->create();
        $admin = Admin::factory()->create(['created_by_owner_id' => $owner->id]);
        AuditLog::create([
            'admin_id'    => $admin->id,
            'action_type' => AuditLog::ACTION_ROOM_UPDATED,
            'entity_type' => 'Room',
            'entity_id'   => 1,
            'old_values'  => [],
            'new_values'  => [],
        ]);

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/owner/admins/{$admin->id}")->assertOk();

        // Soft-delete : exclu des requêtes normales, mais la ligne subsiste
        $this->assertNull(Admin::find($admin->id));
        $this->assertNotNull(Admin::withTrashed()->find($admin->id));

        // Le journal d'audit de l'admin survit (traçabilité immuable)
        $this->assertDatabaseHas('audit_logs', [
            'admin_id'    => $admin->id,
            'action_type' => AuditLog::ACTION_ROOM_UPDATED,
        ]);
    }

    public function test_admin_management_is_owner_only(): void
    {
        Sanctum::actingAs(Admin::factory()->create());

        $this->getJson('/api/owner/admins')->assertStatus(403);
    }
}
