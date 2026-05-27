<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    /* ─────────────────────────────────────────────────────────────
     | POST /admin/reservations/{id}/cash-payment
     |
     | Enregistre un paiement en espèces lors du check-in ou après.
     | Le montant est automatiquement le solde restant.
     |
     | Règles de permission :
     |  - Réservation standard (plan full) : manage_reservations suffit.
     |  - Réservation avec acompte non soldé (plan partial) :
     |      → manage_payments  OU  checkin_with_deposit requis.
     |      Le réceptionniste sans ces permissions est bloqué.
     |
     | Traçabilité : pour tout règlement d'acompte, l'identité de
     | l'acteur (nom, rôle, permission utilisée) est inscrite
     | explicitement dans l'entrée d'audit — sans ambiguïté.
     ──────────────────────────────────────────────────────────── */
    public function cashPayment(Request $request, int $id): JsonResponse
    {
        /** @var \App\Models\Admin $actor */
        $actor       = $request->user();
        $reservation = Reservation::with(['client', 'room', 'payments'])->find($id);

        if (! $reservation) {
            return $this->notFound('Réservation introuvable.');
        }

        // Vérifier que la réservation est dans un état où un paiement espèces est pertinent
        if (! in_array($reservation->status, ['confirmed', 'checked_in', 'checked_out'])) {
            return $this->error(
                'Un paiement en espèces n\'est possible que pour une réservation confirmée ou en cours.',
                422
            );
        }

        $remaining = $reservation->remainingAmount();

        if ($remaining <= 0) {
            return $this->error('Cette réservation est déjà entièrement payée.', 422);
        }

        // ── Vérification de permission pour les acomptes ────────────
        // Un acompte non soldé sur un plan "partial" est une opération financière
        // sensible : seuls manage_payments ou checkin_with_deposit y ont accès.
        $isDepositSettlement = $reservation->payment_plan === 'partial' && $reservation->paidAmount() > 0;

        if ($isDepositSettlement) {
            $canManagePayments = $actor->hasPermission('manage_payments');
            $canHandleDeposit  = $actor->hasPermission('checkin_with_deposit');

            if (! $canManagePayments && ! $canHandleDeposit) {
                $roleLabels = [
                    'manager'      => 'Manager',
                    'receptionist' => 'Réceptionniste',
                    'accountant'   => 'Comptable',
                ];
                $actorRole = $roleLabels[$actor->role] ?? $actor->role;

                return $this->error(
                    "Règlement d'acompte refusé — vous n'avez pas les droits nécessaires ({$actorRole}). ".
                    "L'encaissement du solde d'une réservation avec acompte relève du Manager ou du Comptable. ".
                    "Contactez votre responsable pour effectuer cette opération.",
                    403
                );
            }
        }

        // ── Création du paiement ────────────────────────────────────
        $paidSoFar   = $reservation->paidAmount();
        $paymentType = $paidSoFar > 0 ? 'balance' : ($reservation->payment_plan === 'partial' ? 'deposit' : 'full');

        $payment = DB::transaction(function () use ($reservation, $remaining, $paymentType) {
            return Payment::create([
                'reservation_id'        => $reservation->id,
                'client_id'             => $reservation->client_id,
                'provider'              => 'cash',
                'phone_number'          => null,
                'amount'                => $remaining,
                'currency'              => 'XOF',
                'transaction_reference' => 'CASH-' . strtoupper(uniqid()) . '-' . $reservation->id,
                'status'                => 'success',
                'payment_type'          => $paymentType,
                'confirmed_at'          => now(),
                'simulation_mode'       => false,
            ]);
        });

        // ── Audit — traçabilité renforcée pour les règlements d'acompte ──
        // L'identité de l'acteur est inscrite explicitement dans new_values
        // (nom complet, rôle, permission utilisée) afin d'éviter toute ambiguïté
        // ou tentative de fraude, même si le compte est modifié ultérieurement.
        $roleLabels = [
            'manager'      => 'Manager',
            'receptionist' => 'Réceptionniste',
            'accountant'   => 'Comptable',
        ];

        $auditAction = $isDepositSettlement
            ? AuditLog::ACTION_DEPOSIT_SETTLED
            : AuditLog::ACTION_PAYMENT_RECORDED;

        $auditNewValues = [
            'reservation_id'     => $reservation->id,
            'amount'             => $remaining,
            'provider'           => 'cash',
            'payment_type'       => $paymentType,
            // Traçabilité explicite — toujours présente pour les règlements d'acompte
            'recorded_by_id'     => $actor->id,
            'recorded_by_name'   => trim("{$actor->first_name} {$actor->last_name}"),
            'recorded_by_role'   => $roleLabels[$actor->role] ?? $actor->role,
        ];

        if ($isDepositSettlement) {
            // Pour un règlement d'acompte, on note également la permission utilisée
            $permUsed = $actor->hasPermission('manage_payments') ? 'manage_payments' : 'checkin_with_deposit';
            $auditNewValues['permission_used']    = $permUsed;
            $auditNewValues['deposit_settlement'] = true;
            $auditNewValues['client_name']        = trim("{$reservation->client->first_name} {$reservation->client->last_name}");
            $auditNewValues['room_number']        = $reservation->room->room_number;
        }

        AuditService::log(
            $actor,
            $auditAction,
            'Payment',
            $payment->id,
            null,
            $auditNewValues
        );

        // Recharger la réservation avec ses paiements pour la réponse
        $reservation->refresh();
        $reservation->load(['client', 'room', 'payments']);

        $msg = $isDepositSettlement
            ? "Solde d'acompte de ".number_format($remaining, 0, ',', ' ')." FCFA encaissé en espèces."
            : "Paiement en espèces de ".number_format($remaining, 0, ',', ' ')." FCFA enregistré avec succès.";

        return $this->success(new ReservationResource($reservation), $msg);
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /admin/reservations/{id}/receipt
     | Reçu récapitulatif PDF (vue admin).
     ──────────────────────────────────────────────────────────── */
    public function receipt(int $id): Response
    {
        $reservation = Reservation::with([
            'client',
            'room',
            'payments' => fn ($q) => $q->where('status', 'success')->orderBy('confirmed_at'),
        ])->find($id);

        if (! $reservation || ! $reservation->hasReceipt()) {
            abort(404, 'Reçu non disponible pour cette réservation.');
        }

        $pdf = Pdf::loadView('receipts.reservation', ['reservation' => $reservation]);

        return $pdf->download("recu-reservation-{$reservation->id}.pdf");
    }
}
