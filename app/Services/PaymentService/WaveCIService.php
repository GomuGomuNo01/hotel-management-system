<?php

namespace App\Services\PaymentService;

use App\Events\PaymentReceived;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class WaveCIService
{
    private string $apiUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->apiUrl = config('services.wave_ci.api_url', '');
        $this->apiKey = config('services.wave_ci.api_key', '');
    }

    public function initiate(Reservation $reservation, string $phoneNumber): Payment
    {
        $reference = 'WAV-' . strtoupper(Str::random(12)) . '-' . $reservation->id;

        $payload = [
            'amount'    => $reservation->total_amount,
            'currency'  => 'XOF',
            'error_url' => config('app.url') . '/api/payments/error',
            'success_url' => config('app.url') . '/api/payments/success',
            'client_reference' => $reference,
        ];

        $payment = Payment::create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => 'wave_ci',
            'phone_number'          => $phoneNumber,
            'amount'                => $reservation->total_amount,
            'currency'              => 'XOF',
            'transaction_reference' => $reference,
            'status'                => 'pending',
            'provider_payload'      => $payload,
        ]);

        // In production: call Wave CI API
        // $response = Http::withToken($this->apiKey)->post($this->apiUrl . '/checkout/sessions', $payload);

        return $payment;
    }

    public function handleWebhook(array $payload): bool
    {
        $reference = $payload['client_reference'] ?? null;

        if (! $reference) {
            return false;
        }

        $payment = Payment::where('transaction_reference', $reference)->first();

        if (! $payment || $payment->status !== 'pending') {
            return false;
        }

        $status = $payload['payment_status'] ?? 'failed';

        if ($status === 'succeeded') {
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
