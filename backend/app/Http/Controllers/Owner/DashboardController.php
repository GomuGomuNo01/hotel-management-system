<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\ReservationResource;
use App\Models\Admin;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/owner/dashboard/stats
     * Strategic KPIs + recent activity feeds for the owner dashboard.
     */
    public function stats(Request $request): JsonResponse
    {
        [$from, $to] = $this->parsePeriod($request);
        $monthFrom = now()->startOfMonth();

        $totalRooms     = Room::count();
        $occupiedRooms  = Room::where('status', 'occupied')->count();
        $occupancyRate  = $totalRooms > 0 ? round($occupiedRooms / $totalRooms * 100, 1) : 0;

        $monthRevenue = (float) Payment::where('status', 'success')
            ->where('confirmed_at', '>=', $monthFrom)
            ->sum('amount');

        $stats = [
            'total_clients'           => Client::count(),
            'active_admins'           => Admin::where('is_active', true)->count(),
            'inactive_admins'         => Admin::where('is_active', false)->count(),
            'total_rooms'             => $totalRooms,
            'available_rooms'         => Room::where('status', 'available')->count(),
            'occupied_rooms'          => $occupiedRooms,
            'maintenance_rooms'       => Room::where('status', 'maintenance')->count(),
            'occupancy_rate'          => $occupancyRate,
            'total_reservations'      => Reservation::count(),
            'month_reservations'      => Reservation::where('created_at', '>=', $monthFrom)->count(),
            'pending_reservations'    => Reservation::where('status', 'pending')->count(),
            'confirmed_reservations'  => Reservation::where('status', 'confirmed')->count(),
            'checked_in_reservations' => Reservation::where('status', 'checked_in')->count(),
            'cancelled_reservations'  => Reservation::where('status', 'cancelled')->count(),
            'month_revenue'           => $monthRevenue,
            'pending_payments'        => Payment::where('status', 'pending')->count(),
            'failed_payments'         => Payment::where('status', 'failed')->count(),
            'currency'                => 'XOF',
        ];

        $recentReservations = Reservation::with(['client', 'room'])
            ->latest()
            ->limit(6)
            ->get();

        $recentAudit = AuditLog::with('admin')
            ->latest()
            ->limit(8)
            ->get();

        return $this->success([
            'stats'               => $stats,
            'recent_reservations' => ReservationResource::collection($recentReservations),
            'recent_audit'        => AuditLogResource::collection($recentAudit),
        ], 'Statistiques propriétaire.');
    }

    /**
     * GET /api/owner/dashboard/revenue?period=30d
     * Daily revenue points + provider split for charts.
     */
    public function revenue(Request $request): JsonResponse
    {
        $days = (int) $request->integer('days', 30);
        $days = max(7, min($days, 180));

        $from = now()->subDays($days - 1)->startOfDay();
        $to   = now()->endOfDay();

        $rows = Payment::query()
            ->selectRaw('DATE(confirmed_at) as day, provider, SUM(amount) as total')
            ->where('status', 'success')
            ->whereBetween('confirmed_at', [$from, $to])
            ->groupBy('day', 'provider')
            ->orderBy('day')
            ->get();

        // Build a continuous date series so the chart has no gaps.
        $period = CarbonPeriod::create($from->copy()->startOfDay(), $to->copy()->startOfDay());
        $byDay  = [];
        foreach ($period as $date) {
            $key = $date->toDateString();
            $byDay[$key] = ['date' => $key, 'orange_ci' => 0.0, 'wave_ci' => 0.0, 'total' => 0.0];
        }

        foreach ($rows as $r) {
            $key = $r->day instanceof \DateTimeInterface ? $r->day->format('Y-m-d') : (string) $r->day;
            if (! isset($byDay[$key])) continue;
            $providerKey = $r->provider === 'orange_ci' ? 'orange_ci' : 'wave_ci';
            $byDay[$key][$providerKey] += (float) $r->total;
            $byDay[$key]['total'] += (float) $r->total;
        }

        $daily = array_values($byDay);

        $providerMix = [
            ['provider' => 'orange_ci', 'amount' => array_sum(array_column($daily, 'orange_ci'))],
            ['provider' => 'wave_ci',   'amount' => array_sum(array_column($daily, 'wave_ci'))],
        ];

        return $this->success([
            'daily'        => $daily,
            'provider_mix' => $providerMix,
            'total'        => array_sum(array_column($daily, 'total')),
            'currency'     => 'XOF',
            'period'       => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ], 'Évolution du chiffre d\'affaires.');
    }

    /**
     * GET /api/owner/dashboard/occupancy
     * Snapshot of room occupancy + top booked rooms.
     */
    public function occupancy(Request $request): JsonResponse
    {
        $days = (int) $request->integer('days', 30);
        $from = now()->subDays($days - 1)->startOfDay();
        $to   = now()->endOfDay();

        $totalRooms = Room::count();
        $occupied   = Room::where('status', 'occupied')->count();

        $topRooms = Room::withCount(['reservations as bookings_count' => function ($q) use ($from, $to) {
            $q->whereBetween('check_in_date', [$from, $to])
              ->whereIn('status', ['confirmed', 'checked_in', 'checked_out']);
        }])
            ->orderByDesc('bookings_count')
            ->limit(5)
            ->get(['id', 'room_number', 'room_type']);

        return $this->success([
            'occupancy_rate' => $totalRooms > 0 ? round($occupied / $totalRooms * 100, 2) : 0,
            'total_rooms'    => $totalRooms,
            'occupied_rooms' => $occupied,
            'top_rooms'      => $topRooms,
            'period'         => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ], 'Taux d\'occupation.');
    }

    private function parsePeriod(Request $request): array
    {
        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->endOfMonth()->toDateString();

        return [$from . ' 00:00:00', $to . ' 23:59:59'];
    }
}
