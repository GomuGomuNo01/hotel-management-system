<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'first_name'              => $this->first_name,
            'last_name'               => $this->last_name,
            'full_name'               => trim("{$this->first_name} {$this->last_name}"),
            'email'                   => $this->email,
            'phone'                   => $this->phone,
            'date_of_birth'           => optional($this->date_of_birth)->toDateString(),
            'gender'                  => $this->gender,
            'nationality'             => $this->nationality,
            'address_line'            => $this->address_line,
            'city'                    => $this->city,
            'postal_code'             => $this->postal_code,
            'country'                 => $this->country,
            'id_document_type'        => $this->id_document_type,
            'id_document_number'      => $this->id_document_number,
            'emergency_contact_name'  => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'preferred_language'      => $this->preferred_language,
            'preferences'             => $this->preferences ?? [],
            'profile_photo'           => $this->profile_photo
                ? (str_starts_with($this->profile_photo, 'http')
                    ? $this->profile_photo
                    : asset('storage/'.ltrim($this->profile_photo, '/')))
                : null,
            'provider'                => $this->provider,
            'email_verified_at'       => $this->email_verified_at,
            'created_at'              => $this->created_at,
            'reservations'            => ReservationResource::collection($this->whenLoaded('reservations')),
        ];
    }
}
