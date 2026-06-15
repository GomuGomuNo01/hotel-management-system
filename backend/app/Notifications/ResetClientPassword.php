<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification de réinitialisation de mot de passe pour les clients.
 *
 * Mise en file d'attente : l'envoi SMTP ne bloque plus la requête HTTP.
 * Avec QUEUE_CONNECTION=sync (dev) l'envoi reste immédiat ; en production,
 * basculer sur `database`/`redis` + worker pour un envoi asynchrone.
 */
class ResetClientPassword extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token) {}

    /**
     * Lien vers la page frontend de réinitialisation, valable 60 min (cf. config/auth.php).
     */
    protected function resetUrl(mixed $notifiable): string
    {
        $frontendUrl = config('app.frontend_url');

        return "{$frontendUrl}/reinitialiser-mot-de-passe?token={$this->token}&email=" . urlencode($notifiable->email);
    }

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = $this->resetUrl($notifiable);

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe - ' . config('app.name'))
            ->view('emails.reset-password', [
                'notifiable' => $notifiable,
                'url'        => $url,
                'expire'     => config('auth.passwords.clients.expire', 60),
            ]);
    }
}
