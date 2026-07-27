<?php

namespace App\Console\Commands;

use App\Events\HotelBroadcast;
use App\Models\HousekeepingTask;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Planifie les recouches (ménage en cours de séjour) dues aujourd'hui.
 *
 * Pour chaque séjour en cours (checked_in) qui ne part pas aujourd'hui :
 *   - le séjour doit atteindre le seuil « long séjour » (config housekeeping) ;
 *   - le dernier nettoyage doit remonter à ≥ fréquence configurée ;
 *   - aucune tâche du jour ne doit déjà exister pour la chambre (idempotence).
 *
 * Une recouche est un travail opérationnel : elle ne rend jamais la chambre
 * indisponible et ne modifie pas son état commercial.
 *
 *   php artisan housekeeping:plan-stayovers
 *   php artisan housekeeping:plan-stayovers --dry-run
 */
class PlanStayoverCleanings extends Command
{
    protected $signature = 'housekeeping:plan-stayovers {--dry-run : Afficher les recouches à créer sans les enregistrer}';

    protected $description = 'Génère les tâches de recouche dues pour les séjours en cours.';

    public function handle(): int
    {
        $today       = Carbon::today();
        $frequency   = max(1, (int) config('housekeeping.stayover_frequency_days', 1));
        $threshold   = max(1, (int) config('housekeeping.long_stay_threshold_nights', 2));
        $dryRun       = (bool) $this->option('dry-run');

        // Séjours en cours qui ne partent pas aujourd'hui.
        $reservations = Reservation::query()
            ->where('status', 'checked_in')
            ->whereDate('check_in_date', '<', $today->toDateString())
            ->whereDate('check_out_date', '>', $today->toDateString())
            ->with('room')
            ->get();

        $created = 0;

        foreach ($reservations as $reservation) {
            $room = $reservation->room;
            if (! $room) {
                continue;
            }

            // Séjour trop court → pas de recouche.
            if ($reservation->nightsCount() < $threshold) {
                continue;
            }

            // Dernier nettoyage : horodatage de la chambre, sinon l'arrivée
            // (la chambre était propre au check-in).
            $lastClean = $room->last_cleaned_at
                ? $room->last_cleaned_at->copy()->startOfDay()
                : $reservation->check_in_date->copy()->startOfDay();

            if ($lastClean->diffInDays($today) < $frequency) {
                continue;
            }

            // Idempotence : une seule tâche par chambre et par jour.
            $exists = HousekeepingTask::where('room_id', $room->id)
                ->whereDate('scheduled_for', $today->toDateString())
                ->where('status', '!=', HousekeepingTask::STATUS_CANCELLED)
                ->exists();

            if ($exists) {
                continue;
            }

            if ($dryRun) {
                $this->line("  [dry-run] Recouche chambre {$room->room_number} (réservation #{$reservation->id})");
                continue;
            }

            HousekeepingTask::create([
                'room_id'        => $room->id,
                'reservation_id' => $reservation->id,
                'type'           => HousekeepingTask::TYPE_STAYOVER,
                'scheduled_for'  => $today->toDateString(),
                'status'         => HousekeepingTask::STATUS_PENDING,
            ]);

            $created++;
        }

        if ($created > 0) {
            // Rafraîchit le tableau Ménage et les badges en temps réel.
            HotelBroadcast::dispatch('housekeeping.task', ['action' => 'planned', 'count' => $created]);
        }

        $this->info($dryRun
            ? 'Mode dry-run : aucune tâche créée.'
            : "{$created} recouche(s) planifiée(s) pour aujourd'hui.");

        return self::SUCCESS;
    }
}
