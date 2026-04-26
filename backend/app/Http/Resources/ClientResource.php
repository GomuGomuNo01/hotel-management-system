<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'first_name'        => $this->first_name,
            'last_name'         => $this->last_name,
            'full_name'         => trim("{$this->first_name} {$this->last_name}"),
            'email'             => $this->email,
            'phone'             => $this->phone,
            'nationality'       => $this->nationality,
            'profile_photo'     => $this->profile_photo,
            'provider'          => $this->provider,
            'email_verified_at' => $this->email_verified_at,
            'created_at'        => $this->created_at,
            'reservations'      => ReservationResource::collection($this->whenLoaded('reservations')),
        ];
    }
}
