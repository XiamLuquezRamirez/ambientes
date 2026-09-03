<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resultados_bloque_nino', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
            $table->foreignId('clase_id')->constrained('clases')->cascadeOnDelete();
            $table->foreignId('experiencia_id')->constrained('experiencias')->cascadeOnDelete();
            $table->foreignId('bloque_experiencia_id')->constrained('bloques_experiencia')->cascadeOnDelete();
            $table->string('tipo_bloque', 32);
            $table->string('tipo_registro', 16)->default('resultado');
            $table->boolean('correcto')->nullable();
            $table->json('payload')->nullable();
            $table->string('archivo_path')->nullable();
            $table->timestamp('creado_en')->useCurrent();
            $table->timestamp('actualizado_en')->useCurrent()->useCurrentOnUpdate();

            $table->unique(
                ['estudiante_id', 'clase_id', 'bloque_experiencia_id'],
                'resultados_bloque_nino_unico'
            );
            $table->index(['clase_id', 'experiencia_id']);
            $table->index(['estudiante_id', 'experiencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resultados_bloque_nino');
    }
};
