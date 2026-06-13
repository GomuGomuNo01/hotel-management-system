<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Événement de diffusion générique pour les mises à jour temps-réel.
 *
 * Tous les acteurs (admin, client) s'abonnent au canal public "hotel-events"
 * et filtrent côté frontend en fonction du type et de leur rôle/ID.
 *
 * Payload transmis :
 *  - type    : string  - identifiant de l'action (ex. "reservation.created")
 *  - payload : array   - données minimales (IDs, statut) sans PII ni montants
 *  - at      : string  - timestamp ISO 8601
 */
class HotelBroadcast implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $type;
    public array  $payload;
    public string $at;

    public function __construct(string $type, array $payload = [])
    {
        $this->type    = $type;
        $this->payload = $payload;
        $this->at      = now()->toIso8601String();
    }

    /**
     * Canal de diffusion : public, aucune authentification requise.
     * Les données sensibles ne sont jamais incluses dans le payload.
     */
    public function broadcastOn(): array
    {
        return [new Channel('hotel-events')];
    }

    /**
     * Nom de l'événement côté frontend.
     */
    public function broadcastAs(): string
    {
        return 'hotel.event';
    }
}
