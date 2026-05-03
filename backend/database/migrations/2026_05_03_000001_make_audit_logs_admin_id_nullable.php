<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rend admin_id nullable dans audit_logs pour permettre l'enregistrement
 * d'actions système (paiements via webhook, annulations automatiques,
 * actions client) sans contexte admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            // 1 — Supprimer la contrainte de clé étrangère existante
            $table->dropForeign(['admin_id']);

            // 2 — Rendre la colonne nullable
            $table->unsignedBigInteger('admin_id')->nullable()->change();

            // 3 — Recréer la FK avec nullOnDelete (pas de cascadeOnDelete)
            $table->foreign('admin_id')->references('id')->on('admins')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
            $table->unsignedBigInteger('admin_id')->nullable(false)->change();
            $table->foreign('admin_id')->references('id')->on('admins')->cascadeOnDelete();
        });
    }
};
