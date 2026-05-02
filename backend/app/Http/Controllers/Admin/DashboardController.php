<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\ReservationResource;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/dashboard/stats
     * Operational dashboard for the receptionist:
     * - today's KPI counts
     * - today's check-ins / check-outs
     * - recent reservations + pending payments
     */
    public function stats(Request $request): JsonResponse
    {
        $today = today();

        $todayCheckIns = Reservation::with(['client', 'room'])
            ->whereDate('check_in_date', $today)
            ->whereIn('status', ['confirmed'])
            ->orderBy('check_in_date')
            ->get();

        $todayCheckOuts = Reservation::with(['client', 'room'])
            ->whereDate('check_out_date', $today)
            ->whereIn('status', ['checked_in'])
            ->orderBy('check_out_date')
            ->get();

        $recentReservations = Reservation::with(['client', 'room'])
            ->latest()
            ->limit(8)
            ->get();

        $pendingPayments = Payment::with('reservation.room')
            ->where('status', 'pending')
            ->latest()
            ->limit(8)
            ->get();

        $kpi = [
            'today_reservations' => Reservation::whereDate('created_at', $today)->count(),
            'today_check_ins'    => $todayCheckIns->count(),
            'today_check_outs'   => $todayCheckOuts->count(),
            'available_rooms'    => Room::where('status', 'available')->count(),
            'occupied_rooms'     => Room::where('status', 'occupied')->count(),
            'maintenance_rooms'  => Room::where('status', 'maintenance')->count(),
            'pending_payments'   => Payment::where('status', 'pending')->count(),
            'pending_reservations' => Reservation::where('status', 'pending')->count(),
            'pending_refunds'    => Refund::where('status', 'pending')->count(),
        ];

        return $this->success([
            'kpi'                 => $kpi,
            'today_check_ins'     => ReservationResource::collection($todayCheckIns),
            'today_check_outs'    => ReservationResource::collection($todayCheckOuts),
            'recent_reservations' => ReservationResource::collection($recentReservations),
            'pending_payments'    => PaymentResource::collection($pendingPayments),
        ], 'Tableau de bord administrateur.');
    }
}
