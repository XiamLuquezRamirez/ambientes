<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte el juego único ¿Qué sonido escuchas? (EA) en 6 entradas
 * (un reto del documento = un juego / carpeta), bajo la misma temática 48.
 */
return new class extends Migration
{
    private const EJE_ID = 21;

    private const MODULO_ID = 11;

    private const AMBIENTE_ID = 6;

    private const TEMATICA_ID = 48;

    private const SLUG_ANTIGUO = 'que-sonido-escuchas-2';

    /** @var list<array{nombre: string, slug: string, carpeta: string, color: string}> */
    private const JUEGOS = [
        [
            'nombre' => 'Sonidos de la Naturaleza y Animales',
            'slug' => 'sonidos-de-la-naturaleza-y-animales',
            'carpeta' => 'SonidosDeLaNaturalezaYAnimales',
            'color' => '#ef4444',
        ],
        [
            'nombre' => 'Sonidos del Entorno Cotidiano',
            'slug' => 'sonidos-del-entorno-cotidiano',
            'carpeta' => 'SonidosDelEntornoCotidiano',
            'color' => '#f97316',
        ],
        [
            'nombre' => 'Sonidos de Vehículos y Transporte',
            'slug' => 'sonidos-de-vehiculos-y-transporte',
            'carpeta' => 'SonidosDeVehiculosYTransporte',
            'color' => '#f59e0b',
        ],
        [
            'nombre' => 'Sonidos Urbanos y de Tránsito',
            'slug' => 'sonidos-urbanos-y-de-transito',
            'carpeta' => 'SonidosUrbanosYDeTransito',
            'color' => '#0ea5e9',
        ],
        [
            'nombre' => 'Naturaleza Salvaje',
            'slug' => 'naturaleza-salvaje',
            'carpeta' => 'NaturalezaSalvaje',
            'color' => '#84cc16',
        ],
        [
            'nombre' => 'Efectos Especiales y Clima',
            'slug' => 'efectos-especiales-y-clima',
            'carpeta' => 'EfectosEspecialesYClima',
            'color' => '#8b5cf6',
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos') || ! Schema::hasTable('tematicas')) {
            return;
        }

        $ahora = now();

        DB::table('juegos')
            ->where('slug', self::SLUG_ANTIGUO)
            ->update(['activo' => 0, 'updated_at' => $ahora]);

        if (DB::table('tematicas')->where('id', self::TEMATICA_ID)->exists()) {
            DB::table('tematicas')->where('id', self::TEMATICA_ID)->update([
                'nombre' => '¿Qué sonido escuchas?',
                'activo' => 1,
                'estado' => 'borrador',
                'updated_at' => $ahora,
            ]);
        }

        $ordenBase = ((int) DB::table('juegos')->max('orden')) + 1;

        foreach (self::JUEGOS as $i => $juego) {
            $payload = [
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => self::EJE_ID,
                'tematica_id' => self::TEMATICA_ID,
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas/'.$juego['carpeta'],
                'nombre' => $juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => $juego['color'],
                'orden' => $ordenBase + $i,
                'activo' => 1,
                'updated_at' => $ahora,
            ];

            $existe = DB::table('juegos')->where('slug', $juego['slug'])->exists();
            if ($existe) {
                DB::table('juegos')->where('slug', $juego['slug'])->update($payload);
            } else {
                DB::table('juegos')->insert(array_merge($payload, [
                    'slug' => $juego['slug'],
                    'created_at' => $ahora,
                ]));
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $slugs = array_column(self::JUEGOS, 'slug');
        DB::table('juegos')->whereIn('slug', $slugs)->delete();

        DB::table('juegos')
            ->where('slug', self::SLUG_ANTIGUO)
            ->update([
                'activo' => 1,
                'ruta' => 'catalogo_juegos/ExpresionArtistica/QueSonidoEscuchas',
                'tematica_id' => self::TEMATICA_ID,
                'updated_at' => now(),
            ]);
    }
};
