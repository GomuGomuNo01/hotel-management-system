<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($request->has('type')) {
            $query->where('room_type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('capacity')) {
            $query->where('capacity', '>=', $request->capacity);
        }

        $rooms = $query->paginate(15);

        return $this->success($rooms, 'Liste des chambres.');
    }

    public function show(int $id): JsonResponse
    {
        $room = Room::find($id);

        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        return $this->success($room);
    }
}
