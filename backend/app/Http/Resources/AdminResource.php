<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'first_name'           => $this->first_name,
            'last_name'            => $this->last_name,
            'full_name'            => trim("{$this->first_name} {$this->last_name}"),
            'email'                => $this->email,
            'role'                 => $this->role,
            'is_active'            => (bool) $this->is_active,
            'must_change_password' => (bool) $this->must_change_password,
            'last_login_at'        => $this->last_login_at,
            'created_at'           => $this->created_at,
            'permissions'          => $this->whenLoaded('permissions', fn () =>
                $this->permissions->pluck('permission_key')
            ),
        ];
    }
}
