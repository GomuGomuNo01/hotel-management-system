<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ajoute des en-têtes de sécurité HTTP à chaque réponse de l'API.
 *
 * - X-Content-Type-Options : empêche le MIME-sniffing (XSS via type deviné).
 * - X-Frame-Options        : interdit l'inclusion en iframe (clickjacking).
 * - Referrer-Policy        : ne fuit pas l'URL complète vers les tiers.
 * - Permissions-Policy     : désactive les API navigateur sensibles non utilisées.
 *
 * Note : l'API renvoie du JSON et n'est jamais rendue en page ; ces en-têtes
 * sont sans effet de bord pour les clients légitimes (frontend, mobile).
 */
class SecurityHeaders
{
    /** En-têtes appliqués à toutes les réponses. */
    public const HEADERS = [
        'X-Content-Type-Options' => 'nosniff',
        'X-Frame-Options'        => 'DENY',
        'Referrer-Policy'        => 'strict-origin-when-cross-origin',
        'Permissions-Policy'     => 'camera=(), microphone=(), geolocation=()',
    ];

    /**
     * Pose les en-têtes sur une réponse. Réutilisable depuis le hook d'exception
     * (les réponses d'erreur ne traversent pas le code post-middleware).
     */
    public static function apply(Response $response): Response
    {
        foreach (self::HEADERS as $key => $value) {
            if (! $response->headers->has($key)) {
                $response->headers->set($key, $value);
            }
        }

        return $response;
    }

    public function handle(Request $request, Closure $next): Response
    {
        return self::apply($next($request));
    }
}
