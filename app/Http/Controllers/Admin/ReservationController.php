<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
        $reservations = Reservation::with(['client', 'room'])
            ->when($request->status,     fn ($q) => $q->where('status', $request->status))
            ->when($request->client_id,  fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->room_id,    fn ($q) => $q->where('room_id', $request->room_id))
            ->when($request->date_from,  fn ($q) => $q->where('check_in_date', '>=', $request->date_from))
            ->when($request->date_to,    fn ($q) => $q->where('check_out_date', '<=', $request->date_to))
            ->latest()
            ->paginate(20);

        return $this->success($reservations);
    }

    public function show(int $id): JsonResponse
    {
        $reservation = Reservation::with(['client', 'room', 'payments'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        return $this->success($reservation);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $request->validate([
            'status' => ['sometimes', 'in:pending,confirmed,cancelled'],
            'notes'  => ['nullable', 'string'],
        ]);

        $oldValues = $reservation->toArray();
        $reservation->update($request->only('status', 'notes'));

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_RESERVATION_MODIFIED,
            'Reservation',
            $reservation->id,
            $oldValues,
            $reservation->fresh()->toArray()
        );

        return $this->success($reservation->fresh()->load(['client', 'room']), 'Réservation mise à jour.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

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
