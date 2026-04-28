<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'reservation_id',
        'client_id',
        'provider',
        'phone_number',
        'amount',
        'currency',
        'transaction_reference',
        'status',
        'payment_type',
        'provider_payload',
        'confirmed_at',
        'expires_at',
        'simulation_mode',
    ];

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'provider_payload' => 'array',
            'confirmed_at'     => 'datetime',
            'expires_at'       => 'datetime',
            'simulation_mode'  => 'boolean',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** Indique si ce paiement en attente a dépassé sa limite de temps. */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && now()->isAfter($this->expires_at);
    }

    /** Libellé lisible du type de paiement. */
    public function paymentTypeLabel(): string
    {
        return match ($this->payment_type) {
            'deposit' => 'Acompte (50 %)',
            'balance' => 'Solde restant',
            default   => 'Paiement intégral',
        };
    }
}
