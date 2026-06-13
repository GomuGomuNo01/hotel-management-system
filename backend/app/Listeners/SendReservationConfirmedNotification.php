<?php

namespace App\Listeners;

use App\Events\ReservationConfirmed;
use App\Notifications\ReservationConfirmedNotification;

/**
 * À la confirmation d'une réservation, dépose une notification interne
 * dans l'espace du client (plus d'e-mail métier).
 */
class SendReservationConfirmedNotification
{
    public function handle(ReservationConfirmed $event): void
    {
        $reservation = $event->reservation->load(['client', 'room']);

        $reservation->client?->notify(new ReservationConfirmedNotification($reservation));
    }
}
