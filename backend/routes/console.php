<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Libère les chambres bloquées par des réservations jamais payées.
// Tourne toutes les heures ; le délai effectif est piloté par
// config/reservations.php (unpaid_timeout_hours).
Schedule::command('reservations:cancel-unpaid')
    ->hourly()
    ->withoutOverlapping();
