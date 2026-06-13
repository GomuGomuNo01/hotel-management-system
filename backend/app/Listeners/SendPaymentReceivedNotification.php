<?php

namespace App\Listeners;

use App\Events\PaymentReceived;
use App\Notifications\PaymentReceivedNotification;

/**
 * À la réception d'un paiement, dépose une notification interne
 * dans l'espace du client (plus d'e-mail métier).
 */
class SendPaymentReceivedNotification
{
    public function handle(PaymentReceived $event): void
    {
        $payment = $event->payment->load(['client', 'reservation.room']);

        $payment->client?->notify(new PaymentReceivedNotification($payment));
    }
}
