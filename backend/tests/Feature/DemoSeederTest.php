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
        $this->assertSame(30, Reservation::count());

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
