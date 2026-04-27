<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Expiration du paiement en attente (30 min par défaut)
            $table->timestamp('expires_at')->nullable()->after('confirmed_at');

            // Indique si ce paiement a été créé en mode simulation (pas d'appel API réel)
            $table->boolean('simulation_mode')->default(false)->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['expires_at', 'simulation_mode']);
        });
    }
};
