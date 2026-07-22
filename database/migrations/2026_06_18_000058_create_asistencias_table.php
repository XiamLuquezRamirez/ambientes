<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('asistencias', function (Blueprint $table) {
            $table->id();

            $table->foreignId('carga_docente_id')
                ->constrained('carga_docente')
                ->cascadeOnDelete();

            $table->foreignId('estudiante_id')
                ->constrained('estudiantes')
                ->cascadeOnDelete();

            $table->date('fecha');

            $table->boolean('presente')->default(true);

            // Un registro por estudiante, carga y fecha
            $table->unique([
                'carga_docente_id',
                'estudiante_id',
                'fecha',
            ], 'asistencias_carga_estudiante_fecha_unique');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asistencias');
    }
};
