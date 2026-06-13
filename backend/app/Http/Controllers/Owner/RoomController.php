<?php

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    use ApiResponse;

    /**
     * GET /owner/rooms
     * Liste paginée des chambres (lecture seule, toutes chambres y compris maintenance).
     */
    public function index(Request $request): JsonResponse
    {
        $rooms = Room::with('images')
            ->when($request->filled('status'),    fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('room_type'), fn ($q) => $q->where('room_type', $request->room_type))
            ->withCount([
                'reservations as reservations_count',
                'reservations as active_reservations_count' => fn ($q) => $q->whereIn('status', ['confirmed', 'checked_in']),
            ])
            ->orderBy('room_number')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Liste des chambres.',
            'data'    => $rooms->map(fn ($r) => array_merge(
                (new RoomResource($r))->resolve(),
                [
                    'reservations_count'        => $r->reservations_count,
                    'active_reservations_count' => $r->active_reservations_count,
                ]
            )),
            'meta' => [
                'current_page' => $rooms->currentPage(),
                'last_page'    => $rooms->lastPage(),
                'per_page'     => $rooms->perPage(),
                'total'        => $rooms->total(),
            ],
        ]);
    }

    /**
     * GET /owner/rooms/{id}
     * Détail d'une chambre (lecture seule).
     */
    public function show(int $id): JsonResponse
    {
        $room = Room::with('images')
            ->withCount([
                'reservations as reservations_count',
                'reservations as active_reservations_count' => fn ($q) => $q->whereIn('status', ['confirmed', 'checked_in']),
            ])
            ->find($id);

        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        return $this->success(array_merge(
            (new RoomResource($room))->resolve(),
            [
                'reservations_count'        => $room->reservations_count,
                'active_reservations_count' => $room->active_reservations_count,
            ]
        ));
    }
}
