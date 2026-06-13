<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('rating');               // 1 – 5
            $table->text('comment')->nullable();
            $table->timestamps();

            // Un seul avis par réservation
            $table->unique('reservation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
