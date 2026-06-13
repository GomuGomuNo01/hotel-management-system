<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture {{ $payment->transaction_reference }}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #1a202c; background: #fff; }

    /* ── Bandeau supérieur ── */
    .header-band {
      background: #1e3a5f;
      padding: 24px 40px;
      color: #fff;
    }
    .header-table { width: 100%; }
    .hotel-name   { font-size: 20px; font-weight: bold; letter-spacing: 0.02em; }
    .hotel-sub    { font-size: 11px; color: #94b8e0; margin-top: 3px; }
    .doc-meta     { text-align: right; }
    .doc-type     { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94b8e0; }
    .doc-ref      { font-size: 15px; font-weight: bold; letter-spacing: 0.04em; margin-top: 4px; }
    .doc-date     { font-size: 10px; color: #94b8e0; margin-top: 3px; }

    /* ── Bandeau statut ── */
    .status-band {
      background: #e6f4ea;
      border-bottom: 3px solid #2d6a4f;
      padding: 10px 40px;
    }
    .status-band-table { width: 100%; }
    .status-icon  { font-size: 18px; width: 30px; vertical-align: middle; }
    .status-title { font-size: 13px; font-weight: bold; color: #1e4620; vertical-align: middle; }
    .status-sub   { font-size: 11px; color: #3a6645; vertical-align: middle; padding-left: 8px; }

    /* ── Corps ── */
    .body { padding: 28px 40px; }

    /* ── Montant mis en avant ── */
    .amount-block {
      background: #ebf8f1;
      border: 1px solid #9ae6b4;
      border-radius: 6px;
      padding: 16px 20px;
      text-align: center;
      margin-bottom: 22px;
    }
    .amount-label { font-size: 10px; color: #276749; text-transform: uppercase; letter-spacing: 0.06em; }
    .amount-value { font-size: 26px; font-weight: bold; color: #1a5c38; margin-top: 4px; }
    .amount-sub   { font-size: 11px; color: #3a6645; margin-top: 4px; }

    /* ── Sections ── */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 10px; font-weight: bold; text-transform: uppercase;
      letter-spacing: 0.08em; color: #4a5568;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;
    }
    .info-box {
      background: #f7fafc; border-radius: 6px; border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .info-row {
      width: 100%; border-collapse: collapse;
    }
    .info-row td {
      padding: 7px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px;
    }
    .info-row tr:last-child td { border-bottom: none; }
    .info-row .lbl { color: #718096; width: 40%; }
    .info-row .val { font-weight: 600; color: #2d3748; }

    /* Référence monospace */
    .ref-code {
      display: inline-block;
      background: #ede9fe; border: 1px solid #c4b5fd;
      border-radius: 4px; padding: 2px 8px;
      font-family: monospace; font-size: 11px; font-weight: bold; color: #5b21b6;
      letter-spacing: 0.04em;
    }

    /* ── Tableau paiements ── */
    .payment-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .payment-table thead tr { background: #1e3a5f; }
    .payment-table thead th {
      color: #fff; padding: 8px 12px; text-align: left;
      font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .payment-table tbody tr:nth-child(odd)  { background: #f7fafc; }
    .payment-table tbody tr:nth-child(even) { background: #fff; }
    .payment-table tbody td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .total-row td { background: #ebf8f1 !important; font-weight: bold; color: #276749; border-top: 2px solid #9ae6b4; }

    /* Note acompte */
    .note-block {
      background: #fffbeb; border: 1px solid #f6e05e;
      border-radius: 6px; padding: 12px 16px;
      font-size: 11px; color: #744210; margin-top: 16px; line-height: 1.6;
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
        <div class="hotel-sub">Facture de paiement</div>
      </td>
      <td class="doc-meta">
        <div class="doc-type">Facture</div>
        <div class="doc-ref">{{ $docRef ?? 'PAY-' . str_pad($payment->id, 6, '0', STR_PAD_LEFT) }}</div>
        <div class="doc-date">Émise le {{ ($issuedAt ?? now())->format('d/m/Y') }}</div>
      </td>
    </tr></table>
  </div>

  <!-- STATUT -->
  <div class="status-band">
    <table class="status-band-table"><tr>
      <td class="status-icon">✔</td>
      <td class="status-title">Paiement confirmé</td>
      <td class="status-sub">Traité le {{ $payment->confirmed_at?->format('d/m/Y à H:i') }}</td>
    </tr></table>
  </div>

  <div class="body">

    <!-- MONTANT MIS EN AVANT -->
    <div class="amount-block">
      <div class="amount-label">Montant réglé</div>
      <div class="amount-value">{{ number_format($payment->amount, 0, ',', ' ') }} F CFA</div>
      <div class="amount-sub">{{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</div>
    </div>

    <!-- INFORMATIONS CLIENT -->
    <div class="section">
      <div class="section-title">Informations client</div>
      <div class="info-box">
        <table class="info-row"><tbody>
          <tr>
            <td class="lbl">Nom complet</td>
            <td class="val">{{ $payment->client->first_name }} {{ $payment->client->last_name }}</td>
          </tr>
          <tr>
            <td class="lbl">E-mail</td>
            <td class="val">{{ $payment->client->email }}</td>
          </tr>
          @if ($payment->client->phone)
          <tr>
            <td class="lbl">Téléphone</td>
            <td class="val">{{ $payment->client->phone }}</td>
          </tr>
          @endif
        </tbody></table>
      </div>
    </div>

    <!-- DÉTAILS PAIEMENT -->
    <div class="section">
      <div class="section-title">Détails du paiement</div>
      <div class="info-box">
        <table class="info-row"><tbody>
          <tr>
            <td class="lbl">N° de facture</td>
            <td class="val"><span class="ref-code">{{ $docRef ?? 'PAY-' . str_pad($payment->id, 6, '0', STR_PAD_LEFT) }}</span></td>
          </tr>
          <tr>
            <td class="lbl">Référence opérateur</td>
            <td class="val" style="font-size:11px; color:#718096;">{{ $payment->transaction_reference }}</td>
          </tr>
          <tr>
            <td class="lbl">Moyen de paiement</td>
            <td class="val">{{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</td>
          </tr>
          @if ($payment->phone_number)
          <tr>
            <td class="lbl">Numéro de téléphone</td>
            <td class="val">{{ $payment->phone_number }}</td>
          </tr>
          @endif
          <tr>
            <td class="lbl">Date de confirmation</td>
            <td class="val">{{ $payment->confirmed_at?->format('d/m/Y à H:i') }}</td>
          </tr>
          <tr>
            <td class="lbl">Montant</td>
            <td class="val" style="color:#1a5c38; font-size:13px;">{{ number_format($payment->amount, 0, ',', ' ') }} F CFA</td>
          </tr>
        </tbody></table>
      </div>
    </div>

    <!-- RÉSERVATION ASSOCIÉE -->
    <div class="section">
      <div class="section-title">Réservation associée</div>
      <table class="payment-table">
        <thead>
          <tr>
            <th>N° réservation</th>
            <th>Chambre</th>
            <th>Arrivée</th>
            <th>Départ</th>
            <th>Nuits</th>
            <th class="text-right">Total séjour</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family:monospace; font-size:11px; font-weight:bold; color:#3730a3;">
              RES-{{ str_pad($payment->reservation->id, 6, '0', STR_PAD_LEFT) }}
            </td>
            <td>N° {{ $payment->reservation->room->room_number }} - {{ ucfirst($payment->reservation->room->room_type) }}</td>
            <td>{{ $payment->reservation->check_in_date->format('d/m/Y') }}</td>
            <td>{{ $payment->reservation->check_out_date->format('d/m/Y') }}</td>
            <td>{{ $payment->reservation->nightsCount() }}</td>
            <td class="text-right">{{ number_format($payment->reservation->total_amount, 0, ',', ' ') }} F CFA</td>
          </tr>
          <tr class="total-row">
            <td colspan="5">Montant payé sur cette facture</td>
            <td class="text-right">{{ number_format($payment->amount, 0, ',', ' ') }} F CFA</td>
          </tr>
        </tbody>
      </table>

      @php
        $remaining = max(0, $payment->reservation->total_amount - $payment->reservation->paidAmount());
      @endphp
      @if ($remaining > 0)
        <div class="note-block">
          <strong>⚠ Acompte partiel :</strong>
          Ce document couvre un acompte (50 %) du montant total.
          Un solde de <strong>{{ number_format($remaining, 0, ',', ' ') }} F CFA</strong> reste à régler.
        </div>
      @endif
    </div>

  </div>

  <!-- PIED DE PAGE -->
  <div class="footer">
    <strong>{{ config('app.name') }}</strong> - Facture émise le {{ ($issuedAt ?? now())->format('d/m/Y à H:i') }}<br>
    Ce document tient lieu de preuve de paiement. Conservez-le précieusement.
  </div>

</body>
</html>
