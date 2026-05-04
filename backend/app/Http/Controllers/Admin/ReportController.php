<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/reports
     * Résumé financier pour les administrateurs ayant la permission view_reports.
     */
    public function summary(): JsonResponse
    {
        $today     = today();
        $thisMonth = now()->startOfMonth();
        $lastMonth = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();

        /* ── Revenus ── */
        $revenueThisMonth = Payment::where('status', 'completed')
            ->where('created_at', '>=', $thisMonth)
            ->sum('amount');

        $revenueLastMonth = Payment::where('status', 'completed')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->sum('amount');

        /* ── Revenus par mois (12 derniers mois) ── */
        $revenueByMonth = Payment::where('status', 'completed')
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => ['month' => $r->month, 'total' => (float) $r->total]);

        /* ── Réservations ── */
        $reservationStats = [
            'total'     => Reservation::count(),
            'this_month'=> Reservation::where('created_at', '>=', $thisMonth)->count(),
            'confirmed' => Reservation::where('status', 'confirmed')->count(),
            'cancelled'  => Reservation::where('status', 'cancelled')->count(),
            'checked_in' => Reservation::where('status', 'checked_in')->count(),
            'completed'  => Reservation::where('status', 'completed')->count(),
        ];

        /* ── Chambres ── */
        $roomStats = [
            'total'       => Room::count(),
            'available'   => Room::where('status', 'available')->count(),
            'occupied'    => Room::where('status', 'occupied')->count(),
            'maintenance' => Room::where('status', 'maintenance')->count(),
        ];
        $total = max($roomStats['total'], 1);
        $roomStats['occupancy_rate'] = round(($roomStats['occupied'] / $total) * 100, 1);

        /* ── Remboursements ── */
        $refundStats = [
            'pending'  => Refund::where('status', 'pending')->count(),
            'approved' => Refund::where('status', 'approved')->count(),
            'rejected' => Refund::where('status', 'rejected')->count(),
            'total_amount_refunded' => Refund::where('status', 'approved')->sum('amount'),
        ];

        /* ── Répartition par méthode de paiement ── */
        $paymentMethods = Payment::where('status', 'completed')
            ->selectRaw('payment_method, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($r) => [
                'method' => $r->payment_method,
                'count'  => (int) $r->count,
                'total'  => (float) $r->total,
            ]);

        /* ── Chambres les plus réservées ── */
        $topRooms = Reservation::with('room:id,room_number,room_type')
            ->select('room_id', DB::raw('COUNT(*) as bookings'))
            ->groupBy('room_id')
            ->orderByDesc('bookings')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'room_id'     => $r->room_id,
                'room_number' => $r->room?->room_number,
                'room_type'   => $r->room?->room_type,
                'bookings'    => (int) $r->bookings,
            ]);

        return $this->success([
            'revenue' => [
                'this_month'  => (float) $revenueThisMonth,
                'last_month'  => (float) $revenueLastMonth,
                'by_month'    => $revenueByMonth,
            ],
            'reservations'    => $reservationStats,
            'rooms'           => $roomStats,
            'refunds'         => $refundStats,
            'payment_methods' => $paymentMethods,
            'top_rooms'       => $topRooms,
        ], 'Rapport financier.');
    }
}
