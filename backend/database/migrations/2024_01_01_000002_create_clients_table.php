<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 150)->unique();
            $table->string('phone', 20)->nullable();
            $table->string('password')->nullable();
            $table->enum('provider', ['local', 'google'])->default('local');
            $table->string('provider_id', 100)->nullable()->index();
            $table->string('nationality', 80)->nullable();
            $table->string('profile_photo', 255)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();

            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
