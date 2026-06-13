<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vos identifiants - {{ config('app.name') }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#2d3748;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding:40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background:linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); padding:36px 40px; text-align:center;">
                            <p style="margin:0 0 8px 0; font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#bee3f8; font-weight:600;">Hôtel Management</p>
                            <h1 style="margin:0; font-size:26px; font-weight:700; color:#ffffff; letter-spacing:-0.5px;">{{ config('app.name') }}</h1>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding:40px 40px 32px 40px;">

                            <h2 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#1a365d;">Bienvenue, {{ $admin->first_name }} {{ $admin->last_name }} !</h2>
                            <p style="margin:0 0 28px 0; font-size:15px; color:#4a5568; line-height:1.6;">
                                Votre compte administrateur a été créé avec succès. Vous trouverez ci-dessous vos identifiants de connexion.
                            </p>

                            {{-- Credentials block --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ebf8ff; border:1px solid #bee3f8; border-radius:10px; margin-bottom:28px;">
                                <tr>
                                    <td style="padding:24px 28px;">
                                        <p style="margin:0 0 6px 0; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#2b6cb0; font-weight:700;">Vos identifiants</p>

                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                                            <tr>
                                                <td style="padding:8px 0; border-bottom:1px solid #bee3f8;">
                                                    <span style="font-size:13px; color:#4a5568; display:block; margin-bottom:2px;">Adresse e-mail</span>
                                                    <span style="font-size:15px; font-weight:600; color:#1a365d;">{{ $admin->email }}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:14px 0 8px 0;">
                                                    <span style="font-size:13px; color:#4a5568; display:block; margin-bottom:6px;">Mot de passe temporaire</span>
                                                    <span style="display:inline-block; background-color:#1a365d; color:#ffffff; font-family:'Courier New', Courier, monospace; font-size:16px; font-weight:700; letter-spacing:2px; padding:10px 18px; border-radius:6px;">{{ $temporaryPassword }}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            {{-- Role & permissions --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:28px;">
                                <tr>
                                    <td style="padding:20px 28px;">
                                        <p style="margin:0 0 10px 0; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#4a5568; font-weight:700;">Votre profil</p>
                                        <p style="margin:0 0 6px 0; font-size:14px; color:#2d3748;">
                                            <strong>Rôle :</strong>
                                            <span style="display:inline-block; background-color:#2b6cb0; color:#ffffff; font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px; margin-left:6px; vertical-align:middle;">{{ $admin->role }}</span>
                                        </p>
                                        @if ($admin->relationLoaded('permissions') && $admin->permissions->isNotEmpty())
                                        <p style="margin:10px 0 4px 0; font-size:14px; color:#2d3748;"><strong>Permissions :</strong></p>
                                        <p style="margin:0; font-size:13px; color:#4a5568; line-height:1.8;">
                                            @foreach ($admin->permissions as $permission)
                                                <span style="display:inline-block; background-color:#e2e8f0; color:#2d3748; font-size:12px; padding:2px 8px; border-radius:4px; margin:2px 2px 2px 0;">{{ $permission->permission_key }}</span>
                                            @endforeach
                                        </p>
                                        @endif
                                    </td>
                                </tr>
                            </table>

                            {{-- Alert --}}
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff5f5; border-left:4px solid #fc8181; border-radius:0 8px 8px 0; margin-bottom:28px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <p style="margin:0; font-size:14px; color:#c53030; font-weight:600;">
                                            Securite : vous devez changer votre mot de passe lors de votre premiere connexion.
                                        </p>
                                        <p style="margin:6px 0 0 0; font-size:13px; color:#9b2c2c;">
                                            Ce mot de passe temporaire ne doit pas etre partagé. Modifiez-le immédiatement après votre connexion.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            {{-- CTA --}}
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{ config('app.frontend_url', '#') }}/login"
                                           style="display:inline-block; background:linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:14px 36px; border-radius:8px; letter-spacing:0.3px;">
                                            Acceder a mon espace
                                        </a>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#f7fafc; border-top:1px solid #e2e8f0; padding:24px 40px; text-align:center;">
                            <p style="margin:0 0 6px 0; font-size:12px; color:#718096;">
                                Cet e-mail a été envoyé automatiquement par <strong>{{ config('app.name') }}</strong>. Merci de ne pas y répondre.
                            </p>
                            <p style="margin:0; font-size:11px; color:#a0aec0;">
                                &copy; {{ date('Y') }} {{ config('app.name') }} - Tous droits réservés.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
