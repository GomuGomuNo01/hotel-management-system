<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mise à jour de votre remboursement</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { padding: 32px 40px; text-align: center; }
    .header.approved { background: #064e3b; }
    .header.rejected { background: #7f1d1d; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { margin: 6px 0 0; font-size: 13px; }
    .header.approved p { color: #6ee7b7; }
    .header.rejected p { color: #fca5a5; }
    .body { padding: 32px 40px; color: #374151; line-height: 1.6; }
    .body h2.approved { color: #065f46; }
    .body h2.rejected { color: #991b1b; }
    .info-box { border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-box.approved { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .info-box.rejected { background: #fff1f2; border-left: 4px solid #f43f5e; }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .info-box .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
    .info-box .value { font-weight: bold; color: #111827; font-size: 15px; }
    .amount { font-size: 28px; font-weight: bold; text-align: center; margin: 24px 0 8px; }
    .amount.approved { color: #16a34a; }
    .amount.rejected { color: #dc2626; }
    .note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 14px 18px; font-size: 13px; color: #92400e; margin-top: 20px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
@php $approved = $refund->status === 'approved'; @endphp
<div class="wrapper">
  <div class="header {{ $approved ? 'approved' : 'rejected' }}">
    <h1>🏨 Hotel Management System</h1>
    <p>{{ $approved ? 'Remboursement approuvé' : 'Mise à jour de votre dossier de remboursement' }}</p>
  </div>

  <div class="body">
    <h2 class="{{ $approved ? 'approved' : 'rejected' }}">
      {{ $approved ? '✅ Votre remboursement a été approuvé' : '❌ Votre demande de remboursement a été refusée' }}
    </h2>

    <p>Bonjour <strong>{{ $refund->client->first_name }}</strong>,</p>

    @if($approved)
    <p>
      Nous avons le plaisir de vous informer que votre demande de remboursement pour la
      réservation <strong>#{{ $refund->reservation_id }}</strong> a été <strong>approuvée</strong>.
      Le virement sera effectué dans les prochains jours ouvrés.
    </p>

    <div class="amount approved">{{ number_format($refund->amount, 0, ',', ' ') }} XOF</div>
    <p style="text-align:center; color:#6b7280; font-size:13px; margin-top:0;">Montant remboursé</p>
    @else
    <p>
      Suite à l'examen de votre demande de remboursement pour la réservation
      <strong>#{{ $refund->reservation_id }}</strong>, nous ne sommes malheureusement pas
      en mesure de donner suite à celle-ci.
    </p>
    @endif

    <div class="info-box {{ $approved ? 'approved' : 'rejected' }}">
      <p><span class="label">Numéro de dossier</span><br/><span class="value">RMB-{{ str_pad($refund->id, 6, '0', STR_PAD_LEFT) }}</span></p>
      <p><span class="label">Réservation</span><br/><span class="value">#{{ $refund->reservation_id }}</span></p>
      <p><span class="label">Traité le</span><br/><span class="value">{{ $refund->processed_at?->format('d/m/Y à H:i') }}</span></p>
      <p><span class="label">Statut</span><br/><span class="value">{{ $approved ? '✅ Approuvé' : '❌ Refusé' }}</span></p>
      @if($refund->admin_notes)
      <p><span class="label">Message de l'équipe</span><br/><span class="value" style="font-weight:normal;">{{ $refund->admin_notes }}</span></p>
      @endif
    </div>

    @if(!$approved)
    <div class="note">
      <strong>Vous souhaitez contester cette décision ?</strong> Contactez-nous directement afin
      que nous puissions examiner votre situation.
    </div>
    @endif

    @if($approved)
    <div class="note">
      <strong>📅 Délai de virement :</strong> Le montant sera crédité sur votre mode de paiement
      d'origine dans un délai de <strong>3 à 7 jours ouvrés</strong> selon votre opérateur.
    </div>
    @endif
  </div>

  <div class="footer">
    <p>Hotel Management System &bull; Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.</p>
  </div>
</div>
</body>
</html>
