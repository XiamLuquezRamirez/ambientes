<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesiones_juego_elementos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesion_id')
                ->constrained('sesiones_juego')
                ->cascadeOnDelete();
            $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
            $table->string('elemento_id', 60);
            $table->enum('tipo_elemento', [
                'pieza_cuerpo',
                'pieza_robot',
                'parte_cuerpo',
                'lateralidad',
                'memoria_ronda',
                'laberinto',
                'recorrido_pelota',
                'objeto_semantico',
                'recorrido_precision',
            ]);
            $table->boolean('correcto');
            $table->unsignedTinyInteger('intentos')->default(1);
            $table->boolean('usa_ayuda')->default(false);
            $table->timestamp('creado_en')->useCurrent();

            $table->index(['estudiante_id', 'tipo_elemento', 'correcto']);
            $table->index(['estudiante_id', 'elemento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesiones_juego_elementos');
    }
};
