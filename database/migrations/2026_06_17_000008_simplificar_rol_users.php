<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Paso 1: ampliar el ENUM para incluir valores nuevos y legacy.
        // MySQL trata los valores del ENUM como case-insensitive; NO listamos ambas variantes ('Admin' y 'admin').
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente','docente_lider','docente_auxiliar')
            NOT NULL DEFAULT 'docente'
        ");

        // Paso 2: migrar los datos
        DB::statement("
            UPDATE users
            SET rol = CASE
                WHEN rol = 'Admin' THEN 'admin'
                WHEN rol = 'Docente' THEN 'docente'
                WHEN rol IN ('docente_lider', 'docente_auxiliar') THEN 'docente'
                ELSE rol
            END
            WHERE rol IN ('Admin', 'Docente', 'docente_lider', 'docente_auxiliar')
        ");

        // Paso 3: dejar solo los dos valores finales
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente') NOT NULL DEFAULT 'docente'
        ");
    }

    public function down(): void
    {
        // En rollback, puede existir `rol='docente'` (o legacy 'Docente'/'Admin') y eso no cabe
        // en el ENUM antiguo ('admin','docente_lider','docente_auxiliar'). Primero ampliamos,
        // normalizamos y luego restringimos.
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente','docente_lider','docente_auxiliar')
            NOT NULL DEFAULT 'docente_lider'
        ");

        DB::statement("
            UPDATE users
            SET rol = CASE
                WHEN rol = 'docente' THEN 'docente_lider'
                ELSE rol
            END
            WHERE rol IN ('docente')
        ");

        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN rol ENUM('admin','docente_lider','docente_auxiliar')
            NOT NULL DEFAULT 'docente_lider'
        ");
    }
};
