<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['clients', 'admins'] as $table) {
            if (Schema::hasColumn($table, 'nationality')) {
                Schema::table($table, fn (Blueprint $t) => $t->dropColumn('nationality'));
            }
        }
    }

    public function down(): void
    {
        foreach (['clients', 'admins'] as $table) {
            if (! Schema::hasColumn($table, 'nationality')) {
                Schema::table($table, fn (Blueprint $t) => $t->string('nationality', 80)->nullable());
            }
        }
    }
};
