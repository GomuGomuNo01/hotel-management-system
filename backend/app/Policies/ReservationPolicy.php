<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Reservation;

class ReservationPolicy
{
    /**
     * Owners bypass every check.
     * Admins are short-circuited here too so that the Client-typed methods
     * below are never called with an Admin user (avoids TypeError).
     */
    public function before($user, string $ability): ?bool
    {
        if ($user instanceof Owner) {
            return true;
        }

        if ($user instanceof Admin) {
            return match ($ability) {
                'viewAny', 'view'     => $user->hasPermission('manage_reservations'),
                'update', 'cancel'    => $user->hasPermission('manage_reservations'),
                'checkIn', 'checkOut' => $user->hasPermission('manage_checkin_checkout'),
                default               => false,
            };
        }

        return null; // delegate to Client-typed methods below
    }

    /* ── Client-side checks ─────────────────────────────────── */

    public function viewAny(Client $client): bool
    {
        return true; // a client can list their own reservations
    }

    public function view(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id;
    }

    public function update(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id
            && $reservation->status === 'pending';
    }

    public function cancel(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id
            && ! in_array($reservation->status, ['checked_in', 'checked_out']);
    }

    public function delete(Client $client, Reservation $reservation): bool
    {
        return $this->cancel($client, $reservation);
    }
}
