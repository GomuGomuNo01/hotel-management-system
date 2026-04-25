<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    public static function log(
        Admin $admin,
        string $actionType,
        string $entityType,
        int $entityId,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): void {
        $req = $request ?? request();

        AuditLog::create([
            'admin_id'    => $admin->id,
            'action_type' => $actionType,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'ip_address'  => $req->ip(),
            'user_agent'  => $req->userAgent(),
        ]);
    }
}
