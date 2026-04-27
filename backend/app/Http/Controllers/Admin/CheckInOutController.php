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

class CheckInOutController extends Controller
{
    use ApiResponse;

    public function __construct(private ReservationService $reservationService) {}

    public function checkIn(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with('room')->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        try {
            $reservation = $this->reservationService->checkIn($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_CHECKIN_DONE,
            'Reservation',
            $reservation->id,
            null,
            ['status' => 'checked_in', 'room_status' => 'occupied']
        );

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room'])),
            'Check-in effectué avec succès.'
        );
    }

    public function checkOut(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with('room')->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        try {
            $reservation = $this->reservationService->checkOut($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_CHECKOUT_DONE,
            'Reservation',
            $reservation->id,
            null,
            ['status' => 'checked_out', 'room_status' => 'available']
        );

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room'])),
            'Check-out effectué avec succès.'
        );
    }
}
