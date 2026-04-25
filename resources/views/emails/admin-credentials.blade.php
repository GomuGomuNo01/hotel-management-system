<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Vos identifiants</title></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px;">
    <h2 style="color: #2d6a4f;">Bienvenue sur {{ config('app.name') }}</h2>

    <p>Bonjour <strong>{{ $admin->first_name }} {{ $admin->last_name }}</strong>,</p>

    <p>Votre compte administrateur a été créé. Voici vos identifiants de connexion :</p>

    <div style="background: #f4f4f4; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>E-mail :</strong> {{ $admin->email }}</p>
        <p><strong>Mot de passe temporaire :</strong> <code style="background:#e0e0e0; padding:3px 8px; border-radius:4px;">{{ $temporaryPassword }}</code></p>
        <p><strong>Rôle :</strong> {{ $admin->role }}</p>
    </div>

    <p style="color: #c0392b;"><strong>⚠ Vous devez changer votre mot de passe dès votre première connexion.</strong></p>

    <p>Pour vous connecter, utilisez l'endpoint : <code>POST /api/auth/login</code> avec le rôle <code>admin</code>.</p>

    <hr>
    <p style="color: #888; font-size: 12px;">Cet e-mail a été envoyé automatiquement. Ne pas répondre.</p>
</body>
</html>
