<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        $query = Reservation::with(['client', 'room', 'payments'])
            ->when($request->filled('status'),     fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('client_id'),  fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('room_id'),    fn ($q) => $q->where('room_id', $request->room_id))
            ->when($request->filled('date_from'),  fn ($q) => $q->where('check_in_date', '>=', $request->date_from))
            ->when($request->filled('date_to'),    fn ($q) => $q->where('check_out_date', '<=', $request->date_to));

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
        $reservation = Reservation::with(['client', 'room', 'payments'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $this->authorize('view', $reservation);

        return $this->success(new ReservationResource($reservation));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'client'])->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $this->authorize('update', $reservation);

        $request->validate([
            'status' => ['sometimes', 'in:pending,confirmed,cancelled'],
            'notes'  => ['nullable', 'string', 'max:2000'],
        ]);

        $oldValues = $reservation->toArray();

        try {
            $newStatus = $request->input('status');

            if ($newStatus && $newStatus !== $reservation->status) {
                match ($newStatus) {
                    'confirmed' => $this->reservationService->confirmReservation($reservation),
                    'cancelled' => $this->reservationService->cancelReservation($reservation),
                    default     => $reservation->update(['status' => $newStatus]),
                };
                $reservation->refresh();
            }

            if ($request->has('notes')) {
                $reservation->update(['notes' => $request->input('notes')]);
            }
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_RESERVATION_MODIFIED,
            'Reservation',
            $reservation->id,
            $oldValues,
            $reservation->fresh()->toArray()
        );

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room', 'payments'])),
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

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_RESERVATION_CANCELLED,
            'Reservation',
            $id,
            $oldValues,
            null
        );

        return $this->success(message: 'Réservation annulée.');
    }

    public function store(Request $request): JsonResponse
    {
        return $this->error('Utilisez la route client pour créer une réservation.', 405);
    }
}
