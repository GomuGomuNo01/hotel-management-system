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

        $existingPending = $reservation->payments()
            ->where('status', 'pending')
            ->where('provider', $data['provider'])
            ->exists();

        if ($existingPending) {
            return $this->error('Un paiement est déjà en cours pour cette réservation.', 409);
        }

        $payment = match ($data['provider']) {
            'orange_ci' => $this->orangeCI->initiate($reservation, $data['phone_number']),
            'wave_ci'   => $this->waveCI->initiate($reservation, $data['phone_number']),
        };

        return $this->created($payment, 'Paiement initié avec succès.');
    }

    public function status(int $id, Request $request): JsonResponse
    {
        $payment = Payment::where('id', $id)
            ->where('client_id', $request->user()->id)
            ->first();

        if (! $payment) {
            return $this->notFound('Paiement introuvable.');
        }

        return $this->success($payment);
    }

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

    public function webhookOrange(Request $request): JsonResponse
    {
        $result = $this->orangeCI->handleWebhook($request->all());

        return response()->json(['success' => $result]);
    }

    public function webhookWave(Request $request): JsonResponse
    {
        $result = $this->waveCI->handleWebhook($request->all());

        return response()->json(['success' => $result]);
    }
}
