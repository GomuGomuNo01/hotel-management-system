<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'check_in_date'   => optional($this->check_in_date)->toDateString(),
            'check_out_date'  => optional($this->check_out_date)->toDateString(),
            'status'          => $this->status,
            'total_amount'    => (float) $this->total_amount,
            'notes'           => $this->notes,
            'nights'          => method_exists($this->resource, 'nightsCount') ? $this->nightsCount() : null,
            'room'            => new RoomResource($this->whenLoaded('room')),
            'client'          => new ClientResource($this->whenLoaded('client')),
            'created_at'      => $this->created_at,
        ];
    }
}
