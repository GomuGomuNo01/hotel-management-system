<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Complaint;
use App\Models\Owner;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    // ── Isolation client-client ─────────────────────────────────

    public function test_client_cannot_view_another_clients_reservation(): void
    {
        $clientA = Client::factory()->create();
        $clientB = Client::factory()->create();
        $reservation = Reservation::factory()->create(['client_id' => $clientA->id]);

        Sanctum::actingAs($clientB);

        $this->getJson("/api/reservations/{$reservation->id}")
            ->assertNotFound();
    }

    public function test_client_cannot_cancel_another_clients_reservation(): void
    {
        $clientA = Client::factory()->create();
        $clientB = Client::factory()->create();
        $reservation = Reservation::factory()->create(['client_id' => $clientA->id]);

        Sanctum::actingAs($clientB);

        $this->deleteJson("/api/reservations/{$reservation->id}")
            ->assertNotFound();
    }

    public function test_client_cannot_initiate_payment_on_another_clients_reservation(): void
    {
        $clientA = Client::factory()->create();
        $clientB = Client::factory()->create();
        $reservation = Reservation::factory()->create(['client_id' => $clientA->id]);

        Sanctum::actingAs($clientB);

        $this->postJson('/api/payments/initiate', [
            'reservation_id' => $reservation->id,
            'provider'       => 'orange_ci',
            'phone_number'   => '0701020304',
        ])->assertNotFound();
    }

    public function test_client_cannot_cancel_another_clients_payment(): void
    {
        $clientA = Client::factory()->create();
        $clientB = Client::factory()->create();
        $reservation = Reservation::factory()->create(['client_id' => $clientA->id]);
        $payment = Payment::factory()->pending()->create([
            'client_id'      => $clientA->id,
            'reservation_id' => $reservation->id,
        ]);

        Sanctum::actingAs($clientB);

        // Scoped query returns 404, not 403 — intentional (resource enumeration protection)
        $this->deleteJson("/api/payments/{$payment->id}")
            ->assertNotFound();
    }

    public function test_client_cannot_delete_another_clients_complaint(): void
    {
        $clientA     = Client::factory()->create();
        $clientB     = Client::factory()->create();
        $reservation = Reservation::factory()->checkedIn()->create(['client_id' => $clientA->id]);
        $complaint   = Complaint::factory()->create([
            'client_id'      => $clientA->id,
            'reservation_id' => $reservation->id,
            'status'         => 'open',
        ]);

        Sanctum::actingAs($clientB);

        $this->deleteJson("/api/complaints/{$complaint->id}")
            ->assertNotFound();
    }

    // ── Isolation rôle client vs admin ──────────────────────────

    public function test_client_cannot_access_admin_routes(): void
    {
        Sanctum::actingAs(Client::factory()->create());

        $this->getJson('/api/admin/dashboard/stats')->assertForbidden();
        $this->getJson('/api/admin/clients')->assertForbidden();
        $this->getJson('/api/admin/reservations')->assertForbidden();
    }

    public function test_client_cannot_access_owner_routes(): void
    {
        Sanctum::actingAs(Client::factory()->create());

        $this->getJson('/api/owner/admins')->assertForbidden();
        $this->getJson('/api/owner/audit-logs')->assertForbidden();
    }

    // ── Isolation rôle admin vs owner ───────────────────────────

    public function test_admin_cannot_access_owner_routes(): void
    {
        Sanctum::actingAs(Admin::factory()->create());

        $this->getJson('/api/owner/admins')->assertForbidden();
        $this->getJson('/api/owner/audit-logs')->assertForbidden();
    }

    public function test_owner_cannot_access_client_routes(): void
    {
        Sanctum::actingAs(Owner::factory()->create());

        // Owner is not a client — role:client middleware blocks
        $this->getJson('/api/reservations')->assertForbidden();
        $this->getJson('/api/profile')->assertForbidden();
    }

    // ── Permissions admin ────────────────────────────────────────

    public function test_admin_without_manage_clients_cannot_list_clients(): void
    {
        $admin = Admin::factory()->create();
        // No manage_clients permission created

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/clients')->assertForbidden();
    }

    public function test_admin_without_manage_payments_cannot_approve_refund(): void
    {
        $admin  = Admin::factory()->create();
        $refund = Refund::factory()->create(['status' => 'pending']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/refunds/{$refund->id}/approve", ['notes' => 'ok'])
            ->assertForbidden();
    }

    public function test_admin_with_manage_payments_can_approve_refund(): void
    {
        $admin = Admin::factory()->create();
        AdminPermission::create([
            'admin_id'       => $admin->id,
            'permission_key' => 'manage_payments',
        ]);

        $reservation = Reservation::factory()->confirmed()->create();
        $refund      = Refund::factory()->create([
            'status'         => 'pending',
            'client_id'      => $reservation->client_id,
            'reservation_id' => $reservation->id,
            'amount'         => 60000,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/refunds/{$refund->id}/approve", ['notes' => 'Approuvé'])
            ->assertOk();

        $this->assertDatabaseHas('refunds', [
            'id'     => $refund->id,
            'status' => 'approved',
        ]);
    }

    public function test_admin_without_manage_reservations_cannot_access_reservations(): void
    {
        $admin = Admin::factory()->create();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/reservations')->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_any_protected_route(): void
    {
        $this->getJson('/api/reservations')->assertUnauthorized();
        $this->getJson('/api/admin/clients')->assertUnauthorized();
        $this->getJson('/api/owner/admins')->assertUnauthorized();
    }
}
