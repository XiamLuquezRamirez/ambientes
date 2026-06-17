<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Paso 1: ampliar el ENUM para incluir 'docente' junto a los valores viejos
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente','docente_lider','docente_auxiliar')
            NOT NULL DEFAULT 'docente'
        ");

        // Paso 2: migrar los datos
        DB::statement("
            UPDATE users
            SET rol = 'docente'
            WHERE rol IN ('docente_lider', 'docente_auxiliar')
        ");

        // Paso 3: dejar solo los dos valores finales
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente') NOT NULL DEFAULT 'docente'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente_lider','docente_auxiliar')
            NOT NULL DEFAULT 'docente_lider'
        ");
    }
};
