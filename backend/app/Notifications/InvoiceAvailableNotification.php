<?php

namespace App\Notifications;

use App\Models\Reservation;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - la facture de séjour est disponible
 * à l'issue du check-out. Remplace l'ancien e-mail avec PDF attaché : la facture
 * est désormais téléchargeable depuis l'espace personnel.
 */
class InvoiceAvailableNotification extends Notification
{
    public function __construct(public Reservation $reservation) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'category'       => 'invoice',
            'title'          => 'Nouvelle facture disponible',
            'message'        => "La facture de votre séjour (réservation n°{$this->reservation->id}) "
                . 'est disponible. Vous pouvez la télécharger depuis vos documents.',
            'reservation_id' => $this->reservation->id,
            'refund_id'      => null,
            'action'         => ['type' => 'invoice', 'reservation_id' => $this->reservation->id],
        ];
    }
}
