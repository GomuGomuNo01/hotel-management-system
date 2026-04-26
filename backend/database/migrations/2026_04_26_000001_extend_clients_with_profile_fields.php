<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('phone');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('date_of_birth');
            $table->string('address_line', 200)->nullable()->after('nationality');
            $table->string('city', 100)->nullable()->after('address_line');
            $table->string('postal_code', 20)->nullable()->after('city');
            $table->string('country', 100)->nullable()->after('postal_code');
            $table->enum('id_document_type', ['passport', 'national_id', 'driver_license'])->nullable()->after('country');
            $table->string('id_document_number', 50)->nullable()->after('id_document_type');
            $table->string('emergency_contact_name', 120)->nullable()->after('id_document_number');
            $table->string('emergency_contact_phone', 20)->nullable()->after('emergency_contact_name');
            $table->string('preferred_language', 10)->default('fr')->after('emergency_contact_phone');
            $table->json('preferences')->nullable()->after('preferred_language');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'date_of_birth',
                'gender',
                'address_line',
                'city',
                'postal_code',
                'country',
                'id_document_type',
                'id_document_number',
                'emergency_contact_name',
                'emergency_contact_phone',
                'preferred_language',
                'preferences',
            ]);
        });
    }
};
