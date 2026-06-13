<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\SecureDocument;
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
                $term = trim($request->search);

                // Recherche par nom ou e-mail uniquement (pas par téléphone).
                $q->where(function ($q2) use ($term) {
                    $q2->where('email', 'like', "%{$term}%")
                       ->orWhere('first_name', 'like', "%{$term}%")
                       ->orWhere('last_name', 'like', "%{$term}%");
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
        $client = Client::withCount('reservations')
            ->withSum(['payments as total_paid_gross' => fn ($q) => $q->where('status', 'success')], 'amount')
            ->withSum(['refunds as total_refunded'    => fn ($q) => $q->where('status', 'approved')], 'amount')
            ->with([
                'reservations' => fn ($q) => $q->latest()->with([
                    'room',
                    'payments' => fn ($p) => $p->where('status', 'success'),
                ]),
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

    /**
     * GET /api/admin/clients/{id}/id-document?path=...
     * Renvoie une pièce d'identité du client en flux inline (image/PDF) pour
     * consultation dans le panneau latéral - accès restreint aux documents
     * appartenant réellement au client ciblé.
     */
    public function idDocument(Request $request, int $id)
    {
        $request->validate(['path' => ['required', 'string']]);

        $client = Client::find($id);
        if (! $client) {
            abort(404, 'Client introuvable.');
        }

        $path  = (string) $request->input('path');
        $paths = collect($client->id_documents ?? [])
            ->map(fn ($d) => is_array($d) ? ($d['path'] ?? null) : $d)
            ->filter()
            ->values()
            ->all();

        if (! in_array($path, $paths, true)) {
            abort(404, 'Document introuvable.');
        }

        return SecureDocument::response($path);
    }
}
