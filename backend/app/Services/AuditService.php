<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * Enregistre une entrée dans le journal d'audit.
     *
     * @param  Admin|null  $admin      Admin responsable de l'action, ou null pour les
     *                                 actions système / client (webhook, auto-annulation…)
     * @param  string      $actionType Constante AuditLog::ACTION_*
     * @param  string      $entityType Nom du modèle concerné (ex. 'Reservation', 'Payment')
     * @param  int         $entityId   Identifiant de l'entité
     * @param  array|null  $oldValues  État avant modification
     * @param  array|null  $newValues  État après modification
     * @param  Request|null $request   Requête HTTP courante (auto-détectée si null)
     */
    public static function log(
        Admin|null $admin,
        string $actionType,
        string $entityType,
        int $entityId,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): void {
        $req = $request ?? request();

        AuditLog::create([
            'admin_id'    => $admin?->id,
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
