<?php

namespace App\Http\Controllers\Admin;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\AuditLog;
use App\Models\Reservation;
use App\Services\AuditService;
use App\Services\ReservationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    use ApiResponse;

    public function __construct(private ReservationService $reservationService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Reservation::class);

        $query = Reservation::with(['client', 'room', 'payments', 'refunds'])
            ->when($request->filled('status'),     fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('client_id'),  fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('room_id'),    fn ($q) => $q->where('room_id', $request->room_id))
            ->when($request->filled('date_from'),  fn ($q) => $q->where('check_in_date', '>=', $request->date_from))
            ->when($request->filled('date_to'),    fn ($q) => $q->where('check_out_date', '<=', $request->date_to))
            // Recherche : numéro de réservation (RES-000051 ou 51), nom, prénom, e-mail, téléphone
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

                // Sinon : recherche sur les informations du client
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

        $reservations = $query->latest()->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des réservations.',
            'data'    => ReservationResource::collection($reservations->items()),
            'meta'    => [
                'current_page' => $reservations->currentPage(),
                'last_page'    => $reservations->lastPage(),
                'per_page'     => $reservations->perPage(),
                'total'        => $reservations->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $reservation = Reservation::with(['client', 'room', 'payments', 'refunds'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $this->authorize('view', $reservation);

        return $this->success(new ReservationResource($reservation));
    }

    public function update(UpdateReservationRequest $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'client'])->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $this->authorize('update', $reservation);

        $oldValues = $reservation->toArray();

        $cancelledByAdmin = false;

        try {
            $newStatus = $request->input('status');

            if ($newStatus && $newStatus !== $reservation->status) {
                match ($newStatus) {
                    'cancelled' => $this->reservationService->cancelReservation($reservation),
                    default     => throw new \RuntimeException('Modification de statut non autorisée.'),
                };
                $reservation->refresh();
                $cancelledByAdmin = ($newStatus === 'cancelled');
            }

            if ($request->has('notes')) {
                $reservation->update(['notes' => $request->input('notes')]);
            }
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        // Action précise : CANCELLED si annulation explicite par l'admin, MODIFIED sinon
        AuditService::log(
            $request->user(),
            $cancelledByAdmin ? AuditLog::ACTION_RESERVATION_CANCELLED : AuditLog::ACTION_RESERVATION_MODIFIED,
            'Reservation',
            $reservation->id,
            $oldValues,
            $reservation->fresh()->toArray()
        );

        // Diffusion temps-réel si annulation admin — actorId pour éviter le double toast
        if ($cancelledByAdmin) {
            HotelBroadcast::dispatch('reservation.cancelled', [
                'reservationId' => $reservation->id,
                'clientId'      => $reservation->client_id,
                'cancelledBy'   => 'admin',
                'actorId'       => $request->user()->id,
            ]);
        }

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room', 'payments', 'refunds'])),
            'Réservation mise à jour.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $this->authorize('cancel', $reservation);

        $oldValues = $reservation->toArray();

        try {
            $this->reservationService->cancelReservation($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        $admin = $request->user();

        AuditService::log(
            $admin,
            AuditLog::ACTION_RESERVATION_CANCELLED,
            'Reservation',
            $id,
            $oldValues,
            [
                'status'        => 'cancelled',
                'cancelled_by'  => 'admin',
                'admin_id'      => $admin->id,
                'admin_name'    => $admin->first_name . ' ' . $admin->last_name,
                'admin_role'    => $admin->role,
            ]
        );

        // Diffusion temps-réel — actorId pour éviter le double toast
        HotelBroadcast::dispatch('reservation.cancelled', [
            'reservationId' => $id,
            'clientId'      => $reservation->client_id,
            'cancelledBy'   => 'admin',
            'actorId'       => $admin->id,
        ]);

        return $this->success(message: 'Réservation annulée.');
    }

    /**
     * GET /admin/reservations/deposit-alerts
     * Retourne le nombre de réservations confirmées avec un acompte non soldé.
     * Utilisé par le sidebar pour afficher la bulle de notification.
     */
    public function depositAlerts(): JsonResponse
    {
        // Pure SQL - remplace le filtrage PHP N+1 (remainingAmount() par réservation)
        $count = (int) \Illuminate\Support\Facades\DB::selectOne("
            SELECT COUNT(*) AS cnt
            FROM reservations r
            WHERE r.status IN ('confirmed', 'checked_in')
              AND r.payment_plan = 'partial'
              AND r.total_amount > COALESCE(
                    ( SELECT SUM(p.amount)
                      FROM payments p
                      WHERE p.reservation_id = r.id
                        AND p.status = 'success' ),
                    0
                  )
        ")->cnt;

        return $this->success(['count' => $count], 'Alertes acompte.');
    }

    public function store(Request $request): JsonResponse
    {
        return $this->error('Utilisez la route client pour créer une réservation.', 405);
    }
}
