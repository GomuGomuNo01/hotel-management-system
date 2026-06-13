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
     *
     * Rapport financier complet :
     *   - Revenus (mois, YTD, total, nets, journaliers)
     *   - Indicateurs hôteliers : ADR, RevPAR, taux d'occupation
     *   - Créances en attente (acomptes partiels non soldés)
     *   - Réservations par statut
     *   - Chambres (disponibilité + revenu par chambre)
     *   - Remboursements + taux de remboursement
     *   - Répartition méthodes de paiement
     *   - Top 5 chambres par revenu généré
     */
    public function summary(): JsonResponse
    {
        $thisMonth    = now()->startOfMonth();
        $lastMonth    = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();
        $startOfYear  = now()->startOfYear();
        $daysInMonth  = now()->daysInMonth;

        /* ══════════════════════════════════════════
         │  REVENUS BRUTS
         ══════════════════════════════════════════ */
        $revenueThisMonth = (float) Payment::where('status', 'success')
            ->where('created_at', '>=', $thisMonth)
            ->sum('amount');

        $revenueLastMonth = (float) Payment::where('status', 'success')
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->sum('amount');

        $revenueYtd = (float) Payment::where('status', 'success')
            ->where('created_at', '>=', $startOfYear)
            ->sum('amount');

        $revenueTotalAllTime = (float) Payment::where('status', 'success')->sum('amount');

        /* ── Revenus par mois (12 derniers mois) ── */
        $revenueByMonth = Payment::where('status', 'success')
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => ['month' => $r->month, 'total' => (float) $r->total]);

        /* ── Revenus journaliers du mois en cours ── */
        $revenueDaily = Payment::where('status', 'success')
            ->where('created_at', '>=', $thisMonth)
            ->selectRaw("DAY(created_at) as day, SUM(amount) as total")
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($r) => ['day' => (int) $r->day, 'total' => (float) $r->total]);

        /* ══════════════════════════════════════════
         │  REMBOURSEMENTS & REVENUS NETS
         ══════════════════════════════════════════ */
        $refundedThisMonth = (float) Refund::where('status', 'approved')
            ->where('processed_at', '>=', $thisMonth)
            ->sum('amount');

        $revenueNetThisMonth = $revenueThisMonth - $refundedThisMonth;

        $refundsTotalApproved = (float) Refund::where('status', 'approved')->sum('amount');

        $refundRate = $revenueThisMonth > 0
            ? round(($refundedThisMonth / $revenueThisMonth) * 100, 1)
            : 0.0;

        $refundStats = [
            'pending'              => Refund::where('status', 'pending')->count(),
            'approved'             => Refund::where('status', 'approved')->count(),
            'rejected'             => Refund::where('status', 'rejected')->count(),
            'total_amount_refunded'=> $refundsTotalApproved,
            'amount_this_month'    => $refundedThisMonth,
            'rate_this_month'      => $refundRate,
        ];

        /* ══════════════════════════════════════════
         │  CRÉANCES EN ATTENTE (ACOMPTES PARTIELS)
         ══════════════════════════════════════════ */
        $partialReservations = Reservation::with('payments')
            ->where('payment_plan', 'partial')
            ->whereIn('status', ['confirmed', 'checked_in'])
            ->get();

        $outstandingAmount = $partialReservations
            ->sum(fn (Reservation $r) => $r->remainingAmount());

        $outstandingCount = $partialReservations
            ->filter(fn (Reservation $r) => $r->remainingAmount() > 0)
            ->count();

        /* Paiements initiés (en attente de confirmation opérateur) */
        $pendingPaymentsAmount = (float) Payment::where('status', 'initiated')->sum('amount');
        $pendingPaymentsCount  = Payment::where('status', 'initiated')->count();

        /* ══════════════════════════════════════════
         │  RÉSERVATIONS
         ══════════════════════════════════════════ */
        $reservationStats = [
            'total'      => Reservation::count(),
            'this_month' => Reservation::where('created_at', '>=', $thisMonth)->count(),
            'pending'    => Reservation::where('status', 'pending')->count(),
            'confirmed'  => Reservation::where('status', 'confirmed')->count(),
            'checked_in' => Reservation::where('status', 'checked_in')->count(),
            'completed'  => Reservation::where('status', 'checked_out')->count(),
            'cancelled'  => Reservation::where('status', 'cancelled')->count(),
        ];

        /* ══════════════════════════════════════════
         │  CHAMBRES & INDICATEURS HÔTELIERS
         ══════════════════════════════════════════ */
        $roomStats = [
            'total'       => Room::count(),
            'available'   => Room::where('status', 'available')->count(),
            'occupied'    => Room::where('status', 'occupied')->count(),
            'maintenance' => Room::where('status', 'maintenance')->count(),
        ];

        $totalRooms       = max($roomStats['total'], 1);
        $occupancyRate    = round(($roomStats['occupied'] / $totalRooms) * 100, 1);
        $roomStats['occupancy_rate'] = $occupancyRate;

        /*
         * ADR  = Revenu brut du mois / (Chambres × jours du mois)
         * RevPAR = ADR × taux d'occupation / 100
         * Ces métriques standard mesurent la performance de l'hébergement.
         */
        $adr    = $totalRooms * $daysInMonth > 0
            ? round($revenueThisMonth / ($totalRooms * $daysInMonth))
            : 0;
        $revpar = round($adr * ($occupancyRate / 100));

        /* ══════════════════════════════════════════
         │  RÉPARTITION PAR MÉTHODE DE PAIEMENT
         ══════════════════════════════════════════ */
        $paymentMethods = Payment::where('status', 'success')
            ->selectRaw('provider, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('provider')
            ->get()
            ->map(fn ($r) => [
                'method' => $r->provider,
                'count'  => (int) $r->count,
                'total'  => (float) $r->total,
            ]);

        /* ══════════════════════════════════════════
         │  TOP 5 CHAMBRES PAR REVENU GÉNÉRÉ
         ══════════════════════════════════════════ */
        $revenueByRoom = Payment::where('payments.status', 'success')
            ->join('reservations', 'payments.reservation_id', '=', 'reservations.id')
            ->join('rooms', 'reservations.room_id', '=', 'rooms.id')
            ->selectRaw('
                rooms.id,
                rooms.room_number,
                rooms.room_type,
                rooms.price_per_night,
                COUNT(DISTINCT reservations.id) as bookings,
                SUM(payments.amount) as revenue
            ')
            ->groupBy('rooms.id', 'rooms.room_number', 'rooms.room_type', 'rooms.price_per_night')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'room_id'         => $r->id,
                'room_number'     => $r->room_number,
                'room_type'       => $r->room_type,
                'price_per_night' => (float) $r->price_per_night,
                'bookings'        => (int) $r->bookings,
                'revenue'         => (float) $r->revenue,
            ]);

        /* Top 5 par nombre de réservations (pour comparaison) */
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

        /* ══════════════════════════════════════════
         │  RÉPONSE FINALE
         ══════════════════════════════════════════ */
        return $this->success([
            'period' => [
                'label'        => now()->locale('fr')->isoFormat('MMMM YYYY'),
                'generated_at' => now()->toIso8601String(),
            ],
            'revenue' => [
                'this_month'    => $revenueThisMonth,
                'last_month'    => $revenueLastMonth,
                'net_this_month'=> $revenueNetThisMonth,
                'ytd'           => $revenueYtd,
                'all_time'      => $revenueTotalAllTime,
                'by_month'      => $revenueByMonth,
                'daily'         => $revenueDaily,
            ],
            'indicators' => [
                'adr'            => $adr,
                'revpar'         => $revpar,
                'occupancy_rate' => $occupancyRate,
                'refund_rate'    => $refundRate,
            ],
            'outstanding' => [
                'balance_amount'        => (float) $outstandingAmount,
                'balance_count'         => $outstandingCount,
                'pending_payment_amount'=> $pendingPaymentsAmount,
                'pending_payment_count' => $pendingPaymentsCount,
            ],
            'reservations'    => $reservationStats,
            'rooms'           => $roomStats,
            'refunds'         => $refundStats,
            'payment_methods' => $paymentMethods,
            'revenue_by_room' => $revenueByRoom,
            'top_rooms'       => $topRooms,
        ], 'Rapport financier.');
    }
}
