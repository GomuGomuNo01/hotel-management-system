<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(private AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->registerClient($request->validated());

        return $this->created([
            'client' => $result['client'],
            'token'  => $result['token'],
        ], 'Compte créé avec succès.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->loginByRole(
            $request->email,
            $request->password,
            $request->role
        );

        if (! $result) {
            return $this->error('Identifiants incorrects.', 401);
        }

        if (isset($result['inactive'])) {
            return $this->error('Votre compte administrateur est désactivé.', 403);
        }

        return $this->success([
            'user'  => $result['user'],
            'token' => $result['token'],
            'role'  => $result['role'],
        ], 'Connexion réussie.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Déconnexion réussie.');
    }
}
