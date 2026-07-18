<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Libère les chambres bloquées par des réservations impayées.
// Tourne toutes les 15 min pour honorer le délai court après un échec de
// paiement ; les délais effectifs sont pilotés par config/reservations.php
// (unpaid_timeout_hours pour les jamais tentées, failed_payment_timeout_minutes
// pour les échecs avérés).
Schedule::command('reservations:cancel-unpaid')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
