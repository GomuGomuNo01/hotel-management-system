<?php

namespace App\Helpers;

use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;

/**
 * DocumentRef — source unique de vérité pour tous les numéros de documents.
 *
 * Toute génération de référence (PDF, affichage frontend, noms de fichiers)
 * DOIT passer par cette classe afin de garantir qu'admin et client voient
 * exactement le même numéro pour le même document.
 *
 * Convention :
 *   RES-XXXXXX  — reçu de réservation (payée, non annulée)
 *   ANN-XXXXXX  — reçu d'annulation
 *   FAC-XXXXXX  — facture de séjour (après check-out)
 *   PAY-XXXXXX  — facture unitaire par paiement  (XXXXXX = payment.id)
 *   RMB-XXXXXX  — reçu / avis de remboursement   (XXXXXX = refund.id)
 *
 * L'identifiant est toujours paddé à 6 chiffres pour rester lisible et
 * tri-compatible.  Le préfixe détermine le type, pas le statut courant.
 */
class DocumentRef
{
    /* ── Padding interne ─────────────────────────────────────────── */
    private static function pad(int $id): string
    {
        return str_pad($id, 6, '0', STR_PAD_LEFT);
    }

    /* ── Générateurs de références ───────────────────────────────── */

    /**
     * Référence du reçu de réservation.
     *   - Annulée → ANN-XXXXXX
     *   - Active   → RES-XXXXXX
     *
     * Le numéro est basé sur l'ID de réservation — même valeur
     * que la réservation soit ouverte par le client ou par l'admin.
     */
    public static function receipt(Reservation $reservation): string
    {
        $prefix = $reservation->status === 'cancelled' ? 'ANN' : 'RES';
        return $prefix . '-' . self::pad($reservation->id);
    }

    /**
     * Référence de la facture de séjour (disponible après check-out).
     * FAC-XXXXXX (XXXXXX = reservation.id)
     */
    public static function invoice(Reservation $reservation): string
    {
        return 'FAC-' . self::pad($reservation->id);
    }

    /**
     * Référence de la facture unitaire d'un paiement.
     * PAY-XXXXXX (XXXXXX = payment.id)
     *
     * La transaction_reference opérateur (ORG-/WAV-/CASH-) reste
     * visible dans le détail du document, mais n'est plus le numéro
     * de facture principal.
     */
    public static function payment(Payment $payment): string
    {
        return 'PAY-' . self::pad($payment->id);
    }

    /**
     * Référence du reçu de remboursement.
     * RMB-XXXXXX (XXXXXX = refund.id)
     */
    public static function refund(Refund $refund): string
    {
        return 'RMB-' . self::pad($refund->id);
    }

    /* ── Nom de fichier PDF ──────────────────────────────────────── */

    /**
     * Convertit une référence en nom de fichier PDF.
     * Ex. : 'RES-000042' → 'RES-000042.pdf'
     */
    public static function filename(string $ref): string
    {
        return $ref . '.pdf';
    }
}
