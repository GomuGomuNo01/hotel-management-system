<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoomResource;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    /**
     * Public room listing — no auth required.
     * Visitors browse the catalogue freely; auth is only enforced
     * when they actually try to create a reservation.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($request->filled('room_type')) {
            $query->where('room_type', $request->string('room_type'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('capacity')) {
            $query->where('capacity', '>=', $request->integer('capacity'));
        }
        if ($request->filled('price_min')) {
            $query->where('price_per_night', '>=', $request->integer('price_min'));
        }
        if ($request->filled('price_max')) {
            $query->where('price_per_night', '<=', $request->integer('price_max'));
        }

        $rooms = $query->orderBy('room_number')->paginate($request->integer('per_page', 12));

        return response()->json([
            'success' => true,
            'message' => 'Liste des chambres.',
            'data'    => RoomResource::collection($rooms->items()),
            'meta'    => [
                'current_page' => $rooms->currentPage(),
                'last_page'    => $rooms->lastPage(),
                'per_page'     => $rooms->perPage(),
                'total'        => $rooms->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $room = Room::find($id);

        if (! $room) {
            return response()->json([
                'success' => false,
                'message' => 'Chambre introuvable.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Détails de la chambre.',
            'data'    => new RoomResource($room),
        ]);
    }
}
