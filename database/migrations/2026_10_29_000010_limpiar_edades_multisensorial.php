<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Multisensorial: quitar banda "4 años"; "3 años" pasa a "3-4 años".
 * Afecta EncuentraElColor y MemoriaVisual.
 */
return new class extends Migration
{
    private const ELIMINAR = [
            "encuentra-el-rojo-4-anos",
            "encuentra-el-amarillo-4-anos",
            "encuentra-el-azul-4-anos",
            "encuentra-el-verde-4-anos",
            "encuentra-el-naranja-4-anos",
            "mochila-2",
            "hoja-2",
            "globos-2",
            "caminito-2"
    ];

    private const RENOMBRAR = [
        ['from' => "encuentra-el-rojo-3-anos", 'to' => "encuentra-el-rojo-3-4-anos", 'nombre' => "Encuentra El Rojo (3-4 Años)", 'ruta' => "catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElRojo34Anos"],
        ['from' => "encuentra-el-amarillo-3-anos", 'to' => "encuentra-el-amarillo-3-4-anos", 'nombre' => "Encuentra El Amarillo (3-4 Años)", 'ruta' => "catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElAmarillo34Anos"],
        ['from' => "encuentra-el-azul-3-anos", 'to' => "encuentra-el-azul-3-4-anos", 'nombre' => "Encuentra El Azul (3-4 Años)", 'ruta' => "catalogo_juegos/Multisensorial/EncuentraElColor/EncuentraElAzul34Anos"],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        DB::table('juegos')->whereIn('slug', self::ELIMINAR)->delete();

        $ahora = now();
        foreach (self::RENOMBRAR as $r) {
            if (! DB::table('juegos')->where('slug', $r['from'])->exists()) {
                continue;
            }
            // slug es PK: insertar nuevo y borrar viejo
            $row = (array) DB::table('juegos')->where('slug', $r['from'])->first();
            unset($row['slug']);
            $row['nombre'] = $r['nombre'];
            $row['ruta'] = $r['ruta'];
            $row['updated_at'] = $ahora;
            if (DB::table('juegos')->where('slug', $r['to'])->exists()) {
                DB::table('juegos')->where('slug', $r['to'])->update($row);
            } else {
                DB::table('juegos')->insert(array_merge($row, [
                    'slug' => $r['to'],
                    'created_at' => $row['created_at'] ?? $ahora,
                ]));
            }
            DB::table('juegos')->where('slug', $r['from'])->delete();
        }
    }

    public function down(): void
    {
        // Irreversible de forma segura.
    }
};
