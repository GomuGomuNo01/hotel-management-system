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

    /*
    |--------------------------------------------------------------------------
    | Délai d'annulation après un échec de paiement avéré
    |--------------------------------------------------------------------------
    |
    | Cas distinct du précédent : le client a bien tenté de payer mais la
    | transaction a échoué (ex. solde insuffisant) et il n'a pas ré-essayé.
    | La chambre est alors libérée bien plus vite que le délai « jamais tentée »
    | ci-dessus — le temps de recharger son compte et de réessayer, sans
    | immobiliser l'inventaire une journée entière.
    |
    | Ne s'applique que si la DERNIÈRE tentative est un échec (aucun paiement en
    | cours) : un client en train de réessayer n'est jamais annulé.
    |
    */
    'failed_payment_timeout_minutes' => (int) env('RESERVATION_FAILED_TIMEOUT_MINUTES', 120),

];
