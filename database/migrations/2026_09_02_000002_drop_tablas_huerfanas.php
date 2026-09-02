<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Elimina tablas del esquema anterior reemplazadas por perfil_aprendizaje*,
     * clases/clase_experiencias y resultados_bloque_nino.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('emociones_sesion');
        Schema::dropIfExists('participaciones_bloque');
        Schema::dropIfExists('resultados_bloque');
        Schema::dropIfExists('sesiones_experiencia');
        Schema::dropIfExists('estudiante_condicion_transitoria');
        Schema::dropIfExists('condiciones_transitorias_orden');
        Schema::dropIfExists('condiciones_orden');
        Schema::dropIfExists('condiciones_transitorias');
        Schema::dropIfExists('condiciones');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // No se recrean: el esquema activo usa otras tablas.
    }
};
