<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supprime la colonne JSON "images" de la table rooms.
 *
 * Cette colonne a été ajoutée par erreur dans 2026_04_27_000002.
 * L'architecture finale utilise la table room_images (relation HasMany),
 * et avoir une colonne "images" sur rooms provoque un conflit : Laravel
 * retourne l'attribut null au lieu de charger la relation, ce qui empêche
 * l'affichage des photos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->json('images')->nullable()->after('amenities');
        });
    }
};
