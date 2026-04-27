<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_number',
        'room_type',
        'price_per_night',
        'capacity',
        'status',
        'description',
        'amenities',
    ];

    protected function casts(): array
    {
        return [
            'price_per_night' => 'decimal:2',
            'amenities'       => 'array',
        ];
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(RoomImage::class)->orderByDesc('is_primary');
    }

    public function primaryImage(): ?RoomImage
    {
        return $this->images()->where('is_primary', true)->first()
            ?? $this->images()->first();
    }

    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }
}
