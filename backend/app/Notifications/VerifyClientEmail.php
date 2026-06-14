<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

/**
 * Notification de vérification d'e-mail pour les clients.
 *
 * Mise en file d'attente : l'envoi SMTP ne bloque plus la requête HTTP
 * d'inscription. Avec QUEUE_CONNECTION=sync (dev) l'envoi reste immédiat ;
 * en production, basculer sur `database`/`redis` + worker (`queue:work`)
 * pour un traitement réellement asynchrone.
 */
class VerifyClientEmail extends Notification implements ShouldQueue
{
    use Queueable;

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
            ->subject('Vérifiez votre adresse e-mail - ' . config('app.name'))
            ->view('emails.verify-client-email', [
                'notifiable' => $notifiable,
                'url'        => $url,
            ]);
    }
}
