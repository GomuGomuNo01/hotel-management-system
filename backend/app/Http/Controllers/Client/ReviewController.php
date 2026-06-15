<?php

namespace App\Http\Controllers\Client;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\StoreReviewRequest;
use App\Models\Reservation;
use App\Models\Review;
use App\Notifications\ReviewSubmittedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * POST /reservations/{id}/review
     * Soumet un avis (note 1-5 + commentaire) pour une réservation checkout.
     */
    public function store(StoreReviewRequest $request, int $reservationId): JsonResponse
    {
        $validated = $request->validated();

        $client = $request->user();

        $reservation = Reservation::where('id', $reservationId)
            ->where('client_id', $client->id)
            ->where('status', 'checked_out')
            ->first();

        if (! $reservation) {
            return response()->json([
                'message' => 'Réservation introuvable ou non éligible à un avis.',
            ], 404);
        }

        if ($reservation->review()->exists()) {
            return response()->json([
                'message' => 'Vous avez déjà donné votre avis pour cette réservation.',
            ], 422);
        }

        $review = Review::create([
            'reservation_id' => $reservation->id,
            'client_id'      => $client->id,
            'room_id'        => $reservation->room_id,
            'rating'         => $validated['rating'],
            'comment'        => $validated['comment'] ?? null,
        ]);

        // Notification interne + diffusion temps-réel (met à jour la cloche du client)
        $client->notify(new ReviewSubmittedNotification($review));
        HotelBroadcast::dispatch('review.submitted', [
            'reviewId'      => $review->id,
            'reservationId' => $reservation->id,
            'clientId'      => $client->id,
        ]);

        return response()->json([
            'message' => 'Merci pour votre avis !',
            'review'  => [
                'id'      => $review->id,
                'rating'  => $review->rating,
                'comment' => $review->comment,
            ],
        ], 201);
    }

    /**
     * GET /reviews/pending-count
     * Nombre de séjours terminés sans avis - badge navbar.
     */
    public function pendingCount(Request $request): JsonResponse
    {
        $count = Reservation::where('client_id', $request->user()->id)
            ->where('status', 'checked_out')
            ->whereDoesntHave('review')
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * GET /reviews/reviewable
     * Liste des réservations terminées sans avis - alimente la page dédiée.
     */
    public function reviewable(Request $request): JsonResponse
    {
        $reservations = Reservation::where('client_id', $request->user()->id)
            ->where('status', 'checked_out')
            ->whereDoesntHave('review')
            ->with(['room' => fn ($q) => $q->select('id', 'room_number', 'room_type')->with('images')])
            ->select('id', 'room_id', 'check_in_date', 'check_out_date', 'total_amount')
            ->latest('check_out_date')
            ->get();

        return response()->json([
            'data' => $reservations->map(fn ($r) => [
                'id'             => $r->id,
                'check_in_date'  => $r->check_in_date->toDateString(),
                'check_out_date' => $r->check_out_date->toDateString(),
                'nights'         => (int) $r->check_in_date->diffInDays($r->check_out_date),
                'total_amount'   => (float) $r->total_amount,
                'room'           => $r->room ? [
                    'id'          => $r->room->id,
                    'room_number' => $r->room->room_number,
                    'room_type'   => $r->room->room_type,
                    'photo_url'   => $r->room->images
                                        ->where('is_primary', true)->first()?->url
                                     ?? $r->room->images->first()?->url,
                ] : null,
            ]),
        ]);
    }

    /**
     * GET /reviews/mine
     * Tous les avis déjà soumis par le client - historique.
     */
    public function mine(Request $request): JsonResponse
    {
        $reviews = Review::where('client_id', $request->user()->id)
            ->with([
                'room'        => fn ($q) => $q->select('id', 'room_number', 'room_type')->with('images'),
                'reservation' => fn ($q) => $q->select('id', 'check_in_date', 'check_out_date'),
            ])
            ->select('id', 'reservation_id', 'room_id', 'rating', 'comment', 'created_at')
            ->latest()
            ->get();

        return response()->json([
            'data' => $reviews->map(fn ($rev) => [
                'id'         => $rev->id,
                'rating'     => $rev->rating,
                'comment'    => $rev->comment,
                'created_at' => $rev->created_at->toIso8601String(),
                'reservation' => $rev->reservation ? [
                    'id'             => $rev->reservation->id,
                    'check_in_date'  => $rev->reservation->check_in_date->toDateString(),
                    'check_out_date' => $rev->reservation->check_out_date->toDateString(),
                ] : null,
                'room' => $rev->room ? [
                    'id'          => $rev->room->id,
                    'room_number' => $rev->room->room_number,
                    'room_type'   => $rev->room->room_type,
                    'photo_url'   => $rev->room->images
                                        ->where('is_primary', true)->first()?->url
                                     ?? $rev->room->images->first()?->url,
                ] : null,
            ]),
        ]);
    }
}
