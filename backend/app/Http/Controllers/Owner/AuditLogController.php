<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('admin:id,first_name,last_name,email')
            ->when($request->admin_id,    fn ($q) => $q->where('admin_id', $request->admin_id))
            ->when($request->action_type, fn ($q) => $q->where('action_type', $request->action_type))
            ->when($request->entity_type, fn ($q) => $q->where('entity_type', $request->entity_type))
            ->when($request->date_from,   fn ($q) => $q->where('created_at', '>=', $request->date_from))
            ->when($request->date_to,     fn ($q) => $q->where('created_at', '<=', $request->date_to . ' 23:59:59'))
            ->latest()
            ->paginate(30);

        return $this->success($logs, 'Journal d\'audit.');
    }

    public function byAdmin(int $adminId): JsonResponse
    {
        $logs = AuditLog::with('admin:id,first_name,last_name,email')
            ->where('admin_id', $adminId)
            ->latest()
            ->paginate(30);

        return $this->success($logs, "Journal d'audit de l'administrateur #{$adminId}.");
    }
}
