<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyWebhookSignature
{
    public function handle(Request $request, Closure $next, string $provider): Response
    {
        $secret = match ($provider) {
            'orange' => config('services.orange_ci.webhook_secret'),
            'wave'   => config('services.wave_ci.webhook_secret'),
            default  => null,
        };

        if (empty($secret)) {
            return response()->json(['success' => false, 'message' => 'Webhook non configuré.'], 500);
        }

        $signature = $request->header('X-Webhook-Signature')
            ?? $request->header('X-Orange-Signature')
            ?? $request->header('X-Wave-Signature');

        if (! $signature) {
            return response()->json(['success' => false, 'message' => 'Signature manquante.'], 401);
        }

        $payload   = $request->getContent();
        $expected  = hash_hmac('sha256', $payload, $secret);

        if (! hash_equals($expected, $signature)) {
            return response()->json(['success' => false, 'message' => 'Signature invalide.'], 401);
        }

        return $next($request);
    }
}
