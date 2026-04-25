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
        'provider_payload',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'provider_payload' => 'array',
            'confirmed_at'     => 'datetime',
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
}
