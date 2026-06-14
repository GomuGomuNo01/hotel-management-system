<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Complaint;
use App\Models\Owner;

class ComplaintPolicy
{
    public function before($user, string $ability): ?bool
    {
        if ($user instanceof Owner) {
            return true;
        }

        if ($user instanceof Admin) {
            return $user->hasPermission('manage_complaints') ? true : false;
        }

        return null;
    }

    public function viewAny(Client $client): bool
    {
        return true;
    }

    public function view(Client $client, Complaint $complaint): bool
    {
        return $complaint->client_id === $client->id;
    }

    public function create(Client $client): bool
    {
        return true;
    }

    /**
     * Frontière de sécurité : propriété uniquement. La règle d'état
     * (« seule une réclamation ouverte est annulable ») est vérifiée par
     * le contrôleur, qui renvoie un 422 explicite plutôt qu'un 403 sec.
     */
    public function delete(Client $client, Complaint $complaint): bool
    {
        return $complaint->client_id === $client->id;
    }
}
