<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Reservation;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Compteurs (bulles) du client regroupés en UNE seule requête réseau
 * pour limiter le nombre d'appels parallèles (3 -> 1).
 *   - reviews    : séjours terminés sans avis
 *   - complaints : réclamations encore ouvertes
 *   - documents  : notifications « documents » non lues
 */
class BadgeController extends Controller
{
    use ApiResponse;

    private const DOC_CATEGORIES = ['reservation', 'payment', 'receipt', 'invoice', 'refund'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $reviews = Reservation::where('client_id', $user->id)
            ->where('status', 'checked_out')
            ->whereDoesntHave('review')
            ->count();

        $complaints = Complaint::where('client_id', $user->id)
            ->where('status', 'open')
            ->count();

        $documents = $user->notifications()
            ->whereNull('read_at')
            ->where(function ($w) {
                foreach (self::DOC_CATEGORIES as $c) {
                    $w->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(`data`, '$.category')) = ?", [$c]);
                }
            })
            ->count();

        return $this->success([
            'reviews'    => $reviews,
            'complaints' => $complaints,
            'documents'  => $documents,
        ]);
    }
}
