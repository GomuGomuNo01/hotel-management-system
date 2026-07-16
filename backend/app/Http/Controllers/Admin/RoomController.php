<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoomRequest;
use App\Http\Requests\Admin\UpdateRoomRequest;
use App\Http\Resources\RoomResource;
use App\Models\AuditLog;
use App\Models\Room;
use App\Models\RoomImage;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RoomController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Room::class);

        $query = Room::with('images')
            ->when($request->filled('room_type'), fn ($q) => $q->where('room_type', $request->string('room_type')))
            ->when($request->filled('status'),    fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'),    fn ($q) => $q->where('room_number', 'like', '%'.$request->string('search').'%'));

        $rooms = $query->orderBy('room_number')->paginate($request->integer('per_page', 15));

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

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $this->authorize('create', Room::class);

        $validated = $request->validated();
        $images    = $request->file('images', []);
        unset($validated['images']);

        $room = Room::create($validated);

        $this->handleImageUploads($room, $images);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ROOM_CREATED,
            'Room',
            $room->id,
            null,
            $room->toArray()
        );

        return $this->created(new RoomResource($room->load('images')), 'Chambre créée avec succès.');
    }

    public function show(int $id): JsonResponse
    {
        $room = Room::with('images')->find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $this->authorize('view', $room);

        return $this->success(new RoomResource($room));
    }

    public function update(UpdateRoomRequest $request, int $id): JsonResponse
    {
        $room = Room::with('images')->find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $this->authorize('update', $room);

        $validated = $request->validated();
        $images    = $request->file('images', []);
        unset($validated['images']);

        // Une chambre occupée (client en séjour) ne peut pas passer en
        // maintenance : il faut d'abord effectuer le check-out.
        if (($validated['status'] ?? null) === 'maintenance' && $room->status === 'occupied') {
            return $this->error(
                'Impossible de mettre en maintenance une chambre occupée. Effectuez d\'abord le check-out.',
                422
            );
        }

        $oldValues = $room->toArray();
        // Le RoomObserver synchronise l'état ménage (maintenance ⇒ hors service,
        // retour de maintenance ⇒ à nettoyer) et diffuse "room.updated".
        $room->update($validated);

        if (! empty($images)) {
            $this->handleImageUploads($room, $images);
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_ROOM_UPDATED,
            'Room',
            $room->id,
            $oldValues,
            $room->fresh()->toArray()
        );

        return $this->success(new RoomResource($room->fresh()->load('images')), 'Chambre mise à jour.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $this->authorize('delete', $room);

        if ($room->reservations()->whereIn('status', ['confirmed', 'checked_in'])->exists()) {
            return $this->error('Impossible de supprimer une chambre avec des réservations actives.', 422);
        }

        // Supprimer les images du stockage
        foreach ($room->images as $image) {
            Storage::disk('public')->delete($image->path);
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

    public function deleteImage(Request $request, int $roomId, int $imageId): JsonResponse
    {
        $room = Room::find($roomId);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $this->authorize('update', $room);

        $image = RoomImage::where('room_id', $roomId)->find($imageId);
        if (! $image) {
            return $this->notFound('Image introuvable.');
        }

        Storage::disk('public')->delete($image->path);
        $image->delete();

        // Si l'image supprimée était primaire, promouvoir la suivante
        if ($image->is_primary) {
            $next = RoomImage::where('room_id', $roomId)->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return $this->success(message: 'Image supprimée.');
    }

    public function setPrimaryImage(Request $request, int $roomId, int $imageId): JsonResponse
    {
        $room = Room::find($roomId);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $this->authorize('update', $room);

        RoomImage::where('room_id', $roomId)->update(['is_primary' => false]);
        RoomImage::where('room_id', $roomId)->where('id', $imageId)->update(['is_primary' => true]);

        return $this->success(message: 'Image principale définie.');
    }

    private function handleImageUploads(Room $room, array $images): void
    {
        $isFirst = $room->images()->count() === 0;

        foreach ($images as $index => $file) {
            $path = $file->store('rooms', 'public');
            $url  = Storage::disk('public')->url($path);

            RoomImage::create([
                'room_id'    => $room->id,
                'path'       => $path,
                'url'        => $url,
                'is_primary' => $isFirst && $index === 0,
            ]);
        }
    }
}
