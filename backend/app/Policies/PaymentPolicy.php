<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Payment;

class PaymentPolicy
{
    public function before($user, string $ability): ?bool
    {
        if ($user instanceof Owner) {
            return true;
        }

        if ($user instanceof Admin) {
            return $user->hasPermission('manage_payments') ? true : false;
        }

        return null;
    }

    public function viewAny(Client $client): bool
    {
        return true;
    }

    public function view(Client $client, Payment $payment): bool
    {
        return $payment->client_id === $client->id;
    }

    /**
     * Frontière de sécurité : propriété uniquement. L'état « pending »
     * (seul un paiement en attente est annulable) est filtré en amont par
     * la requête du contrôleur, qui renvoie un 404 si non annulable.
     */
    public function cancel(Client $client, Payment $payment): bool
    {
        return $payment->client_id === $client->id;
    }
}
