<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $images = $this->whenLoaded('images', function () {
            // values()->all() garantit un tableau séquentiel (JSON array), même
            // après mise en cache/sérialisation - évite un objet JSON {} côté client.
            return $this->images->map(fn ($img) => [
                'id'         => $img->id,
                'url'        => $img->url,
                'is_primary' => $img->is_primary,
            ])->values()->all();
        }, []);

        $primaryImage = collect($images)->firstWhere('is_primary', true)
            ?? collect($images)->first();

        return [
            'id'              => $this->id,
            'room_number'     => $this->room_number,
            'room_type'       => $this->room_type,
            'price_per_night' => (float) $this->price_per_night,
            'capacity'        => (int) $this->capacity,
            'status'          => $this->status,
            'description'     => $this->description,
            'amenities'       => $this->amenities ?? [],
            'images'          => $images,
            'photo_url'       => $primaryImage['url'] ?? $this->photo_url ?? null,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
