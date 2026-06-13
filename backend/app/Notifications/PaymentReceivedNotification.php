<?php

namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Notifications\Notification;

/**
 * Notification interne (canal database) - un paiement a été reçu.
 */
class PaymentReceivedNotification extends Notification
{
    public function __construct(public Payment $payment) {}

    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    public function toArray(mixed $notifiable): array
    {
        $amount = number_format((float) $this->payment->amount, 0, ',', ' ');

        return [
            'category'       => 'payment',
            'title'          => 'Paiement reçu',
            'message'        => "Votre paiement de {$amount} FCFA a bien été enregistré. "
                . 'Votre reçu est disponible dans vos documents.',
            'reservation_id' => $this->payment->reservation_id,
            'payment_id'     => $this->payment->id,
            'refund_id'      => null,
            'action'         => ['type' => 'receipt', 'reservation_id' => $this->payment->reservation_id],
        ];
    }
}
