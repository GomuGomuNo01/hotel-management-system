<?php

namespace App\Policies;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use App\Models\Review;

class ReviewPolicy
{
    public function before($user, string $ability): ?bool
    {
        if ($user instanceof Owner) {
            return true;
        }

        if ($user instanceof Admin) {
            return $user->hasPermission('view_reviews') ? true : false;
        }

        return null;
    }

    public function viewAny(Client $client): bool
    {
        return true;
    }

    public function view(Client $client, Review $review): bool
    {
        return $review->client_id === $client->id;
    }

    public function create(Client $client): bool
    {
        return true;
    }
}
