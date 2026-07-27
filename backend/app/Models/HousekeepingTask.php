<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tâche de ménage planifiée (principalement une « recouche » en cours de
 * séjour). Distincte de l'état physique de la chambre : une recouche due ne
 * rend jamais la chambre indisponible — c'est un travail opérationnel à suivre.
 */
class HousekeepingTask extends Model
{
    use HasFactory;

    public const TYPE_STAYOVER = 'stayover';
    public const TYPE_CHECKOUT = 'checkout';

    public const STATUS_PENDING     = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_DONE        = 'done';
    public const STATUS_DEFERRED    = 'deferred';
    public const STATUS_CANCELLED   = 'cancelled';

    /** Statuts « ouverts » : tâche encore à traiter aujourd'hui. */
    public const OPEN_STATUSES = [self::STATUS_PENDING, self::STATUS_IN_PROGRESS];

    protected $fillable = [
        'room_id',
        'reservation_id',
        'type',
        'scheduled_for',
        'status',
        'deferred_count',
        'completed_by',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_for'  => 'date',
            'completed_at'   => 'datetime',
            'deferred_count' => 'integer',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'completed_by');
    }
}
