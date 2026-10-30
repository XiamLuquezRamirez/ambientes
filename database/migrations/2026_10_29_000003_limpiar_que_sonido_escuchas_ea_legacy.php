<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Elimina el juego único legacy. La temática 48 («¿Qué sonido escuchas?») se conserva.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('juegos')) {
            DB::table('juegos')->where('slug', 'que-sonido-escuchas-2')->delete();
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();

        if (! DB::table('juegos')->where('slug', 'que-sonido-escuchas-2')->exists()) {
            DB::table('juegos')->insert([
                'slug' => 'que-sonido-escuchas-2',
                'ambiente_id' => 6,
                'eje_id' => 21,
                'tematica_id' => 48,
                'modulo_id' => 11,
                'ruta' => 'catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas',
                'nombre' => '¿Qué sonido escuchas?',
                'descripcion' => null,
                'imagen' => null,
                'color' => '#ef4444',
                'orden' => 44,
                'activo' => 0,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
};
