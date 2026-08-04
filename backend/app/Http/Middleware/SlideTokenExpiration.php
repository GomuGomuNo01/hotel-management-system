<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Expiration glissante des sessions (tokens Sanctum).
 *
 * Chaque requête authentifiée repousse l'échéance (`expires_at`) du token de la
 * fenêtre d'inactivité configurée (30 min par défaut, 7 j pour une session
 * « Se souvenir de moi »). Sans activité pendant cette fenêtre, Sanctum rejette
 * nativement le token périmé → 401 → déconnexion automatique côté SPA.
 *
 * Le glissement s'effectue en phase « after » : à ce stade `auth:sanctum` a déjà
 * résolu l'utilisateur. Sur une route publique, aucun token n'est présent → no-op.
 */
class SlideTokenExpiration
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $token = $request->user()?->currentAccessToken();

        // Uniquement les tokens réellement persistés : exclut les jetons factices
        // des tests (Sanctum::actingAs) et les TransientToken.
        if ($token instanceof PersonalAccessToken && $token->exists) {
            $minutes = str_ends_with((string) $token->name, '-remember')
                ? (int) config('sanctum.remember_minutes', 60 * 24 * 7)
                : (int) config('sanctum.idle_minutes', 30);

            $newExpiry = now()->addMinutes($minutes);
            $current   = $token->expires_at;

            // Anti-écriture inutile : on ne repousse que si l'échéance est absente
            // ou doit avancer d'au moins 60 s (évite un UPDATE à chaque polling).
            if (! $current instanceof \DateTimeInterface || $current->lt($newExpiry->copy()->subSeconds(60))) {
                $token->forceFill(['expires_at' => $newExpiry])->save();
            }
        }

        return $response;
    }
}
