<?php

namespace App\Listeners;

use App\Events\ReservationConfirmed;
use App\Mail\ReservationConfirmedMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendReservationConfirmationEmail implements ShouldQueue
{
    public string $queue = 'emails';

    public function handle(ReservationConfirmed $event): void
    {
        $reservation = $event->reservation->load(['client', 'room']);

        Mail::to($reservation->client->email)
            ->send(new ReservationConfirmedMail($reservation));
    }
}
