<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Canal par défaut — notification Laravel
|--------------------------------------------------------------------------
| Utilisé par le système de notification de Laravel lui-même.
*/
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/*
|--------------------------------------------------------------------------
| hotel-events — canal public
|--------------------------------------------------------------------------
| Diffuse les événements hôtel à tous les acteurs connectés (admins,
| clients). Le payload ne contient que des IDs et statuts — aucune
| donnée sensible (PII, montants) n'est transmise sur ce canal.
| L'authentification est requise au niveau des API REST pour accéder
| aux détails.
|
| Ce canal est PUBLIC : aucun callback d'autorisation n'est nécessaire.
*/
