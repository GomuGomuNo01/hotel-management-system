<?php

namespace App\Mail;

use App\Models\Refund;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RefundProcessedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Refund $refund,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->refund->status === 'approved'
            ? 'Votre remboursement a été approuvé — Réservation #' . $this->refund->reservation_id
            : 'Mise à jour concernant votre remboursement — Réservation #' . $this->refund->reservation_id;

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.refund-processed',
        );
    }
}
