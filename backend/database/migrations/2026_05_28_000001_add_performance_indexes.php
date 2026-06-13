<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes composites pour les requêtes les plus fréquentes.
 * Impact estimé : -60 à -80 % de temps de réponse sur les pages
 * réservations, dashboard et badges.
 *
 * Idempotent : chaque index est créé uniquement s'il n'existe pas déjà
 * (utile si la migration a été partiellement appliquée avant un rollback).
 */
return new class extends Migration
{
    /**
     * Retourne true si l'index $name existe sur $table.
     * Introspection native Laravel → compatible MySQL, MariaDB et SQLite (tests).
     */
    private function indexExists(string $table, string $name): bool
    {
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['name'] ?? null) === $name) {
                return true;
            }
        }

        return false;
    }

    public function up(): void
    {
        // ── reservations ────────────────────────────────────────────────────
        Schema::table('reservations', function (Blueprint $table) {
            if (! $this->indexExists('reservations', 'idx_res_status_created'))
                $table->index(['status', 'created_at'],            'idx_res_status_created');

            if (! $this->indexExists('reservations', 'idx_res_client_status'))
                $table->index(['client_id', 'status'],             'idx_res_client_status');

            if (! $this->indexExists('reservations', 'idx_res_room_dates'))
                $table->index(['room_id', 'status', 'check_in_date', 'check_out_date'], 'idx_res_room_dates');

            if (! $this->indexExists('reservations', 'idx_res_status_plan'))
                $table->index(['status', 'payment_plan'],          'idx_res_status_plan');

            if (! $this->indexExists('reservations', 'idx_res_checkin_status'))
                $table->index(['check_in_date', 'status'],         'idx_res_checkin_status');

            if (! $this->indexExists('reservations', 'idx_res_checkout_status'))
                $table->index(['check_out_date', 'status'],        'idx_res_checkout_status');
        });

        // ── payments ────────────────────────────────────────────────────────
        Schema::table('payments', function (Blueprint $table) {
            if (! $this->indexExists('payments', 'idx_pay_reservation_status'))
                $table->index(['reservation_id', 'status'],        'idx_pay_reservation_status');

            if (! $this->indexExists('payments', 'idx_pay_status_confirmed'))
                $table->index(['status', 'confirmed_at'],          'idx_pay_status_confirmed');
        });

        // ── refunds ─────────────────────────────────────────────────────────
        Schema::table('refunds', function (Blueprint $table) {
            if (! $this->indexExists('refunds', 'idx_ref_status_created'))
                $table->index(['status', 'created_at'],            'idx_ref_status_created');

            if (! $this->indexExists('refunds', 'idx_ref_reservation_status'))
                $table->index(['reservation_id', 'status'],        'idx_ref_reservation_status');

            if (! $this->indexExists('refunds', 'idx_ref_client_status'))
                $table->index(['client_id', 'status'],             'idx_ref_client_status');
        });

        // ── rooms ───────────────────────────────────────────────────────────
        Schema::table('rooms', function (Blueprint $table) {
            if (! $this->indexExists('rooms', 'idx_rooms_status'))
                $table->index('status', 'idx_rooms_status');
        });

        // ── reviews ─────────────────────────────────────────────────────────
        Schema::table('reviews', function (Blueprint $table) {
            if (! $this->indexExists('reviews', 'idx_rev_client_created'))
                $table->index(['client_id', 'created_at'],         'idx_rev_client_created');

            if (! $this->indexExists('reviews', 'idx_rev_room'))
                $table->index('room_id',                           'idx_rev_room');
        });

        // ── audit_logs ──────────────────────────────────────────────────────
        // admin_id, action_type, entity_type, created_at ont déjà des index
        // simples (migration initiale). On ajoute uniquement le composite
        // (admin_id + created_at) utile pour la pagination filtrée par admin.
        Schema::table('audit_logs', function (Blueprint $table) {
            if (! $this->indexExists('audit_logs', 'idx_audit_admin_created'))
                $table->index(['admin_id', 'created_at'], 'idx_audit_admin_created');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            if ($this->indexExists('reservations', 'idx_res_status_created'))   $table->dropIndex('idx_res_status_created');
            if ($this->indexExists('reservations', 'idx_res_client_status'))    $table->dropIndex('idx_res_client_status');
            if ($this->indexExists('reservations', 'idx_res_room_dates'))       $table->dropIndex('idx_res_room_dates');
            if ($this->indexExists('reservations', 'idx_res_status_plan'))      $table->dropIndex('idx_res_status_plan');
            if ($this->indexExists('reservations', 'idx_res_checkin_status'))   $table->dropIndex('idx_res_checkin_status');
            if ($this->indexExists('reservations', 'idx_res_checkout_status'))  $table->dropIndex('idx_res_checkout_status');
        });

        Schema::table('payments', function (Blueprint $table) {
            if ($this->indexExists('payments', 'idx_pay_reservation_status')) $table->dropIndex('idx_pay_reservation_status');
            if ($this->indexExists('payments', 'idx_pay_status_confirmed'))   $table->dropIndex('idx_pay_status_confirmed');
        });

        Schema::table('refunds', function (Blueprint $table) {
            if ($this->indexExists('refunds', 'idx_ref_status_created'))        $table->dropIndex('idx_ref_status_created');
            if ($this->indexExists('refunds', 'idx_ref_reservation_status'))    $table->dropIndex('idx_ref_reservation_status');
            if ($this->indexExists('refunds', 'idx_ref_client_status'))         $table->dropIndex('idx_ref_client_status');
        });

        Schema::table('rooms', function (Blueprint $table) {
            if ($this->indexExists('rooms', 'idx_rooms_status')) $table->dropIndex('idx_rooms_status');
        });

        Schema::table('reviews', function (Blueprint $table) {
            if ($this->indexExists('reviews', 'idx_rev_client_created')) $table->dropIndex('idx_rev_client_created');
            if ($this->indexExists('reviews', 'idx_rev_room'))           $table->dropIndex('idx_rev_room');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            if ($this->indexExists('audit_logs', 'idx_audit_admin_created')) $table->dropIndex('idx_audit_admin_created');
        });
    }
};
