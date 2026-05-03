<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\StoreReservationRequest;
use App\Http\Requests\Client\UpdateReservationRequest;
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
        $reservations = $request->user()
            ->reservations()
            ->with(['room', 'payments'])
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Mes réservations.',
            'data'    => ReservationResource::collection($reservations->items()),
            'meta'    => [
                'current_page' => $reservations->currentPage(),
                'last_page'    => $reservations->lastPage(),
                'per_page'     => $reservations->perPage(),
                'total'        => $reservations->total(),
            ],
        ]);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        try {
            $reservation = $this->reservationService->createReservation(
                $request->user(),
                $request->validated()
            );
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 409);
        }

        $reservation->load(['room', 'payments']);

        // Audit — action client, pas d'admin (admin_id = null)
        AuditService::log(
            null,
            AuditLog::ACTION_RESERVATION_CREATED,
            'Reservation',
            $reservation->id,
            null,
            [
                'client_id'      => $reservation->client_id,
                'room_id'        => $reservation->room_id,
                'check_in_date'  => $reservation->check_in_date?->toDateString(),
                'check_out_date' => $reservation->check_out_date?->toDateString(),
                'total_amount'   => $reservation->total_amount,
                'payment_plan'   => $reservation->payment_plan,
            ]
        );

        return $this->created(new ReservationResource($reservation), 'Réservation créée avec succès.');
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $reservation = $request->user()->reservations()->with(['room', 'payments'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        return $this->success(new ReservationResource($reservation));
    }

    public function update(UpdateReservationRequest $request, int $id): JsonResponse
    {
        $reservation = $request->user()->reservations()->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        if (! in_array($reservation->status, ['pending'])) {
            return $this->error('Cette réservation ne peut plus être modifiée.', 422);
        }

        $data = $request->validated();

        if (isset($data['check_in_date']) || isset($data['check_out_date'])) {
            $checkIn  = $data['check_in_date']  ?? $reservation->check_in_date->toDateString();
            $checkOut = $data['check_out_date'] ?? $reservation->check_out_date->toDateString();

            if (! $this->reservationService->checkAvailability($reservation->room_id, $checkIn, $checkOut, $reservation->id)) {
                return $this->error('La chambre est déjà réservée sur cette période.', 409);
            }

            $data['total_amount'] = $this->reservationService->calculateTotal(
                $reservation->room,
                $checkIn,
                $checkOut
            );
        }

        $reservation->update($data);

        $fresh = $reservation->fresh()->load(['room', 'payments']);

        return $this->success(new ReservationResource($fresh), 'Réservation mise à jour.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $reservation = $request->user()->reservations()->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        $oldStatus = $reservation->status;
        $snapshot  = [
            'client_id'   => $reservation->client_id,
            'room_id'     => $reservation->room_id,
            'status'      => $oldStatus,
            'paid_amount' => $reservation->paidAmount(),
        ];

        try {
            $this->reservationService->cancelReservation($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        // Audit — annulation par le client, pas d'admin (admin_id = null)
        AuditService::log(
            null,
            AuditLog::ACTION_RESERVATION_CANCELLED,
            'Reservation',
            $id,
            $snapshot,
            ['status' => 'cancelled', 'cancelled_by' => 'client']
        );

        return $this->success(message: 'Réservation annulée avec succès.');
    }
}
