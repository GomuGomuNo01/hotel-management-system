<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const UPDATED_AT = null;

    /* ── Actions admin ──────────────────────────────────────────── */
    public const ACTION_ROOM_CREATED          = 'ROOM_CREATED';
    public const ACTION_ROOM_UPDATED          = 'ROOM_UPDATED';
    public const ACTION_ROOM_DELETED          = 'ROOM_DELETED';
    public const ACTION_RESERVATION_MODIFIED  = 'RESERVATION_MODIFIED';
    public const ACTION_RESERVATION_CANCELLED = 'RESERVATION_CANCELLED';
    public const ACTION_CHECKIN_DONE          = 'CHECKIN_DONE';
    public const ACTION_CHECKOUT_DONE         = 'CHECKOUT_DONE';
    // Check-in/out d'une réservation avec acompte soldé sur place — nécessite checkin_with_deposit
    public const ACTION_CHECKIN_WITH_DEPOSIT  = 'CHECKIN_WITH_DEPOSIT';
    public const ACTION_CHECKOUT_WITH_DEPOSIT = 'CHECKOUT_WITH_DEPOSIT';
    public const ACTION_PAYMENT_RECORDED      = 'PAYMENT_RECORDED';
    public const ACTION_CLIENT_UPDATED        = 'CLIENT_UPDATED';
    public const ACTION_PROFILE_UPDATED       = 'PROFILE_UPDATED';
    public const ACTION_REFUND_APPROVED       = 'REFUND_APPROVED';
    public const ACTION_REFUND_REJECTED       = 'REFUND_REJECTED';

    /* ── Gestion des administrateurs (par le patron) ─────────── */
    public const ACTION_ADMIN_CREATED         = 'ADMIN_CREATED';
    public const ACTION_ADMIN_UPDATED         = 'ADMIN_UPDATED';
    public const ACTION_ADMIN_STATUS_CHANGED  = 'ADMIN_STATUS_CHANGED';
    public const ACTION_ADMIN_DELETED         = 'ADMIN_DELETED';

    /* ── Sécurité ────────────────────────────────────────────── */
    public const ACTION_PASSWORD_CHANGED      = 'PASSWORD_CHANGED';

    /* ── Actions système / client (admin_id = null) ──────────────── */
    public const ACTION_RESERVATION_CREATED        = 'RESERVATION_CREATED';
    public const ACTION_RESERVATION_AUTO_CANCELLED = 'RESERVATION_AUTO_CANCELLED';
    public const ACTION_PAYMENT_CONFIRMED          = 'PAYMENT_CONFIRMED';
    public const ACTION_PAYMENT_FAILED             = 'PAYMENT_FAILED';

    protected $fillable = [
        'admin_id',
        'action_type',
        'entity_type',
        'entity_id',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }
}
