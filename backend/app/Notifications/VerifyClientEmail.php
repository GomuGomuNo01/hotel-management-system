<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

/**
 * Notification de vérification d'e-mail pour les clients.
 * Envoi synchrone (pas de queue) pour garantir la réception immédiate.
 * En production, ajouter `implements ShouldQueue` + `use Queueable`
 * et configurer un vrai driver de queue (Redis, SQS…).
 */
class VerifyClientEmail extends Notification
{
    /**
     * Lien signé temporaire (24h) vers l'endpoint de vérification API.
     */
    protected function verificationUrl(mixed $notifiable): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addHours(24),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->email),
            ]
        );
    }

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Vérifiez votre adresse e-mail — ' . config('app.name'))
            ->view('emails.verify-client-email', [
                'notifiable' => $notifiable,
                'url'        => $url,
            ]);
    }
}
