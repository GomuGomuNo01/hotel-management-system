<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Reçu de réservation #{{ $reservation->id }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 13px;
            color: #1a202c;
            background: #fff;
            padding: 40px;
        }

        /* ── En-tête ── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #2d6a4f;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .hotel-name { font-size: 22px; font-weight: bold; color: #2d6a4f; }
        .hotel-sub  { font-size: 11px; color: #718096; margin-top: 4px; }
        .receipt-meta { text-align: right; }
        .receipt-meta .label { font-size: 10px; text-transform: uppercase; color: #718096; letter-spacing: 0.05em; }
        .receipt-meta .value { font-size: 14px; font-weight: bold; color: #2d3748; }
        .receipt-meta .date  { font-size: 11px; color: #718096; margin-top: 4px; }

        /* ── Badge statut ── */
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 8px;
        }
        .badge-partial  { background: #fef3c7; color: #92400e; }
        .badge-full     { background: #d1fae5; color: #065f46; }

        /* ── Sections ── */
        .section { margin-bottom: 22px; }
        .section-title {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #718096;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 12px;
        }

        /* ── Grille infos ── */
        .info-grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .info-cell { flex: 1; min-width: 120px; }
        .info-label { font-size: 10px; color: #718096; margin-bottom: 2px; }
        .info-value { font-size: 13px; font-weight: bold; color: #1a202c; }

        /* ── Tableau paiements ── */
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #2d6a4f; }
        thead th {
            color: white;
            padding: 9px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        tbody tr:nth-child(odd)  { background: #f7fafc; }
        tbody tr:nth-child(even) { background: #ffffff; }
        tbody td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .amount { font-weight: bold; }

        /* ── Récapitulatif financier ── */
        .financial-summary {
            margin-top: 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        .fin-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
        }
        .fin-row:last-child { border-bottom: none; }
        .fin-row.total {
            background: #2d6a4f;
            color: white;
            font-weight: bold;
            font-size: 15px;
        }
        .fin-row.remaining {
            background: #fffbeb;
            color: #92400e;
            font-weight: bold;
        }
        .fin-row.paid-ok {
            background: #f0fdf4;
            color: #065f46;
            font-weight: bold;
        }

        /* ── Note check-in ── */
        .checkin-note {
            margin-top: 24px;
            background: #ebf8ff;
            border: 1px solid #bee3f8;
            border-radius: 8px;
            padding: 14px 18px;
        }
        .checkin-note-title { font-weight: bold; color: #2b6cb0; font-size: 13px; margin-bottom: 6px; }
        .checkin-note-body  { color: #2c5282; font-size: 12px; line-height: 1.5; }
        .ref-code {
            display: inline-block;
            background: #2b6cb0;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
            font-weight: bold;
            margin-top: 8px;
            letter-spacing: 0.05em;
        }

        /* ── Pied de page ── */
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #a0aec0;
        }
    </style>
</head>
<body>

    <!-- ═══════════ EN-TÊTE ═══════════ -->
    <div class="header">
        <div>
            <div class="hotel-name">{{ config('app.name') }}</div>
            <div class="hotel-sub">Reçu de réservation officiel</div>
            @php
                $totalPaid     = $reservation->payments->sum('amount');
                $remaining     = max(0, $reservation->total_amount - $totalPaid);
                $isFullyPaid   = $remaining <= 0;
            @endphp
            <span class="status-badge {{ $isFullyPaid ? 'badge-full' : 'badge-partial' }}">
                {{ $isFullyPaid ? '✓ Entièrement payé' : 'Acompte versé — solde dû' }}
            </span>
        </div>
        <div class="receipt-meta">
            <div class="label">Reçu N°</div>
            <div class="value">RES-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</div>
            <div class="date">Émis le {{ now()->format('d/m/Y à H:i') }}</div>
        </div>
    </div>

    <!-- ═══════════ CLIENT ═══════════ -->
    <div class="section">
        <div class="section-title">Informations client</div>
        <div class="info-grid">
            <div class="info-cell">
                <div class="info-label">Nom complet</div>
                <div class="info-value">{{ $reservation->client->first_name }} {{ $reservation->client->last_name }}</div>
            </div>
            <div class="info-cell">
                <div class="info-label">E-mail</div>
                <div class="info-value">{{ $reservation->client->email }}</div>
            </div>
            @if ($reservation->client->phone)
            <div class="info-cell">
                <div class="info-label">Téléphone</div>
                <div class="info-value">{{ $reservation->client->phone }}</div>
            </div>
            @endif
        </div>
    </div>

    <!-- ═══════════ RÉSERVATION ═══════════ -->
    <div class="section">
        <div class="section-title">Détails de la réservation</div>
        <div class="info-grid">
            <div class="info-cell">
                <div class="info-label">Chambre</div>
                <div class="info-value">
                    N° {{ $reservation->room->room_number }} — {{ ucfirst($reservation->room->room_type) }}
                </div>
            </div>
            <div class="info-cell">
                <div class="info-label">Arrivée</div>
                <div class="info-value">{{ $reservation->check_in_date->format('d/m/Y') }}</div>
            </div>
            <div class="info-cell">
                <div class="info-label">Départ</div>
                <div class="info-value">{{ $reservation->check_out_date->format('d/m/Y') }}</div>
            </div>
            <div class="info-cell">
                <div class="info-label">Durée</div>
                <div class="info-value">{{ $reservation->nightsCount() }} nuit(s)</div>
            </div>
            <div class="info-cell">
                <div class="info-label">Plan de paiement</div>
                <div class="info-value">
                    {{ $reservation->payment_plan === 'partial' ? 'Paiement en 2 tranches (50 % + 50 %)' : 'Paiement intégral' }}
                </div>
            </div>
            @if ($reservation->notes)
            <div class="info-cell" style="flex: 2;">
                <div class="info-label">Remarques</div>
                <div class="info-value">{{ $reservation->notes }}</div>
            </div>
            @endif
        </div>
    </div>

    <!-- ═══════════ PAIEMENTS ═══════════ -->
    <div class="section">
        <div class="section-title">Historique des paiements</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Moyen</th>
                    <th>Référence</th>
                    <th class="text-right">Montant</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($reservation->payments as $payment)
                <tr>
                    <td>{{ $payment->confirmed_at?->format('d/m/Y H:i') ?? '—' }}</td>
                    <td>{{ $payment->paymentTypeLabel() }}</td>
                    <td>
                        @if ($payment->provider === 'cash')
                            Espèces (hôtel)
                        @elseif ($payment->provider === 'orange_ci')
                            Orange Money
                        @elseif ($payment->provider === 'wave_ci')
                            Wave CI
                        @else
                            {{ $payment->provider }}
                        @endif
                    </td>
                    <td style="font-family: monospace; font-size: 10px;">{{ $payment->transaction_reference }}</td>
                    <td class="text-right amount">{{ number_format($payment->amount, 0, ',', ' ') }} XOF</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Récapitulatif financier -->
        <div class="financial-summary" style="margin-top: 16px;">
            <div class="fin-row">
                <span>Prix par nuit</span>
                <span>{{ number_format($reservation->room->price_per_night, 0, ',', ' ') }} XOF × {{ $reservation->nightsCount() }} nuit(s)</span>
            </div>
            <div class="fin-row total">
                <span>Total de la réservation</span>
                <span>{{ number_format($reservation->total_amount, 0, ',', ' ') }} XOF</span>
            </div>
            <div class="fin-row paid-ok">
                <span>Montant payé</span>
                <span>{{ number_format($totalPaid, 0, ',', ' ') }} XOF</span>
            </div>
            @if ($remaining > 0)
            <div class="fin-row remaining">
                <span>⚠ Solde restant dû</span>
                <span>{{ number_format($remaining, 0, ',', ' ') }} XOF</span>
            </div>
            @endif
        </div>
    </div>

    <!-- ═══════════ NOTE CHECK-IN ═══════════ -->
    <div class="checkin-note">
        <div class="checkin-note-title">📋 Important — Présenter ce reçu lors de votre arrivée à l'hôtel</div>
        <div class="checkin-note-body">
            Ce document est votre justificatif de réservation. Présentez-le à la réception lors de votre check-in.
            @if ($remaining > 0)
                <br><strong>Un solde de {{ number_format($remaining, 0, ',', ' ') }} XOF reste à régler à l'accueil.</strong>
            @else
                <br>Votre réservation est entièrement réglée. Bienvenue !
            @endif
        </div>
        <div class="ref-code">RES-{{ str_pad($reservation->id, 6, '0', STR_PAD_LEFT) }}</div>
    </div>

    <!-- ═══════════ PIED DE PAGE ═══════════ -->
    <div class="footer">
        {{ config('app.name') }} — Reçu généré automatiquement le {{ now()->format('d/m/Y à H:i') }}<br>
        Ce document est valable comme justificatif de paiement. Conservez-le précieusement.
    </div>

</body>
</html>
