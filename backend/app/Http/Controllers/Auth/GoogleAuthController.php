<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    use ApiResponse;

    public function __construct(private AuthService $authService) {}

    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback(): RedirectResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Exception $e) {
            return redirect("{$frontendUrl}/login?error=google_failed");
        }

        $result = $this->authService->findOrCreateClientFromGoogle($googleUser);

        $params = http_build_query([
            'token' => $result['token'],
            'role'  => $result['role'],
        ]);

        return redirect("{$frontendUrl}/auth/google/callback?{$params}");
    }
}
