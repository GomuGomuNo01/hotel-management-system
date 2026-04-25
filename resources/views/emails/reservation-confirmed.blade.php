<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Réservation confirmée</title></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px;">
    <h2 style="color: #2d6a4f;">Réservation confirmée ✓</h2>

    <p>Bonjour <strong>{{ $reservation->client->first_name }}</strong>,</p>

    <p>Votre réservation a été confirmée avec succès.</p>

    <div style="background: #f4f4f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>Chambre :</strong> {{ $reservation->room->room_number }} ({{ $reservation->room->room_type }})</p>
        <p><strong>Arrivée :</strong> {{ $reservation->check_in_date->format('d/m/Y') }}</p>
        <p><strong>Départ :</strong> {{ $reservation->check_out_date->format('d/m/Y') }}</p>
        <p><strong>Durée :</strong> {{ $reservation->nightsCount() }} nuit(s)</p>
        <p><strong>Montant total :</strong> {{ number_format($reservation->total_amount, 0, ',', ' ') }} XOF</p>
    </div>

    <p>Merci pour votre confiance. Nous vous souhaitons un agréable séjour.</p>

    <hr>
    <p style="color: #888; font-size: 12px;">{{ config('app.name') }} — Cet e-mail est automatique.</p>
</body>
</html>
