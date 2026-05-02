<?php

namespace App\Services;

use App\Events\ReservationConfirmed;
use App\Mail\RefundInitiatedMail;
use App\Models\Client;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

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

        // Envoyer l'e-mail au client si un remboursement a été initié
        if ($refund !== null) {
            $reservation->load(['client', 'room']);
            Mail::to($reservation->client->email)
                ->send(new RefundInitiatedMail($reservation, $refund));
        }

        return $reservation->fresh();
    }

    /**
     * Confirme la réservation et déclenche l'événement — idempotent.
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
     * Confirme la réservation suite à un paiement réussi — idempotent.
     * Si déjà confirmée (ex. : paiement du solde après acompte), ne refait rien.
     */
    public function confirmReservationIfNeeded(Reservation $reservation): void
    {
        if ($reservation->status === 'pending') {
            $reservation->update(['status' => 'confirmed']);
            event(new ReservationConfirmed($reservation->fresh()));
        }
    }

    public function checkIn(Reservation $reservation): Reservation
    {
        if ($reservation->status !== 'confirmed') {
            throw new \RuntimeException('Le check-in ne peut être effectué que pour une réservation confirmée.');
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

        DB::transaction(function () use ($reservation) {
            $reservation->update(['status' => 'checked_out']);
            $reservation->room->update(['status' => 'available']);
        });

        return $reservation->fresh();
    }
}
