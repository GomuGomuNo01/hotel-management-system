<?php

namespace App\Services\PaymentService;

use App\Events\PaymentReceived;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class OrangeCIService
{
    private string $apiUrl;
    private string $merchantKey;

    public function __construct()
    {
        $this->apiUrl      = config('services.orange_ci.api_url', '');
        $this->merchantKey = config('services.orange_ci.merchant_key', '');
    }

    public function initiate(Reservation $reservation, string $phoneNumber): Payment
    {
        $reference = 'ORG-' . strtoupper(Str::random(12)) . '-' . $reservation->id;

        $payload = [
            'merchant_key'  => $this->merchantKey,
            'currency'      => 'XOF',
            'order_id'      => $reference,
            'amount'        => $reservation->total_amount,
            'return_url'    => config('app.url') . '/api/payments/return',
            'cancel_url'    => config('app.url') . '/api/payments/cancel',
            'notif_url'     => config('app.url') . '/api/webhooks/orange',
            'lang'          => 'fr',
            'reference'     => $reference,
        ];

        $payment = Payment::create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => 'orange_ci',
            'phone_number'          => $phoneNumber,
            'amount'                => $reservation->total_amount,
            'currency'              => 'XOF',
            'transaction_reference' => $reference,
            'status'                => 'pending',
            'provider_payload'      => $payload,
        ]);

        // In production: call Orange CI API and get payment URL
        // $response = Http::post($this->apiUrl . '/webpayment', $payload);
        // Store the response and redirect URL

        return $payment;
    }

    public function handleWebhook(array $payload): bool
    {
        $reference = $payload['order_id'] ?? $payload['reference'] ?? null;

        if (! $reference) {
            return false;
        }

        $payment = Payment::where('transaction_reference', $reference)->first();

        if (! $payment || $payment->status !== 'pending') {
            return false;
        }

        $status = $payload['status'] ?? 'failed';

        if ($status === 'SUCCESS' || $status === 'INITIATED') {
            $payment->update([
                'status'           => 'success',
                'confirmed_at'     => now(),
                'provider_payload' => $payload,
            ]);

            $reservationService = app(ReservationService::class);
            $reservationService->confirmReservation($payment->reservation);

            event(new PaymentReceived($payment));
        } else {
            $payment->update([
                'status'           => 'failed',
                'provider_payload' => $payload,
            ]);
        }

        return true;
    }
}
