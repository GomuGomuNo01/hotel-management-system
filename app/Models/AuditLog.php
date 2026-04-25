<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const UPDATED_AT = null;

    public const ACTION_ROOM_CREATED          = 'ROOM_CREATED';
    public const ACTION_ROOM_UPDATED          = 'ROOM_UPDATED';
    public const ACTION_ROOM_DELETED          = 'ROOM_DELETED';
    public const ACTION_RESERVATION_MODIFIED  = 'RESERVATION_MODIFIED';
    public const ACTION_RESERVATION_CANCELLED = 'RESERVATION_CANCELLED';
    public const ACTION_CHECKIN_DONE          = 'CHECKIN_DONE';
    public const ACTION_CHECKOUT_DONE         = 'CHECKOUT_DONE';
    public const ACTION_PAYMENT_RECORDED      = 'PAYMENT_RECORDED';
    public const ACTION_CLIENT_UPDATED        = 'CLIENT_UPDATED';

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
