<?php

namespace App\Services;

use App\Events\ReservationConfirmed;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReservationService
{
    public function checkAvailability(int $roomId, string $checkIn, string $checkOut, ?int $excludeReservationId = null): bool
    {
        $query = Reservation::where('room_id', $roomId)
            ->whereIn('status', ['confirmed', 'checked_in'])
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

        DB::transaction(function () use ($reservation) {
            if ($reservation->status === 'reserved' || $reservation->status === 'pending') {
                $reservation->room->update(['status' => 'available']);
            }
            $reservation->update(['status' => 'cancelled']);
        });

        return $reservation->fresh();
    }

    public function confirmReservation(Reservation $reservation): Reservation
    {
        $reservation->update(['status' => 'confirmed']);

        event(new ReservationConfirmed($reservation));

        return $reservation->fresh();
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
