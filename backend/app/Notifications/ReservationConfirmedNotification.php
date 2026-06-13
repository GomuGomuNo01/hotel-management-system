<?php

namespace App\Notifications;

use App\Models\Reservation;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - la réservation est confirmée.
 * Remplace l'ancien e-mail métier : tout est désormais consultable dans
 * l'espace personnel du client.
 */
class ReservationConfirmedNotification extends Notification
{
    public function __construct(public Reservation $reservation) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        $room = $this->reservation->room;

        return [
            'category'       => 'reservation',
            'title'          => 'Réservation confirmée',
            'message'        => "Votre réservation n°{$this->reservation->id}"
                . ($room ? " (chambre {$room->room_number})" : '')
                . ' est confirmée. Votre reçu est disponible.',
            'reservation_id' => $this->reservation->id,
            'refund_id'      => null,
            'action'         => ['type' => 'receipt', 'reservation_id' => $this->reservation->id],
        ];
    }
}
