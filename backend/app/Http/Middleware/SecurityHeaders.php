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
 * - Content-Security-Policy : « default-src 'none' » — l'API ne sert que du
 *   JSON et des fichiers (factures, pièces d'identité) ; aucune réponse ne doit
 *   charger de sous-ressource. Neutralise l'exécution d'un contenu téléversé
 *   malveillant (HTML/SVG/PDF) et interdit le framing.
 * - Strict-Transport-Security : force HTTPS (honoré par le navigateur
 *   uniquement sur une connexion sécurisée ; sans effet en local http).
 *
 * Note : l'API renvoie du JSON/des fichiers et n'est jamais rendue en page ;
 * ces en-têtes sont sans effet de bord pour les clients légitimes (le SPA
 * récupère les documents en blob et les rend sous sa propre origine).
 */
class SecurityHeaders
{
    /** En-têtes appliqués à toutes les réponses. */
    public const HEADERS = [
        'X-Content-Type-Options'    => 'nosniff',
        'X-Frame-Options'           => 'DENY',
        'Referrer-Policy'           => 'strict-origin-when-cross-origin',
        'Permissions-Policy'        => 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy'   => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
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
