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
     | Sécurité : seul un admin authentifié avec la permission
     |            manage_reservations peut appeler cet endpoint.
     ──────────────────────────────────────────────────────────── */
    public function cashPayment(Request $request, int $id): JsonResponse
    {
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

        // Déterminer le type : solde partiel ou paiement intégral en espèces
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

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_PAYMENT_RECORDED,
            'Payment',
            $payment->id,
            null,
            [
                'reservation_id' => $reservation->id,
                'amount'         => $remaining,
                'provider'       => 'cash',
                'payment_type'   => $paymentType,
            ]
        );

        // Recharger la réservation avec ses paiements pour la réponse
        $reservation->refresh();
        $reservation->load(['client', 'room', 'payments']);

        return $this->success(
            new ReservationResource($reservation),
            "Paiement en espèces de {$remaining} XOF enregistré avec succès."
        );
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
