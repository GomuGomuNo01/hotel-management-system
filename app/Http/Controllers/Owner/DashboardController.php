<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function stats(Request $request): JsonResponse
    {
        [$from, $to] = $this->parsePeriod($request);

        $stats = [
            'total_clients'          => Client::count(),
            'active_admins'          => Admin::where('is_active', true)->count(),
            'inactive_admins'        => Admin::where('is_active', false)->count(),
            'total_reservations'     => Reservation::count(),
            'today_reservations'     => Reservation::whereDate('created_at', today())->count(),
            'pending_reservations'   => Reservation::where('status', 'pending')->count(),
            'confirmed_reservations' => Reservation::where('status', 'confirmed')->count(),
            'cancelled_reservations' => Reservation::where('status', 'cancelled')->count(),
            'total_rooms'            => Room::count(),
            'available_rooms'        => Room::where('status', 'available')->count(),
            'occupied_rooms'         => Room::where('status', 'occupied')->count(),
            'pending_payments'       => Payment::where('status', 'pending')->count(),
            'failed_payments'        => Payment::where('status', 'failed')->count(),
        ];

        return $this->success($stats, 'Statistiques globales.');
    }

    public function revenue(Request $request): JsonResponse
    {
        [$from, $to] = $this->parsePeriod($request);

        $base = Payment::where('status', 'success')
            ->whereBetween('confirmed_at', [$from, $to]);

        $revenue = [
            'total'     => (float) (clone $base)->sum('amount'),
            'orange_ci' => (float) (clone $base)->where('provider', 'orange_ci')->sum('amount'),
            'wave_ci'   => (float) (clone $base)->where('provider', 'wave_ci')->sum('amount'),
            'currency'  => 'XOF',
            'period'    => ['from' => $from, 'to' => $to],
        ];

        return $this->success($revenue, 'Chiffre d\'affaires.');
    }

    public function occupancy(Request $request): JsonResponse
    {
        [$from, $to] = $this->parsePeriod($request);

        $totalRooms = Room::count();

        $topRooms = Room::withCount(['reservations as bookings_count' => function ($q) use ($from, $to) {
            $q->whereBetween('check_in_date', [$from, $to])
              ->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        }])
            ->orderByDesc('bookings_count')
            ->limit(5)
            ->get(['id', 'room_number', 'room_type']);

        $occupancyRate = $totalRooms > 0
            ? round((Room::where('status', 'occupied')->count() / $totalRooms) * 100, 2)
            : 0;

        return $this->success([
            'occupancy_rate' => $occupancyRate,
            'total_rooms'    => $totalRooms,
            'occupied_rooms' => Room::where('status', 'occupied')->count(),
            'top_rooms'      => $topRooms,
            'period'         => ['from' => $from, 'to' => $to],
        ], 'Taux d\'occupation.');
    }

    private function parsePeriod(Request $request): array
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->endOfMonth()->toDateString();

        return [$from . ' 00:00:00', $to . ' 23:59:59'];
    }
}
