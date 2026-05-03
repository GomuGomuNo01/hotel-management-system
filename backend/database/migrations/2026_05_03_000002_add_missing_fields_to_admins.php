<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->string('place_of_birth', 150)->nullable()->after('date_of_birth');
            $table->string('id_document_path', 255)->nullable()->after('id_document_number');
        });
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->dropColumn(['place_of_birth', 'id_document_path']);
        });
    }
};
