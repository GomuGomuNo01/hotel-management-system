<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajoute 'cash' à l'ENUM provider et rend phone_number nullable.
     * Nécessaire pour les paiements enregistrés en espèces par l'admin.
     *
     * Utilise le Schema builder (->change()) plutôt que du DDL MySQL brut,
     * afin de rester compatible avec SQLite (suite de tests) et MySQL (prod).
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->enum('provider', ['orange_ci', 'wave_ci', 'cash'])->nullable(false)->change();
            $table->string('phone_number', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('payments')->where('provider', 'cash')->delete();
        DB::table('payments')->whereNull('phone_number')->update(['phone_number' => '']);

        Schema::table('payments', function (Blueprint $table) {
            $table->enum('provider', ['orange_ci', 'wave_ci'])->nullable(false)->change();
            $table->string('phone_number', 20)->nullable(false)->change();
        });
    }
};
