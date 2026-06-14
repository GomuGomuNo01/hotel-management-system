<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory;

    /** États ménage possibles d'une chambre, indépendants de l'état commercial. */
    public const HOUSEKEEPING_STATUSES = [
        'clean'          => 'Propre',
        'dirty'          => 'À nettoyer',
        'in_progress'    => 'En cours',
        'out_of_service' => 'Hors service',
    ];

    protected $fillable = [
        'room_number',
        'room_type',
        'price_per_night',
        'capacity',
        'status',
        'housekeeping_status',
        'description',
        'amenities',
    ];

    public function housekeepingLabel(): string
    {
        return self::HOUSEKEEPING_STATUSES[$this->housekeeping_status] ?? $this->housekeeping_status;
    }

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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
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
