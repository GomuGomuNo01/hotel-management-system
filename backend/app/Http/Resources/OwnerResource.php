<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OwnerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'full_name'  => $this->full_name,
            'first_name' => explode(' ', (string) $this->full_name, 2)[0] ?? '',
            'email'      => $this->email,
            'created_at' => $this->created_at,
        ];
    }
}
