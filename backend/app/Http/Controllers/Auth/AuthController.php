<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\AuthUserResource;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->registerClient($request->validated());

        return $this->created([
            'user'  => new AuthUserResource($result['user']),
            'token' => $result['token'],
            'role'  => $result['role'],
        ], 'Compte créé avec succès.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->loginByRole(
            $request->string('email'),
            $request->string('password'),
            $request->string('role')
        );

        if ($result === null) {
            return $this->error('Identifiants incorrects.', 401);
        }

        if (isset($result['inactive'])) {
            return $this->error('Votre compte administrateur est désactivé.', 403);
        }

        return $this->success([
            'user'  => new AuthUserResource($result['user']),
            'token' => $result['token'],
            'role'  => $result['role'],
        ], 'Connexion réussie.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = match (true) {
            $user instanceof \App\Models\Client => 'client',
            $user instanceof \App\Models\Admin  => 'admin',
            $user instanceof \App\Models\Owner  => 'owner',
            default => null,
        };

        return $this->success([
            'user' => new AuthUserResource($user),
            'role' => $role,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Déconnexion réussie.');
    }
}
