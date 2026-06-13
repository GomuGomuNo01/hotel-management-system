<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\ReservationResource;
use App\Models\Admin;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        /** @var Admin $admin */
        $admin = $request->user();
        $today = today()->toDateString();

        $canRooms = $admin->hasPermission('manage_rooms');
        $canRes   = $admin->hasPermission('manage_reservations');
        $canCheck = $admin->hasPermission('manage_checkin_checkout');
        $canPay   = $admin->hasPermission('manage_payments');

        $kpi     = [];
        $payload = [];

        // ── Chambres ─────────────────────────────────────────────────────────
        if ($canRooms) {
            $roomStats = Room::selectRaw("
                SUM(status = 'available')    AS available,
                SUM(status = 'occupied')     AS occupied,
                SUM(status = 'maintenance')  AS maintenance
            ")->first();

            $kpi['available_rooms']   = (int) ($roomStats->available   ?? 0);
            $kpi['occupied_rooms']    = (int) ($roomStats->occupied    ?? 0);
            $kpi['maintenance_rooms'] = (int) ($roomStats->maintenance ?? 0);
        }

        // ── Réservations / Check-in-out (1 query partagée si nécessaire) ──────
        if ($canRes || $canCheck) {
            $resStats = DB::table('reservations')->selectRaw("
                SUM(DATE(created_at) = ?)    AS today_reservations,
                SUM(status = 'pending')      AS pending_reservations,
                SUM(DATE(check_in_date)  = ? AND status = 'confirmed')   AS today_check_ins,
                SUM(DATE(check_out_date) = ? AND status = 'checked_in')  AS today_check_outs
            ", [$today, $today, $today])->first();
        }

        if ($canRes) {
            $kpi['today_reservations']   = (int) ($resStats->today_reservations  ?? 0);
            $kpi['pending_reservations'] = (int) ($resStats->pending_reservations ?? 0);

            $payload['recent_reservations'] = ReservationResource::collection(
                Reservation::with(['client:id,first_name,last_name,email', 'room:id,room_number,room_type'])
                    ->latest()->limit(30)->get()
            );

            // Prochaines arrivées (J+1 à J+3) — utile pour la réceptionniste
            $payload['upcoming_checkins'] = ReservationResource::collection(
                Reservation::with(['client:id,first_name,last_name,email', 'room:id,room_number,room_type'])
                    ->where('status', 'confirmed')
                    ->whereBetween('check_in_date', [
                        today()->addDay()->toDateString(),
                        today()->addDays(3)->toDateString(),
                    ])
                    ->orderBy('check_in_date')
                    ->limit(15)
                    ->get()
            );
        }

        if ($canCheck) {
            $kpi['today_check_ins']  = (int) ($resStats->today_check_ins  ?? 0);
            $kpi['today_check_outs'] = (int) ($resStats->today_check_outs ?? 0);

            // Clients actuellement en séjour
            $kpi['checked_in_count'] = Reservation::where('status', 'checked_in')->count();

            // Arrivées dans les 3 prochains jours (compteur)
            $kpi['upcoming_checkins_3days'] = Reservation::where('status', 'confirmed')
                ->whereBetween('check_in_date', [
                    today()->addDay()->toDateString(),
                    today()->addDays(3)->toDateString(),
                ])->count();

            // payments success eager-loadés → is_fully_paid / remaining_amount corrects
            $withPayments = ['client:id,first_name,last_name,email', 'room:id,room_number,room_type',
                'payments' => fn ($q) => $q->where('status', 'success')];

            $payload['today_check_ins'] = ReservationResource::collection(
                Reservation::with($withPayments)
                    ->whereDate('check_in_date', $today)->where('status', 'confirmed')
                    ->orderBy('check_in_date')->get()
            );
            $payload['today_check_outs'] = ReservationResource::collection(
                Reservation::with($withPayments)
                    ->whereDate('check_out_date', $today)->where('status', 'checked_in')
                    ->orderBy('check_out_date')->get()
            );
        }

        // ── Paiements & remboursements ───────────────────────────────────────
        if ($canPay) {
            $kpi['pending_payments'] = Payment::where('status', 'pending')->count();
            $kpi['pending_refunds']  = Refund::where('status', 'pending')->count();

            // Montant total des paiements en attente
            $kpi['pending_payments_amount'] = (float) Payment::where('status', 'pending')->sum('amount');

            // Recettes confirmées aujourd'hui
            $kpi['revenue_today'] = (float) Payment::where('status', 'success')
                ->whereDate('updated_at', $today)
                ->sum('amount');

            // Recettes confirmées ce mois
            $kpi['revenue_this_month'] = (float) Payment::where('status', 'success')
                ->whereYear('updated_at',  today()->year)
                ->whereMonth('updated_at', today()->month)
                ->sum('amount');

            $payload['pending_payments'] = PaymentResource::collection(
                Payment::with('reservation.client:id,first_name,last_name,email',
                              'reservation.room:id,room_number,room_type')
                    ->where('status', 'pending')->latest()->limit(8)->get()
            );

            // Soldes en attente : réservations 2x dont le solde n'est pas réglé
            $unpaidBalance = function ($q) {
                $q->whereIn('status', ['confirmed', 'checked_in'])
                  ->where('payment_plan', 'partial')
                  ->whereRaw('total_amount > COALESCE((SELECT SUM(p.amount) FROM payments p
                              WHERE p.reservation_id = reservations.id AND p.status = "success"), 0)');
            };

            $kpi['pending_balances'] = Reservation::where($unpaidBalance)->count();

            $payload['pending_balances'] = ReservationResource::collection(
                Reservation::with(['client:id,first_name,last_name,email', 'room:id,room_number,room_type',
                    'payments' => fn ($q) => $q->where('status', 'success')])
                    ->where($unpaidBalance)
                    ->latest()->limit(8)->get()
            );
        }

        return $this->success(array_merge(['kpi' => $kpi], $payload), 'Tableau de bord administrateur.');
    }

    /**
     * GET /api/admin/badges
     *
     * Remplace les 3 appels séparés de useBadgeSync en un seul endpoint.
     * Retourne uniquement les compteurs autorisés pour cet admin.
     * Exécute 1 à 3 requêtes SQL optimisées selon les permissions.
     */
    public function badges(Request $request): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user();
        $data  = ['refunds' => 0, 'deposits' => 0, 'checkins' => 0, 'complaints' => 0];

        // ── 1. Remboursements en attente ─────────────────────────────────────
        if ($admin->hasPermission('manage_payments')) {
            $data['refunds'] = DB::table('refunds')
                ->where('status', 'pending')
                ->count();
        }

        // ── 2. Acomptes non soldés (SQL pur - élimine le N+1 PHP) ────────────
        if ($admin->hasPermission('manage_reservations')) {
            // Sous-requête : réservations partielles dont le solde > 0
            $data['deposits'] = (int) DB::selectOne("
                SELECT COUNT(*) AS cnt
                FROM reservations r
                WHERE r.status IN ('confirmed', 'checked_in')
                  AND r.payment_plan = 'partial'
                  AND r.total_amount > COALESCE(
                        ( SELECT SUM(p.amount)
                          FROM payments p
                          WHERE p.reservation_id = r.id
                            AND p.status = 'success' ),
                        0
                      )
            ")->cnt;
        }

        // ── 3. Check-in / Check-out éligibles (réservations actives) ─────────
        if ($admin->hasPermission('manage_checkin_checkout')) {
            $data['checkins'] = DB::table('reservations')
                ->whereIn('status', ['confirmed', 'checked_in'])
                ->count();
        }

        // ── 4. Réclamations ouvertes ─────────────────────────────────────────
        if ($admin->hasPermission('manage_complaints')) {
            $data['complaints'] = DB::table('complaints')
                ->where('status', 'open')
                ->count();
        }

        return response()->json(['data' => $data]);
    }
}
