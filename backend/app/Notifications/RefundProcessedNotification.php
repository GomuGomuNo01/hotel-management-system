<?php

namespace App\Notifications;

use App\Models\Refund;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - une demande de remboursement
 * a été traitée (approuvée ou refusée).
 */
class RefundProcessedNotification extends Notification
{
    public function __construct(public Refund $refund) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        $amount    = number_format((float) $this->refund->amount, 0, ',', ' ');
        $approved  = $this->refund->status === 'approved';

        return [
            'category'       => 'refund',
            'title'          => $approved ? 'Remboursement effectué' : 'Remboursement refusé',
            'message'        => $approved
                ? "Votre remboursement de {$amount} FCFA (réservation n°{$this->refund->reservation_id}) a été effectué."
                : "Votre demande de remboursement (réservation n°{$this->refund->reservation_id}) a été refusée."
                    . ($this->refund->admin_notes ? " Motif : {$this->refund->admin_notes}" : ''),
            'reservation_id' => $this->refund->reservation_id,
            'refund_id'      => $this->refund->id,
            'status'         => $this->refund->status,
            'action'         => ['type' => 'refunds'],
        ];
    }
}
