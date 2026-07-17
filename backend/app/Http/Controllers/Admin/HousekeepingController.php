<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateHousekeepingRequest;
use App\Models\AuditLog;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        // Chambres avec une arrivée prévue aujourd'hui (réservation confirmée) :
        // leur remise en état est prioritaire pour tenir le planning des arrivées.
        $arrivalTodayRoomIds = Reservation::whereDate('check_in_date', now()->toDateString())
            ->where('status', 'confirmed')
            ->pluck('room_id')
            ->flip();

        $rooms = Room::query()
            ->when($request->filled('housekeeping_status'),
                fn ($q) => $q->where('housekeeping_status', $request->housekeeping_status))
            ->orderBy('room_number')
            ->get(['id', 'room_number', 'room_type', 'status', 'housekeeping_status'])
            ->map(fn (Room $r) => $this->present($r, $arrivalTodayRoomIds->has($r->id)));

        // Compteurs par état pour les filtres / badges de l'écran housekeeping.
        $counts = Room::selectRaw('housekeeping_status, COUNT(*) as total')
            ->groupBy('housekeeping_status')
            ->pluck('total', 'housekeeping_status');

        $summary = [];
        foreach (array_keys(Room::HOUSEKEEPING_STATUSES) as $key) {
            $summary[$key] = (int) ($counts[$key] ?? 0);
        }
        // Nombre de chambres prioritaires (à préparer + arrivée aujourd'hui).
        $summary['priority'] = $rooms->where('priority', true)->count();

        return $this->success([
            'rooms'   => $rooms,
            'summary' => $summary,
        ], 'État ménage des chambres.');
    }

    public function update(UpdateHousekeepingRequest $request, int $id): JsonResponse
    {
        $room = Room::find($id);
        if (! $room) {
            return $this->notFound('Chambre introuvable.');
        }

        $validated = $request->validated();

        $old = $room->housekeeping_status;
        if ($old === $validated['housekeeping_status']) {
            return $this->success($this->present($room), 'Aucun changement.');
        }

        // Une chambre occupée (client en séjour) ne peut pas être mise hors
        // service : il faut d'abord effectuer le check-out.
        if ($validated['housekeeping_status'] === 'out_of_service' && $room->status === 'occupied') {
            return $this->error(
                'Impossible de mettre hors service une chambre occupée. Effectuez d\'abord le check-out.',
                422
            );
        }

        $oldStatus = $room->status;

        // Le RoomObserver synchronise le statut commercial (maintenance ⇄ hors
        // service) et diffuse "room.updated" en temps réel.
        $room->update(['housekeeping_status' => $validated['housekeeping_status']]);

        $room->refresh();

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_HOUSEKEEPING_UPDATED,
            'Room',
            $room->id,
            ['housekeeping_status' => $old, 'status' => $oldStatus],
            [
                'housekeeping_status' => $room->housekeeping_status,
                'status'              => $room->status,
                'room_number'         => $room->room_number,
            ],
        );

        return $this->success($this->present($room->fresh()), 'État ménage mis à jour.');
    }

    private function present(Room $room, bool $arrivalToday = false): array
    {
        // Une chambre est « prioritaire » si elle reste à préparer (sale / en cours)
        // ALORS qu'un client doit arriver aujourd'hui.
        $needsWork = in_array($room->housekeeping_status, ['dirty', 'in_progress'], true);

        return [
            'id'                        => $room->id,
            'room_number'               => $room->room_number,
            'room_type'                 => $room->room_type,
            'status'                    => $room->status,
            'housekeeping_status'       => $room->housekeeping_status,
            'housekeeping_label'        => $room->housekeepingLabel(),
            'arrival_today'             => $arrivalToday,
            'priority'                  => $arrivalToday && $needsWork,
        ];
    }
}
