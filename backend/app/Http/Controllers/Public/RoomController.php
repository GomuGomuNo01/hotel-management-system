<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Public room listing - no auth required.
     * Visitors browse the catalogue freely; auth is only enforced
     * when they actually try to create a reservation.
     */
    public function index(Request $request): JsonResponse
    {
        // FIX: ajout de with('images') pour que photo_url soit disponible côté client.
        // Les chambres en maintenance ne sont jamais visibles côté client.
        $query = Room::with('images')->where('status', '!=', 'maintenance');

        if ($request->filled('room_type')) {
            $query->where('room_type', $request->string('room_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('capacity')) {
            $query->where('capacity', '>=', $request->integer('capacity'));
        }

        if ($request->filled('price_min')) {
            $query->where('price_per_night', '>=', $request->integer('price_min'));
        }

        if ($request->filled('price_max')) {
            $query->where('price_per_night', '<=', $request->integer('price_max'));
        }

        $rooms = $query->orderBy('room_number')->paginate($request->integer('per_page', 12));

        return response()->json([
            'data'  => RoomResource::collection($rooms->items()),
            'meta'  => [
                'current_page' => $rooms->currentPage(),
                'last_page'    => $rooms->lastPage(),
                'per_page'     => $rooms->perPage(),
                'total'        => $rooms->total(),
            ],
        ])->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    }

    /**
     * GET /rooms/popular
     * Les 4 chambres les plus réservées - accessibles publiquement pour la page d'accueil.
     */
    public function popular(): JsonResponse
    {
        // Cache 5 min côté serveur - les chambres les plus populaires changent rarement
        $payload = \Illuminate\Support\Facades\Cache::remember('rooms.popular', 300, function () {
            $rooms = Room::with('images')
                ->withCount([
                    'reservations as reservations_count' => fn ($q) => $q->whereIn('status', [
                        'confirmed', 'checked_in', 'checked_out',
                    ]),
                ])
                ->withAvg('reviews as avg_rating', 'rating')
                ->withCount('reviews as reviews_count')
                ->where('status', '!=', 'maintenance')
                ->orderByDesc('reservations_count')
                ->limit(4)
                ->get();

            return $rooms->map(fn ($room) => array_merge(
                (new RoomResource($room))->resolve(),
                [
                    'reservations_count' => $room->reservations_count,
                    'avg_rating'         => $room->avg_rating ? round((float) $room->avg_rating, 1) : null,
                    'reviews_count'      => $room->reviews_count,
                ]
            ))->all();
        });

        return response()->json(['data' => $payload])
            ->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    }

    /**
     * Single room detail - no auth required.
     */
    public function show(int $id): JsonResponse
    {
        // FIX: ajout de with('images') pour que les images soient disponibles
        $room = Room::with('images')->find($id);

        // Une chambre en maintenance n'est pas consultable côté client.
        if (! $room || $room->status === 'maintenance') {
            return response()->json(['message' => 'Chambre introuvable.'], 404);
        }

        return response()->json(['data' => new RoomResource($room)]);
    }

    /**
     * GET /rooms/{id}/reviews?page=1&per_page=6
     * Avis publiés sur une chambre spécifique - accès public.
     */
    public function roomReviews(int $id, Request $request): JsonResponse
    {
        if (! Room::where('id', $id)->exists()) {
            return response()->json(['message' => 'Chambre introuvable.'], 404);
        }

        $perPage = min($request->integer('per_page', 6), 20);

        $reviews = Review::where('room_id', $id)
            ->where('rating', '>=', 3)  // only positive reviews (3+ stars)
            ->whereNotNull('comment')   // on n'affiche que les avis avec commentaire
            ->whereHas('client')        // jamais les avis d'un client supprimé (RGPD)
            ->with('client:id,first_name,last_name')
            ->select('id', 'client_id', 'rating', 'comment', 'created_at')
            ->latest()
            ->paginate($perPage);

        // Statistiques agrégées en 1 requête
        $stats = Review::where('room_id', $id)->where('rating', '>=', 3)->whereHas('client')->selectRaw("
            COUNT(*)                  AS total,
            ROUND(AVG(rating), 1)     AS avg_rating,
            SUM(rating = 5)           AS r5,
            SUM(rating = 4)           AS r4,
            SUM(rating = 3)           AS r3,
            SUM(rating = 2)           AS r2,
            SUM(rating = 1)           AS r1
        ")->first();

        return response()->json([
            'data' => collect($reviews->items())->map(fn ($r) => [
                'id'         => $r->id,
                'rating'     => $r->rating,
                'comment'    => $r->comment,
                'created_at' => $r->created_at->toDateString(),
                'reviewer'   => $r->client
                    ? $r->client->first_name . ' ' . mb_substr($r->client->last_name, 0, 1) . '.'
                    : 'Client',
            ]),
            'meta'  => [
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
                'per_page'     => $reviews->perPage(),
                'total'        => $reviews->total(),
            ],
            'stats' => [
                'total'        => (int) ($stats->total    ?? 0),
                'avg_rating'   => $stats->avg_rating ? (float) $stats->avg_rating : null,
                'distribution' => [
                    5 => (int) ($stats->r5 ?? 0),
                    4 => (int) ($stats->r4 ?? 0),
                    3 => (int) ($stats->r3 ?? 0),
                    2 => (int) ($stats->r2 ?? 0),
                    1 => (int) ($stats->r1 ?? 0),
                ],
            ],
        ])->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    }

    /**
     * GET /reviews/public?limit=6
     * Témoignages récents (note >= 4, avec commentaire) - page d'accueil.
     */
    public function publicReviews(Request $request): JsonResponse
    {
        $limit = min($request->integer('limit', 6), 12);

        $payload = \Illuminate\Support\Facades\Cache::remember("reviews.public.v2.{$limit}", 300, function () use ($limit) {
            return Review::where('rating', '>=', 3)
                ->whereNotNull('comment')
                ->whereHas('client')   // jamais les avis d'un client supprimé (RGPD)
                ->with([
                    'client:id,first_name,last_name',
                    'room:id,room_number,room_type',
                ])
                ->select('id', 'client_id', 'room_id', 'rating', 'comment', 'created_at')
                ->latest()
                ->limit($limit)
                ->get()
                ->map(fn ($r) => [
                    'id'         => $r->id,
                    'rating'     => $r->rating,
                    'comment'    => $r->comment,
                    'created_at' => $r->created_at->toDateString(),
                    'reviewer'   => $r->client
                        ? $r->client->first_name . ' ' . mb_substr($r->client->last_name, 0, 1) . '.'
                        : 'Client',
                    'room'       => $r->room ? [
                        'room_number' => $r->room->room_number,
                        'room_type'   => $r->room->room_type,
                    ] : null,
                ])
                ->all();
        });

        return response()->json(['data' => $payload])
            ->header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    }

    /**
     * Invalide le cache serveur des témoignages d'accueil (toutes les variantes
     * de `limit`). À appeler dès qu'un avis peut disparaître de cette vue —
     * notamment lors de la suppression RGPD d'un compte client.
     */
    public static function forgetPublicReviewsCache(): void
    {
        // publicReviews() borne `limit` à 12 ; on purge toutes les clés possibles.
        for ($limit = 0; $limit <= 12; $limit++) {
            \Illuminate\Support\Facades\Cache::forget("reviews.public.v2.{$limit}");
        }
    }

    /**
     * GET /rooms/{id}/unavailable-dates
     * Retourne les périodes déjà réservées pour une chambre (accès public).
     * Statuts pris en compte : pending, confirmed, checked_in.
     */
    public function unavailableDates(int $id): JsonResponse
    {
        if (! Room::where('id', $id)->exists()) {
            return response()->json(['message' => 'Chambre introuvable.'], 404);
        }

        $periods = Reservation::where('room_id', $id)
            ->whereIn('status', ['pending', 'confirmed', 'checked_in'])
            ->orderBy('check_in_date')
            ->get(['check_in_date', 'check_out_date'])
            ->map(fn ($r) => [
                'check_in'  => $r->check_in_date->toDateString(),
                'check_out' => $r->check_out_date->toDateString(),
            ]);

        return response()->json(['success' => true, 'data' => $periods]);
    }
}
