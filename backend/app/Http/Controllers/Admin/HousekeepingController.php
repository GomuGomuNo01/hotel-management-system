<?php

namespace App\Http\Controllers\Admin;

use App\Events\HotelBroadcast;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateHousekeepingRequest;
use App\Models\AuditLog;
use App\Models\HousekeepingTask;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\AuditService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
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

        // Recouches (ménage en cours de séjour) à traiter aujourd'hui.
        $stayovers = $this->todayStayovers();

        return $this->success([
            'rooms'     => $rooms,
            'summary'   => $summary,
            'stayovers' => $stayovers,
        ], 'État ménage des chambres.');
    }

    /**
     * POST /admin/housekeeping/tasks/{id}/start — démarre une recouche.
     */
    public function startTask(Request $request, int $id): JsonResponse
    {
        $task = $this->findOpenTask($id);
        if (! $task) {
            return $this->notFound('Tâche de ménage introuvable ou déjà clôturée.');
        }

        $task->update(['status' => HousekeepingTask::STATUS_IN_PROGRESS]);
        HotelBroadcast::dispatch('housekeeping.task', ['action' => 'started', 'taskId' => $task->id]);

        return $this->success($this->presentTask($task->fresh()), 'Recouche démarrée.');
    }

    /**
     * POST /admin/housekeeping/tasks/{id}/complete — recouche effectuée.
     * Horodate le dernier nettoyage de la chambre (sans changer son état
     * commercial : le client reste en séjour).
     */
    public function completeTask(Request $request, int $id): JsonResponse
    {
        $task = $this->findOpenTask($id, ['room']);
        if (! $task) {
            return $this->notFound('Tâche de ménage introuvable ou déjà clôturée.');
        }

        $task->update([
            'status'       => HousekeepingTask::STATUS_DONE,
            'completed_by' => $request->user()->id,
            'completed_at' => now(),
        ]);

        // Marque le dernier nettoyage : pilote la prochaine recouche due.
        $task->room?->update(['last_cleaned_at' => now()]);

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_STAYOVER_DONE,
            'Room',
            $task->room_id,
            null,
            ['task_id' => $task->id, 'room_number' => $task->room?->room_number],
        );

        HotelBroadcast::dispatch('housekeeping.task', ['action' => 'completed', 'taskId' => $task->id]);

        return $this->success($this->presentTask($task->fresh()), 'Recouche terminée.');
    }

    /**
     * POST /admin/housekeeping/tasks/{id}/defer — report (client présent / DND).
     * La tâche du jour est reportée et une nouvelle est planifiée plus tard.
     */
    public function deferTask(Request $request, int $id): JsonResponse
    {
        $task = $this->findOpenTask($id, ['room']);
        if (! $task) {
            return $this->notFound('Tâche de ménage introuvable ou déjà clôturée.');
        }

        $deferDays = max(1, (int) config('housekeeping.defer_days', 1));
        $nextDate  = Carbon::parse($task->scheduled_for)->addDays($deferDays)->toDateString();
        $nextCount = $task->deferred_count + 1;

        $task->update([
            'status'         => HousekeepingTask::STATUS_DEFERRED,
            'deferred_count' => $nextCount,
        ]);

        // Reprogramme la recouche, sauf si un job existe déjà pour la nouvelle date.
        $alreadyPlanned = HousekeepingTask::where('room_id', $task->room_id)
            ->whereDate('scheduled_for', $nextDate)
            ->where('status', '!=', HousekeepingTask::STATUS_CANCELLED)
            ->exists();

        if (! $alreadyPlanned) {
            HousekeepingTask::create([
                'room_id'        => $task->room_id,
                'reservation_id' => $task->reservation_id,
                'type'           => HousekeepingTask::TYPE_STAYOVER,
                'scheduled_for'  => $nextDate,
                'status'         => HousekeepingTask::STATUS_PENDING,
                'deferred_count' => $nextCount,
            ]);
        }

        AuditService::log(
            $request->user(),
            AuditLog::ACTION_STAYOVER_DEFERRED,
            'Room',
            $task->room_id,
            null,
            ['task_id' => $task->id, 'next_date' => $nextDate, 'room_number' => $task->room?->room_number],
        );

        HotelBroadcast::dispatch('housekeeping.task', ['action' => 'deferred', 'taskId' => $task->id]);

        return $this->success(['next_date' => $nextDate], 'Recouche reportée.');
    }

    /**
     * Récupère une tâche de ménage encore ouverte (démarrable / clôturable),
     * ou null si elle est introuvable ou déjà clôturée.
     *
     * @param  array<int,string>  $with  relations Eloquent à précharger
     */
    private function findOpenTask(int $id, array $with = []): ?HousekeepingTask
    {
        $task = HousekeepingTask::with($with)->find($id);

        return $task && in_array($task->status, HousekeepingTask::OPEN_STATUSES, true)
            ? $task
            : null;
    }

    /** Recouches ouvertes planifiées pour aujourd'hui, avec chambre et client. */
    private function todayStayovers()
    {
        return HousekeepingTask::query()
            ->where('type', HousekeepingTask::TYPE_STAYOVER)
            ->whereIn('status', HousekeepingTask::OPEN_STATUSES)
            ->whereDate('scheduled_for', now()->toDateString())
            ->with(['room:id,room_number,room_type', 'reservation.client:id,first_name,last_name'])
            ->get()
            ->map(fn (HousekeepingTask $t) => $this->presentTask($t))
            ->values();
    }

    private function presentTask(HousekeepingTask $task): array
    {
        return [
            'id'             => $task->id,
            'room_id'        => $task->room_id,
            'room_number'    => $task->room?->room_number,
            'room_type'      => $task->room?->room_type,
            'guest_name'     => $task->reservation?->client?->full_name,
            'status'         => $task->status,
            'deferred_count' => $task->deferred_count,
            'scheduled_for'  => $task->scheduled_for?->toDateString(),
        ];
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
