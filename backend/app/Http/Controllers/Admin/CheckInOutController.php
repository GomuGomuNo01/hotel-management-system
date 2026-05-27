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

    /**
     * GET /admin/checkin-eligible
     *
     * Retourne les réservations éligibles au check-in/out, séparées en deux groupes :
     *  - eligible   : confirmées ou en cours ET entièrement payées
     *  - with_deposit : confirmées ou en cours MAIS avec un solde restant (acompte non soldé)
     *
     * Le groupe with_deposit n'est retourné que si l'admin possède la permission
     * checkin_with_deposit ; sinon seul le compteur est transmis.
     */
    public function eligible(Request $request): JsonResponse
    {
        $admin = $request->user();

        $reservations = Reservation::with(['client', 'room', 'payments'])
            ->whereIn('status', ['confirmed', 'checked_in'])
            ->latest()
            ->get();

        $eligible    = [];
        $withDeposit = [];

        foreach ($reservations as $r) {
            if ($r->isFullyPaid()) {
                $eligible[] = $r;
            } else {
                $withDeposit[] = $r;
            }
        }

        $hasDepositPerm = $admin->hasPermission('checkin_with_deposit');

        return $this->success([
            'eligible'             => ReservationResource::collection(collect($eligible)),
            'with_deposit'         => $hasDepositPerm
                                        ? ReservationResource::collection(collect($withDeposit))
                                        : [],
            'with_deposit_count'   => count($withDeposit),
            'can_manage_deposit'   => $hasDepositPerm,
        ], 'Réservations éligibles au check-in / check-out.');
    }

    /**
     * POST /admin/checkin/{id}
     *
     * Effectue le check-in. Si la réservation a un solde restant, le service
     * lève une RuntimeException (solde dû) — le contrôleur renvoie une 422
     * claire avec un message orientant vers le paiement.
     *
     * Cas particulier : si l'admin a checkin_with_deposit ET que la réservation
     * avait un acompte (payment_plan = partial mais maintenant soldée), on trace
     * une action CHECKIN_WITH_DEPOSIT pour l'audit.
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'payments'])->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        // Vérification préalable du solde — donne un message ciblé avant même d'appeler le service.
        if (! $reservation->isFullyPaid()) {
            $canManageDeposit = $request->user()->hasPermission('checkin_with_deposit');

            if (! $canManageDeposit) {
                return $this->error(
                    "Check-in impossible : cette réservation comporte un acompte non soldé ".
                    "(solde restant : ".number_format($reservation->remainingAmount(), 0, ',', ' ')." FCFA). ".
                    "Ce type de situation relève du Manager ou du Comptable.",
                    403
                );
            }

            // L'admin a la permission mais le solde n'est pas encore réglé — on bloque quand même.
            return $this->error(
                "Check-in bloqué : le solde restant de ".number_format($reservation->remainingAmount(), 0, ',', ' ').
                " FCFA doit être enregistré avant de procéder. ".
                "Utilisez la section paiements pour saisir le règlement, puis revenez ici.",
                422
            );
        }

        // Solde soldé — on détermine si c'était une réservation avec acompte (partial)
        $wasPartialPlan = $reservation->payment_plan === 'partial';

        try {
            $reservation = $this->reservationService->checkIn($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        // Audit : action spécifique si plan partiel (acompte soldé avant check-in)
        $actionType = ($wasPartialPlan && $request->user()->hasPermission('checkin_with_deposit'))
            ? AuditLog::ACTION_CHECKIN_WITH_DEPOSIT
            : AuditLog::ACTION_CHECKIN_DONE;

        AuditService::log(
            $request->user(),
            $actionType,
            'Reservation',
            $reservation->id,
            null,
            array_filter([
                'status'      => 'checked_in',
                'room_status' => 'occupied',
                'deposit_plan'=> $wasPartialPlan ? 'partial_settled' : null,
            ])
        );

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room'])),
            'Check-in effectué avec succès.'
        );
    }

    /**
     * POST /admin/checkout/{id}
     *
     * Même logique que checkIn : solde vérifié, message contextualisé selon permission.
     */
    public function checkOut(Request $request, int $id): JsonResponse
    {
        $reservation = Reservation::with(['room', 'payments'])->find($id);
        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        if (! $reservation->isFullyPaid()) {
            $canManageDeposit = $request->user()->hasPermission('checkin_with_deposit');

            if (! $canManageDeposit) {
                return $this->error(
                    "Check-out impossible : cette réservation comporte un acompte non soldé ".
                    "(solde restant : ".number_format($reservation->remainingAmount(), 0, ',', ' ')." FCFA). ".
                    "Ce type de situation relève du Manager ou du Comptable.",
                    403
                );
            }

            return $this->error(
                "Check-out bloqué : le solde restant de ".number_format($reservation->remainingAmount(), 0, ',', ' ').
                " FCFA doit être enregistré avant de procéder. ".
                "Utilisez la section paiements pour saisir le règlement, puis revenez ici.",
                422
            );
        }

        $wasPartialPlan = $reservation->payment_plan === 'partial';

        try {
            $reservation = $this->reservationService->checkOut($reservation);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        $actionType = ($wasPartialPlan && $request->user()->hasPermission('checkin_with_deposit'))
            ? AuditLog::ACTION_CHECKOUT_WITH_DEPOSIT
            : AuditLog::ACTION_CHECKOUT_DONE;

        AuditService::log(
            $request->user(),
            $actionType,
            'Reservation',
            $reservation->id,
            null,
            array_filter([
                'status'      => 'checked_out',
                'room_status' => 'available',
                'deposit_plan'=> $wasPartialPlan ? 'partial_settled' : null,
            ])
        );

        return $this->success(
            new ReservationResource($reservation->fresh()->load(['client', 'room'])),
            'Check-out effectué avec succès.'
        );
    }
}
