<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Room;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Planning d'occupation : restitue, pour une fenêtre de dates, chaque chambre
 * et les réservations qui la chevauchent. Alimente la vue calendrier admin
 * (lignes = chambres, colonnes = jours). Lecture seule.
 */
class PlanningController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'days' => ['nullable', 'integer', 'min:1', 'max:31'],
        ]);

        $from = $request->filled('from')
            ? Carbon::parse($request->input('from'))->startOfDay()
            : now()->startOfDay();

        $days = (int) $request->integer('days', 14);
        // Borne exclusive : une fenêtre de N jours couvre [from, from + N).
        $to = (clone $from)->addDays($days);

        $fromStr = $from->toDateString();
        $toStr   = $to->toDateString();

        // Chevauchement d'intervalles : check_in < fin ET check_out > début.
        // Les annulations n'occupent pas la chambre → exclues.
        $reservations = Reservation::query()
            ->with('client:id,first_name,last_name')
            ->where('status', '!=', 'cancelled')
            ->whereDate('check_in_date', '<', $toStr)
            ->whereDate('check_out_date', '>', $fromStr)
            ->get(['id', 'room_id', 'client_id', 'status', 'check_in_date', 'check_out_date'])
            ->groupBy('room_id');

        $rooms = Room::orderBy('room_number')
            ->get(['id', 'room_number', 'room_type', 'status'])
            ->map(function (Room $room) use ($reservations) {
                $list = ($reservations->get($room->id) ?? collect())
                    ->map(fn (Reservation $r) => [
                        'id'             => $r->id,
                        'client_name'    => $r->client?->full_name ?? 'Client',
                        'status'         => $r->status,
                        'check_in_date'  => $r->check_in_date->toDateString(),
                        'check_out_date' => $r->check_out_date->toDateString(),
                    ])
                    ->values();

                return [
                    'id'           => $room->id,
                    'room_number'  => $room->room_number,
                    'room_type'    => $room->room_type,
                    'status'       => $room->status,
                    'reservations' => $list,
                ];
            });

        return $this->success([
            'range' => ['from' => $fromStr, 'to' => $toStr, 'days' => $days],
            'rooms' => $rooms,
        ], 'Planning d\'occupation.');
    }
}
