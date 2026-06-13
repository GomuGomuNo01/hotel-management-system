<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture de séjour - {{ config('app.name') }}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #1a202c; background: #fff; }

    /* ── Bandeau supérieur ── */
    .header-band { background: #1e3a5f; padding: 24px 40px; color: #fff; }
    .header-table { width: 100%; }
    .hotel-name  { font-size: 20px; font-weight: bold; letter-spacing: 0.02em; }
    .hotel-sub   { font-size: 11px; color: #94b8e0; margin-top: 3px; }
    .doc-meta    { text-align: right; }
    .doc-type    { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94b8e0; }
    .doc-ref     { font-size: 15px; font-weight: bold; letter-spacing: 0.04em; margin-top: 4px; }
    .doc-date    { font-size: 10px; color: #94b8e0; margin-top: 3px; }

    /* ── Bandeau statut ── */
    .status-band { background: #e6f4ea; border-bottom: 3px solid #2d6a4f; padding: 10px 40px; }
    .status-table { width: 100%; }
    .status-icon  { font-size: 18px; width: 30px; vertical-align: middle; }
    .status-title { font-size: 13px; font-weight: bold; color: #1e4620; vertical-align: middle; }
    .status-sub   { font-size: 11px; color: #3a6645; vertical-align: middle; padding-left: 8px; }

    /* ── Corps ── */
    .body { padding: 28px 40px; }

    /* ── Sections ── */
    .section { margin-bottom: 22px; }
    .section-title {
      font-size: 10px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.08em; color: #4a5568;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;
    }
    .info-box { background: #f7fafc; border-radius: 6px; border: 1px solid #e2e8f0; overflow: hidden; }
    .info-tbl { width: 100%; border-collapse: collapse; }
    .info-tbl td { padding: 7px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .info-tbl tr:last-child td { border-bottom: none; }
    .info-tbl .lbl { color: #718096; width: 38%; }
    .info-tbl .val { font-weight: 600; color: #2d3748; }

    /* ── Tableau paiements ── */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead tr { background: #1e3a5f; }
    .data-table thead th {
      color: #fff; padding: 8px 12px; text-align: left;
      font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .data-table thead th.right { text-align: right; }
    .data-table tbody tr:nth-child(odd)  { background: #f7fafc; }
    .data-table tbody tr:nth-child(even) { background: #ffffff; }
    .data-table tbody td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .data-table tbody td.right { text-align: right; }
    .data-table .total-row td {
      background: #ebf8f1 !important; font-weight: bold;
      color: #276749; border-top: 2px solid #9ae6b4;
    }
    .data-table .total-row td.right { text-align: right; }

    /* ── Bloc récapitulatif financier ── */
    .fin-summary { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .fin-row { width: 100%; border-collapse: collapse; }
    .fin-row td { padding: 9px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .fin-row tr:last-child td { border-bottom: none; }
    .fin-row .lbl2 { color: #4a5568; }
    .fin-row .val2 { text-align: right; font-weight: 600; color: #2d3748; }
    .fin-row .grand-total td { background: #1e3a5f !important; color: #fff; font-weight: bold; font-size: 14px; }
    .fin-row .paid-ok td    { background: #f0fdf4 !important; color: #065f46; font-weight: 600; }

    /* Ref code */
    .ref-code {
      font-family: monospace; font-size: 12px; font-weight: bold;
      color: #3730a3; letter-spacing: 0.04em;
    }

    /* ── Pied de page ── */
    .footer {
      margin-top: 28px; padding: 14px 40px;
      border-top: 1px solid #e2e8f0;
      text-align: center; font-size: 10px; color: #a0aec0;
      line-height: 1.7; background: #f9fafb;
    }
  </style>
</head>
<body>

  <!-- EN-TÊTE -->
  <div class="header-band">
    <table class="header-table"><tr>
      <td>
        <div class="hotel-name">{{ config('app.name') }}</div>
        <div class="hotel-sub">Facture officielle de séjour</div>
      </td>
      <td class="doc-meta">
        <div class="doc-type">Facture de séjour</div>
        <div class="doc-ref">{{ $docRef ?? 'FAC-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</div>
        <div class="doc-date">Émise le {{ ($issuedAt ?? now())->format('d/m/Y') }}</div>
      </td>
    </tr></table>
  </div>

  <!-- STATUT -->
  <div class="status-band">
    <table class="status-table"><tr>
      <td class="status-icon">✔</td>
      <td class="status-title">Séjour terminé - Facture officielle</td>
      <td class="status-sub">
        Du {{ $reservation->check_in_date->format('d/m/Y') }}
        au {{ $reservation->check_out_date->format('d/m/Y') }}
        ({{ $reservation->nightsCount() }} nuit{{ $reservation->nightsCount() > 1 ? 's' : '' }})
      </td>
    </tr></table>
  </div>

  <div class="body">

    <!-- DEUX COLONNES : client + réservation -->
    <table style="width:100%; margin-bottom:22px;" cellspacing="0" cellpadding="0">
      <tr>
        <!-- Client -->
        <td style="width:48%; vertical-align:top; padding-right:12px;">
          <div class="section-title">Informations client</div>
          <div class="info-box">
            <table class="info-tbl"><tbody>
              <tr>
                <td class="lbl">Nom complet</td>
                <td class="val">{{ $reservation->client->first_name }} {{ $reservation->client->last_name }}</td>
              </tr>
              <tr>
                <td class="lbl">E-mail</td>
                <td class="val">{{ $reservation->client->email }}</td>
              </tr>
              @if ($reservation->client->phone)
              <tr>
                <td class="lbl">Téléphone</td>
                <td class="val">{{ $reservation->client->phone }}</td>
              </tr>
              @endif
            </tbody></table>
          </div>
        </td>
        <!-- Séjour -->
        <td style="width:52%; vertical-align:top; padding-left:12px;">
          <div class="section-title">Détails du séjour</div>
          <div class="info-box">
            <table class="info-tbl"><tbody>
              <tr>
                <td class="lbl">N° réservation</td>
                <td class="val"><span class="ref-code">RES-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</span></td>
              </tr>
              <tr>
                <td class="lbl">Chambre</td>
                <td class="val">N° {{ $reservation->room->room_number }} - {{ ucfirst($reservation->room->room_type) }}</td>
              </tr>
              <tr>
                <td class="lbl">Arrivée</td>
                <td class="val">{{ $reservation->check_in_date->format('d/m/Y') }}</td>
              </tr>
              <tr>
                <td class="lbl">Départ</td>
                <td class="val">{{ $reservation->check_out_date->format('d/m/Y') }}</td>
              </tr>
              <tr>
                <td class="lbl">Durée</td>
                <td class="val">{{ $reservation->nightsCount() }} nuit{{ $reservation->nightsCount() > 1 ? 's' : '' }}</td>
              </tr>
              <tr>
                <td class="lbl">Plan de paiement</td>
                <td class="val">{{ $reservation->payment_plan === 'partial' ? 'Paiement en 2 tranches' : 'Paiement intégral' }}</td>
              </tr>
            </tbody></table>
          </div>
        </td>
      </tr>
    </table>

    <!-- DÉTAIL DE LA PRESTATION -->
    <div class="section">
      <div class="section-title">Détail de la prestation</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Prix / nuit</th>
            <th>Nuits</th>
            <th class="right">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chambre N° {{ $reservation->room->room_number }} - {{ ucfirst($reservation->room->room_type) }}</td>
            <td>{{ number_format($reservation->room->price_per_night, 0, ',', ' ') }} F CFA</td>
            <td>{{ $reservation->nightsCount() }}</td>
            <td class="right">{{ number_format($reservation->total_amount, 0, ',', ' ') }} F CFA</td>
          </tr>
          <tr class="total-row">
            <td colspan="3">Montant total du séjour</td>
            <td class="right">{{ number_format($reservation->total_amount, 0, ',', ' ') }} F CFA</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- HISTORIQUE DES PAIEMENTS -->
    <div class="section">
      <div class="section-title">Historique des paiements</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Moyen</th>
            <th>Référence</th>
            <th class="right">Montant</th>
          </tr>
        </thead>
        <tbody>
          @php
            $typeLabels = [
              'deposit' => 'Acompte (50 %)',
              'balance' => 'Solde restant',
              'full'    => 'Paiement intégral',
              'cash'    => 'Espèces',
            ];
            $totalPaid = $reservation->payments->sum('amount');
          @endphp
          @foreach ($reservation->payments as $payment)
          <tr>
            <td>{{ $payment->confirmed_at?->format('d/m/Y H:i') ?? '-' }}</td>
            <td>{{ $typeLabels[$payment->payment_type] ?? $payment->payment_type }}</td>
            <td>{{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</td>
            <td style="font-family:monospace; font-size:10px;">{{ $payment->transaction_reference ?? '-' }}</td>
            <td class="right" style="font-weight:600;">{{ number_format($payment->amount, 0, ',', ' ') }} F CFA</td>
          </tr>
          @endforeach
          <tr class="total-row">
            <td colspan="4">Total réglé</td>
            <td class="right">{{ number_format($totalPaid, 0, ',', ' ') }} F CFA</td>
          </tr>
        </tbody>
      </table>

      <!-- Récapitulatif financier -->
      <div class="fin-summary" style="margin-top:14px;">
        <table class="fin-row"><tbody>
          <tr>
            <td class="lbl2">Prix unitaire</td>
            <td class="val2">{{ number_format($reservation->room->price_per_night, 0, ',', ' ') }} F CFA × {{ $reservation->nightsCount() }} nuit{{ $reservation->nightsCount() > 1 ? 's' : '' }}</td>
          </tr>
          <tr class="grand-total">
            <td class="lbl2" style="color:#fff;">Total du séjour</td>
            <td class="val2" style="color:#fff;">{{ number_format($reservation->total_amount, 0, ',', ' ') }} F CFA</td>
          </tr>
          <tr class="paid-ok">
            <td class="lbl2">Montant total réglé</td>
            <td class="val2">{{ number_format($totalPaid, 0, ',', ' ') }} F CFA</td>
          </tr>
        </tbody></table>
      </div>
    </div>

  </div>

  <!-- PIED DE PAGE -->
  <div class="footer">
    <strong>{{ config('app.name') }}</strong> - Facture officielle émise le {{ ($issuedAt ?? now())->format('d/m/Y à H:i') }}<br>
    Réservation {{ 'RES-'.str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }} - Ce document tient lieu de facture officielle de séjour.
  </div>

</body>
</html>
