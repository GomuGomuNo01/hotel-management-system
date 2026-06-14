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
    public function checkAvailability(int $roomId, string $checkIn, string $checkOut, ?int $excludeReservationId = null): bool
    {
        $query = Reservation::where('room_id', $roomId)
            ->whereIn('status', ['pending', 'confirmed', 'checked_in'])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->whereBetween('check_in_date', [$checkIn, $checkOut])
                  ->orWhereBetween('check_out_date', [$checkIn, $checkOut])
                  ->orWhere(function ($inner) use ($checkIn, $checkOut) {
                      $inner->where('check_in_date', '<=', $checkIn)
                            ->where('check_out_date', '>=', $checkOut);
                  });
            });

        if ($excludeReservationId) {
            $query->where('id', '!=', $excludeReservationId);
        }

        return $query->doesntExist();
    }

    public function calculateTotal(Room $room, string $checkIn, string $checkOut): float
    {
        $nights = Carbon::parse($checkIn)->diffInDays(Carbon::parse($checkOut));
        return round($nights * $room->price_per_night, 2);
    }

    public function createReservation(Client $client, array $data): Reservation
    {
        $room = Room::findOrFail($data['room_id']);

        if (! $this->checkAvailability($room->id, $data['check_in_date'], $data['check_out_date'])) {
            throw new \RuntimeException('La chambre est déjà réservée sur cette période.');
        }

        $total = $this->calculateTotal($room, $data['check_in_date'], $data['check_out_date']);

        $reservation = DB::transaction(function () use ($client, $room, $data, $total) {
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
