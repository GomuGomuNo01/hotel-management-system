<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Refund;

class RefundPolicy
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

    public function view(Client $client, Refund $refund): bool
    {
        return $refund->client_id === $client->id;
    }

    public function approve(Client $client, Refund $refund): bool
    {
        return false;
    }

    public function reject(Client $client, Refund $refund): bool
    {
        return false;
    }
}
