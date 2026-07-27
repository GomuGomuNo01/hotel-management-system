<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Fréquence des recouches (ménage en cours de séjour)
    |--------------------------------------------------------------------------
    |
    | Nombre de jours entre deux ménages pendant un séjour. 1 = recouche
    | quotidienne (standard hôtelier). Passer à 3 ou 7 pour des programmes
    | longs séjours / éco (change de linge espacé).
    |
    */
    'stayover_frequency_days' => (int) env('HOUSEKEEPING_STAYOVER_FREQUENCY_DAYS', 1),

    /*
    |--------------------------------------------------------------------------
    | Seuil « long séjour »
    |--------------------------------------------------------------------------
    |
    | Nombre minimum de nuits pour qu'un séjour déclenche des recouches. Un
    | séjour d'une seule nuit n'a jamais besoin de ménage intermédiaire.
    |
    */
    'long_stay_threshold_nights' => (int) env('HOUSEKEEPING_LONG_STAY_THRESHOLD_NIGHTS', 2),

    /*
    |--------------------------------------------------------------------------
    | Report automatique (DND / client présent)
    |--------------------------------------------------------------------------
    |
    | Quand une recouche est reportée (client présent, « Ne pas déranger »),
    | nombre de jours avant la nouvelle tentative. 1 = report au lendemain.
    |
    */
    'defer_days' => (int) env('HOUSEKEEPING_DEFER_DAYS', 1),

];
