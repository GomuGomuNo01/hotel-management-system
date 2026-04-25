<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $clients = Client::query()
            ->when($request->search, function ($q) use ($request) {
                $q->where('email', 'like', "%{$request->search}%")
                  ->orWhere('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%");
            })
            ->withCount('reservations')
            ->paginate(20);

        return $this->success($clients);
    }

    public function show(int $id): JsonResponse
    {
        $client = Client::with([
            'reservations' => fn ($q) => $q->with('room')->latest()->limit(10),
            'payments' => fn ($q) => $q->latest()->limit(10),
        ])->find($id);

        if (! $client) {
            return $this->notFound('Client introuvable.');
        }

        return $this->success($client);
    }
}
