<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Room;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Housekeeping — pilotage de l'état ménage des chambres, indépendant de l'état
 * commercial. Le départ d'un client marque la chambre « sale » (cf.
 * ReservationService::checkOut) ; le personnel la repasse ensuite « propre ».
 */
class HousekeepingController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $rooms = Room::query()
            ->when($request->filled('housekeeping_status'),
                fn ($q) => $q->where('housekeeping_status', $request->housekeeping_status))
            ->orderBy('room_number')
            ->get(['id', 'room_number', 'room_type', 'status', 'housekeeping_status'])
            ->map(fn (Room $r) => $this->present($r));

        // Compteurs par état pour les filtres / badges de l'écran housekeeping.
        $counts = Room::selectRaw('housekeeping_status, COUNT(*) as total')
            ->groupBy('housekeeping_status')
            ->pluck('total', 'housekeeping_status');

        $summary = [];
        foreach (array_keys(Room::HOUSEKEEPING_STATUSES) as $key) {
            $summary[$key] = (int) ($counts[$key] ?? 0);
        }

        return $this->success([
            'rooms'   => $rooms,
            'summary' => $summary,
        ], 'État ménage des chambres.');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $validated = $request->validate([
            'housekeeping_status' => ['required', Rule::in(array_keys(Room::HOUSEKEEPING_STATUSES))],
        ]);

        $old = $room->housekeeping_status;
        if ($old === $validated['housekeeping_status']) {
            return $this->success($this->present($room), 'Aucun changement.');
        }

        $room->update(['housekeeping_status' => $validated['housekeeping_status']]);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_HOUSEKEEPING_UPDATED,
            'Room',
            $room->id,
            ['housekeeping_status' => $old],
            ['housekeeping_status' => $room->housekeeping_status, 'room_number' => $room->room_number],
        );

        return $this->success($this->present($room->fresh()), 'État ménage mis à jour.');
    }

    private function present(Room $room): array
    {
        return [
            'id'                        => $room->id,
            'room_number'               => $room->room_number,
            'room_type'                 => $room->room_type,
            'status'                    => $room->status,
            'housekeeping_status'       => $room->housekeeping_status,
            'housekeeping_label'        => $room->housekeepingLabel(),
        ];
    }
}
