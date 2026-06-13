<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notifications internes du client (canal database).
 * Centralise les informations métier auparavant envoyées par e-mail :
 * nouvelle facture, reçu, statut de remboursement, etc.
 */
class NotificationController extends Controller
{
    use ApiResponse;

    /**
     * GET /notifications - liste paginée des notifications du client.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Liste des notifications.',
            'data'    => collect($notifications->items())->map(fn ($n) => $this->format($n)),
            'meta'    => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'per_page'     => $notifications->perPage(),
                'total'        => $notifications->total(),
                'unread'       => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * GET /notifications/unread-count - compteur de notifications non lues.
     * Filtrable par catégories : ?categories=invoice,receipt,refund
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $cats  = $this->categories($request);
        $query = $request->user()->notifications()->whereNull('read_at');

        $this->scopeByCategories($query, $cats);

        return $this->success(['count' => $query->count()]);
    }

    /**
     * POST /notifications/{id}/read - marque une notification comme lue.
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->find($id);

        if (! $notification) {
            return $this->notFound('Notification introuvable.');
        }

        $notification->markAsRead();

        return $this->success($this->format($notification->fresh()), 'Notification marquée comme lue.');
    }

    /**
     * POST /notifications/read-all - marque les notifications comme lues.
     * Filtrable par catégories : { "categories": ["invoice","receipt"] }
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $cats  = $this->categories($request);
        $query = $request->user()->notifications()->whereNull('read_at');

        $this->scopeByCategories($query, $cats);

        // Mise à jour SQL directe (pas d'hydratation de modèles) — rapide même
        // avec un grand volume de notifications.
        $query->update(['read_at' => now()]);

        return $this->success(
            ['unread' => $request->user()->notifications()->whereNull('read_at')->count()],
            'Notifications marquées comme lues.'
        );
    }

    /** Récupère la liste de catégories depuis la requête (CSV ou tableau). */
    private function categories(Request $request): ?array
    {
        $raw = $request->input('categories', $request->query('categories'));
        if (empty($raw)) {
            return null;
        }
        return is_array($raw) ? $raw : explode(',', $raw);
    }

    /**
     * Restreint la requête aux catégories données via le chemin JSON data->category
     * (la colonne `data` est du JSON stocké en text — JSON_EXTRACT fonctionne).
     */
    private function scopeByCategories($query, ?array $cats): void
    {
        if ($cats === null) {
            return;
        }
        $query->where(function ($w) use ($cats) {
            foreach ($cats as $c) {
                $w->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(`data`, '$.category')) = ?", [$c]);
            }
        });
    }

    /** Sérialise une notification de base de données pour le frontend. */
    private function format($n): array
    {
        $data = $n->data ?? [];

        return [
            'id'         => $n->id,
            'category'   => $data['category'] ?? 'info',
            'title'      => $data['title'] ?? 'Notification',
            'message'    => $data['message'] ?? '',
            'action'     => $data['action'] ?? null,
            'data'       => $data,
            'read'       => $n->read_at !== null,
            'read_at'    => optional($n->read_at)->toIso8601String(),
            'created_at' => optional($n->created_at)->toIso8601String(),
        ];
    }
}
