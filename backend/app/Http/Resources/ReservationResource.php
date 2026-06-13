<?php

namespace App\Http\Resources;

use App\Helpers\DocumentRef;
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
            // Références de documents — même valeur côté admin et côté client
            'receipt_ref'      => $paidAmount > 0 ? DocumentRef::receipt($this->resource) : null,
            'invoice_ref'      => ($this->status === 'checked_out' && $paidAmount > 0) ? DocumentRef::invoice($this->resource) : null,
            'nights'           => $nights,
            'is_editable'      => in_array($this->status, ['pending']),
            // Annulable par le client uniquement dans les 24h suivant la création
            'is_cancellable'   => in_array($this->status, ['pending', 'confirmed'])
                                  && $this->created_at->diffInHours(now()) < 24,
            'cancellation_deadline' => $this->created_at->addHours(24)->toIso8601String(),
            // Avis : possible uniquement après check-out et si aucun avis déjà soumis
            'can_review'       => $this->status === 'checked_out'
                                  && $this->whenLoaded('review', fn () => $this->review === null, true),
            'has_review'       => $this->whenLoaded('review', fn () => $this->review !== null, false),
            'review'           => $this->whenLoaded('review', fn () => $this->review ? [
                'id'      => $this->review->id,
                'rating'  => $this->review->rating,
                'comment' => $this->review->comment,
            ] : null),
            'room'             => new RoomResource($this->whenLoaded('room')),
            'client'           => new ClientResource($this->whenLoaded('client')),
            'payments'         => $this->whenLoaded('payments'),
            'refund'           => $this->whenLoaded('refunds', fn () => $this->activeRefund()),
            'created_at'       => $this->created_at,
        ];
    }
}
