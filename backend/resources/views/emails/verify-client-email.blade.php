<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vérification de votre adresse e-mail</title>
  <style>
    body { margin:0; padding:0; background:#f3f4f6; font-family:'Helvetica Neue',Arial,sans-serif; color:#374151; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,.08); }
    .header  { background:linear-gradient(135deg,#247E49,#1A5333); padding:36px 40px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-.3px; }
    .header p  { margin:6px 0 0; color:rgba(255,255,255,.9); font-size:13px; }
    .body    { padding:36px 40px; }
    .body p  { margin:0 0 16px; font-size:15px; line-height:1.65; color:#4b5563; }
    .btn-wrap { text-align:center; margin:28px 0; }
    .btn     { display:inline-block; padding:14px 36px; background:#247E49; color:#fff !important; text-decoration:none; border-radius:8px; font-size:15px; font-weight:600; letter-spacing:.2px; }
    .note    { font-size:13px; color:#9ca3af; margin-top:24px; padding-top:20px; border-top:1px solid #f3f4f6; line-height:1.6; }
    .note a  { color:#247E49; }
    .footer  { background:#f9fafb; padding:20px 40px; text-align:center; font-size:12px; color:#9ca3af; border-top:1px solid #f3f4f6; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🏨 {{ config('app.name') }}</h1>
    <p>Hôtel 4 étoiles - Abidjan</p>
  </div>

  <div class="body">
    <p>Bonjour <strong>{{ $notifiable->first_name }}</strong>,</p>
    <p>
      Merci de vous être inscrit(e) sur <strong>{{ config('app.name') }}</strong> !<br>
      Pour activer votre compte et accéder à nos services de réservation en ligne, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
    </p>

    <div class="btn-wrap">
      <a href="{{ $url }}" class="btn">Vérifier mon adresse e-mail</a>
    </div>

    <p>Ce lien est valable <strong>24 heures</strong>. Passé ce délai, vous pourrez en demander un nouveau depuis la page de connexion.</p>

    <div class="note">
      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
      <a href="{{ $url }}">{{ $url }}</a>
      <br><br>
      Si vous n'avez pas créé de compte, ignorez simplement cet e-mail.
    </div>
  </div>

  <div class="footer">
    © {{ date('Y') }} {{ config('app.name') }} · Tous droits réservés<br>
    Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
  </div>
</div>
</body>
</html>
