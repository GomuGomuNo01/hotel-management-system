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

    /**
     * GET /owner/audit-logs
     *
     * Paramètres de filtre disponibles :
     *  - admin_id      : ID d'un admin spécifique
     *  - actor         : 'owner'  → actions du patron (admin_id IS NULL + _performed_by_owner)
     *                    'system' → actions automatiques (admin_id IS NULL, pas d'owner)
     *  - action_type   : constante AuditLog::ACTION_*
     *  - entity_type   : ex. 'Reservation', 'Payment'
     *  - date_from / date_to : plage de dates (YYYY-MM-DD)
     */
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('admin:id,first_name,last_name,email,role')
            ->when($request->admin_id, fn ($q) => $q->where('admin_id', $request->admin_id))
            ->when($request->actor === 'owner', function ($q) {
                // Actions du patron : admin_id NULL + clé _performed_by_owner présente dans new_values
                $q->whereNull('admin_id')
                  ->whereNotNull('new_values->_performed_by_owner');
            })
            ->when($request->actor === 'system', function ($q) {
                // Actions système / client : admin_id NULL et pas de _performed_by_owner
                $q->whereNull('admin_id')
                  ->where(function ($inner) {
                      $inner->whereNull('new_values')
                            ->orWhereNull('new_values->_performed_by_owner');
                  });
            })
            ->when($request->action_type, fn ($q) => $q->where('action_type', $request->action_type))
            ->when($request->entity_type, fn ($q) => $q->where('entity_type', $request->entity_type))
            ->when($request->date_from,   fn ($q) => $q->where('created_at', '>=', $request->date_from))
            ->when($request->date_to,     fn ($q) => $q->where('created_at', '<=', $request->date_to . ' 23:59:59'))
            ->latest()
            ->paginate(30);

        return $this->success($logs, 'Journal d\'audit.');
    }

    /**
     * GET /owner/audit-logs/{adminId}
     * Journal d'audit filtré par un administrateur donné.
     */
    public function byAdmin(int $adminId): JsonResponse
    {
        $logs = AuditLog::with('admin:id,first_name,last_name,email,role')
            ->where('admin_id', $adminId)
            ->latest()
            ->paginate(30);

        return $this->success($logs, "Journal d'audit de l'administrateur #{$adminId}.");
    }
}
