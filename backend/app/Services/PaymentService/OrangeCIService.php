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

class OrangeCIService
{
    private bool   $simulation;
    private string $apiUrl;
    private string $merchantKey;
    private int    $expiryMinutes;

    public function __construct()
    {
        $this->simulation    = (bool) config('services.payment.simulation', true);
        $this->expiryMinutes = (int)  config('services.payment.expiry_minutes', 30);
        $this->apiUrl        = config('services.orange_ci.api_url', '');
        $this->merchantKey   = config('services.orange_ci.merchant_key', '');
    }

    /**
     * Initie un paiement Orange CI.
     *
     * @param  float   $amount      Montant calculé par le contrôleur (total, acompte ou solde).
     * @param  string  $paymentType full | deposit | balance
     */
    public function initiate(Reservation $reservation, string $phoneNumber, float $amount, string $paymentType = 'full'): Payment
    {
        $reference = 'ORG-' . strtoupper(Str::random(12)) . '-' . $reservation->id;

        $providerPayload = [
            'merchant_key'  => $this->merchantKey,
            'currency'      => 'XOF',
            'order_id'      => $reference,
            'amount'        => $amount,
            'notif_url'     => config('app.url') . '/api/webhooks/orange',
            'reference'     => $reference,
        ];

        $payment = Payment::create([
            'reservation_id'        => $reservation->id,
            'client_id'             => $reservation->client_id,
            'provider'              => 'orange_ci',
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

        if (! $this->simulation && $this->apiUrl && $this->merchantKey) {
            try {
                $response = Http::timeout(15)->post($this->apiUrl . '/webpayment', $providerPayload);
                if ($response->successful()) {
                    $payment->update([
                        'provider_payload' => array_merge($providerPayload, $response->json() ?? []),
                    ]);
                } else {
                    Log::warning('Orange CI initiation failed', ['body' => $response->body()]);
                }
            } catch (\Throwable $e) {
                Log::error('Orange CI HTTP error', ['error' => $e->getMessage()]);
            }
        }

        return $payment;
    }

    /**
     * Traite un webhook Orange CI (ou un payload simulé).
     */
    public function handleWebhook(array $payload): bool
    {
        $reference = $payload['order_id'] ?? $payload['reference'] ?? null;
        if (! $reference) return false;

        $payment = Payment::where('transaction_reference', $reference)->first();
        if (! $payment || $payment->status !== 'pending') return false;

        $status = $payload['status'] ?? 'failed';

        if (in_array($status, ['SUCCESS', 'INITIATED', 'success'])) {
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
                    'provider'              => 'orange_ci',
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
                    'provider'              => 'orange_ci',
                    'transaction_reference' => $payment->transaction_reference,
                ]
            );
        }

        return true;
    }
}
