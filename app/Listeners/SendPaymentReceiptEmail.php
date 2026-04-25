<?php

namespace App\Listeners;

use App\Events\PaymentReceived;
use App\Mail\PaymentReceiptMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendPaymentReceiptEmail implements ShouldQueue
{
    public string $queue = 'emails';

    public function handle(PaymentReceived $event): void
    {
        $payment = $event->payment->load(['client', 'reservation.room']);

        Mail::to($payment->client->email)
            ->send(new PaymentReceiptMail($payment));
    }
}
