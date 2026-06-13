<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/reviews
     * Liste paginée de tous les avis (y compris les négatifs).
     * Permission requise : view_reviews
     */
    public function index(Request $request): JsonResponse
    {
        $query = Review::with([
            'client:id,first_name,last_name,profile_photo',
            'room:id,room_number,room_type',
            'reservation:id,check_in_date,check_out_date',
        ])->latest();

        // Filtre par note
        if ($request->filled('rating')) {
            $query->where('rating', (int) $request->rating);
        }

        // Filtre par catégorie (positif >= 4, neutre = 3, négatif <= 2)
        if ($request->filled('category')) {
            match ($request->category) {
                'positive' => $query->where('rating', '>=', 4),
                'neutral'  => $query->where('rating', 3),
                'negative' => $query->where('rating', '<=', 2),
                default    => null,
            };
        }

        // Filtre par chambre
        if ($request->filled('room_id')) {
            $query->where('room_id', (int) $request->room_id);
        }

        // Statistiques globales (avant pagination)
        $stats = [
            'total'        => Review::count(),
            'average'      => round(Review::avg('rating') ?? 0, 1),
            'positive'     => Review::where('rating', '>=', 4)->count(),
            'neutral'      => Review::where('rating', 3)->count(),
            'negative'     => Review::where('rating', '<=', 2)->count(),
        ];

        $perPage = min(max((int) $request->input('per_page', 12), 1), 50);
        $reviews = $query->paginate($perPage);

        return $this->success([
            'stats'   => $stats,
            'reviews' => $reviews->through(fn ($r) => [
                'id'           => $r->id,
                'rating'       => $r->rating,
                'comment'      => $r->comment,
                'created_at'   => $r->created_at,
                'client'       => $r->client ? [
                    'id'            => $r->client->id,
                    'full_name'     => $r->client->full_name,
                    'profile_photo' => $r->client->profile_photo
                        ? (str_starts_with($r->client->profile_photo, 'http')
                            ? $r->client->profile_photo
                            : asset('storage/'.ltrim($r->client->profile_photo, '/')))
                        : null,
                ] : null,
                'room'         => $r->room ? [
                    'id'          => $r->room->id,
                    'room_number' => $r->room->room_number,
                    'room_type'   => $r->room->room_type,
                ] : null,
                'reservation'  => $r->reservation ? [
                    'id'             => $r->reservation->id,
                    'check_in_date'  => optional($r->reservation->check_in_date)->toDateString(),
                    'check_out_date' => optional($r->reservation->check_out_date)->toDateString(),
                ] : null,
            ]),
        ], 'Avis des clients.');
    }
}
