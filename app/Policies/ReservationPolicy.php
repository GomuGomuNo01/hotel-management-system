<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\Reservation;

class ReservationPolicy
{
    public function view(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id;
    }

    public function update(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id
            && $reservation->status === 'pending';
    }

    public function delete(Client $client, Reservation $reservation): bool
    {
        return $reservation->client_id === $client->id
            && ! in_array($reservation->status, ['checked_in', 'checked_out']);
    }
}
