<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminPermission extends Model
{
    public const KEYS = [
        'manage_rooms',
        'manage_reservations',
        'manage_clients',
        'manage_checkin_checkout',
        'manage_payments',
        'manage_complaints',
        'view_reports',
        'view_audit_summary',
        // Permission spéciale : voir et traiter les réservations avec acompte non soldé
        // Réservé au Manager / Comptable - doit quand même solder l'acompte avant check-in/out
        'checkin_with_deposit',
        // Consultation des avis clients (y compris les avis négatifs non publiés)
        'view_reviews',
    ];

    protected $fillable = [
        'admin_id',
        'permission_key',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }
}
