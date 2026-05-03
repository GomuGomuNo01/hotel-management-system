<?php

namespace App\Services\PaymentService;

use App\Events\PaymentReceived;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Reservation;
use App\Services\AuditService;
use App\Services\ReservationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WaveCIService
{
    private bool   $simulation;
    private string $apiUrl;
    private string $apiKey;
    private int    $expiryMinutes;

    public function __construct()
    {
        $this->simulation    = (bool) config('services.payment.simulation', true);
        $this->expiryMinutes = (int)  config('services.payment.expiry_minutes', 30);
        $this->apiUrl        = config('services.wave_ci.api_url', '');
        $this->apiKey        = config('services.wave_ci.api_key', '');
    }

    /**
     * Initie un paiement Wave CI.
     *
     * @param  float   $amount      Montant calculé par le contrôleur (total, acompte ou solde).
     * @param  string  $paymentType full | deposit | balance
     */
    public function initiate(Reservation $reservation, string $phoneNumber, float $amount, string $paymentType = 'full'): Payment
    {
        $reference = 'WAV-' . strtoupper(Str::random(12)) . '-' . $reservation->id;

        $providerPayload = [
            'amount'           => $amount,
            'currency'         => 'XOF',
            'client_reference' => $reference,
            'error_url'        => config('app.url') . '/api/payments/error',
            'success_url'      => config('app.url') . '/api/payments/success',
        ];

        $payment = Payment::create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => 'wave_ci',
            'phone_number'          => $phoneNumber,
            'amount'                => $amount,
            'currency'              => 'XOF',
            'transaction_reference' => $reference,
            'status'                => 'pending',
            'payment_type'          => $paymentType,
            'expires_at'            => now()->addMinutes($this->expiryMinutes),
            'simulation_mode'       => $this->simulation,
            'provider_payload'      => $providerPayload,
        ]);

        if (! $this->simulation && $this->apiUrl && $this->apiKey) {
            try {
                $response = Http::withToken($this->apiKey)
                    ->timeout(15)
                    ->post($this->apiUrl . '/checkout/sessions', $providerPayload);
                if ($response->successful()) {
                    $payment->update([
                        'provider_payload' => array_merge($providerPayload, $response->json() ?? []),
                    ]);
                } else {
                    Log::warning('Wave CI initiation failed', ['body' => $response->body()]);
                }
            } catch (\Throwable $e) {
                Log::error('Wave CI HTTP error', ['error' => $e->getMessage()]);
            }
        }

        return $payment;
    }

    /**
     * Traite un webhook Wave CI (ou un payload simulé).
     */
    public function handleWebhook(array $payload): bool
    {
        $reference = $payload['client_reference'] ?? null;
        if (! $reference) return false;

        $payment = Payment::where('transaction_reference', $reference)->first();
        if (! $payment || $payment->status !== 'pending') return false;

        $status = $payload['payment_status'] ?? $payload['status'] ?? 'failed';

        if (in_array($status, ['succeeded', 'success', 'SUCCESS'])) {
            $payment->update([
                'status'           => 'success',
                'confirmed_at'     => now(),
                'provider_payload' => array_merge($payment->provider_payload ?? [], $payload),
            ]);

            // Confirme la réservation si pas encore confirmée
            app(ReservationService::class)->confirmReservationIfNeeded($payment->reservation);
            event(new PaymentReceived($payment));

            // Audit — action système (webhook), pas d'admin
            AuditService::log(
                null,
                AuditLog::ACTION_PAYMENT_CONFIRMED,
                'Payment',
                $payment->id,
                null,
                [
                    'reservation_id'        => $payment->reservation_id,
                    'amount'                => (float) $payment->amount,
                    'provider'              => 'wave_ci',
                    'payment_type'          => $payment->payment_type,
                    'transaction_reference' => $payment->transaction_reference,
                ]
            );
        } else {
            $payment->update([
                'status'           => 'failed',
                'provider_payload' => array_merge($payment->provider_payload ?? [], $payload),
            ]);

            // Audit — échec de paiement
            AuditService::log(
                null,
                AuditLog::ACTION_PAYMENT_FAILED,
                'Payment',
                $payment->id,
                null,
                [
                    'reservation_id'        => $payment->reservation_id,
                    'amount'                => (float) $payment->amount,
                    'provider'              => 'wave_ci',
                    'transaction_reference' => $payment->transaction_reference,
                ]
            );
        }

        return true;
    }
}
