<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Remboursement en cours</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1e3a5f; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: #93c5fd; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 32px 40px; color: #374151; line-height: 1.6; }
    .body h2 { color: #1e3a5f; margin-top: 0; }
    .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .info-box .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .info-box .value { font-weight: bold; color: #111827; font-size: 15px; }
    .amount { font-size: 28px; font-weight: bold; color: #1d4ed8; text-align: center; margin: 24px 0 8px; }
    .note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 20px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🏨 Hotel Management System</h1>
    <p>Confirmation d'annulation et de remboursement</p>
  </div>

  <div class="body">
    <h2>Votre remboursement est en cours de traitement</h2>

    <p>Bonjour <strong>{{ $reservation->client->first_name }}</strong>,</p>

    <p>
      Nous avons bien enregistré l'annulation de votre réservation <strong>#{{ $reservation->id }}</strong>.
      Étant donné que vous aviez déjà réglé cette réservation, un remboursement va être initié en votre faveur.
    </p>

    <div class="amount">{{ number_format($refund->amount, 0, ',', ' ') }} XOF</div>
    <p style="text-align:center; color:#6b7280; font-size:13px; margin-top:0;">Montant à rembourser</p>

    <div class="info-box">
      <p><span class="label">Réservation</span><br/><span class="value">#{{ $reservation->id }}</span></p>
      <p><span class="label">Chambre</span><br/><span class="value">N° {{ $reservation->room->room_number }} — {{ $reservation->room->room_type }}</span></p>
      <p><span class="label">Dates</span><br/><span class="value">{{ \Carbon\Carbon::parse($reservation->check_in_date)->format('d/m/Y') }} → {{ \Carbon\Carbon::parse($reservation->check_out_date)->format('d/m/Y') }}</span></p>
      <p><span class="label">Numéro de dossier</span><br/><span class="value">RMB-{{ str_pad($refund->id, 6, '0', STR_PAD_LEFT) }}</span></p>
      <p><span class="label">Statut</span><br/><span class="value">⏳ En attente de validation</span></p>
    </div>

    <div class="note">
      <strong>⚠️ Important :</strong> Votre demande de remboursement est en cours d'examen par notre équipe.
      Vous recevrez un second e-mail dès que votre remboursement aura été approuvé.
      Le délai de traitement est généralement de <strong>2 à 5 jours ouvrés</strong>.
    </div>

    <p style="margin-top: 24px;">
      Si vous avez la moindre question, n'hésitez pas à nous contacter.
    </p>
  </div>

  <div class="footer">
    <p>Hotel Management System &bull; Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
</div>
</body>
</html>
