<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Facture {{ $payment->transaction_reference }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #333; margin: 40px; }
        h1 { color: #2d6a4f; font-size: 22px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #2d6a4f; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
        .total { font-weight: bold; font-size: 16px; color: #2d6a4f; }
        .header-info { display: flex; justify-content: space-between; }
        .ref { color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <h1>{{ config('app.name') }}</h1>
    <p class="ref">Facture N° {{ $payment->transaction_reference }}</p>
    <p class="ref">Émise le : {{ now()->format('d/m/Y') }}</p>

    <hr>

    <h3>Client</h3>
    <p>{{ $payment->client->first_name }} {{ $payment->client->last_name }}<br>
    {{ $payment->client->email }}<br>
    {{ $payment->client->phone }}</p>

    <h3>Détails de la réservation</h3>
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Détail</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Chambre</td><td>{{ $payment->reservation->room->room_number }} — {{ ucfirst($payment->reservation->room->room_type) }}</td></tr>
            <tr><td>Arrivée</td><td>{{ $payment->reservation->check_in_date->format('d/m/Y') }}</td></tr>
            <tr><td>Départ</td><td>{{ $payment->reservation->check_out_date->format('d/m/Y') }}</td></tr>
            <tr><td>Nuits</td><td>{{ $payment->reservation->nightsCount() }}</td></tr>
            <tr><td>Prix par nuit</td><td>{{ number_format($payment->reservation->room->price_per_night, 0, ',', ' ') }} XOF</td></tr>
        </tbody>
    </table>

    <h3>Paiement</h3>
    <table>
        <tbody>
            <tr><td>Fournisseur</td><td>{{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</td></tr>
            <tr><td>Téléphone</td><td>{{ $payment->phone_number }}</td></tr>
            <tr><td>Date de paiement</td><td>{{ $payment->confirmed_at?->format('d/m/Y à H:i') }}</td></tr>
            <tr><td class="total">TOTAL</td><td class="total">{{ number_format($payment->amount, 0, ',', ' ') }} {{ $payment->currency }}</td></tr>
        </tbody>
    </table>

    <br><br>
    <p style="color: #888; font-size: 11px; text-align: center;">Merci pour votre confiance — {{ config('app.name') }}</p>
</body>
</html>
