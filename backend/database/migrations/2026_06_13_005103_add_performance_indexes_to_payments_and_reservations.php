<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Index de performance :
     * - payments (status, confirmed_at) : graphes de revenus (owner/dashboard/revenue,
     *   rapports admin) qui filtrent status='success' + plage confirmed_at.
     * - reservations (created_at) : tris latest() des listes et agrégats par date de création.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->index(['status', 'confirmed_at'], 'payments_status_confirmed_at_index');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->index('created_at', 'reservations_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_status_confirmed_at_index');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('reservations_created_at_index');
        });
    }
};
