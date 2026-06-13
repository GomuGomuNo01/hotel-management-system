<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification de réinitialisation de mot de passe pour les clients.
 * Envoi synchrone (pas de queue) pour garantir la réception immédiate.
 */
class ResetClientPassword extends Notification
{
    public function __construct(public string $token) {}

    /**
     * Lien vers la page frontend de réinitialisation, valable 60 min (cf. config/auth.php).
     */
    protected function resetUrl(mixed $notifiable): string
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

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
