<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'reservation_id'        => $this->reservation_id,
            'provider'              => $this->provider,
            'phone_number'          => $this->phone_number,
            'amount'                => (float) $this->amount,
            'currency'              => $this->currency,
            'transaction_reference' => $this->transaction_reference,
            'status'                => $this->status,
            'confirmed_at'          => $this->confirmed_at,
            'created_at'            => $this->created_at,
            'reservation'           => new ReservationResource($this->whenLoaded('reservation')),
        ];
    }
}
