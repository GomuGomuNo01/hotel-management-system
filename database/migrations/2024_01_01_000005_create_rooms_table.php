<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('room_number', 20)->unique();
            $table->enum('room_type', ['simple', 'double', 'suite', 'familiale']);
            $table->decimal('price_per_night', 10, 2);
            $table->tinyInteger('capacity')->unsigned();
            $table->enum('status', ['available', 'occupied', 'maintenance', 'reserved'])->default('available');
            $table->text('description')->nullable();
            $table->json('amenities')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('room_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
