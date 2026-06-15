<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/auth/email/verify/{id}/{hash}
     * Lien cliqué depuis l'e-mail - accessible directement dans le navigateur.
     * Vérifie la signature, valide le hash, marque l'e-mail comme vérifié,
     * puis redirige vers le frontend.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        $client = Client::find($id);

        if (! $client) {
            return redirect("{$frontendUrl}/email-verifie?status=invalid");
        }

        // Vérifier le hash (sha1 de l'e-mail)
        if (! hash_equals(sha1($client->email), $hash)) {
            return redirect("{$frontendUrl}/email-verifie?status=invalid");
        }

        // Vérifier la signature temporaire
        if (! $request->hasValidSignature()) {
            return redirect("{$frontendUrl}/email-verifie?status=expired");
        }

        if ($client->hasVerifiedEmail()) {
            return redirect("{$frontendUrl}/email-verifie?status=already");
        }

        $client->markEmailAsVerified();

        return redirect("{$frontendUrl}/email-verifie?status=success");
    }

    /**
     * POST /api/auth/email/resend
     * Renvoyer un e-mail de vérification à un client non encore vérifié.
     */
    public function resend(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $client = Client::where('email', $request->string('email'))->first();

        if (! $client) {
            // Réponse neutre pour ne pas révéler si l'e-mail existe
            return $this->success(message: 'Si un compte correspond à cet e-mail, un lien de vérification a été envoyé.');
        }

        if ($client->hasVerifiedEmail()) {
            return $this->error('Cette adresse e-mail est déjà vérifiée.', 422);
        }

        $client->sendEmailVerificationNotification();

        return $this->success(message: 'E-mail de vérification renvoyé.');
    }
}
