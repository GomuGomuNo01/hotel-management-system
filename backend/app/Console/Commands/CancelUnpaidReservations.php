<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Reservation;
use App\Services\AuditService;
use App\Services\ReservationService;
use Illuminate\Console\Command;

/**
 * Annule les réservations restées impayées (statut « pending ») au-delà du
 * délai configuré (config/reservations.php → unpaid_timeout_hours).
 *
 * Une réservation « pending » n'a jamais reçu de paiement réussi : le premier
 * succès la fait passer en « confirmed ». On peut donc filtrer sur le statut
 * seul, avec un garde-fou défensif sur l'absence de paiement abouti.
 */
class CancelUnpaidReservations extends Command
{
    protected $signature = 'reservations:cancel-unpaid {--dry-run : Affiche les réservations concernées sans les annuler}';

    protected $description = 'Annule les réservations impayées au-delà du délai configuré et libère les chambres.';

    public function handle(ReservationService $reservationService): int
    {
        $hours     = (int) config('reservations.unpaid_timeout_hours', 24);
        $threshold = now()->subHours($hours);
        $dryRun    = (bool) $this->option('dry-run');

        $reservations = Reservation::query()
            ->where('status', 'pending')
            ->where('created_at', '<=', $threshold)
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'success'))
            ->with(['payments', 'client', 'room'])
            ->get();

        if ($reservations->isEmpty()) {
            $this->info("Aucune réservation impayée de plus de {$hours} h à annuler.");
            return self::SUCCESS;
        }

        $this->info("{$reservations->count()} réservation(s) impayée(s) de plus de {$hours} h détectée(s).");

        $cancelled = 0;

        foreach ($reservations as $reservation) {
            if ($dryRun) {
                $this->line("  [dry-run] #{$reservation->id} — créée le {$reservation->created_at}");
                continue;
            }

            $snapshot = [
                'client_id' => $reservation->client_id,
                'room_id'   => $reservation->room_id,
                'status'    => $reservation->status,
            ];

            try {
                $reservationService->cancelReservation($reservation);
            } catch (\RuntimeException $e) {
                $this->warn("  #{$reservation->id} ignorée : {$e->getMessage()}");
                continue;
            }

            // Traçabilité — annulation automatique (action système, pas d'admin).
            AuditService::log(
                null,
                AuditLog::ACTION_RESERVATION_AUTO_CANCELLED,
                'Reservation',
                $reservation->id,
                $snapshot,
                ['status' => 'cancelled', 'reason' => 'unpaid_timeout', 'timeout_hours' => $hours]
            );

            $cancelled++;
            $this->line("  #{$reservation->id} annulée — chambre libérée.");
        }

        if ($dryRun) {
            $this->info('Mode dry-run : aucune modification effectuée.');
        } else {
            $this->info("{$cancelled} réservation(s) annulée(s).");
        }

        return self::SUCCESS;
    }
}
