<?php

namespace App\Http\Controllers\Client;

use App\Helpers\DocumentRef;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\InitiatePaymentRequest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\PaymentService\OrangeCIService;
use App\Services\PaymentService\WaveCIService;
use App\Models\AuditLog;
use App\Services\AuditService;
use App\Services\ReservationService;
use App\Traits\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private OrangeCIService    $orangeCI,
        private WaveCIService      $waveCI,
        private ReservationService $reservationService,
    ) {}

    /* ─────────────────────────────────────────────────────────────
     | POST /payments/initiate
     | Crée un paiement selon le plan de la réservation.
     |
     | Logique de calcul du montant :
     |   - Aucun paiement réussi + plan=full   → 100 % du total
     |   - Aucun paiement réussi + plan=partial → 50 % du total (acompte)
     |   - Paiement(s) réussi(s) + solde > 0   → solde restant
     ──────────────────────────────────────────────────────────── */
    public function initiate(InitiatePaymentRequest $request): JsonResponse
    {
        $data        = $request->validated();
        $reservation = Reservation::find($data['reservation_id']);

        if (! $reservation || $reservation->client_id !== $request->user()->id) {
            return $this->notFound('Réservation introuvable.');
        }

        if (! in_array($reservation->status, ['pending', 'confirmed', 'checked_in'])) {
            return $this->error('Cette réservation ne peut pas être payée.', 422);
        }

        // Auto-expirer les paiements en attente dépassés pour libérer le slot
        $reservation->payments()
            ->where('status', 'pending')
            ->get()
            ->each(fn ($p) => $p->isExpired() && $p->update(['status' => 'cancelled']));

        // Bloquer si un paiement en attente non expiré existe déjà
        if ($reservation->payments()->where('status', 'pending')->exists()) {
            return $this->error(
                'Un paiement est déjà en cours pour cette réservation. Attendez son expiration ou annulez-le.',
                409
            );
        }

        // ── Calcul du montant et du type de paiement ──────────────
        $paidAmount = $reservation->paidAmount();
        $remaining  = $reservation->remainingAmount();

        if ($remaining <= 0) {
            return $this->error('Cette réservation est déjà entièrement payée.', 422);
        }

        if ($paidAmount > 0) {
            // Paiement du solde restant (2e tranche pour plan partiel)
            $amount      = $remaining;
            $paymentType = 'balance';
        } elseif ($reservation->payment_plan === 'partial') {
            // Premier paiement = acompte 50 %
            $amount      = round($reservation->total_amount / 2, 2);
            $paymentType = 'deposit';
        } else {
            // Paiement intégral
            $amount      = (float) $reservation->total_amount;
            $paymentType = 'full';
        }

        $payment = match ($data['provider']) {
            'orange_ci' => $this->orangeCI->initiate($reservation, $data['phone_number'], $amount, $paymentType),
            'wave_ci'   => $this->waveCI->initiate($reservation, $data['phone_number'], $amount, $paymentType),
        };

        return $this->created($this->formatPayment($payment), 'Paiement initié avec succès.');
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /payments/{id}/status
     | Statut d'un paiement, avec auto-expiration si dépassé.
     ──────────────────────────────────────────────────────────── */
    public function status(int $id, Request $request): JsonResponse
    {
        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->first();

        if (! $payment) {
            return $this->notFound('Paiement introuvable.');
        }

        if ($payment->status === 'pending' && $payment->isExpired()) {
            $payment->update(['status' => 'cancelled']);
            $this->autoCancelReservationIfAbandoned($payment);
        }

        return $this->success($this->formatPayment($payment));
    }

    /* ─────────────────────────────────────────────────────────────
     | DELETE /payments/{id}
     | Le client annule manuellement un paiement en attente.
     ──────────────────────────────────────────────────────────── */
    public function cancel(int $id, Request $request): JsonResponse
    {
        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->where('status', 'pending')
            ->first();

        if (! $payment) {
            return $this->notFound('Paiement introuvable ou non annulable.');
        }

        $this->authorize('cancel', $payment);

        $payment->update(['status' => 'cancelled']);
        $this->autoCancelReservationIfAbandoned($payment);

        return $this->success($this->formatPayment($payment), 'Paiement annulé.');
    }

    /* ─────────────────────────────────────────────────────────────
     | POST /payments/{id}/simulate
     | Simule la réponse du fournisseur (mode simulation uniquement).
     ──────────────────────────────────────────────────────────── */
    public function simulate(int $id, Request $request): JsonResponse
    {
        if (! config('services.payment.simulation', true)) {
            return $this->error('Mode simulation désactivé.', 403);
        }

        $request->validate([
            'outcome' => ['required', 'in:success,failed'],
        ]);

        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->where('status', 'pending')
            ->first();

        if (! $payment) {
            return $this->notFound('Paiement introuvable ou déjà traité.');
        }

        if ($payment->isExpired()) {
            $payment->update(['status' => 'cancelled']);
            return $this->error('Ce paiement a expiré.', 422);
        }

        $webhookPayload = $this->buildSimulatedWebhook($payment, $request->input('outcome'));

        match ($payment->provider) {
            'orange_ci' => $this->orangeCI->handleWebhook($webhookPayload),
            'wave_ci'   => $this->waveCI->handleWebhook($webhookPayload),
        };

        return $this->success(
            $this->formatPayment($payment->fresh()),
            $request->input('outcome') === 'success' ? 'Paiement simulé avec succès.' : 'Échec simulé.'
        );
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /payments/{id}/invoice
     | Ancienne route conservée pour compatibilité - désormais
     | restreinte aux réservations en statut checked_out.
     ──────────────────────────────────────────────────────────── */
    public function invoice(int $id, Request $request): Response
    {
        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->where('status', 'success')
            ->with(['reservation.room', 'client'])
            ->first();

        if (! $payment || $payment->reservation?->status !== 'checked_out') {
            abort(404, 'Facture non disponible. Elle sera générée à l\'issue de votre séjour.');
        }

        // Date d'émission STABLE (date du paiement), pas la date d'ouverture du PDF
        $issuedAt = $payment->confirmed_at ?? $payment->created_at;

        // Référence centralisée PAY-XXXXXX (payment.id paddé)
        $docRef = DocumentRef::payment($payment);

        $pdf = Pdf::loadView('invoices.payment', [
            'payment'  => $payment,
            'issuedAt' => $issuedAt,
            'docRef'   => $docRef,
        ]);

        return $pdf->stream(DocumentRef::filename($docRef));
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /reservations/{id}/invoice
     | Facture complète de séjour - disponible uniquement après
     | validation du check-out par l'administrateur.
     ──────────────────────────────────────────────────────────── */
    public function reservationInvoice(int $reservationId, Request $request): Response
    {
        $reservation = $request->user()
            ->reservations()
            ->with(['room', 'client', 'payments' => fn ($q) => $q->where('status', 'success')->orderBy('confirmed_at')])
            ->find($reservationId);

        if (! $reservation || $reservation->status !== 'checked_out') {
            abort(404, 'Facture non disponible. Elle sera générée à l\'issue de votre séjour.');
        }

        // Date d'émission STABLE (dernier paiement confirmé), pas la date d'ouverture
        $issuedAt = optional($reservation->payments->last())->confirmed_at ?? $reservation->created_at;

        // Référence centralisée FAC-XXXXXX (reservation.id paddé)
        $docRef = DocumentRef::invoice($reservation);

        $pdf = Pdf::loadView('invoices.reservation', [
            'reservation' => $reservation,
            'issuedAt'    => $issuedAt,
            'docRef'      => $docRef,
        ]);

        return $pdf->stream(DocumentRef::filename($docRef));
    }

    /* ─────────────────────────────────────────────────────────────
     | GET /reservations/{id}/receipt
     | Reçu récapitulatif PDF de la réservation (client).
     ──────────────────────────────────────────────────────────── */
    public function receipt(int $reservationId, Request $request): Response
    {
        $reservation = $request->user()
            ->reservations()
            ->with([
                'room',
                'client',
                'payments' => fn ($q) => $q->where('status', 'success')->orderBy('confirmed_at'),
                'refunds'  => fn ($q) => $q->latest(),
            ])
            ->find($reservationId);

        if (! $reservation || ! $reservation->hasReceipt()) {
            abort(404, 'Reçu non disponible. Effectuez d\'abord un paiement.');
        }

        // Référence centralisée — identique côté admin
        $docRef   = DocumentRef::receipt($reservation);
        $filename = DocumentRef::filename($docRef);

        // Date d'émission STABLE (dernier paiement confirmé), pas la date d'ouverture
        $issuedAt = optional($reservation->payments->last())->confirmed_at ?? $reservation->created_at;

        $pdf = Pdf::loadView('receipts.reservation', [
            'reservation' => $reservation,
            'issuedAt'    => $issuedAt,
            'docRef'      => $docRef,
        ]);

        return $pdf->stream($filename);
    }

    /* ─────────────────────────────────────────────────────────────
     | POST /webhooks/orange  (middleware: webhook:orange)
     ──────────────────────────────────────────────────────────── */
    public function webhookOrange(Request $request): JsonResponse
    {
        $result = $this->orangeCI->handleWebhook($request->all());
        return response()->json(['success' => $result]);
    }

    /* ─────────────────────────────────────────────────────────────
     | POST /webhooks/wave  (middleware: webhook:wave)
     ──────────────────────────────────────────────────────────── */
    public function webhookWave(Request $request): JsonResponse
    {
        $result = $this->waveCI->handleWebhook($request->all());
        return response()->json(['success' => $result]);
    }

    /* ─────────────────────────────────────────────────────────────
     | Helpers privés
     ──────────────────────────────────────────────────────────── */

    /**
     * Annule automatiquement la réservation si le paiement est abandonné
     * (annulé ou expiré) et qu'aucun paiement réussi n'a encore été confirmé.
     *
     * Règle : pas de paiement = pas de réservation.
     * Si un acompte a déjà été encaissé (réservation confirmée), on ne touche
     * pas à la réservation - le client annule juste sa tentative de solde.
     */
    private function autoCancelReservationIfAbandoned(Payment $payment): void
    {
        $reservation = $payment->reservation()->with(['payments', 'client', 'room'])->first();

        if (! $reservation) {
            return;
        }

        // N'annuler que si la réservation est encore en attente (jamais confirmée)
        if ($reservation->status !== 'pending') {
            return;
        }

        // Ne rien faire si un paiement réussi existe déjà (ne devrait pas arriver
        // puisque le premier succès passe le statut à 'confirmed', mais par sécurité)
        if ($reservation->payments()->where('status', 'success')->exists()) {
            return;
        }

        $this->reservationService->cancelReservation($reservation);

        // Diffusion temps-réel - le planning et les listes admin/client se mettent à jour
        \App\Events\HotelBroadcast::dispatch('reservation.cancelled', [
            'reservationId' => $reservation->id,
            'clientId'      => $reservation->client_id,
            'cancelledBy'   => 'system',
        ]);

        // Audit - annulation automatique déclenchée par l'abandon de paiement (pas d'admin)
        AuditService::log(
            null,
            AuditLog::ACTION_RESERVATION_AUTO_CANCELLED,
            'Reservation',
            $reservation->id,
            null,
            [
                'reason'     => 'payment_abandoned',
                'payment_id' => $payment->id,
                'client_id'  => $reservation->client_id,
            ]
        );
    }

    /** Sérialise un paiement pour le frontend. */
    private function formatPayment(Payment $payment): array
    {
        return [
            'id'                    => $payment->id,
            'provider'              => $payment->provider,
            'phone_number'          => $payment->phone_number,
            'amount'                => (float) $payment->amount,
            'currency'              => $payment->currency,
            'status'                => $payment->status,
            'payment_type'          => $payment->payment_type,
            'transaction_reference' => $payment->transaction_reference,
            'simulation_mode'       => (bool) $payment->simulation_mode,
            'expires_at'            => $payment->expires_at?->toIso8601String(),
            'confirmed_at'          => $payment->confirmed_at?->toIso8601String(),
            'created_at'            => $payment->created_at?->toIso8601String(),
        ];
    }

    /** Construit un payload de webhook simulé cohérent avec chaque fournisseur. */
    private function buildSimulatedWebhook(Payment $payment, string $outcome): array
    {
        $ref = $payment->transaction_reference;

        return match ($payment->provider) {
            'orange_ci' => [
                'order_id'   => $ref,
                'reference'  => $ref,
                'status'     => $outcome === 'success' ? 'SUCCESS' : 'FAILED',
                'amount'     => (float) $payment->amount,
                'currency'   => 'XOF',
                'simulated'  => true,
            ],
            'wave_ci' => [
                'client_reference' => $ref,
                'payment_status'   => $outcome === 'success' ? 'succeeded' : 'failed',
                'amount'           => (float) $payment->amount,
                'currency'         => 'XOF',
                'simulated'        => true,
            ],
        };
    }
}
