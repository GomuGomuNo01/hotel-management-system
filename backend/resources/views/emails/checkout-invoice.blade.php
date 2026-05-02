<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Votre facture de séjour</title>
  <style>
    body { margin:0; padding:0; background:#f4f6f9; font-family: Arial, sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
    .header { background:#1e3a5f; padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:22px; font-weight:700; }
    .header p  { margin:6px 0 0; color:#94b8e0; font-size:13px; }
    .body { padding:36px 40px; }
    .greeting { font-size:16px; font-weight:600; color:#1a202c; margin-bottom:16px; }
    .intro { font-size:14px; color:#4a5568; line-height:1.6; margin-bottom:24px; }
    .info-box { background:#f0f4f8; border-radius:10px; padding:20px 24px; margin-bottom:24px; }
    .info-box h3 { margin:0 0 12px; font-size:13px; font-weight:700; color:#2d3748; text-transform:uppercase; letter-spacing:.05em; }
    .info-row { display:flex; justify-content:space-between; font-size:13px; color:#4a5568; padding:5px 0; border-bottom:1px solid #e2e8f0; }
    .info-row:last-child { border-bottom:none; }
    .info-row .label { color:#718096; }
    .info-row .value { font-weight:600; color:#2d3748; }
    .highlight { background:#ebf8f1; border:1px solid #9ae6b4; border-radius:10px; padding:18px 24px; margin-bottom:24px; }
    .highlight p { margin:0; font-size:15px; color:#276749; font-weight:600; }
    .highlight span { font-size:22px; font-weight:800; }
    .cta-note { background:#fffbeb; border:1px solid #f6e05e; border-radius:10px; padding:16px 20px; margin-bottom:24px; font-size:13px; color:#744210; line-height:1.6; }
    .footer { background:#f4f6f9; padding:24px 40px; text-align:center; font-size:12px; color:#a0aec0; line-height:1.7; }
    .footer strong { color:#718096; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>{{ config('app.name') }}</h1>
      <p>Facture de séjour — Réservation #{{ $reservation->id }}</p>
    </div>

    <div class="body">
      <p class="greeting">Bonjour {{ $reservation->client->first_name }},</p>
      <p class="intro">
        Votre séjour au {{ config('app.name') }} est maintenant terminé. Nous espérons que vous avez passé
        un excellent moment parmi nous. Veuillez trouver ci-joint votre <strong>facture officielle de séjour</strong>,
        disponible également dans votre espace personnel.
      </p>

      <!-- Détails du séjour -->
      <div class="info-box">
        <h3>Détails du séjour</h3>
        <div class="info-row"><span class="label">Chambre</span><span class="value">N° {{ $reservation->room->room_number }} — {{ ucfirst($reservation->room->room_type) }}</span></div>
        <div class="info-row"><span class="label">Arrivée</span><span class="value">{{ $reservation->check_in_date->format('d/m/Y') }}</span></div>
        <div class="info-row"><span class="label">Départ</span><span class="value">{{ $reservation->check_out_date->format('d/m/Y') }}</span></div>
        <div class="info-row"><span class="label">Durée</span><span class="value">{{ $reservation->nightsCount() }} nuit{{ $reservation->nightsCount() > 1 ? 's' : '' }}</span></div>
        <div class="info-row"><span class="label">Plan de paiement</span><span class="value">{{ $reservation->payment_plan === 'partial' ? 'Paiement en 2 fois' : 'Paiement intégral' }}</span></div>
      </div>

      <!-- Total -->
      <div class="highlight">
        <p>Montant total du séjour : <span>{{ number_format($reservation->total_amount, 0, ',', ' ') }} XOF</span></p>
      </div>

      <div class="cta-note">
        📎 <strong>La facture PDF est jointe à cet e-mail.</strong> Vous pouvez également la télécharger
        à tout moment depuis votre espace personnel → <em>Mes réservations</em>.
      </div>

      <p style="font-size:14px;color:#4a5568;">
        Merci pour votre confiance et à très bientôt !<br>
        <strong>L'équipe {{ config('app.name') }}</strong>
      </p>
    </div>

    <div class="footer">
      <strong>{{ config('app.name') }}</strong><br>
      Cet e-mail a été envoyé automatiquement suite à la validation de votre check-out.<br>
      Pour toute question, contactez notre équipe à la réception.
    </div>
  </div>
</body>
</html>
