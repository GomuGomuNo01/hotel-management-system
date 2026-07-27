<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>
        @if($reservation->status === 'cancelled')
            Reçu d'annulation #{{ $reservation->id }}
        @else
            Reçu de réservation #{{ $reservation->id }}
        @endif
    </title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 13px; color: #1a202c; background: #fff; }
        .body-inner { padding: 28px 40px; }

        /* En-tête - couleurs appliquées en inline (DomPDF: pas de sélecteurs composés) */
        .header-tbl { width: 100%; border-collapse: collapse; }
        .hotel-name  { font-size: 20px; font-weight: bold; color: #ffffff; letter-spacing: 0.02em; }

        /* Badges statut */
        .status-badge {
            display: inline-block; padding: 3px 10px; border-radius: 12px;
            font-size: 10px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.05em; margin-top: 8px;
        }
        .badge-partial   { background: #fef3c7; color: #92400e; }
        .badge-full      { background: #d1fae5; color: #065f46; }
        .badge-cancelled { background: #fee2e2; color: #991b1b; }

        /* Bannière annulation */
        .cancel-banner {
            background: #fff1f2; border: 2px solid #fecaca;
            border-radius: 8px; padding: 14px 20px; margin-bottom: 20px;
        }

        /* Sections */
        .section { margin-bottom: 22px; }
        .section-title {
            font-size: 10px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.08em; color: #718096;
            border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;
        }

        /* Grille infos - utilise un vrai tableau HTML */
        .info-tbl  { width: 100%; border-collapse: collapse; }
        .info-cell { padding: 0 12px 8px 0; vertical-align: top; }
        .info-lbl  { font-size: 10px; color: #718096; margin-bottom: 2px; }
        .info-val  { font-size: 13px; font-weight: bold; color: #1a202c; }

        /* Tableau paiements */
        .pay-tbl { width: 100%; border-collapse: collapse; }
        .pay-tbl thead tr  { background: #1E673D; }
        .pay-tbl thead th  {
            color: #ffffff; padding: 9px 12px; text-align: left;
            font-size: 11px; font-weight: bold; text-transform: uppercase;
        }
        .pay-tbl tbody tr  { background: #f7fafc; }
        .pay-tbl tbody td  { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
        .pay-tbl .tr-even  { background: #ffffff; }
        .text-right        { text-align: right; }
        .bold              { font-weight: bold; }

        /* Récapitulatif financier - table pure, pas de flex */
        .fin-tbl { width: 100%; border-collapse: collapse; border: 2px solid #e2e8f0; border-radius: 8px; margin-top: 16px; }
        .fin-tbl td { padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        .fin-tbl .row-last td { border-bottom: none; }

        /* Boîte remboursement */
        .refund-box { border-radius: 8px; padding: 16px 20px; margin-top: 4px; }
        .refund-dtbl { width: 100%; border-collapse: collapse; }
        .refund-dtbl td { padding: 4px 0; font-size: 12px; vertical-align: top; }
        .refund-lbl { color: #718096; font-size: 11px; width: 42%; }

        /* Note bas de document */
        .bottom-note { margin-top: 24px; border-radius: 8px; padding: 14px 18px; }
        .ref-code {
            display: inline-block; padding: 4px 12px; border-radius: 6px;
            font-family: monospace; font-size: 14px; font-weight: bold;
            margin-top: 8px; letter-spacing: 0.05em; color: #ffffff;
        }

        /* Pied de page */
        .footer {
            margin-top: 32px; padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            text-align: center; font-size: 10px; color: #a0aec0;
        }
    </style>
</head>
<body>

@php
    $isCancelled  = $reservation->status === 'cancelled';
    $headerBg     = $isCancelled ? '#7f1d1d' : '#1A5333';
    $subColor     = $isCancelled ? '#fca5a5' : '#BDE6CE';
    $totalPaid    = $reservation->payments->sum('amount');
    $remaining    = max(0, $reservation->total_amount - $totalPaid);
    $isFullyPaid  = $remaining <= 0;
    $refund       = $reservation->refunds->first();
    $refundBg     = '#fffbeb'; $refundColor = '#92400e'; $refundBorder = '#fcd34d';
    $refundLabel  = '↻ En attente de traitement';
    if ($refund) {
        if ($refund->status === 'approved') {
            $refundBg = '#f0fdf4'; $refundColor = '#065f46'; $refundBorder = '#4ade80';
            $refundLabel = '✔ Remboursement approuvé';
        } elseif ($refund->status === 'rejected') {
            $refundBg = '#fff1f2'; $refundColor = '#991b1b'; $refundBorder = '#fca5a5';
            $refundLabel = '✕ Remboursement refusé';
        }
    }
    // Référence document : fournie par le contrôleur (DocumentRef) ou calculée en fallback
    $receiptRef = $docRef ?? (($isCancelled ? 'ANN' : 'RES') . '-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT));
@endphp

{{-- ══════════════ EN-TÊTE ══════════════ --}}
<div style="background:{{ $headerBg }}; padding:22px 40px; color:#ffffff;">
    <table class="header-tbl"><tr>
        <td style="vertical-align:top;">
            <div class="hotel-name">{{ config('app.name') }}</div>
            <div style="font-size:11px; color:{{ $subColor }}; margin-top:3px;">
                {{ $isCancelled ? "Reçu d'annulation officiel" : 'Reçu de réservation officiel' }}
            </div>
            @if($isCancelled)
                <span class="status-badge badge-cancelled" style="margin-top:8px;">✕ RÉSERVATION ANNULÉE</span>
            @else
                <span class="status-badge {{ $isFullyPaid ? 'badge-full' : 'badge-partial' }}" style="margin-top:8px;">
                    {{ $isFullyPaid ? '✔ Entièrement payé' : 'Acompte versé - solde dû' }}
                </span>
            @endif
        </td>
        <td style="text-align:right; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; color:{{ $subColor }}; letter-spacing:0.05em;">Reçu N°</div>
            <div style="font-size:15px; font-weight:bold; color:#ffffff; margin-top:4px;">{{ $receiptRef }}</div>
            <div style="font-size:10px; color:{{ $subColor }}; margin-top:3px;">Émis le {{ ($issuedAt ?? now())->format('d/m/Y à H:i') }}</div>
        </td>
    </tr></table>
</div>

<div class="body-inner">

{{-- ── Bannière annulation ── --}}
@if($isCancelled)
<div class="cancel-banner">
    <div style="font-size:14px; font-weight:bold; color:#991b1b; margin-bottom:4px;">
        ⚠ Cette réservation a été annulée
    </div>
    <div style="font-size:12px; color:#7f1d1d; line-height:1.5;">
        Ce document confirme l'annulation de votre réservation et fait office de justificatif officiel.
        @if($refund)
            Une demande de remboursement de <strong>{{ number_format($refund->amount, 0, ',', ' ') }} F CFA</strong>
            a été initiée - voir détail ci-dessous.
        @elseif($totalPaid <= 0)
            Aucun paiement n'ayant été effectué, aucun remboursement n'est dû.
        @endif
    </div>
</div>
@endif

{{-- ══════════════ CLIENT ══════════════ --}}
<div class="section">
    <div class="section-title">Informations client</div>
    <table class="info-tbl"><tr>
        <td class="info-cell">
            <div class="info-lbl">Nom complet</div>
            <div class="info-val">{{ $reservation->client?->first_name }} {{ $reservation->client?->last_name }}</div>
        </td>
        <td class="info-cell">
            <div class="info-lbl">E-mail</div>
            <div class="info-val">{{ $reservation->client?->email ?? '-' }}</div>
        </td>
        @if($reservation->client?->phone)
        <td class="info-cell">
            <div class="info-lbl">Téléphone</div>
            <div class="info-val">{{ $reservation->client->phone }}</div>
        </td>
        @endif
    </tr></table>
</div>

{{-- ══════════════ RÉSERVATION ══════════════ --}}
<div class="section">
    <div class="section-title">Détails de la réservation</div>
    <table class="info-tbl"><tr>
        <td class="info-cell">
            <div class="info-lbl">Chambre</div>
            <div class="info-val">N° {{ $reservation->room->room_number }} - {{ ucfirst($reservation->room->room_type) }}</div>
        </td>
        <td class="info-cell">
            <div class="info-lbl">Arrivée{{ $isCancelled ? ' prévue' : '' }}</div>
            <div class="info-val">{{ $reservation->check_in_date->format('d/m/Y') }}</div>
        </td>
        <td class="info-cell">
            <div class="info-lbl">Départ{{ $isCancelled ? ' prévu' : '' }}</div>
            <div class="info-val">{{ $reservation->check_out_date->format('d/m/Y') }}</div>
        </td>
        <td class="info-cell">
            <div class="info-lbl">Durée</div>
            <div class="info-val">{{ $reservation->nightsCount() }} nuit(s)</div>
        </td>
    </tr><tr>
        <td class="info-cell" colspan="2">
            <div class="info-lbl">Plan de paiement</div>
            <div class="info-val">
                {{ $reservation->payment_plan === 'partial' ? 'Paiement en 2 tranches (50 % + 50 %)' : 'Paiement intégral' }}
            </div>
        </td>
        @if($isCancelled)
        <td class="info-cell" colspan="2">
            <div class="info-lbl">Statut</div>
            <div class="info-val" style="color:#991b1b;">Annulée</div>
        </td>
        @endif
    </tr></table>
    @if($reservation->notes)
    <table class="info-tbl" style="margin-top:8px;"><tr>
        <td class="info-cell">
            <div class="info-lbl">Remarques</div>
            <div class="info-val" style="font-weight:normal;">{{ $reservation->notes }}</div>
        </td>
    </tr></table>
    @endif
</div>

{{-- ══════════════ PAIEMENTS ══════════════ --}}
@if($reservation->payments->isNotEmpty())
<div class="section">
    <div class="section-title">Historique des paiements</div>
    <table class="pay-tbl">
        <thead><tr>
            <th>Date</th>
            <th>Type</th>
            <th>Moyen</th>
            <th>Référence</th>
            <th class="text-right">Montant</th>
        </tr></thead>
        <tbody>
            @foreach($reservation->payments as $i => $payment)
            <tr class="{{ $i % 2 === 1 ? 'tr-even' : '' }}">
                <td>{{ $payment->confirmed_at?->format('d/m/Y H:i') ?? '-' }}</td>
                <td>{{ $payment->paymentTypeLabel() }}</td>
                <td>
                    @if($payment->provider === 'cash') Espèces (hôtel)
                    @elseif($payment->provider === 'orange_ci') Orange Money
                    @elseif($payment->provider === 'wave_ci') Wave CI
                    @else {{ $payment->provider }}
                    @endif
                </td>
                <td style="font-family:monospace; font-size:10px;">{{ $payment->transaction_reference }}</td>
                <td class="text-right bold">{{ number_format($payment->amount, 0, ',', ' ') }} F CFA</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Récapitulatif financier --}}
    <table class="fin-tbl">
        <tr>
            <td>Prix par nuit</td>
            <td class="text-right">
                {{ number_format($reservation->room->price_per_night, 0, ',', ' ') }} F CFA
                × {{ $reservation->nightsCount() }} nuit(s)
            </td>
        </tr>
        <tr style="background:#1E673D;">
            <td style="color:#ffffff; font-weight:bold; font-size:15px;">Total de la réservation</td>
            <td class="text-right" style="color:#ffffff; font-weight:bold; font-size:15px;">
                {{ number_format($reservation->total_amount, 0, ',', ' ') }} F CFA
            </td>
        </tr>
        <tr style="background:#f0fdf4;">
            <td style="color:#065f46; font-weight:bold;">Montant payé</td>
            <td class="text-right" style="color:#065f46; font-weight:bold;">
                {{ number_format($totalPaid, 0, ',', ' ') }} F CFA
            </td>
        </tr>
        @if(!$isCancelled && $remaining > 0)
        <tr class="row-last" style="background:#fffbeb;">
            <td style="color:#92400e; font-weight:bold;">⚠ Solde restant dû</td>
            <td class="text-right" style="color:#92400e; font-weight:bold;">
                {{ number_format($remaining, 0, ',', ' ') }} F CFA
            </td>
        </tr>
        @elseif($isCancelled && $refund)
        <tr class="row-last" style="background:{{ $refundBg }};">
            <td style="color:{{ $refundColor }}; font-weight:bold;">{{ $refundLabel }}</td>
            <td class="text-right" style="color:{{ $refundColor }}; font-weight:bold;">
                {{ number_format($refund->amount, 0, ',', ' ') }} F CFA
            </td>
        </tr>
        @else
        <tr class="row-last">
            <td></td><td></td>
        </tr>
        @endif
    </table>
</div>
@endif

{{-- ══════════════ SECTION REMBOURSEMENT ══════════════ --}}
@if($isCancelled && $refund)
<div class="section">
    <div class="section-title">Dossier de remboursement</div>
    <div class="refund-box" style="background:{{ $refundBg }}; border:2px solid {{ $refundBorder }};">
        <div style="font-size:13px; font-weight:bold; color:{{ $refundColor }}; margin-bottom:8px;">
            {{ $refundLabel }}
        </div>
        <div style="font-size:22px; font-weight:bold; color:{{ $refundColor }}; text-align:center; margin:8px 0 4px;">
            {{ number_format($refund->amount, 0, ',', ' ') }} F CFA
        </div>
        <div style="text-align:center; font-size:11px; color:#718096; margin-bottom:12px;">Montant concerné</div>
        <table class="refund-dtbl">
            <tr>
                <td class="refund-lbl">Numéro de dossier</td>
                <td style="font-weight:bold; color:#1a202c;">RMB-{{ str_pad($refund->id, 6, '0', STR_PAD_LEFT) }}</td>
            </tr>
            <tr>
                <td class="refund-lbl">Statut</td>
                <td style="font-weight:bold; color:{{ $refundColor }};">{{ $refund->statusLabel() }}</td>
            </tr>
            @if($refund->processed_at)
            <tr>
                <td class="refund-lbl">Traité le</td>
                <td style="font-weight:bold; color:#1a202c;">{{ $refund->processed_at->format('d/m/Y à H:i') }}</td>
            </tr>
            @endif
            @if($refund->admin && ($refund->admin->first_name || $refund->admin->last_name))
            <tr>
                <td class="refund-lbl">Traité par</td>
                <td style="font-weight:bold; color:#1a202c;">{{ $refund->admin->first_name }} {{ $refund->admin->last_name }}</td>
            </tr>
            @endif
            @if($refund->admin_notes)
            <tr>
                <td class="refund-lbl" style="vertical-align:top;">{{ $refund->status === 'rejected' ? 'Motif du refus' : 'Note' }}</td>
                <td style="font-style:italic; color:#374151;">{{ $refund->admin_notes }}</td>
            </tr>
            @endif
            @if($refund->status === 'pending')
            <tr>
                <td colspan="2" style="padding-top:8px; font-size:11px; color:#92400e;">
                    Délai de traitement estimé : <strong>2 à 5 jours ouvrés</strong>
                </td>
            </tr>
            @elseif($refund->status === 'approved')
            <tr>
                <td colspan="2" style="padding-top:8px; font-size:11px; color:#065f46;">
                    Virement dans <strong>3 à 7 jours ouvrés</strong> selon votre opérateur.
                </td>
            </tr>
            @endif
        </table>
    </div>
</div>
@endif

{{-- ══════════════ NOTE BAS DE PAGE ══════════════ --}}
@if($isCancelled)
<div class="bottom-note" style="background:#fff1f2; border:1px solid #fecaca;">
    <div style="font-weight:bold; font-size:13px; color:#991b1b; margin-bottom:6px;">
        Document officiel d'annulation
    </div>
    <div style="font-size:12px; color:#7f1d1d; line-height:1.5;">
        Conservez ce document comme justificatif d'annulation.
        @if($refund && $refund->status === 'pending')
            Votre remboursement est en cours de traitement. Vous serez notifié dans votre espace personnel.
        @elseif($refund && $refund->status === 'rejected' && $refund->admin_notes)
            Si vous contestez ce refus, contactez l'hôtel en joignant ce document.
        @endif
    </div>
    <div class="ref-code" style="background:#991b1b;">ANN-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</div>
</div>
@else
<div class="bottom-note" style="background:#ebf8ff; border:1px solid #bee3f8;">
    <div style="font-weight:bold; font-size:13px; color:#2b6cb0; margin-bottom:6px;">
        Important - Présenter ce reçu lors de votre arrivée à l'hôtel
    </div>
    <div style="font-size:12px; color:#2c5282; line-height:1.5;">
        Ce document est votre justificatif de réservation. Présentez-le à la réception lors de votre check-in.
        @if($remaining > 0)
            <br><strong>Un solde de {{ number_format($remaining, 0, ',', ' ') }} F CFA reste à régler à l'accueil.</strong>
        @else
            <br>Votre réservation est entièrement réglée. Bienvenue !
        @endif
    </div>
    <div class="ref-code" style="background:#2b6cb0;">RES-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</div>
</div>
@endif

</div>{{-- /.body-inner --}}

{{-- ══════════════ PIED DE PAGE ══════════════ --}}
<div class="footer">
    <strong>{{ config('app.name') }}</strong> - Document émis le {{ ($issuedAt ?? now())->format('d/m/Y à H:i') }}<br>
    @if($isCancelled)
        Ce document confirme officiellement l'annulation de la réservation.
    @else
        Ce document est valable comme justificatif de paiement. Conservez-le précieusement.
    @endif
</div>

</body>
</html>
