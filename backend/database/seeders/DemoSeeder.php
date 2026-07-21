<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\AdminPermission;
use App\Models\Client;
use App\Models\Complaint;
use App\Models\Owner;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Room;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Jeu de données de démonstration pour le développement.
 *
 *   php artisan db:seed --class=DemoSeeder
 *
 * Crée un propriétaire, trois admins aux permissions distinctes, vingt clients,
 * dix chambres et une trentaine de réservations couvrant tout le cycle de vie
 * (impayée, confirmée, acompte, en cours, terminée + avis, annulée + remboursement),
 * avec les paiements, réclamations et avis cohérents. Idempotent sur les comptes
 * nommés (firstOrCreate), additif sur les réservations.
 */
class DemoSeeder extends Seeder
{
    private int $refCounter = 0;

    public function run(): void
    {
        $owner   = $this->seedOwner();
        $this->seedAdmins($owner);
        $clients = $this->seedClients();
        $rooms   = $this->seedRooms();

        $this->seedReservations($clients, $rooms);

        $this->command?->info('DemoSeeder terminé : '
            . Reservation::count() . ' réservations, '
            . Payment::count() . ' paiements, '
            . Review::count() . ' avis, '
            . Complaint::count() . ' réclamations.');
    }

    private function seedOwner(): Owner
    {
        return Owner::firstOrCreate(
            ['email' => 'demo.owner@hotel.local'],
            ['full_name' => 'Propriétaire Démo', 'password' => Hash::make('password')]
        );
    }

    private function seedAdmins(Owner $owner): void
    {
        $profiles = [
            ['Manager', 'Général', 'manager.demo@hotel.local', AdminPermission::KEYS],
            ['Awa', 'Réception', 'reception.demo@hotel.local', [
                'manage_reservations', 'manage_checkin_checkout', 'manage_clients', 'manage_complaints',
            ]],
            ['Koffi', 'Comptable', 'comptable.demo@hotel.local', [
                'manage_payments', 'view_reports', 'view_audit_summary', 'checkin_with_deposit',
            ]],
        ];

        foreach ($profiles as [$first, $last, $email, $permissions]) {
            $admin = Admin::firstOrCreate(
                ['email' => $email],
                [
                    'first_name'           => $first,
                    'last_name'            => $last,
                    'password'             => Hash::make('password'),
                    'role'                 => $last,
                    'is_active'            => true,
                    'must_change_password' => false,
                    'created_by_owner_id'  => $owner->id,
                ]
            );

            foreach ($permissions as $key) {
                AdminPermission::firstOrCreate(['admin_id' => $admin->id, 'permission_key' => $key]);
            }
        }
    }

    /** @return \Illuminate\Support\Collection<int,Client> */
    private function seedClients()
    {
        return Client::factory()
            ->count(20)
            ->state(['provider' => 'local', 'password' => Hash::make('password')])
            ->create();
    }

    /** @return \Illuminate\Support\Collection<int,Room> */
    private function seedRooms()
    {
        $existing = Room::count();
        if ($existing >= 10) {
            return Room::limit(10)->get();
        }

        Room::factory()->count(10 - $existing)->create();

        return Room::limit(10)->get();
    }

    private function seedReservations($clients, $rooms): void
    {
        // [statut, nombre, configurateur de dates, plan, état du paiement]
        $plan = [
            ['pending',     6, fn () => $this->futureDates(),  'full',    'none'],
            ['confirmed',   8, fn () => $this->futureDates(),  'full',    'full'],
            ['confirmed',   4, fn () => $this->futureDates(),  'partial', 'deposit'],
            ['checked_in',  4, fn () => $this->currentDates(), 'full',    'full'],
            ['checked_out', 6, fn () => $this->pastDates(),    'full',    'full'],
            ['cancelled',   2, fn () => $this->futureDates(),  'full',    'refund'],
        ];

        // Intervalles déjà posés par chambre (y compris réservations existantes
        // en base) : le seeder ne crée JAMAIS de conflit d'occupation. Les
        // séjours terminés sont inclus pour un historique de planning cohérent.
        $booked = Reservation::where('status', '!=', 'cancelled')
            ->get(['room_id', 'check_in_date', 'check_out_date'])
            ->groupBy('room_id')
            ->map(fn ($list) => $list->map(fn ($r) => [$r->check_in_date, $r->check_out_date])->all())
            ->all();

        foreach ($plan as [$status, $count, $dates, $paymentPlan, $payState]) {
            for ($i = 0; $i < $count; $i++) {
                $client = $clients->random();

                // Tirage (chambre, dates) rejoué jusqu'à trouver un créneau libre.
                $slot = $this->findFreeSlot($rooms, $dates, $booked, occupies: $status !== 'cancelled');
                if ($slot === null) {
                    continue; // aucun créneau libre après plusieurs essais : on saute
                }
                [$room, $in, $out] = $slot;

                $nights = max(1, (int) $in->diffInDays($out));
                $total  = $nights * (float) $room->price_per_night;

                $reservation = Reservation::factory()->create([
                    'client_id'      => $client->id,
                    'room_id'        => $room->id,
                    'check_in_date'  => $in->toDateString(),
                    'check_out_date' => $out->toDateString(),
                    'status'         => $status,
                    'total_amount'   => $total,
                    'payment_plan'   => $paymentPlan,
                ]);

                $this->attachPayment($reservation, $payState, $total);
                $this->attachExtras($reservation, $status);

                if ($status === 'checked_in') {
                    $room->update(['status' => 'occupied']);
                }
            }
        }
    }

    private function attachPayment(Reservation $reservation, string $payState, float $total): void
    {
        if ($payState === 'none') {
            return;
        }

        $provider = fake()->randomElement(['orange_ci', 'wave_ci', 'cash']);

        if ($payState === 'deposit') {
            $this->makePayment($reservation, round($total / 2, 2), 'deposit', $provider);
            return;
        }

        // full ou refund : paiement intégral réussi
        $this->makePayment($reservation, $total, 'full', $provider);

        if ($payState === 'refund') {
            Refund::create([
                'reservation_id' => $reservation->id,
                'client_id'      => $reservation->client_id,
                'amount'         => $total,
                'status'         => 'pending',
            ]);
        }
    }

    private function makePayment(Reservation $reservation, float $amount, string $type, string $provider): void
    {
        Payment::create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => $provider,
            'phone_number'          => $provider === 'cash' ? null : '0700' . fake()->numerify('######'),
            'amount'                => $amount,
            'currency'              => 'XOF',
            'transaction_reference' => 'DEMO-' . str_pad((string) ++$this->refCounter, 6, '0', STR_PAD_LEFT),
            'status'                => 'success',
            'payment_type'          => $type,
            'confirmed_at'          => now()->subDays(fake()->numberBetween(0, 20)),
            'simulation_mode'       => true,
        ]);
    }

    private function attachExtras(Reservation $reservation, string $status): void
    {
        // Avis sur ~80 % des séjours terminés (commentaires en français)
        if ($status === 'checked_out' && fake()->boolean(80)) {
            $comments = [
                'Séjour très agréable, chambre propre et personnel attentionné.',
                'Excellent accueil, je reviendrai avec plaisir.',
                'Bon rapport qualité-prix, emplacement idéal.',
                'Chambre confortable et calme, petit-déjeuner copieux.',
                'Personnel aux petits soins, rien à redire.',
                'Très bon séjour dans l\'ensemble, literie de qualité.',
                'Cadre reposant et service impeccable.',
                null,
            ];
            Review::create([
                'reservation_id' => $reservation->id,
                'client_id'      => $reservation->client_id,
                'room_id'        => $reservation->room_id,
                'rating'         => fake()->numberBetween(3, 5),
                'comment'        => fake()->randomElement($comments),
            ]);
        }

        // Réclamation ouverte sur ~30 % des séjours en cours (messages en français)
        if ($status === 'checked_in' && fake()->boolean(30)) {
            $messages = [
                'La climatisation de la chambre ne fonctionne pas correctement.',
                'Le Wi-Fi est très lent depuis mon arrivée.',
                'Il manque des serviettes propres dans la salle de bain.',
                'Du bruit provient de la chambre voisine tard le soir.',
                'L\'eau chaude met beaucoup de temps à arriver.',
                'La télévision de la chambre ne s\'allume pas.',
            ];
            Complaint::create([
                'reservation_id' => $reservation->id,
                'client_id'      => $reservation->client_id,
                'category'       => fake()->randomElement(array_keys(Complaint::CATEGORIES)),
                'message'        => fake()->randomElement($messages),
                'status'         => 'open',
            ]);
        }
    }

    /**
     * Tire une chambre et des dates jusqu'à trouver un créneau sans
     * chevauchement (sémantique demi-ouverte, comme ReservationService).
     * Les créneaux retenus sont mémorisés dans $booked.
     *
     * @return array{0: Room, 1: \Carbon\Carbon, 2: \Carbon\Carbon}|null
     */
    private function findFreeSlot($rooms, callable $dates, array &$booked, bool $occupies): ?array
    {
        for ($attempt = 0; $attempt < 40; $attempt++) {
            $room = $rooms->random();
            [$in, $out] = $dates();

            $overlaps = collect($booked[$room->id] ?? [])->contains(
                fn ($period) => $period[0]->lt($out) && $period[1]->gt($in)
            );

            if ($overlaps) {
                continue;
            }

            if ($occupies) {
                $booked[$room->id][] = [$in, $out];
            }

            return [$room, $in, $out];
        }

        return null;
    }

    /** Dates passées (séjour terminé). */
    private function pastDates(): array
    {
        $in  = now()->subDays(fake()->numberBetween(10, 40))->startOfDay();
        $out = (clone $in)->addDays(fake()->numberBetween(1, 5));
        return [$in, $out];
    }

    /** Dates encadrant aujourd'hui (séjour en cours). */
    private function currentDates(): array
    {
        $in  = now()->subDays(fake()->numberBetween(1, 3))->startOfDay();
        $out = now()->addDays(fake()->numberBetween(1, 3))->startOfDay();
        return [$in, $out];
    }

    /** Dates futures (réservation à venir). */
    private function futureDates(): array
    {
        $in  = now()->addDays(fake()->numberBetween(3, 40))->startOfDay();
        $out = (clone $in)->addDays(fake()->numberBetween(1, 6));
        return [$in, $out];
    }
}
