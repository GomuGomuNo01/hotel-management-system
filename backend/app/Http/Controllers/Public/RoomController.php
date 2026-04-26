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
        // FIX: ajout de with('images') pour que photo_url soit disponible côté client
        $query = Room::with('images');

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
            'data'  => RoomResource::collection($rooms->items()),
            'meta'  => [
                'current_page' => $rooms->currentPage(),
                'last_page'    => $rooms->lastPage(),
                'per_page'     => $rooms->perPage(),
                'total'        => $rooms->total(),
            ],
        ]);
    }

    /**
     * Single room detail — no auth required.
     */
    public function show(int $id): JsonResponse
    {
        // FIX: ajout de with('images') pour que les images soient disponibles
        $room = Room::with('images')->find($id);

        if (! $room) {
            return response()->json(['message' => 'Chambre introuvable.'], 404);
        }

        return response()->json(['data' => new RoomResource($room)]);
    }
}
