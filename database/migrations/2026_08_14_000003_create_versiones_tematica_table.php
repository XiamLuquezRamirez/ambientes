<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('versiones_tematica')) {
            return;
        }

        Schema::create('versiones_tematica', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tematica_id')->constrained('tematicas')->cascadeOnDelete();
            $table->json('snapshot');
            $table->foreignId('creado_por')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tematica_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('versiones_tematica');
    }
};
