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
        'view_reports',
        'view_audit_summary',
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
