<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            if (Schema::hasColumn('admins', 'postal_code')) {
                $table->dropColumn('postal_code');
            }
            if (Schema::hasColumn('admins', 'country')) {
                $table->dropColumn('country');
            }
            if (! Schema::hasColumn('admins', 'id_documents')) {
                // Pièces d'identité gérées par l'admin lui-même (comme le client)
                $table->json('id_documents')->nullable()->after('id_document_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            if (! Schema::hasColumn('admins', 'postal_code')) {
                $table->string('postal_code', 20)->nullable();
            }
            if (! Schema::hasColumn('admins', 'country')) {
                $table->string('country', 100)->nullable();
            }
            if (Schema::hasColumn('admins', 'id_documents')) {
                $table->dropColumn('id_documents');
            }
        });
    }
};
