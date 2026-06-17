<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matriculas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')
                  ->constrained('estudiantes')
                  ->onDelete('restrict');
            $table->foreignId('grado_id')
                  ->constrained('grados')
                  ->onDelete('restrict');
            $table->foreignId('grupo_id')
                  ->constrained('grupos')
                  ->onDelete('restrict');
            $table->year('anio_lectivo');
            $table->enum('estado', ['activo', 'promovido', 'graduado', 'retirado'])
                  ->default('activo');
            $table->date('fecha_ingreso');
            $table->date('fecha_egreso')->nullable();
            $table->timestamps();

            $table->unique(['estudiante_id', 'anio_lectivo'], 'unique_matricula_activa');
            $table->index(['grupo_id', 'anio_lectivo', 'estado']);
            $table->index(['grado_id', 'anio_lectivo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};
