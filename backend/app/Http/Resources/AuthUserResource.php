<?php

namespace App\Http\Resources;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Polymorphic resource that returns the authenticated user
 * (Client, Admin or Owner) in a unified shape consumable by the SPA.
 */
class AuthUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->resource;

        return match (true) {
            $user instanceof Client => (new ClientResource($user))->toArray($request),
            $user instanceof Admin  => (new AdminResource($user))->toArray($request),
            $user instanceof Owner  => (new OwnerResource($user))->toArray($request),
            default => [],
        };
    }
}
