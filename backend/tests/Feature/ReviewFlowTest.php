<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_review_a_checked_out_reservation(): void
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
            'comment' => 'Séjour excellent.',
        ])->assertCreated();

        $this->assertDatabaseHas('reviews', [
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'rating'         => 5,
        ]);
    }

    public function test_reviews_of_deleted_clients_are_hidden(): void
    {
        $active  = Client::factory()->create();
        $deleted = Client::factory()->create();

        $resA = Reservation::factory()->create(['client_id' => $active->id, 'status' => 'checked_out']);
        $resD = Reservation::factory()->create(['client_id' => $deleted->id, 'status' => 'checked_out']);

        Review::create(['reservation_id' => $resA->id, 'client_id' => $active->id, 'room_id' => $resA->room_id, 'rating' => 5, 'comment' => 'Super séjour.']);
        Review::create(['reservation_id' => $resD->id, 'client_id' => $deleted->id, 'room_id' => $resD->room_id, 'rating' => 5, 'comment' => 'Avis fantôme.']);

        $deleted->delete(); // RGPD : le client est anonymisé puis soft-delete

        // Admin / owner : liste + stats n'incluent que l'avis du client actif.
        $admin = Admin::factory()->create();
        AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => 'view_reviews']);
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/reviews')->assertOk();
        $this->assertCount(1, $res->json('data.reviews.data'));
        $this->assertSame(1, $res->json('data.stats.total'));

        // Public : aucun avis affiché pour la chambre du client supprimé.
        $this->getJson("/api/rooms/{$resA->room_id}/reviews")->assertOk()->assertJsonPath('stats.total', 1);
        $this->getJson("/api/rooms/{$resD->room_id}/reviews")->assertOk()->assertJsonPath('stats.total', 0);
    }

    public function test_client_cannot_review_a_reservation_that_is_not_checked_out(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->checkedIn()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/review", [
            'rating' => 4,
        ])->assertNotFound();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_client_cannot_review_the_same_reservation_twice(): void
    {
        Notification::fake();

        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id' => $client->id,
            'status'    => 'checked_out',
        ]);
        Review::create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'room_id'        => $reservation->room_id,
            'rating'         => 4,
        ]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/review", [
            'rating' => 5,
        ])->assertStatus(422);

        $this->assertDatabaseCount('reviews', 1);
    }

    public function test_client_cannot_review_another_clients_reservation(): void
    {
        $owner       = Client::factory()->create();
        $intruder    = Client::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id' => $owner->id,
            'status'    => 'checked_out',
        ]);

        Sanctum::actingAs($intruder);

        $this->postJson("/api/reservations/{$reservation->id}/review", [
            'rating' => 1,
        ])->assertNotFound();

        $this->assertDatabaseCount('reviews', 0);
    }

    public function test_rating_must_be_between_1_and_5(): void
    {
        $client      = Client::factory()->create();
        $reservation = Reservation::factory()->create([
            'client_id' => $client->id,
            'status'    => 'checked_out',
        ]);

        Sanctum::actingAs($client);

        $this->postJson("/api/reservations/{$reservation->id}/review", [
            'rating' => 6,
        ])->assertStatus(422);
    }

    public function test_reviewable_list_only_returns_unreviewed_checked_out_reservations(): void
    {
        Notification::fake();

        $client = Client::factory()->create();
        // Éligible : terminée, sans avis
        $eligible = Reservation::factory()->create(['client_id' => $client->id, 'status' => 'checked_out']);
        // Non éligible : terminée mais déjà notée
        $reviewed = Reservation::factory()->create(['client_id' => $client->id, 'status' => 'checked_out']);
        Review::create([
            'reservation_id' => $reviewed->id,
            'client_id'      => $client->id,
            'room_id'        => $reviewed->room_id,
            'rating'         => 5,
        ]);
        // Non éligible : pas encore terminée
        Reservation::factory()->checkedIn()->create(['client_id' => $client->id]);

        Sanctum::actingAs($client);

        $this->getJson('/api/reviews/reviewable')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['id' => $eligible->id]);
    }
}
