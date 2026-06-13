<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    use ApiResponse;

    /**
     * GET /owner/reservations
     * Liste paginée (lecture seule) — pas de policy owner.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::with([
                'client:id,first_name,last_name,email,phone,profile_photo',
                'room:id,room_number,room_type',
            ])
            ->when($request->filled('status'),    fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('date_from'), fn ($q) => $q->where('check_in_date', '>=', $request->date_from))
            ->when($request->filled('date_to'),   fn ($q) => $q->where('check_out_date', '<=', $request->date_to))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term   = trim($request->search);
                $digits = preg_replace('/\D/', '', $term);

                // Numéro de réservation : "RES-000051", "RES51", "51"
                $reservationId = null;
                if (preg_match('/^RES-?0*(\d+)$/i', $term, $m)) {
                    $reservationId = (int) $m[1];
                } elseif (ctype_digit($term)) {
                    $reservationId = (int) $term;
                }

                if ($reservationId !== null) {
                    $q->where('id', $reservationId);
                    return;
                }

                $q->whereHas('client', function ($c) use ($term, $digits) {
                    $c->where(function ($c2) use ($term, $digits) {
                        $c2->where('first_name', 'like', "%{$term}%")
                           ->orWhere('last_name', 'like', "%{$term}%")
                           ->orWhere('email', 'like', "%{$term}%");

                        if ($digits !== '') {
                            $c2->orWhereRaw(
                                "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''), '.', '') LIKE ?",
                                ["%{$digits}%"]
                            );
                        }
                    });
                });
            });

        // Charger les paiements (success) pour les montants réglés + les remboursements
        $query->with([
            'payments' => fn ($q) => $q->where('status', 'success'),
            'refunds',
        ]);

        $reservations = $query->latest()->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des réservations.',
            'data'    => ReservationResource::collection($reservations),
            'meta'    => [
                'current_page' => $reservations->currentPage(),
                'last_page'    => $reservations->lastPage(),
                'per_page'     => $reservations->perPage(),
                'total'        => $reservations->total(),
            ],
        ]);
    }
}
