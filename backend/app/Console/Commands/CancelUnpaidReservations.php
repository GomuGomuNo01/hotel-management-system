<?php

namespace App\Console\Commands;

use App\Events\HotelBroadcast;
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
        $hours         = (int) config('reservations.unpaid_timeout_hours', 24);
        $failedMinutes = (int) config('reservations.failed_payment_timeout_minutes', 120);
        $dryRun        = (bool) $this->option('dry-run');

        $unpaidThreshold = now()->subHours($hours);
        $failedThreshold = now()->subMinutes($failedMinutes);

        // ── Catégorie 1 : jamais payées (aucune tentative aboutie), anciennes ──
        $neverPaid = Reservation::query()
            ->where('status', 'pending')
            ->where('created_at', '<=', $unpaidThreshold)
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'success'))
            ->with(['payments', 'client', 'room'])
            ->get()
            ->map(fn (Reservation $r) => ['reservation' => $r, 'reason' => 'unpaid_timeout']);

        // ── Catégorie 2 : dernière tentative en échec depuis > failedMinutes ──
        // Libération accélérée : le client a tenté de payer sans succès et ne
        // ré-essaie pas. On exige que la tentative LA PLUS RÉCENTE soit un échec
        // (un paiement encore en cours = retry actif → on n'annule pas).
        $failed = Reservation::query()
            ->where('status', 'pending')
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'success'))
            ->whereHas('payments', fn ($q) => $q->where('status', 'failed'))
            ->with(['payments' => fn ($q) => $q->latest(), 'client', 'room'])
            ->get()
            ->filter(function (Reservation $r) use ($failedThreshold) {
                $latest = $r->payments->first(); // la plus récente (latest())
                return $latest
                    && $latest->status === 'failed'
                    && $latest->created_at <= $failedThreshold;
            })
            ->map(fn (Reservation $r) => ['reservation' => $r, 'reason' => 'failed_payment_timeout']);

        // Fusion en dédoublonnant par id de réservation (le délai « jamais payée »
        // prime si une réservation coche les deux, l'ordre importe peu ici).
        $targets = $neverPaid->concat($failed)->unique(fn ($item) => $item['reservation']->id);

        if ($targets->isEmpty()) {
            $this->info("Aucune réservation à annuler (délais : impayée {$hours} h, échec {$failedMinutes} min).");
            return self::SUCCESS;
        }

        $this->info("{$targets->count()} réservation(s) à libérer détectée(s).");

        $cancelled = 0;

        foreach ($targets as $item) {
            /** @var Reservation $reservation */
            $reservation = $item['reservation'];
            $reason      = $item['reason'];

            if ($dryRun) {
                $this->line("  [dry-run] #{$reservation->id} — motif : {$reason}");
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
                $reason === 'failed_payment_timeout'
                    ? ['status' => 'cancelled', 'reason' => 'failed_payment_timeout', 'timeout_minutes' => $failedMinutes]
                    : ['status' => 'cancelled', 'reason' => 'unpaid_timeout', 'timeout_hours' => $hours]
            );

            // Diffusion temps-réel — planning et listes se mettent à jour sans rechargement.
            HotelBroadcast::dispatch('reservation.cancelled', [
                'reservationId' => $reservation->id,
                'clientId'      => $reservation->client_id,
                'cancelledBy'   => 'system',
            ]);

            $cancelled++;
            $this->line("  #{$reservation->id} annulée ({$reason}) — chambre libérée.");
        }

        if ($dryRun) {
            $this->info('Mode dry-run : aucune modification effectuée.');
        } else {
            $this->info("{$cancelled} réservation(s) annulée(s).");
        }

        return self::SUCCESS;
    }
}
