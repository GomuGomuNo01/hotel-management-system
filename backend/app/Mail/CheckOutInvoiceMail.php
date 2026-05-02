<?php

namespace App\Mail;

use App\Models\Reservation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CheckOutInvoiceMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Reservation $reservation) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre facture de séjour — Réservation #' . $this->reservation->id . ' — ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.checkout-invoice');
    }

    public function attachments(): array
    {
        $pdf  = Pdf::loadView('invoices.reservation', ['reservation' => $this->reservation]);
        $name = 'facture-sejour-' . $this->reservation->id . '.pdf';

        return [
            Attachment::fromData(fn () => $pdf->output(), $name)
                ->withMime('application/pdf'),
        ];
    }
}
