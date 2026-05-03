<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture de séjour — Réservation #{{ $reservation->id }}</title>
  <style>
    body      { font-family: DejaVu Sans, sans-serif; color: #1a202c; margin: 40px; font-size: 13px; }
    h1        { color: #1e3a5f; font-size: 20px; margin: 0; }
    h3        { color: #1e3a5f; font-size: 13px; margin: 24px 0 6px; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; }
    .ref      { color: #718096; font-size: 11px; margin: 2px 0; }
    .header   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .badge    { background: #1e3a5f; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; }
    table     { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th        { background: #1e3a5f; color: #fff; padding: 7px 12px; text-align: left; font-size: 11px; font-weight: 700; }
    td        { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .total-row td  { background: #ebf8f1; font-weight: 700; font-size: 14px; color: #276749; border-top: 2px solid #9ae6b4; }
    .right    { text-align: right; }
    .footer   { margin-top: 40px; font-size: 10px; color: #a0aec0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    .section  { background: #f7fafc; border-radius: 6px; padding: 12px 16px; margin-top: 8px; }
    .row      { display: flex; justify-content: space-between; padding: 3px 0; }
    .label    { color: #718096; }
    .value    { font-weight: 600; color: #2d3748; }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="header">
    <div>
      <h1>{{ config('app.name') }}</h1>
      <p class="ref">Facture de séjour N° FAC-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</p>
      <p class="ref">Émise le : {{ now()->format('d/m/Y') }}</p>
    </div>
    <div class="badge">FACTURE OFFICIELLE</div>
  </div>

  <hr style="border:none;border-top:2px solid #1e3a5f;margin:0 0 24px;">

  <!-- Client -->
  <h3>Client</h3>
  <div class="section">
    <div class="row"><span class="label">Nom : </span><span class="value">{{ $reservation->client->first_name }} {{ $reservation->client->last_name }}</span></div>
    <div class="row"><span class="label">E-mail : </span><span class="value">{{ $reservation->client->email }}</span></div>
    @if($reservation->client->phone)
    <div class="row"><span class="label">Téléphone : </span><span class="value">{{ $reservation->client->phone }}</span></div>
    @endif
  </div>

  <!-- Séjour -->
  <h3>Détails du séjour</h3>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Détail</th>
        <th class="right">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Chambre N° {{ $reservation->room->room_number }} — {{ ucfirst($reservation->room->room_type) }}</td>
        <td>
          Du {{ $reservation->check_in_date->format('d/m/Y') }}
          au {{ $reservation->check_out_date->format('d/m/Y') }}
          ({{ $reservation->nightsCount() }} nuit{{ $reservation->nightsCount() > 1 ? 's' : '' }})
        </td>
        <td class="right">{{ number_format($reservation->total_amount, 0, ',', ' ') }} XOF</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total séjour</td>
        <td class="right">{{ number_format($reservation->total_amount, 0, ',', ' ') }} XOF</td>
      </tr>
    </tbody>
  </table>

  <!-- Paiements -->
  <h3>Historique des paiements</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Fournisseur</th>
        <th>Référence</th>
        <th class="right">Montant</th>
      </tr>
    </thead>
    <tbody>
      @php $labels = ['deposit' => 'Acompte (50 %)', 'balance' => 'Solde restant', 'full' => 'Paiement intégral', 'cash' => 'Espèces']; @endphp
      @foreach($reservation->payments as $payment)
      <tr>
        <td>{{ $payment->confirmed_at?->format('d/m/Y H:i') ?? '—' }}</td>
        <td>{{ $labels[$payment->payment_type] ?? $payment->payment_type }}</td>
        <td>{{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</td>
        <td style="font-family:monospace;font-size:10px;">{{ $payment->transaction_reference ?? '—' }}</td>
        <td class="right">{{ number_format($payment->amount, 0, ',', ' ') }} XOF</td>
      </tr>
      @endforeach
      <tr class="total-row">
        <td colspan="4">Total réglé</td>
        <td class="right">{{ number_format($reservation->payments->sum('amount'), 0, ',', ' ') }} XOF</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    {{ config('app.name') }} — Facture générée automatiquement le {{ now()->format('d/m/Y à H:i') }}<br>
    Réservation #{{ $reservation->id }} — Ce document tient lieu de facture officielle.
  </div>

</body>
</html>
