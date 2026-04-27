<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\InitiatePaymentRequest;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\PaymentService\OrangeCIService;
use App\Services\PaymentService\WaveCIService;
use App\Traits\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private OrangeCIService $orangeCI,
        private WaveCIService   $waveCI,
    ) {}

    /* ─────────────────────────────────────────────────────────────
     | POST /payments/initiate
     | Crée un paiement en attente pour une réservation.
     ──────────────────────────────────────────────────────────── */
    public function initiate(InitiatePaymentRequest $request): JsonResponse
    {
        $data        = $request->validated();
        $reservation = Reservation::find($data['reservation_id']);

        if (! $reservation || $reservation->client_id !== $request->user()->id) {
            return $this->notFound('Réservation introuvable.');
        }

        if (! in_array($reservation->status, ['pending', 'confirmed'])) {
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

        $payment = match ($data['provider']) {
            'orange_ci' => $this->orangeCI->initiate($reservation, $data['phone_number']),
            'wave_ci'   => $this->waveCI->initiate($reservation, $data['phone_number']),
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

        // Auto-expiration des paiements en attente trop vieux
        if ($payment->status === 'pending' && $payment->isExpired()) {
            $payment->update(['status' => 'cancelled']);
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

        $payment->update(['status' => 'cancelled']);

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

        // Construire le payload simulé selon le fournisseur et déclencher le même code que le webhook
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
     ──────────────────────────────────────────────────────────── */
    public function invoice(int $id, Request $request): Response
    {
        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->where('status', 'success')
            ->with(['reservation.room', 'client'])
            ->first();

        if (! $payment) {
            abort(404, 'Facture non disponible.');
        }

        $pdf = Pdf::loadView('invoices.payment', ['payment' => $payment]);

        return $pdf->download("facture-{$payment->transaction_reference}.pdf");
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
