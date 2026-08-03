<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    use ApiResponse;

    public function __construct(private AuthService $authService) {}

    public function redirect(): RedirectResponse
    {
        // Nonce anti-forge : on mémorise le state émis pour n'accepter au retour
        // qu'un callback issu d'une initiation récente (anti-replay / anti-CSRF).
        $state = Str::random(40);
        Cache::put("oauth_state:{$state}", true, now()->addMinutes(5));

        return Socialite::driver('google')->stateless()->with(['state' => $state])->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = config('app.frontend_url');

        // Le state doit correspondre à une initiation récente (usage unique).
        $state = (string) $request->query('state', '');
        if ($state === '' || ! Cache::pull("oauth_state:{$state}")) {
            return redirect("{$frontendUrl}/login?error=google_failed");
        }

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            return redirect("{$frontendUrl}/login?error=google_failed");
        }

        $result = $this->authService->findOrCreateClientFromGoogle($googleUser);

        // On NE met jamais le token dans l'URL : on émet un code à usage unique,
        // que le SPA échange en POST contre le token (cf. exchange()).
        $code = Str::random(48);
        Cache::put("oauth_code:{$code}", [
            'token' => $result['token'],
            'role'  => $result['role'],
        ], now()->addSeconds(60));

        return redirect("{$frontendUrl}/auth/google/callback?code={$code}");
    }

    /**
     * POST /auth/google/exchange — échange le code à usage unique contre le token.
     */
    public function exchange(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'max:64']]);

        $data = Cache::pull('oauth_code:'.$request->string('code'));

        if (! $data) {
            return $this->error('Code de connexion invalide ou expiré.', 422);
        }

        return $this->success($data, 'Authentification réussie.');
    }
}
