<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Date du dernier nettoyage effectif d'une chambre (départ OU recouche).
 * Pilote le calcul de la fréquence de recouche par la commande planifiée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->timestamp('last_cleaned_at')->nullable()->after('housekeeping_status');
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('last_cleaned_at');
        });
    }
};
