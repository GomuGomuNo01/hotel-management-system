<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoomRequest;
use App\Http\Requests\Admin\UpdateRoomRequest;
use App\Models\AuditLog;
use App\Models\Room;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Room::class);

        $rooms = Room::query()
            ->when($request->type,   fn ($q) => $q->where('room_type', $request->type))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->paginate(20);

        return $this->success($rooms);
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $this->authorize('create', Room::class);

        $room = Room::create($request->validated());

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ROOM_CREATED,
            'Room',
            $room->id,
            null,
            $room->toArray()
        );

        return $this->created($room, 'Chambre créée avec succès.');
    }

    public function show(int $id): JsonResponse
    {
        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        return $this->success($room);
    }

    public function update(UpdateRoomRequest $request, int $id): JsonResponse
    {
        $this->authorize('update', Room::class);

        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $oldValues = $room->toArray();
        $room->update($request->validated());

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ROOM_UPDATED,
            'Room',
            $room->id,
            $oldValues,
            $room->fresh()->toArray()
        );

        return $this->success($room->fresh(), 'Chambre mise à jour.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorize('delete', Room::class);

        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        if ($room->reservations()->whereIn('status', ['confirmed', 'checked_in'])->exists()) {
            return $this->error('Impossible de supprimer une chambre avec des réservations actives.', 422);
        }

        $oldValues = $room->toArray();
        $room->delete();

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ROOM_DELETED,
            'Room',
            $id,
            $oldValues,
            null
        );

        return $this->success(message: 'Chambre supprimée.');
    }
}
