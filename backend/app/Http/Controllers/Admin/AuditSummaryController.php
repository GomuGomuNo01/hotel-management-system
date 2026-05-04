<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditSummaryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/audit-summary
     * Vue simplifiée du journal d'audit pour les administrateurs ayant view_audit_summary.
     * Filtres disponibles : action_type, date_from, date_to.
     * Pas de filtre admin_id : l'admin voit tous les logs (lecture seule, pas d'identité exposée).
     */
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('admin:id,first_name,last_name,role')
            ->when($request->action_type, fn ($q) => $q->where('action_type', $request->action_type))
            ->when($request->entity_type, fn ($q) => $q->where('entity_type', $request->entity_type))
            ->when($request->date_from,   fn ($q) => $q->where('created_at', '>=', $request->date_from))
            ->when($request->date_to,     fn ($q) => $q->where('created_at', '<=', $request->date_to . ' 23:59:59'))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        // Résumé par type d'action (sur les 30 derniers jours)
        $summary = AuditLog::selectRaw('action_type, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('action_type')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['action_type' => $r->action_type, 'count' => (int) $r->count]);

        return $this->success([
            'logs'    => $logs,
            'summary' => $summary,
        ], "Journal d'audit (vue administrateur).");
    }
}
