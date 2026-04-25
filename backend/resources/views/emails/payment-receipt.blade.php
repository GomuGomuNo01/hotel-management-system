<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Reçu de paiement</title></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px;">
    <h2 style="color: #2d6a4f;">Paiement reçu ✓</h2>

    <p>Bonjour <strong>{{ $payment->client->first_name }}</strong>,</p>

    <p>Votre paiement a été reçu et traité avec succès.</p>

    <div style="background: #f4f4f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>Référence :</strong> {{ $payment->transaction_reference }}</p>
        <p><strong>Montant :</strong> {{ number_format($payment->amount, 0, ',', ' ') }} {{ $payment->currency }}</p>
        <p><strong>Fournisseur :</strong> {{ strtoupper(str_replace('_', ' ', $payment->provider)) }}</p>
        <p><strong>Date :</strong> {{ $payment->confirmed_at?->format('d/m/Y à H:i') }}</p>
        <p><strong>Chambre :</strong> {{ $payment->reservation->room->room_number }}</p>
    </div>

    <p>Vous pouvez télécharger votre facture depuis votre espace client.</p>

    <hr>
    <p style="color: #888; font-size: 12px;">{{ config('app.name') }} — Cet e-mail est automatique.</p>
</body>
</html>
