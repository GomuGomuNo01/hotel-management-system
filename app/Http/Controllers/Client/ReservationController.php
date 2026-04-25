<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\StoreReservationRequest;
use App\Http\Requests\Client\UpdateReservationRequest;
use App\Models\Reservation;
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
            ->with(['room'])
            ->latest()
            ->paginate(15);

        return $this->success($reservations, 'Mes réservations.');
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

        return $this->created($reservation->load('room'), 'Réservation créée avec succès.');
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $reservation = $request->user()->reservations()->with(['room', 'payments'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        return $this->success($reservation);
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

        return $this->success($reservation->fresh()->load('room'), 'Réservation mise à jour.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $reservation = $request->user()->reservations()->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        try {
            $this->reservationService->cancelReservation($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(message: 'Réservation annulée avec succès.');
    }
}
