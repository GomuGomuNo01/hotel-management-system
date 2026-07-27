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

    /** Équipements canoniques (valeurs stockées et acceptées à la validation). */
    public const AMENITIES = ['wifi', 'climatisation', 'tv', 'minibar'];

    /**
     * Ramène une liste d'équipements aux valeurs canoniques : insensible à la
     * casse et à la ponctuation ("WiFi" → "wifi", "Mini-bar" → "minibar").
     * Une valeur inconnue est renvoyée telle quelle pour être rejetée par la
     * validation avec un message explicite.
     *
     * @param  array<int,mixed>  $amenities
     * @return array<int,string>
     */
    public static function normalizeAmenities(array $amenities): array
    {
        $normalized = array_map(static function ($value): string {
            $key = preg_replace('/[^a-z0-9]/', '', strtolower(trim((string) $value)));

            return in_array($key, self::AMENITIES, true) ? $key : (string) $value;
        }, $amenities);

        return array_values(array_unique($normalized));
    }

    protected $fillable = [
        'room_number',
        'room_type',
        'price_per_night',
        'capacity',
        'status',
        'housekeeping_status',
        'last_cleaned_at',
        'description',
        'amenities',
    ];

    public function housekeepingLabel(): string
    {
        // housekeeping_status peut être null sur un modèle fraîchement créé
        // (la valeur par défaut « clean » n'est appliquée qu'au niveau base) :
        // on retombe alors sur « clean ».
        $status = $this->housekeeping_status ?? 'clean';
        return self::HOUSEKEEPING_STATUSES[$status] ?? $status;
    }

    protected function casts(): array
    {
        return [
            'price_per_night' => 'decimal:2',
            'amenities'       => 'array',
            'last_cleaned_at' => 'datetime',
        ];
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function housekeepingTasks(): HasMany
    {
        return $this->hasMany(HousekeepingTask::class);
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
