<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte Descubre el instrumento (EA) en 7 juegos bajo la temática 49.
 */
return new class extends Migration
{
    private const EJE_ID = 21;

    private const MODULO_ID = 11;

    private const AMBIENTE_ID = 6;

    private const TEMATICA_ID = 49;

    private const SLUG_ANTIGUO = 'descubre-el-instrumento';

    /** @var list<array{nombre: string, slug: string, carpeta: string, color: string}> */
    private const JUEGOS = [
        [
            'nombre' => 'El Tambor',
            'slug' => 'el-tambor',
            'carpeta' => 'ElTambor',
            'color' => '#ef4444',
        ],
        [
            'nombre' => 'La Guitarra',
            'slug' => 'la-guitarra',
            'carpeta' => 'LaGuitarra',
            'color' => '#f97316',
        ],
        [
            'nombre' => 'La Flauta Mágica',
            'slug' => 'la-flauta-magica',
            'carpeta' => 'LaFlautaMagica',
            'color' => '#f59e0b',
        ],
        [
            'nombre' => 'Guardar los Instrumentos',
            'slug' => 'guardar-los-instrumentos',
            'carpeta' => 'GuardarLosInstrumentos',
            'color' => '#84cc16',
        ],
        [
            'nombre' => 'Cuerda, Viento y Percusión',
            'slug' => 'cuerda-viento-y-percusion',
            'carpeta' => 'CuerdaVientoYPercusion',
            'color' => '#0ea5e9',
        ],
        [
            'nombre' => 'Agudo vs. Grave',
            'slug' => 'agudo-vs-grave',
            'carpeta' => 'AgudoVsGrave',
            'color' => '#8b5cf6',
        ],
        [
            'nombre' => 'Director de Orquesta',
            'slug' => 'director-de-orquesta',
            'carpeta' => 'DirectorDeOrquesta',
            'color' => '#ec4899',
        ],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();

        DB::table('juegos')->where('slug', self::SLUG_ANTIGUO)->delete();

        if (Schema::hasTable('tematicas')) {
            DB::table('tematicas')->where('id', self::TEMATICA_ID)->update([
                'nombre' => 'Descubre el instrumento',
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
                'ruta' => 'catalogo_juegos/ExpresionArtistica/DescubreElInstrumento/'.$juego['carpeta'],
                'nombre' => $juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => $juego['color'],
                'orden' => $ordenBase + $i,
                'activo' => 1,
                'updated_at' => $ahora,
            ];

            if (DB::table('juegos')->where('slug', $juego['slug'])->exists()) {
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

        $ahora = now();
        if (! DB::table('juegos')->where('slug', self::SLUG_ANTIGUO)->exists()) {
            DB::table('juegos')->insert([
                'slug' => self::SLUG_ANTIGUO,
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => self::EJE_ID,
                'tematica_id' => self::TEMATICA_ID,
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/ExpresionArtistica/DescubreElInstrumento',
                'nombre' => 'Descubre el instrumento',
                'descripcion' => null,
                'imagen' => null,
                'color' => '#84cc16',
                'orden' => 45,
                'activo' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
};
