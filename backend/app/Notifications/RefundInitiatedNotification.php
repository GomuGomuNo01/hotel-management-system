<?php

namespace App\Notifications;

use App\Models\Refund;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - une demande de remboursement
 * a été ouverte et est en cours de traitement.
 */
class RefundInitiatedNotification extends Notification
{
    public function __construct(public Refund $refund) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        $amount = number_format((float) $this->refund->amount, 0, ',', ' ');

        return [
            'category'       => 'refund',
            'title'          => 'Remboursement en cours de traitement',
            'message'        => "Votre demande de remboursement de {$amount} FCFA "
                . "(réservation n°{$this->refund->reservation_id}) est en cours de traitement.",
            'reservation_id' => $this->refund->reservation_id,
            'refund_id'      => $this->refund->id,
            'status'         => 'pending',
            'action'         => ['type' => 'refunds'],
        ];
    }
}
