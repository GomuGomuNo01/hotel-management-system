<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $nights = ($this->check_in_date && $this->check_out_date)
            ? (int) \Carbon\Carbon::parse($this->check_in_date)->diffInDays(\Carbon\Carbon::parse($this->check_out_date))
            : null;

        $paidAmount      = $this->paidAmount();
        $remainingAmount = $this->remainingAmount();

        return [
            'id'               => $this->id,
            'check_in_date'    => optional($this->check_in_date)->toDateString(),
            'check_out_date'   => optional($this->check_out_date)->toDateString(),
            'status'           => $this->status,
            'total_amount'     => (float) $this->total_amount,
            'notes'            => $this->notes,
            'payment_plan'     => $this->payment_plan ?? 'full',
            'paid_amount'      => $paidAmount,
            'remaining_amount' => $remainingAmount,
            'is_fully_paid'    => $remainingAmount <= 0,
            'has_receipt'      => $paidAmount > 0,
            'has_invoice'      => $this->status === 'checked_out' && $paidAmount > 0,
            'nights'           => $nights,
            'is_editable'      => in_array($this->status, ['pending']),
            'is_cancellable'   => in_array($this->status, ['pending', 'confirmed']),
            'room'             => new RoomResource($this->whenLoaded('room')),
            'client'           => new ClientResource($this->whenLoaded('client')),
            'payments'         => $this->whenLoaded('payments'),
            'refund'           => $this->whenLoaded('refunds', fn () => $this->activeRefund()),
            'created_at'       => $this->created_at,
        ];
    }
}
