<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'room_id',
        'check_in_date',
        'check_out_date',
        'status',
        'total_amount',
        'notes',
        'payment_plan',
    ];

    protected function casts(): array
    {
        return [
            'check_in_date'  => 'date',
            'check_out_date' => 'date',
            'total_amount'   => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function nightsCount(): int
    {
        return (int) $this->check_in_date->diffInDays($this->check_out_date);
    }

    /** Montant total des paiements confirmés pour cette réservation. */
    public function paidAmount(): float
    {
        return (float) $this->payments()->where('status', 'success')->sum('amount');
    }

    /** Solde restant à payer. */
    public function remainingAmount(): float
    {
        return max(0, (float) $this->total_amount - $this->paidAmount());
    }

    /** Indique si la réservation est entièrement payée. */
    public function isFullyPaid(): bool
    {
        return $this->remainingAmount() <= 0;
    }

    /** Indique si un reçu peut être émis (au moins un paiement réussi). */
    public function hasReceipt(): bool
    {
        return $this->payments()->where('status', 'success')->exists();
    }
}
