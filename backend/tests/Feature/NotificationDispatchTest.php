<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Complaint;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Notifications\ComplaintHandledNotification;
use App\Notifications\InvoiceAvailableNotification;
use App\Notifications\RefundInitiatedNotification;
use App\Notifications\RefundProcessedNotification;
use App\Notifications\ReviewSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Vérifie que les actions métier déclenchent bien la notification interne au
 * bon destinataire (le client concerné). Couvre le câblage notification —
 * jusqu'ici non testé.
 */
class NotificationDispatchTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(string $permission): Admin
    {
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $permission]);
        return $admin;
    }

    private function fullyPaid(Reservation $reservation): void
    {
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => $reservation->total_amount,
            'status'         => 'success',
        ]);
    }

    public function test_approving_a_refund_notifies_the_client(): void
    {
        Notification::fake();

        $client = Client::factory()->create();
        $refund = Refund::factory()->create(['client_id' => $client->id, 'status' => 'pending']);

        Sanctum::actingAs($this->adminWith('manage_payments'));

        $this->postJson("/api/admin/refunds/{$refund->id}/approve", ['notes' => 'OK'])->assertOk();

        Notification::assertSentTo($client, RefundProcessedNotification::class);
    }

    public function test_handling_a_complaint_notifies_the_client(): void
    {
        Notification::fake();

        $client    = Client::factory()->create();
        $complaint = Complaint::factory()->create(['client_id' => $client->id, 'status' => 'open']);

        Sanctum::actingAs($this->adminWith('manage_complaints'));

        $this->postJson("/api/admin/complaints/{$complaint->id}/handle", ['response' => 'Traité.'])->assertOk();

        Notification::assertSentTo($client, ComplaintHandledNotification::class);
    }

    public function test_submitting_a_review_notifies_the_author(): void
    {
        Notification::fake();

        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id' => $client->id,
            'status'    => 'checked_out',
        ]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/review", [
            'rating'  => 5,
            'comment' => 'Parfait.',
        ])->assertCreated();

        Notification::assertSentTo($client, ReviewSubmittedNotification::class);
    }

    public function test_checkout_notifies_the_client_that_the_invoice_is_available(): void
    {
        Notification::fake();

        $room        = Room::factory()->create(['status' => 'occupied']);
        $reservation = Reservation::factory()->checkedIn()->create([
            'room_id'      => $room->id,
            'total_amount' => 80000,
        ]);
        $this->fullyPaid($reservation);

        Sanctum::actingAs($this->adminWith('manage_checkin_checkout'));

        $this->postJson("/api/admin/checkout/{$reservation->id}")->assertOk();

        Notification::assertSentTo($reservation->client, InvoiceAvailableNotification::class);
    }

    public function test_cancelling_a_paid_reservation_notifies_the_client_of_the_refund(): void
    {
        Notification::fake();

        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->confirmed()->create([
            'client_id'  => $client->id,
            'total_amount' => 60000,
            'created_at' => now(), // dans la fenêtre d'annulation de 24 h
        ]);
        $this->fullyPaid($reservation);

        Sanctum::actingAs($client);

        $this->deleteJson("/api/reservations/{$reservation->id}")->assertOk();

        // Un remboursement est créé et le client en est notifié.
        $this->assertDatabaseHas('refunds', ['reservation_id' => $reservation->id, 'status' => 'pending']);
        Notification::assertSentTo($client, RefundInitiatedNotification::class);
    }
}
