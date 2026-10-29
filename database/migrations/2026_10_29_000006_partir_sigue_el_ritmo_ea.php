<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte Sigue el ritmo (EA) en 6 juegos bajo la temática 50.
 */
return new class extends Migration
{
    private const EJE_ID = 21;

    private const MODULO_ID = 11;

    private const AMBIENTE_ID = 6;

    private const TEMATICA_ID = 50;

    private const SLUG_ANTIGUO = 'sigue-el-ritmo';

    /** @var list<array{nombre: string, slug: string, carpeta: string, color: string}> */
    private const JUEGOS = [
        [
            'nombre' => 'El Latido del Tambor',
            'slug' => 'el-latido-del-tambor',
            'carpeta' => 'ElLatidoDelTambor',
            'color' => '#ef4444',
        ],
        [
            'nombre' => 'Aplausos al Compás',
            'slug' => 'aplausos-al-compas',
            'carpeta' => 'AplausosAlCompas',
            'color' => '#f97316',
        ],
        [
            'nombre' => 'Dos Golpes y una Pausa',
            'slug' => 'dos-golpes-y-una-pausa',
            'carpeta' => 'DosGolpesYUnaPausa',
            'color' => '#f59e0b',
        ],
        [
            'nombre' => 'Palmada y Tambor',
            'slug' => 'palmada-y-tambor',
            'carpeta' => 'PalmadaYTambor',
            'color' => '#0ea5e9',
        ],
        [
            'nombre' => 'Los Grandes Instrumentos (1-2-3)',
            'slug' => 'los-grandes-instrumentos-1-2-3',
            'carpeta' => 'LosGrandesInstrumentos123',
            'color' => '#8b5cf6',
        ],
        [
            'nombre' => 'Memoria y Coordinación',
            'slug' => 'memoria-y-coordinacion',
            'carpeta' => 'MemoriaYCoordinacion',
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
                'nombre' => 'Sigue el ritmo',
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
                'ruta' => 'catalogo_juegos/ExpresionArtistica/SigueElRitmo/'.$juego['carpeta'],
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

        DB::table('juegos')->whereIn('slug', array_column(self::JUEGOS, 'slug'))->delete();

        $ahora = now();
        if (! DB::table('juegos')->where('slug', self::SLUG_ANTIGUO)->exists()) {
            DB::table('juegos')->insert([
                'slug' => self::SLUG_ANTIGUO,
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => self::EJE_ID,
                'tematica_id' => self::TEMATICA_ID,
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/ExpresionArtistica/SigueElRitmo',
                'nombre' => 'Sigue el ritmo',
                'descripcion' => null,
                'imagen' => null,
                'color' => '#0ea5e9',
                'orden' => 46,
                'activo' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }
    }
};
