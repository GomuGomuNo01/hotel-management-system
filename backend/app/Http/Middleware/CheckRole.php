<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\Client;
use App\Models\Owner;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        $allowed = match ($role) {
            'client' => $user instanceof Client,
            'admin'  => $user instanceof Admin && $user->is_active,
            'owner'  => $user instanceof Owner,
            default  => false,
        };

        if (! $allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé. Rôle insuffisant.',
            ], 403);
        }

        return $next($request);
    }
}
