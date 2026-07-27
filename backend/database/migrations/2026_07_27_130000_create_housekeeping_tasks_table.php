<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tâches de ménage planifiées et suivies, distinctes de l'état physique de la
 * chambre (rooms.housekeeping_status). Sert avant tout aux « recouches »
 * (ménage en cours de séjour) : planification quotidienne, report si le client
 * est présent (DND), historique et traçabilité.
 *
 * Pas de clés étrangères physiques : le schéma existant est en MyISAM (qui ne
 * les supporte pas). L'intégrité est assurée côté applicatif (relations Eloquent
 * + garde-fous). Colonnes indexées pour les recherches par chambre / statut.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housekeeping_tasks', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('room_id');
            $table->unsignedBigInteger('reservation_id')->nullable();

            // stayover = recouche en séjour ; checkout réservé à une extension future.
            $table->string('type', 20)->default('stayover');

            $table->date('scheduled_for');

            // pending → in_progress → done ; deferred (reporté, DND) ; cancelled.
            $table->string('status', 20)->default('pending');

            $table->unsignedSmallInteger('deferred_count')->default(0);

            $table->unsignedBigInteger('completed_by')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->string('notes', 500)->nullable();

            $table->timestamps();

            // Un seul job actif par chambre et par jour (garanti aussi côté applicatif).
            $table->index(['room_id', 'scheduled_for']);
            $table->index(['status', 'scheduled_for']);
            $table->index('reservation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('housekeeping_tasks');
    }
};
