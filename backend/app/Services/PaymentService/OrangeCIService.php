<?php

namespace App\Services\PaymentService;

use App\Models\Payment;
use App\Models\Reservation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrangeCIService
{
    use InteractsWithPaymentWebhook;

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
        if (! $reference) {
            return false;
        }

        $payment = Payment::where('transaction_reference', $reference)->first();
        if (! $payment || $payment->status !== 'pending') {
            return false;
        }

        $success = in_array($payload['status'] ?? 'failed', ['SUCCESS', 'INITIATED', 'success'], true);

        return $this->processWebhook($payment, $payload, 'orange_ci', $success);
    }
}
