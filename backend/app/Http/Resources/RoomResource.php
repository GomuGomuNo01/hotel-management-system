<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'room_number'     => $this->room_number,
            'room_type'       => $this->room_type,
            'price_per_night' => (float) $this->price_per_night,
            'capacity'        => (int) $this->capacity,
            'status'          => $this->status,
            'description'     => $this->description,
            'amenities'       => $this->amenities ?? [],
            'photo_url'       => $this->photo_url,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
