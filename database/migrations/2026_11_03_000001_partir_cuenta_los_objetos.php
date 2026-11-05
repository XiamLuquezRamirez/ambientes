<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte "Cuenta los objetos" (Multisaberes) en 3 juegos (1 reto = 1 juego).
 * RecolectaLasManzanas ya existía; se registran AlimentaLosConejos y LosPollitosEnLaGranja.
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 8;

    private const EJE_ID = 20;

    private const TEMATICA_ID = 43;

    private const MODULO_ID = 3;

    /** @var list<array{slug: string, nombre: string, carpeta: string, color: string, orden: int}> */
    private const JUEGOS = [
        ['slug' => 'alimenta-los-conejos', 'nombre' => 'Alimenta los conejos', 'carpeta' => 'CuentaLosObjetos/AlimentaLosConejos', 'color' => '#f97316', 'orden' => 397],
        ['slug' => 'los-pollitos-en-la-granja', 'nombre' => 'Los pollitos en la granja', 'carpeta' => 'CuentaLosObjetos/LosPollitosEnLaGranja', 'color' => '#eab308', 'orden' => 398],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();

        foreach (self::JUEGOS as $juego) {
            $payload = [
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => self::EJE_ID,
                'tematica_id' => self::TEMATICA_ID,
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/Multisaberes/'.$juego['carpeta'],
                'nombre' => $juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => $juego['color'],
                'orden' => $juego['orden'],
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
    }
};
