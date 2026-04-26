<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientResource;
use App\Http\Resources\ReservationResource;
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
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->search;
                $q->where(function ($q2) use ($term) {
                    $q2->where('email', 'like', "%{$term}%")
                       ->orWhere('first_name', 'like', "%{$term}%")
                       ->orWhere('last_name', 'like', "%{$term}%")
                       ->orWhere('phone', 'like', "%{$term}%");
                });
            })
            ->withCount('reservations')
            ->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des clients.',
            'data'    => ClientResource::collection($clients->items()),
            'meta'    => [
                'current_page' => $clients->currentPage(),
                'last_page'    => $clients->lastPage(),
                'per_page'     => $clients->perPage(),
                'total'        => $clients->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $client = Client::with([
            'reservations' => fn ($q) => $q->with('room')->latest()->limit(10),
        ])->find($id);

        if (! $client) {
            return $this->notFound('Client introuvable.');
        }

        $data = (new ClientResource($client))->toArray(request());
        $data['reservations'] = ReservationResource::collection(
            $client->reservations
        )->toArray(request());

        return $this->success($data);
    }
}
