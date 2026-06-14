<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyWebhookSignature;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role'       => CheckRole::class,
            'permission' => CheckPermission::class,
            'webhook'    => VerifyWebhookSignature::class,
        ]);

        // throttleApi() uses the configured cache store (database/file/redis).
        // Avoid throttleWithRedis() unless Redis is actually deployed.
        $middleware->throttleApi();

        // En-têtes de sécurité sur toutes les réponses API (clickjacking, MIME-sniffing…).
        $middleware->appendToGroup('api', SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ressource introuvable.',
                ], 404);
            }
        });

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié. Veuillez vous connecter.',
                ], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès refusé.',
                ], 403);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Les données fournies sont invalides.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        // Les réponses d'erreur ne traversent pas le code post-middleware :
        // on y réapplique les en-têtes de sécurité pour qu'ils soient présents partout.
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response) {
            return SecurityHeaders::apply($response);
        });

        // Remontée des exceptions vers Sentry. Inerte tant que SENTRY_LARAVEL_DSN
        // est vide (aucun événement n'est envoyé) — aucun impact en dev/CI.
        \Sentry\Laravel\Integration::handles($exceptions);
    })->create();
