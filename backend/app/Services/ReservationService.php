<?php

namespace App\Services;

use App\Events\HotelBroadcast;
use App\Events\ReservationConfirmed;
use App\Models\Client;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Notifications\InvoiceAvailableNotification;
use App\Notifications\RefundInitiatedNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReservationService
{
    /** Statuts qui occupent réellement la chambre sur leur période. */
    public const OCCUPYING_STATUSES = ['pending', 'confirmed', 'checked_in'];

    /**
     * Une chambre est libre sur [checkIn, checkOut) si aucune réservation
     * occupante ne chevauche l'intervalle. Sémantique demi-ouverte : le jour
     * du départ est libéré, un check-in le jour d'un check-out est permis.
     *
     * NB : pour une garantie absolue (deux requêtes simultanées), appeler
     * cette méthode dans une transaction après avoir verrouillé la chambre
     * (cf. createReservation / rescheduleReservation).
     */
    public function checkAvailability(int $roomId, string $checkIn, string $checkOut, ?int $excludeReservationId = null): bool
    {
        // whereDate : normalise la comparaison quel que soit le format stocké
        // (DATE MySQL vs datetime SQLite) — même approche que PlanningController.
        $query = Reservation::where('room_id', $roomId)
            ->whereIn('status', self::OCCUPYING_STATUSES)
            ->whereDate('check_in_date', '<', $checkOut)
            ->whereDate('check_out_date', '>', $checkIn);

        if ($excludeReservationId) {
            $query->where('id', '!=', $excludeReservationId);
        }

        return $query->doesntExist();
    }

    /**
     * Verrouille la chambre (FOR UPDATE) et vérifie qu'elle est réservable :
     * ni en maintenance / hors service, ni déjà occupée sur la période.
     * À appeler UNIQUEMENT dans une transaction : le verrou sérialise les
     * demandes concurrentes et rend le conflit d'occupation impossible.
     *
     * @throws \RuntimeException si la chambre n'est pas réservable
     */
    private function lockAndAssertBookable(int $roomId, string $checkIn, string $checkOut, ?int $excludeReservationId = null): Room
    {
        $room = Room::whereKey($roomId)->lockForUpdate()->firstOrFail();

        if ($room->status === 'maintenance' || $room->housekeeping_status === 'out_of_service') {
            throw new \RuntimeException('Cette chambre est actuellement indisponible (maintenance).');
        }

        if (! $this->checkAvailability($room->id, $checkIn, $checkOut, $excludeReservationId)) {
            throw new \RuntimeException('La chambre est déjà réservée sur cette période.');
        }

        return $room;
    }

    public function calculateTotal(Room $room, string $checkIn, string $checkOut): float
    {
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));
        return round($nights * $room->price_per_night, 2);
    }

    public function createReservation(Client $client, array $data): Reservation
    {
        $reservation = DB::transaction(function () use ($client, $data) {
            // Verrou + contrôle de disponibilité DANS la transaction :
            // deux créations simultanées ne peuvent plus passer toutes les deux.
            $room = $this->lockAndAssertBookable($data['room_id'], $data['check_in_date'], $data['check_out_date']);

            $total = $this->calculateTotal($room, $data['check_in_date'], $data['check_out_date']);

            $res = Reservation::create([
                'client_id'      => $client->id,
                'room_id'        => $room->id,
                'check_in_date'  => $data['check_in_date'],
                'check_out_date' => $data['check_out_date'],
                'status'         => 'pending',
                'total_amount'   => $total,
                'notes'          => $data['notes'] ?? null,
                'payment_plan'   => $data['payment_plan'] ?? 'full',
            ]);

            $room->update(['status' => 'reserved']);

            return $res;
        });

        return $reservation->load(['room', 'client']);
    }

    /**
     * Modifie les dates (et champs annexes) d'une réservation en garantissant
     * l'absence de chevauchement, avec le même verrou que la création.
     */
    public function rescheduleReservation(Reservation $reservation, array $data): Reservation
    {
        return DB::transaction(function () use ($reservation, $data) {
            $checkIn  = $data['check_in_date']  ?? $reservation->check_in_date->toDateString();
            $checkOut = $data['check_out_date'] ?? $reservation->check_out_date->toDateString();

            $room = $this->lockAndAssertBookable($reservation->room_id, $checkIn, $checkOut, $reservation->id);

            $data['total_amount'] = $this->calculateTotal($room, $checkIn, $checkOut);

            $reservation->update($data);

            return $reservation->fresh();
        });
    }

    public function cancelReservation(Reservation $reservation): Reservation
    {
        if (in_array($reservation->status, ['checked_in', 'checked_out'])) {
            throw new \RuntimeException('Impossible d\'annuler une réservation déjà en cours ou terminée.');
        }

        // Charger les paiements et le client si nécessaire pour le calcul et l'e-mail
        if (! $reservation->relationLoaded('payments')) {
            $reservation->load(['payments', 'client', 'room']);
        }

        $paidAmount = $reservation->paidAmount();

        $refund = DB::transaction(function () use ($reservation, $paidAmount) {
            if (in_array($reservation->status, ['pending', 'confirmed'])) {
                $reservation->room->update(['status' => 'available']);
            }
            $reservation->update(['status' => 'cancelled']);

            // Créer une demande de remboursement si un paiement a déjà été effectué
            if ($paidAmount > 0) {
                return Refund::create([
                    'reservation_id' => $reservation->id,
                    'client_id'      => $reservation->client_id,
                    'amount'         => $paidAmount,
                    'status'         => 'pending',
                ]);
            }

            return null;
        });

        // Notifier le client dans son espace si un remboursement a été initié
        if ($refund !== null) {
            $reservation->load(['client', 'room']);
            $reservation->client?->notify(new RefundInitiatedNotification($refund));

            // Diffusion temps-réel - notifie les admins de la nouvelle demande de remboursement
            HotelBroadcast::dispatch('refund.requested', [
                'refundId'      => $refund->id,
                'reservationId' => $reservation->id,
                'clientId'      => $reservation->client_id,
            ]);
        }

        return $reservation->fresh();
    }

    /**
     * Confirme la réservation et déclenche l'événement - idempotent.
     * Appelé uniquement par le flux de paiement (webhook/simulation/cash).
     * La confirmation manuelle par l'admin n'est pas autorisée.
     */
    public function confirmReservation(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'confirmed') {
            $reservation->update(['status' => 'confirmed']);
            event(new ReservationConfirmed($reservation));
        }

        return $reservation->fresh();
    }

    /**
     * Confirme la réservation suite à un paiement réussi - idempotent.
     * Si déjà confirmée (ex. : paiement du solde après acompte), ne refait rien.
     *
     * @return bool true si CE paiement a confirmé la réservation (transition
     *              pending -> confirmed), false si elle l'était déjà.
     */
    public function confirmReservationIfNeeded(Reservation $reservation): bool
    {
        if ($reservation->status === 'pending') {
            $reservation->update(['status' => 'confirmed']);
            event(new ReservationConfirmed($reservation->fresh()));
            return true;
        }

        return false;
    }

    public function checkIn(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'confirmed') {
            throw new \RuntimeException('Le check-in ne peut être effectué que pour une réservation confirmée.');
        }

        // L'arrivée ne peut pas être enregistrée avant la date d'arrivée prévue
        // (une arrivée tardive reste possible : on ne bloque que l'anticipation).
        if (Carbon::today()->startOfDay()->lt($reservation->check_in_date->copy()->startOfDay())) {
            $date = $reservation->check_in_date->format('d/m/Y');
            throw new \RuntimeException(
                "L'arrivée ne peut pas être enregistrée avant la date prévue ({$date})."
            );
        }

        // Règle hôtelière : aucun client n'entre dans une chambre non préparée.
        // La chambre doit être « propre » (nettoyée après le départ précédent)
        // avant d'enregistrer une nouvelle arrivée.
        if (($reservation->room->housekeeping_status ?? 'clean') !== 'clean') {
            $label = $reservation->room->housekeepingLabel();
            throw new \RuntimeException(
                "La chambre n°{$reservation->room->room_number} n'est pas prête (état ménage : {$label}). ".
                'Elle doit être nettoyée avant d\'enregistrer l\'arrivée (module Ménage).'
            );
        }

        // Bloquer si un solde d'acompte est en attente - doit être soldé avant le check-in.
        if (! $reservation->isFullyPaid()) {
            $remaining = number_format($reservation->remainingAmount(), 0, ',', ' ');
            throw new \RuntimeException(
                "Le check-in est bloqué : un solde de {$remaining} FCFA reste dû. ".
                'Veuillez enregistrer le règlement du solde avant de procéder.'
            );
        }

        DB::transaction(function () use ($reservation) {
            $reservation->update(['status' => 'checked_in']);
            $reservation->room->update(['status' => 'occupied']);
        });

        return $reservation->fresh();
    }

    public function checkOut(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'checked_in') {
            throw new \RuntimeException('Le check-out ne peut être effectué que pour une réservation en cours.');
        }

        // Bloquer si un solde d'acompte est toujours en attente.
        if (! $reservation->isFullyPaid()) {
            $remaining = number_format($reservation->remainingAmount(), 0, ',', ' ');
            throw new \RuntimeException(
                "Le check-out est bloqué : un solde de {$remaining} FCFA reste dû. ".
                'Veuillez enregistrer le règlement du solde avant de procéder.'
            );
        }

        DB::transaction(function () use ($reservation) {
            $reservation->update(['status' => 'checked_out']);
            // La chambre redevient commercialisable mais doit être nettoyée avant
            // la prochaine arrivée : on la marque « sale » pour le housekeeping.
            $reservation->room->update([
                'status'              => 'available',
                'housekeeping_status' => 'dirty',
            ]);
        });

        // Notifier le client que sa facture de séjour est disponible dans son espace
        $fresh = $reservation->fresh()->load([
            'client',
            'room',
            'payments' => fn ($q) => $q->where('status', 'success')->orderBy('confirmed_at'),
        ]);

        $fresh->client?->notify(new InvoiceAvailableNotification($fresh));

        return $fresh;
    }
}
