<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'first_name'               => $this->first_name,
            'last_name'                => $this->last_name,
            'full_name'                => trim("{$this->first_name} {$this->last_name}"),
            'email'                    => $this->email,
            'phone'                    => $this->phone,
            'date_of_birth'            => optional($this->date_of_birth)->toDateString(),
            'place_of_birth'           => $this->place_of_birth,
            'gender'                   => $this->gender,
            'nationality'              => $this->nationality,
            'address_line'             => $this->address_line,
            'city'                     => $this->city,
            'postal_code'              => $this->postal_code,
            'country'                  => $this->country,
            'id_document_type'         => $this->id_document_type,
            'id_document_number'       => $this->id_document_number,
            'id_document_path'         => $this->id_document_path
                ? (str_starts_with($this->id_document_path, 'http')
                    ? $this->id_document_path
                    : asset('storage/'.ltrim($this->id_document_path, '/')))
                : null,
            'emergency_contact_name'   => $this->emergency_contact_name,
            'emergency_contact_phone'  => $this->emergency_contact_phone,
            'job_title'                => $this->job_title,
            'hired_at'                 => optional($this->hired_at)->toDateString(),
            'bio'                      => $this->bio,
            'profile_photo'            => $this->profile_photo
                ? (str_starts_with($this->profile_photo, 'http')
                    ? $this->profile_photo
                    : asset('storage/'.ltrim($this->profile_photo, '/')))
                : null,
            'role'                     => $this->role,
            'is_active'                => (bool) $this->is_active,
            'must_change_password'     => (bool) $this->must_change_password,
            'last_login_at'            => $this->last_login_at,
            'created_at'               => $this->created_at,
            'permissions'              => $this->whenLoaded('permissions', fn () =>
                $this->permissions->pluck('permission_key')
            ),
            'owner'                    => new OwnerResource($this->whenLoaded('owner')),
        ];
    }
}
