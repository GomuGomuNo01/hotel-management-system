<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_produces_a_coherent_dataset(): void
    {
        $this->seed(DemoSeeder::class);

        $this->assertSame(3, Admin::count());
        $this->assertSame(20, Client::count());
        $this->assertSame(10, Room::count());
        // Le tirage anti-conflit peut sauter un créneau introuvable : on tolère
        // une petite marge sous les 30 réservations planifiées.
        $this->assertGreaterThanOrEqual(25, Reservation::count());
        $this->assertLessThanOrEqual(30, Reservation::count());

        // Invariant métier : aucune paire de réservations actives ne se
        // chevauche sur une même chambre (conflit d'occupation impossible).
        $active = Reservation::where('status', '!=', 'cancelled')
            ->get(['id', 'room_id', 'check_in_date', 'check_out_date'])
            ->groupBy('room_id');

        foreach ($active as $roomId => $list) {
            $sorted = $list->sortBy('check_in_date')->values();
            for ($i = 1; $i < $sorted->count(); $i++) {
                $this->assertTrue(
                    $sorted[$i]->check_in_date->gte($sorted[$i - 1]->check_out_date),
                    "Conflit d'occupation généré par le seeder sur la chambre #{$roomId} "
                    . "(réservations #{$sorted[$i - 1]->id} et #{$sorted[$i]->id})."
                );
            }
        }

        // Le cycle de vie complet est représenté.
        foreach (['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as $status) {
            $this->assertTrue(
                Reservation::where('status', $status)->exists(),
                "Statut manquant dans le jeu de démo : {$status}"
            );
        }

        // Chaque réservation confirmée/terminée porte au moins un paiement réussi.
        $unpaidConfirmed = Reservation::whereIn('status', ['confirmed', 'checked_in', 'checked_out'])
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'success'))
            ->count();
        $this->assertSame(0, $unpaidConfirmed, 'Une réservation confirmée sans paiement réussi a été générée.');

        // Les annulations génèrent une demande de remboursement.
        $this->assertDatabaseHas('refunds', ['status' => 'pending']);
    }
}
