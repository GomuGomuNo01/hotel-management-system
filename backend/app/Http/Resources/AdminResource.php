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
            'address_line'             => $this->address_line,
            'city'                     => $this->city,
            'id_document_type'         => $this->id_document_type,
            'id_document_number'       => $this->id_document_number,
            // Pas d'URL publique pour les pièces d'identité : la consultation
            // passe par les endpoints de streaming authentifiés (disque privé).
            'id_document_path'         => $this->id_document_path,
            'id_documents'             => collect($this->id_documents ?? [])
                ->map(function ($doc) {
                    $path = is_array($doc) ? ($doc['path'] ?? '') : $doc;
                    $name = is_array($doc) ? ($doc['name'] ?? basename($path)) : basename($path);
                    return ['path' => $path, 'name' => $name];
                })
                ->filter(fn ($d) => $d['path'] !== '')
                ->values(),
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
