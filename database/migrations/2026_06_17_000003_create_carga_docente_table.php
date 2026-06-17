<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carga_docente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('docente_id')
                  ->constrained('docentes')
                  ->onDelete('cascade');
            $table->foreignId('ambiente_id')
                  ->constrained('ambientes')
                  ->onDelete('restrict');
            $table->foreignId('grado_id')
                  ->constrained('grados')
                  ->onDelete('restrict');
            $table->foreignId('grupo_id')
                  ->constrained('grupos')
                  ->onDelete('restrict');
            $table->year('anio_lectivo');
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(
                ['docente_id', 'ambiente_id', 'grado_id', 'grupo_id', 'anio_lectivo'],
                'unique_carga_docente'
            );
            $table->index(['docente_id', 'anio_lectivo']);
            $table->index(['ambiente_id', 'grado_id', 'grupo_id', 'anio_lectivo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carga_docente');
    }
};
