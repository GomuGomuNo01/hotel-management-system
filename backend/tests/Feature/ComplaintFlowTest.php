<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Complaint;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ComplaintFlowTest extends TestCase
{
    use RefreshDatabase;

    // ── Création (client) ───────────────────────────────────────

    public function test_client_can_file_a_complaint_during_their_stay(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->checkedIn()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/complaints", [
            'category' => 'noise',
            'message'  => 'Bruit excessif dans le couloir toute la nuit.',
        ])->assertCreated();

        $this->assertDatabaseHas('complaints', [
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'category'       => 'noise',
            'status'         => 'open',
        ]);
    }

    public function test_client_cannot_file_a_complaint_before_check_in(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->confirmed()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/complaints", [
            'category' => 'amenities',
            'message'  => 'Problème signalé avant le séjour.',
        ])->assertStatus(422);

        $this->assertDatabaseCount('complaints', 0);
    }

    public function test_client_cannot_open_two_complaints_on_the_same_reservation(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->checkedIn()->create(['client_id' => $client->id]);
        Complaint::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'status'         => 'open',
        ]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/complaints", [
            'category' => 'staff_service',
            'message'  => 'Deuxième réclamation tentée.',
        ])->assertStatus(422);

        $this->assertDatabaseCount('complaints', 1);
    }

    public function test_other_category_requires_a_custom_subject(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->checkedIn()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/complaints", [
            'category' => 'other',
            'message'  => 'Un souci non catégorisé à signaler.',
        ])->assertStatus(422);
    }

    // ── Annulation (client) ─────────────────────────────────────

    public function test_client_can_cancel_their_own_open_complaint(): void
    {
        $client    = Client::factory()->create();
        $complaint = Complaint::factory()->create(['client_id' => $client->id, 'status' => 'open']);

        Sanctum::actingAs($client);

        $this->deleteJson("/api/complaints/{$complaint->id}")->assertOk();

        $this->assertDatabaseMissing('complaints', ['id' => $complaint->id]);
    }

    public function test_client_cannot_cancel_a_handled_complaint(): void
    {
        $client    = Client::factory()->create();
        $complaint = Complaint::factory()->handled()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->deleteJson("/api/complaints/{$complaint->id}")->assertStatus(422);

        $this->assertDatabaseHas('complaints', ['id' => $complaint->id]);
    }

    // ── Traitement (admin) ──────────────────────────────────────

    public function test_admin_with_permission_can_handle_a_complaint(): void
    {
        Notification::fake();

        $admin = Admin::factory()->create();
        AdminPermission::create([
            'admin_id'       => $admin->id,
            'permission_key' => 'manage_complaints',
        ]);
        $complaint = Complaint::factory()->create(['status' => 'open']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/complaints/{$complaint->id}/handle", [
            'response' => 'Nous avons traité votre demande, toutes nos excuses.',
        ])->assertOk();

        $this->assertDatabaseHas('complaints', [
            'id'       => $complaint->id,
            'status'   => 'handled',
            'admin_id' => $admin->id,
        ]);
    }

    public function test_admin_without_permission_cannot_handle_a_complaint(): void
    {
        $admin     = Admin::factory()->create();
        $complaint = Complaint::factory()->create(['status' => 'open']);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/complaints/{$complaint->id}/handle", [
            'response' => 'Tentative non autorisée.',
        ])->assertForbidden();

        $this->assertDatabaseHas('complaints', ['id' => $complaint->id, 'status' => 'open']);
    }

    public function test_handling_an_already_handled_complaint_is_rejected(): void
    {
        Notification::fake();

        $admin = Admin::factory()->create();
        AdminPermission::create([
            'admin_id'       => $admin->id,
            'permission_key' => 'manage_complaints',
        ]);
        $complaint = Complaint::factory()->handled()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/complaints/{$complaint->id}/handle", [
            'response' => 'Deuxième traitement.',
        ])->assertStatus(422);
    }
}
