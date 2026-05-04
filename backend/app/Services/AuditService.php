<?php

namespace App\Services;

use App\Models\Admin;
use App\Models\AuditLog;
use App\Models\Owner;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * Enregistre une entrée dans le journal d'audit.
     *
     * @param  Admin|Owner|null $actor      Responsable de l'action :
     *                                       - Admin : admin_id renseigné
     *                                       - Owner : admin_id = null, info patron injectée dans new_values
     *                                       - null  : action système / automatisée
     * @param  string      $actionType Constante AuditLog::ACTION_*
     * @param  string      $entityType Nom du modèle concerné (ex. 'Reservation', 'Payment')
     * @param  int         $entityId   Identifiant de l'entité
     * @param  array|null  $oldValues  État avant modification
     * @param  array|null  $newValues  État après modification
     * @param  Request|null $request   Requête HTTP courante (auto-détectée si null)
     */
    public static function log(
        Admin|Owner|null $actor,
        string $actionType,
        string $entityType,
        int $entityId,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): void {
        $req = $request ?? request();

        // Si c'est le patron qui agit, on stocke son identité dans new_values
        // (admin_id reste null car la colonne FK pointe sur la table admins)
        $adminId = $actor instanceof Admin ? $actor->id : null;

        if ($actor instanceof Owner) {
            $newValues = array_merge($newValues ?? [], [
                '_performed_by_owner' => trim("{$actor->first_name} {$actor->last_name}"),
            ]);
        }

        AuditLog::create([
            'admin_id'    => $adminId,
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
