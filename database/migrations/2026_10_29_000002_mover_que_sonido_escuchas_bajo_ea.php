<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mueve las rutas de los 6 juegos a
 * catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas/{Carpeta}.
 */
return new class extends Migration
{
    /** @var list<array{slug: string, carpeta: string}> */
    private const JUEGOS = [
        ['slug' => 'sonidos-de-la-naturaleza-y-animales', 'carpeta' => 'SonidosDeLaNaturalezaYAnimales'],
        ['slug' => 'sonidos-del-entorno-cotidiano', 'carpeta' => 'SonidosDelEntornoCotidiano'],
        ['slug' => 'sonidos-de-vehiculos-y-transporte', 'carpeta' => 'SonidosDeVehiculosYTransporte'],
        ['slug' => 'sonidos-urbanos-y-de-transito', 'carpeta' => 'SonidosUrbanosYDeTransito'],
        ['slug' => 'naturaleza-salvaje', 'carpeta' => 'NaturalezaSalvaje'],
        ['slug' => 'efectos-especiales-y-clima', 'carpeta' => 'EfectosEspecialesYClima'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();
        foreach (self::JUEGOS as $juego) {
            DB::table('juegos')->where('slug', $juego['slug'])->update([
                'ruta' => 'catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas/'.$juego['carpeta'],
                'updated_at' => $ahora,
            ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();
        foreach (self::JUEGOS as $juego) {
            DB::table('juegos')->where('slug', $juego['slug'])->update([
                'ruta' => 'catalogo_juegos/QueSonidoEscuchas/'.$juego['carpeta'],
                'updated_at' => $ahora,
            ]);
        }
    }
};
