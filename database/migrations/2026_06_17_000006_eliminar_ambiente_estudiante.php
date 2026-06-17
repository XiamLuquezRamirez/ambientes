<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // El pivot ambiente_estudiante queda obsoleto:
        // los estudiantes acceden a todos los ambientes via sincronizacion P2P.
        // Su asignacion a grado+grupo se maneja en la tabla matriculas.
        Schema::dropIfExists('ambiente_estudiante');
    }

    public function down(): void
    {
        // No se recrea — la nueva arquitectura usa matriculas
    }
};
