<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! ($user instanceof Admin)) {
            return response()->json([
                'success' => false,
                'message' => 'Accès refusé.',
            ], 403);
        }

        if (! $user->hasPermission($permission)) {
            return response()->json([
                'success' => false,
                'message' => "Permission manquante : {$permission}.",
            ], 403);
        }

        return $next($request);
    }
}
