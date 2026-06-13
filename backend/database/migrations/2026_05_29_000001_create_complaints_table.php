<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            // Admin ayant traité la réclamation (null tant qu'ouverte)
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            // Catégorie issue du catalogue (voir Complaint::CATEGORIES)
            $table->string('category', 40);
            // Objet libre — requis uniquement lorsque category = 'other'
            $table->string('custom_subject')->nullable();
            $table->text('message');
            $table->enum('status', ['open', 'handled'])->default('open');
            // Réponse / note de l'admin lors de la clôture
            $table->text('admin_response')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('client_id');
            $table->index('reservation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
