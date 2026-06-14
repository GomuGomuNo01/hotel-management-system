<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            // État ménage, distinct de l'état commercial (status). Une chambre
            // peut être « disponible » commercialement mais « sale » tant qu'elle
            // n'a pas été nettoyée après un départ.
            $table->enum('housekeeping_status', ['clean', 'dirty', 'in_progress', 'out_of_service'])
                ->default('clean')
                ->after('status');
            $table->index('housekeeping_status');
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropIndex(['housekeeping_status']);
            $table->dropColumn('housekeeping_status');
        });
    }
};
