<?php

namespace App\Observers;

use App\Events\HotelBroadcast;
use App\Models\Room;
use Illuminate\Support\Facades\Cache;

/**
 * Observer central des chambres — garantit deux invariants, quel que soit
 * le point d'entrée (section Chambres, Housekeeping, check-in/out, etc.) :
 *
 * 1. Couplage bidirectionnel statut commercial ↔ état ménage :
 *    - status = "maintenance"            ⇒ housekeeping = "out_of_service"
 *    - sortie de "maintenance"           ⇒ housekeeping = "dirty" (à nettoyer)
 *    - housekeeping = "out_of_service"   ⇒ status = "maintenance"
 *    - sortie de "out_of_service"        ⇒ status = "available"
 *
 * 2. Diffusion temps réel : tout changement de statut (commercial ou ménage)
 *    émet "room.updated" sur le canal hotel-events, pour que les vues client
 *    et back-office se rafraîchissent sans rechargement de page.
 */
class RoomObserver
{
    /** Applique le couplage AVANT l'écriture — une seule sauvegarde, pas de boucle. */
    public function saving(Room $room): void
    {
        if ($room->isDirty('status')) {
            if ($room->status === 'maintenance') {
                $room->housekeeping_status = 'out_of_service';
            } elseif (
                $room->getOriginal('status') === 'maintenance'
                && $room->housekeeping_status === 'out_of_service'
                && ! $room->isDirty('housekeeping_status')
            ) {
                // Retour de maintenance : la chambre doit repasser par le ménage.
                $room->housekeeping_status = 'dirty';
            }

            return;
        }

        if ($room->isDirty('housekeeping_status')) {
            if ($room->housekeeping_status === 'out_of_service') {
                $room->status = 'maintenance';
            } elseif (
                $room->getOriginal('housekeeping_status') === 'out_of_service'
                && $room->status === 'maintenance'
            ) {
                $room->status = 'available';
            }
        }
    }

    public function updated(Room $room): void
    {
        if ($room->wasChanged('status') || $room->wasChanged('housekeeping_status')) {
            $this->broadcast($room);
        }
    }

    public function created(Room $room): void
    {
        $this->broadcast($room);
    }

    public function deleted(Room $room): void
    {
        Cache::forget('rooms.popular');
        HotelBroadcast::dispatch('room.deleted', ['roomId' => $room->id]);
    }

    private function broadcast(Room $room): void
    {
        // Le cache serveur des « chambres populaires » (page d'accueil) doit
        // refléter immédiatement une mise en maintenance.
        Cache::forget('rooms.popular');

        HotelBroadcast::dispatch('room.updated', [
            'roomId'             => $room->id,
            'status'             => $room->status,
            'housekeepingStatus' => $room->housekeeping_status,
        ]);
    }
}
