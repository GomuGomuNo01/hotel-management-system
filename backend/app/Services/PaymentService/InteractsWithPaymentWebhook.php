<?php

namespace App\Services\PaymentService;

use App\Events\HotelBroadcast;
use App\Events\PaymentReceived;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Services\AuditService;
use App\Services\ReservationService;

/**
 * Logique commune de traitement d'un webhook de paiement (Orange / Wave),
 * avec les garde-fous de sécurité :
 *  - garde temporelle : un paiement expiré ne peut plus être confirmé (anti-rejeu) ;
 *  - intégrité du montant : on ne confirme que si le montant + la devise
 *    « encaissés » correspondent à ce qui a été demandé.
 *
 * La signature du webhook est vérifiée en amont par VerifyWebhookSignature.
 */
trait InteractsWithPaymentWebhook
{
    /**
     * Applique les gardes puis confirme ou échoue le paiement.
     * $providerSuccess = le provider a-t-il annoncé un succès ?
     */
    protected function processWebhook(Payment $payment, array $payload, string $provider, bool $providerSuccess): bool
    {
        // Anti-rejeu : un webhook arrivant après expiration ne confirme jamais.
        if ($payment->isExpired()) {
            $this->failPayment($payment, $payload, $provider, 'expired');
            return true;
        }

        if (! $providerSuccess) {
            $this->failPayment($payment, $payload, $provider);
            return true;
        }

        // Défense en profondeur : refuser une confirmation dont le montant ou la
        // devise ne correspond pas au paiement attendu (capture partielle, rejeu
        // altéré, mauvaise configuration provider).
        if (! $this->webhookAmountMatches($payment, $payload)) {
            $this->failPayment($payment, $payload, $provider, 'amount_mismatch');
            return true;
        }

        $this->confirmPayment($payment, $payload, $provider);

        return true;
    }

    /** Le montant/devise annoncés correspondent-ils (quand ils sont fournis) ? */
    protected function webhookAmountMatches(Payment $payment, array $payload): bool
    {
        $amount = $payload['amount'] ?? $payload['amount_paid'] ?? $payload['total_amount'] ?? null;
        if ($amount !== null && abs((float) $amount - (float) $payment->amount) > 0.01) {
            return false;
        }

        $currency = $payload['currency'] ?? null;
        if ($currency !== null && strtoupper((string) $currency) !== strtoupper((string) $payment->currency)) {
            return false;
        }

        return true;
    }

    protected function confirmPayment(Payment $payment, array $payload, string $provider): void
    {
        $payment->update([
            'status'           => 'success',
            'confirmed_at'     => now(),
            'provider_payload' => array_merge($payment->provider_payload ?? [], $payload),
        ]);

        // Confirme la réservation si besoin. Si CE paiement vient de la confirmer,
        // on n'émet PAS « Paiement reçu » (« Réservation confirmée » couvre le cas) ;
        // ce toast n'est conservé que pour les paiements de solde ultérieurs.
        $justConfirmed = app(ReservationService::class)->confirmReservationIfNeeded($payment->reservation);
        if (! $justConfirmed) {
            event(new PaymentReceived($payment));
        }

        HotelBroadcast::dispatch('payment.confirmed', [
            'paymentId'     => $payment->id,
            'reservationId' => $payment->reservation_id,
            'clientId'      => $payment->client_id,
            'type'          => $payment->payment_type,
        ]);

        AuditService::log(
            null,
            AuditLog::ACTION_PAYMENT_CONFIRMED,
            'Payment',
            $payment->id,
            null,
            [
                'reservation_id'        => $payment->reservation_id,
                'amount'                => (float) $payment->amount,
                'provider'              => $provider,
                'payment_type'          => $payment->payment_type,
                'transaction_reference' => $payment->transaction_reference,
            ]
        );
    }

    protected function failPayment(Payment $payment, array $payload, string $provider, ?string $reason = null): void
    {
        // Un paiement expiré est « cancelled » (jamais tenté), un refus provider
        // ou une divergence de montant est « failed ».
        $payment->update([
            'status'           => $reason === 'expired' ? 'cancelled' : 'failed',
            'provider_payload' => array_merge($payment->provider_payload ?? [], $payload),
        ]);

        $newValues = [
            'reservation_id'        => $payment->reservation_id,
            'amount'                => (float) $payment->amount,
            'provider'              => $provider,
            'transaction_reference' => $payment->transaction_reference,
        ];
        if ($reason !== null) {
            $newValues['reason'] = $reason;
        }

        AuditService::log(null, AuditLog::ACTION_PAYMENT_FAILED, 'Payment', $payment->id, null, $newValues);
    }
}
