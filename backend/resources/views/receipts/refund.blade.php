<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu de remboursement RMB-{{ str_pad($refund->id, 6, '0', STR_PAD_LEFT) }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 13px; color: #1a202c; background: #fff; }
        .body-inner { padding: 28px 40px; }

        .header-tbl { width: 100%; border-collapse: collapse; }
        .hotel-name  { font-size: 20px; font-weight: bold; color: #ffffff; letter-spacing: 0.02em; }

        .status-badge {
            display: inline-block; padding: 3px 10px; border-radius: 12px;
            font-size: 10px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.05em; margin-top: 8px;
        }
        .badge-approved { background: #d1fae5; color: #065f46; }

        .section { margin-bottom: 22px; }
        .section-title {
            font-size: 10px; font-weight: bold; text-transform: uppercase;
            letter-spacing: 0.08em; color: #718096;
            border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;
        }

        .info-tbl  { width: 100%; border-collapse: collapse; }
        .info-cell { padding: 0 12px 8px 0; vertical-align: top; }
        .info-lbl  { font-size: 10px; color: #718096; margin-bottom: 2px; }
        .info-val  { font-size: 13px; font-weight: bold; color: #1a202c; }

        /* Bloc montant central */
        .amount-box {
            background: #f0fdf4; border: 2px solid #4ade80;
            border-radius: 10px; padding: 20px 24px; margin-bottom: 22px;
            text-align: center;
        }
        .amount-label { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .amount-value { font-size: 32px; font-weight: bold; color: #065f46; }
        .amount-sub   { font-size: 11px; color: #4b7c5a; margin-top: 4px; }

        /* Tableau récap remboursement */
        .detail-tbl { width: 100%; border-collapse: collapse; }
        .detail-tbl td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .detail-tbl .lbl { color: #718096; width: 38%; }
        .detail-tbl .val { font-weight: bold; color: #1a202c; }
        .detail-tbl tr:last-child td { border-bottom: none; }

        /* Tableau réservation liée */
        .res-tbl { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; }
        .res-tbl td { padding: 8px 12px; font-size: 12px; }
        .res-tbl .res-lbl { color: #718096; font-size: 10px; display: block; margin-bottom: 2px; }

        .bottom-note { margin-top: 24px; border-radius: 8px; padding: 14px 18px; }
        .ref-code {
            display: inline-block; padding: 4px 12px; border-radius: 6px;
            font-family: monospace; font-size: 14px; font-weight: bold;
            margin-top: 8px; letter-spacing: 0.05em; color: #ffffff;
        }
        .footer {
            margin-top: 32px; padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            text-align: center; font-size: 10px; color: #a0aec0;
        }
    </style>
</head>
<body>

@php
    $isApproved  = $refund->status === 'approved';
    $isRejected  = $refund->status === 'rejected';
    $headerBg    = $isApproved ? '#065f46' : '#7f1d1d';
    $subColor    = $isApproved ? '#a7d9b8'  : '#fca5a5';
    // Référence centralisée : fournie par le contrôleur (DocumentRef) ou calculée en fallback
    $refundRef   = $docRef ?? ('RMB-' . str_pad($refund->id, 6, '0', STR_PAD_LEFT));
    $processedAt = $refund->processed_at ?? now();
    $docTitle    = $isApproved ? 'Reçu de remboursement officiel' : "Avis de refus de remboursement";
    $badgeText   = $isApproved ? '✔ REMBOURSEMENT APPROUVÉ' : '✕ REMBOURSEMENT REFUSÉ';
    $amountBg    = $isApproved ? '#f0fdf4' : '#fff1f2';
    $amountBorder= $isApproved ? '#4ade80' : '#fca5a5';
    $amountColor = $isApproved ? '#065f46' : '#991b1b';
    $amountLabel = $isApproved ? 'Montant remboursé' : 'Montant concerné';
    $amountSub   = $isApproved ? 'Remboursement approuvé — virement sous 3 à 7 jours ouvrés' : 'Demande de remboursement refusée';
@endphp

{{-- ══════════════ EN-TÊTE ══════════════ --}}
<div style="background:{{ $headerBg }}; padding:22px 40px; color:#ffffff;">
    <table class="header-tbl"><tr>
        <td style="vertical-align:top;">
            <div class="hotel-name">{{ config('app.name') }}</div>
            <div style="font-size:11px; color:{{ $subColor }}; margin-top:3px;">
                {{ $docTitle }}
            </div>
            <span class="status-badge {{ $isApproved ? 'badge-approved' : '' }}"
                  style="margin-top:8px; {{ $isRejected ? 'background:#fee2e2; color:#991b1b;' : '' }}">
                {{ $badgeText }}
            </span>
        </td>
        <td style="text-align:right; vertical-align:top;">
            <div style="font-size:10px; text-transform:uppercase; color:{{ $subColor }}; letter-spacing:0.05em;">Dossier N°</div>
            <div style="font-size:15px; font-weight:bold; color:#ffffff; margin-top:4px;">{{ $refundRef }}</div>
            <div style="font-size:10px; color:{{ $subColor }}; margin-top:3px;">
                Traité le {{ $processedAt->format('d/m/Y à H:i') }}
            </div>
        </td>
    </tr></table>
</div>

<div class="body-inner">

{{-- ══════════════ MONTANT ══════════════ --}}
<div class="amount-box" style="background:{{ $amountBg }}; border:2px solid {{ $amountBorder }};">
    <div class="amount-label">{{ $amountLabel }}</div>
    <div class="amount-value" style="color:{{ $amountColor }};">{{ number_format($refund->amount, 0, ',', ' ') }} F CFA</div>
    <div class="amount-sub" style="color:{{ $amountColor }}; opacity:0.75;">{{ $amountSub }}</div>
</div>

{{-- ══════════════ BANNIÈRE REFUS ══════════════ --}}
@if($isRejected && $refund->admin_notes)
<div style="background:#fff1f2; border:2px solid #fecaca; border-radius:8px; padding:14px 18px; margin-bottom:22px;">
    <div style="font-size:12px; font-weight:bold; color:#991b1b; margin-bottom:4px;">Motif du refus</div>
    <div style="font-size:13px; color:#7f1d1d; font-style:italic; line-height:1.5;">{{ $refund->admin_notes }}</div>
</div>
@endif

{{-- ══════════════ CLIENT ══════════════ --}}
<div class="section">
    <div class="section-title">Informations client</div>
    <table class="info-tbl"><tr>
        <td class="info-cell">
            <div class="info-lbl">Nom complet</div>
            <div class="info-val">{{ $refund->client?->first_name }} {{ $refund->client?->last_name }}</div>
        </td>
        <td class="info-cell">
            <div class="info-lbl">E-mail</div>
            <div class="info-val">{{ $refund->client?->email ?? '-' }}</div>
        </td>
        @if($refund->client?->phone)
        <td class="info-cell">
            <div class="info-lbl">Téléphone</div>
            <div class="info-val">{{ $refund->client->phone }}</div>
        </td>
        @endif
    </tr></table>
</div>

{{-- ══════════════ DÉTAIL REMBOURSEMENT ══════════════ --}}
<div class="section">
    <div class="section-title">Détail du remboursement</div>
    <table class="detail-tbl">
        <tr>
            <td class="lbl">Numéro de dossier</td>
            <td class="val" style="font-family:monospace;">{{ $refundRef }}</td>
        </tr>
        <tr>
            <td class="lbl">Statut</td>
            <td class="val" style="color:{{ $amountColor }};">{{ $badgeText }}</td>
        </tr>
        <tr>
            <td class="lbl">Date de demande</td>
            <td class="val">{{ $refund->created_at->format('d/m/Y à H:i') }}</td>
        </tr>
        <tr>
            <td class="lbl">Date de traitement</td>
            <td class="val">{{ $processedAt->format('d/m/Y à H:i') }}</td>
        </tr>
        @if($refund->admin && ($refund->admin->first_name || $refund->admin->last_name))
        <tr>
            <td class="lbl">Approuvé par</td>
            <td class="val">{{ $refund->admin->first_name }} {{ $refund->admin->last_name }}</td>
        </tr>
        @endif
        @if($refund->admin_notes)
        <tr>
            <td class="lbl" style="vertical-align:top;">Note</td>
            <td style="font-style:italic; color:#374151; font-size:12px;">{{ $refund->admin_notes }}</td>
        </tr>
        @endif
    </table>
</div>

{{-- ══════════════ RÉSERVATION LIÉE ══════════════ --}}
@if($refund->reservation)
<div class="section">
    <div class="section-title">Réservation concernée</div>
    <table class="res-tbl">
        <tr>
            <td style="width:25%;">
                <span class="res-lbl">Numéro de réservation</span>
                <strong>#{{ $refund->reservation->id }}</strong>
            </td>
            @if($refund->reservation->room)
            <td style="width:25%;">
                <span class="res-lbl">Chambre</span>
                <strong>N° {{ $refund->reservation->room->room_number }} - {{ ucfirst($refund->reservation->room->room_type) }}</strong>
            </td>
            @endif
            <td style="width:25%;">
                <span class="res-lbl">Arrivée prévue</span>
                <strong>{{ optional($refund->reservation->check_in_date)->format('d/m/Y') ?? '-' }}</strong>
            </td>
            <td style="width:25%;">
                <span class="res-lbl">Départ prévu</span>
                <strong>{{ optional($refund->reservation->check_out_date)->format('d/m/Y') ?? '-' }}</strong>
            </td>
        </tr>
    </table>
</div>
@endif

{{-- ══════════════ NOTE BAS DE PAGE ══════════════ --}}
@if($isApproved)
<div class="bottom-note" style="background:#f0fdf4; border:1px solid #86efac;">
    <div style="font-weight:bold; font-size:13px; color:#065f46; margin-bottom:6px;">
        Confirmation officielle de remboursement
    </div>
    <div style="font-size:12px; color:#14532d; line-height:1.5;">
        Ce document confirme l'approbation de votre demande de remboursement.
        Le virement sera effectué dans un délai de <strong>3 à 7 jours ouvrés</strong> selon votre opérateur.
        Conservez ce document comme justificatif.
    </div>
    <div class="ref-code" style="background:#065f46;">{{ $refundRef }}</div>
</div>
@else
<div class="bottom-note" style="background:#fff1f2; border:1px solid #fecaca;">
    <div style="font-weight:bold; font-size:13px; color:#991b1b; margin-bottom:6px;">
        Avis officiel de refus
    </div>
    <div style="font-size:12px; color:#7f1d1d; line-height:1.5;">
        Ce document confirme que votre demande de remboursement a été examinée et refusée.
        Si vous souhaitez contester cette décision, contactez l'hôtel en joignant ce document.
    </div>
    <div class="ref-code" style="background:#991b1b;">{{ $refundRef }}</div>
</div>
@endif

</div>{{-- /.body-inner --}}

{{-- ══════════════ PIED DE PAGE ══════════════ --}}
<div class="footer">
    <strong>{{ config('app.name') }}</strong> — Document émis le {{ now()->format('d/m/Y à H:i') }}<br>
    @if($isApproved)
        Ce document confirme officiellement l'approbation du remboursement. Conservez-le comme justificatif.
    @else
        Ce document confirme officiellement le refus de la demande de remboursement.
    @endif
</div>

</body>
</html>
