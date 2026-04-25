<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admins', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 150)->unique();
            $table->string('password');
            $table->string('role', 60);
            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(true);
            $table->foreignId('created_by_owner_id')->constrained('owners')->cascadeOnDelete();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('is_active');
            $table->index('created_by_owner_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admins');
    }
};
