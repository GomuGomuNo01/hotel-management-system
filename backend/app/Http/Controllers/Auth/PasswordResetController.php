<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordResetController extends Controller
{
    use ApiResponse;

    /**
     * Broker dédié aux clients (cf. config/auth.php → passwords.clients).
     */
    private function broker()
    {
        return Password::broker('clients');
    }

    /**
     * POST /api/auth/password/forgot
     * Envoie un lien de réinitialisation à l'adresse e-mail fournie.
     * Réponse neutre : ne révèle jamais si l'e-mail existe.
     */
    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $this->broker()->sendResetLink($request->only('email'));

        return $this->success(
            message: 'Si un compte correspond à cet e-mail, un lien de réinitialisation a été envoyé.'
        );
    }

    /**
     * POST /api/auth/password/reset
     * Valide le token et définit le nouveau mot de passe.
     */
    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            // Même exigence qu'à l'inscription : sans cela, « mot de passe
            // oublié » offrait un contournement de la politique de robustesse.
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $status = $this->broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($client, $password) {
                // NB : la table `clients` n'a pas de colonne remember_token.
                // Le cast 'password' => 'hashed' du modèle hashe automatiquement :
                // ne pas appeler Hash::make ici sous peine de double hachage.
                $client->forceFill([
                    'password' => $password,
                ])->save();

                // Révoque tous les jetons d'API actifs pour forcer une reconnexion.
                $client->tokens()->delete();

                event(new PasswordReset($client));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->success(message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.');
        }

        if ($status === Password::INVALID_TOKEN) {
            return $this->error('Ce lien de réinitialisation est invalide ou a expiré.', 422, ['token' => true]);
        }

        return $this->error('Impossible de réinitialiser le mot de passe. Vérifiez l\'adresse e-mail.', 422);
    }
}
