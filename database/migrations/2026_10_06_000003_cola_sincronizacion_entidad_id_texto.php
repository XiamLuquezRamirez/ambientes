<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Algunas entidades sincronizables usan llave de texto (p. ej. `juegos.slug`).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cola_sincronizacion')) {
            DB::statement('ALTER TABLE `cola_sincronizacion` MODIFY `entidad_id` VARCHAR(120) NOT NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('cola_sincronizacion')) {
            return;
        }

        DB::table('cola_sincronizacion')
            ->whereRaw("`entidad_id` NOT REGEXP '^[0-9]+$'")
            ->delete();

        DB::statement('ALTER TABLE `cola_sincronizacion` MODIFY `entidad_id` BIGINT UNSIGNED NOT NULL');
    }
};
