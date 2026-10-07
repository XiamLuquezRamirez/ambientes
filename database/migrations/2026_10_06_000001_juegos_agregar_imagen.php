<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Imagen del juego: archivo dentro de la carpeta del paquete (`{ruta}/{imagen}`).
 * La columna guarda solo el nombre de archivo para que sobreviva a cambios de ruta.
 */
return new class extends Migration
{
    private const IMAGENES_INICIALES = [
        'arrastrar-y-soltar-objetos' => 'arrastrar.png',
        'coordinacion-visual' => 'cordinacion.png',
        'ensamblajes-sencillos' => 'ensamblaje.png',
        'juegos-de-precision' => 'precision.png',
        'laberintos-de-coordinacion' => 'laberinto.png',
        'lateralidad' => 'lateralidad.png',
        'memoria-corporal' => 'memoria.png',
        'reconocimiento-de-partes-del-cuerpo' => 'reconocimiento.png',
        'rompecabezas-del-cuerpo' => 'rompecabeza.png',
        'secuencia-de-movimiento' => 'secuencia.png',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        if (! Schema::hasColumn('juegos', 'imagen')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->string('imagen', 120)->nullable()->after('descripcion');
            });
        }

        DB::table('juegos')
            ->whereIn('slug', array_keys(self::IMAGENES_INICIALES))
            ->whereNotNull('ruta')
            ->get(['slug', 'ruta', 'imagen'])
            ->each(function ($juego) {
                $archivo = self::IMAGENES_INICIALES[$juego->slug];
                $ruta = trim(str_replace('\\', '/', (string) $juego->ruta), '/');

                if (
                    (blank($juego->imagen) || $juego->imagen === 'portada.png')
                    && is_file(public_path($ruta.'/'.$archivo))
                ) {
                    DB::table('juegos')
                        ->where('slug', $juego->slug)
                        ->update(['imagen' => $archivo]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasTable('juegos') && Schema::hasColumn('juegos', 'imagen')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->dropColumn('imagen');
            });
        }
    }
};
