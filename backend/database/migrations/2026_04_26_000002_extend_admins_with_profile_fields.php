<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->date('date_of_birth')->nullable()->after('phone');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('date_of_birth');
            $table->string('nationality', 80)->nullable()->after('gender');
            $table->string('address_line', 200)->nullable()->after('nationality');
            $table->string('city', 100)->nullable()->after('address_line');
            $table->string('postal_code', 20)->nullable()->after('city');
            $table->string('country', 100)->nullable()->after('postal_code');
            $table->string('id_document_type', 30)->nullable()->after('country'); // passport / national_id / driver_license
            $table->string('id_document_number', 50)->nullable()->after('id_document_type');
            $table->string('emergency_contact_name', 120)->nullable()->after('id_document_number');
            $table->string('emergency_contact_phone', 20)->nullable()->after('emergency_contact_name');
            $table->string('job_title', 80)->nullable()->after('emergency_contact_phone'); // "Réceptionniste de jour", "Manager", ...
            $table->date('hired_at')->nullable()->after('job_title');
            $table->string('profile_photo', 255)->nullable()->after('hired_at');
            $table->text('bio')->nullable()->after('profile_photo');
        });
    }

    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'date_of_birth', 'gender', 'nationality',
                'address_line', 'city', 'postal_code', 'country',
                'id_document_type', 'id_document_number',
                'emergency_contact_name', 'emergency_contact_phone',
                'job_title', 'hired_at', 'profile_photo', 'bio',
            ]);
        });
    }
};
