<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    private function adminWith(array $permissions): Admin
    {
        $admin = Admin::factory()->create();
        foreach ($permissions as $key) {
            AdminPermission::create(['admin_id' => $admin->id, 'permission_key' => $key]);
        }
        return $admin;
    }

    public function test_admin_cash_payment_settles_a_confirmed_reservation(): void
    {
        $admin = $this->adminWith(['manage_reservations']);
        $reservation = Reservation::factory()->confirmed()->create(['total_amount' => 100000]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/reservations/{$reservation->id}/cash-payment")
            ->assertOk()
            ->assertJsonPath('data.is_fully_paid', true)
            ->assertJsonPath('data.remaining_amount', 0);

        $this->assertDatabaseHas('payments', [
            'reservation_id' => $reservation->id,
            'provider'       => 'cash',
            'status'         => 'success',
            'amount'         => 100000,
        ]);
    }

    public function test_deposit_balance_settlement_is_blocked_before_arrival_date(): void
    {
        $admin = $this->adminWith(['manage_reservations', 'manage_payments']);
        // Plan en 2 fois, acompte déjà versé, arrivée dans 3 jours.
        $reservation = Reservation::factory()->confirmed()->partial()->create([
            'total_amount'   => 100000,
            'check_in_date'  => now()->addDays(3)->toDateString(),
            'check_out_date' => now()->addDays(5)->toDateString(),
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 50000,
            'payment_type'   => 'deposit',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/reservations/{$reservation->id}/cash-payment")
            ->assertStatus(422);

        // Aucun règlement de solde enregistré.
        $this->assertDatabaseMissing('payments', [
            'reservation_id' => $reservation->id,
            'payment_type'   => 'balance',
        ]);
    }

    public function test_deposit_balance_settlement_is_allowed_from_arrival_date(): void
    {
        $admin = $this->adminWith(['manage_reservations', 'manage_payments']);
        // Arrivée aujourd'hui : le règlement du solde est autorisé.
        $reservation = Reservation::factory()->confirmed()->partial()->create([
            'total_amount'   => 100000,
            'check_in_date'  => now()->toDateString(),
            'check_out_date' => now()->addDays(2)->toDateString(),
        ]);
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $reservation->client_id,
            'amount'         => 50000,
            'payment_type'   => 'deposit',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/reservations/{$reservation->id}/cash-payment")
            ->assertOk()
            ->assertJsonPath('data.is_fully_paid', true);
    }

    public function test_paid_and_remaining_amounts_are_consistent(): void
    {
        $client = Client::factory()->create();
        $room   = Room::factory()->create();
        $reservation = Reservation::factory()->confirmed()->create([
            'client_id'    => $client->id,
            'room_id'      => $room->id,
            'total_amount' => 100000,
        ]);
        // Acompte de 40 000 déjà réglé
        Payment::factory()->create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'amount'         => 40000,
            'payment_type'   => 'deposit',
        ]);

        Sanctum::actingAs($client);

        $this->getJson("/api/reservations/{$reservation->id}")
            ->assertOk()
            ->assertJsonPath('data.paid_amount', 40000)
            ->assertJsonPath('data.remaining_amount', 60000)
            ->assertJsonPath('data.is_fully_paid', false);
    }
}
