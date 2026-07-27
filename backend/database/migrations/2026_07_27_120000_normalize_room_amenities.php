<?php

use App\Models\Room;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normalise les équipements des chambres vers les valeurs canoniques
 * (wifi, climatisation, tv, minibar). Des chambres historiques stockaient des
 * libellés capitalisés ("WiFi", "Mini-bar") qui échouaient à la validation lors
 * d'une mise à jour et s'affichaient bruts côté client.
 *
 * Écriture directe (DB::table) pour ne pas déclencher l'observer de diffusion.
 * Idempotente : réappliquée, elle ne modifie plus rien.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('rooms')->select('id', 'amenities')->get() as $room) {
            $amenities = json_decode($room->amenities ?? 'null', true);

            if (! is_array($amenities) || $amenities === []) {
                continue;
            }

            $normalized = Room::normalizeAmenities($amenities);

            if ($normalized !== $amenities) {
                DB::table('rooms')
                    ->where('id', $room->id)
                    ->update(['amenities' => json_encode($normalized)]);
            }
        }
    }

    public function down(): void
    {
        // Normalisation non réversible : les libellés d'origine ne sont pas conservés.
    }
};
