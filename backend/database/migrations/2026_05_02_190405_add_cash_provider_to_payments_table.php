<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ajoute 'cash' au ENUM provider et rend phone_number nullable.
     * Nécessaire pour les paiements enregistrés en espèces par l'admin.
     */
    public function up(): void
    {
        // Modifier l'ENUM provider pour inclure 'cash'
        DB::statement("ALTER TABLE payments MODIFY COLUMN provider ENUM('orange_ci','wave_ci','cash') NOT NULL");

        // Rendre phone_number nullable (les paiements en espèces n'ont pas de numéro)
        DB::statement("ALTER TABLE payments MODIFY COLUMN phone_number VARCHAR(20) NULL");
    }

    public function down(): void
    {
        // Remettre phone_number NOT NULL
        DB::statement("UPDATE payments SET phone_number = '' WHERE phone_number IS NULL");
        DB::statement("ALTER TABLE payments MODIFY COLUMN phone_number VARCHAR(20) NOT NULL");

        // Supprimer 'cash' de l'ENUM
        DB::statement("DELETE FROM payments WHERE provider = 'cash'");
        DB::statement("ALTER TABLE payments MODIFY COLUMN provider ENUM('orange_ci','wave_ci') NOT NULL");
    }
};
