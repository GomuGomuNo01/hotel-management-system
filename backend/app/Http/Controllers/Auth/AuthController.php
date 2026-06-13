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

        // Aucun token émis - le client doit d'abord vérifier son e-mail
        return $this->created([
            'user'             => new AuthUserResource($result['user']),
            'role'             => $result['role'],
            'email_verified'   => false,
            'message'          => 'Un e-mail de vérification a été envoyé à ' . $result['user']->email . '. Veuillez confirmer votre adresse pour activer votre compte.',
        ], 'Inscription réussie. Vérifiez votre e-mail.');
    }

    /**
     * Login without role selection.
     * The role is detected automatically by AuthService::login().
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->string('email'),
            $request->string('password')
        );

        if ($result === null) {
            return $this->error('Identifiants incorrects.', 401);
        }

        if (isset($result['inactive'])) {
            return $this->error('Votre compte administrateur est désactivé.', 403);
        }

        if (isset($result['email_not_verified'])) {
            return $this->error('Veuillez vérifier votre adresse e-mail avant de vous connecter.', 403, [
                'email_not_verified' => true,
                'email'              => $result['email'],
            ]);
        }

        return $this->success([
            'user'  => new AuthUserResource($result['user']),
            'token' => $result['token'],
            'role'  => $result['role'],
        ], 'Connexion reussie.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $role = match (true) {
            $user instanceof \App\Models\Client => 'client',
            $user instanceof \App\Models\Admin  => 'admin',
            $user instanceof \App\Models\Owner  => 'owner',
            default                             => null,
        };

        // Charger les permissions pour les admins (nécessaire pour les guards frontend)
        if ($user instanceof \App\Models\Admin) {
            $user->load('permissions');
        }

        return $this->success([
            'user' => new AuthUserResource($user),
            'role' => $role,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Deconnexion reussie.');
    }
}
