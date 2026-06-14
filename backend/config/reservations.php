<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Délai d'annulation des réservations impayées
    |--------------------------------------------------------------------------
    |
    | Une réservation laissée en statut « pending » (jamais confirmée par un
    | paiement) au-delà de ce délai est automatiquement annulée par la commande
    | planifiée `reservations:cancel-unpaid`, ce qui libère la chambre.
    |
    */
    'unpaid_timeout_hours' => (int) env('RESERVATION_UNPAID_TIMEOUT_HOURS', 24),

];
