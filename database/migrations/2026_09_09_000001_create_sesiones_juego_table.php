<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesiones_juego', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
            $table->foreignId('juego_id')->constrained('juegos')->restrictOnDelete();
            $table->enum('nivel_edad', ['3', '4', '5-6']);
            $table->integer('perfil_aprendizaje_id')->nullable();
            $table->boolean('completado')->default(false);
            $table->unsignedTinyInteger('puntaje')->nullable();
            $table->unsignedSmallInteger('tiempo_seg')->nullable();
            $table->dateTime('inicio_at');
            $table->dateTime('fin_at')->nullable();

            $table->foreign('perfil_aprendizaje_id')
                ->references('id')
                ->on('perfil_aprendizaje')
                ->nullOnDelete();

            $table->index(['estudiante_id', 'juego_id']);
            $table->index(['estudiante_id', 'inicio_at']);
            $table->index(['juego_id', 'completado']);
            $table->index(['completado', 'puntaje']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesiones_juego');
    }
};
