<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Los 6 juegos pertenecen a la misma temática curricular
 * «¿Qué sonido escuchas?» (no una temática por categoría/reto).
 */
return new class extends Migration
{
    private const EJE_ID = 21;

    private const TEMATICA_ID = 48;

    private const TEMATICA_NOMBRE = '¿Qué sonido escuchas?';

    /** @var list<string> */
    private const SLUGS = [
        'sonidos-de-la-naturaleza-y-animales',
        'sonidos-del-entorno-cotidiano',
        'sonidos-de-vehiculos-y-transporte',
        'sonidos-urbanos-y-de-transito',
        'naturaleza-salvaje',
        'efectos-especiales-y-clima',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos') || ! Schema::hasTable('tematicas')) {
            return;
        }

        $ahora = now();

        if (! DB::table('tematicas')->where('id', self::TEMATICA_ID)->exists()) {
            DB::table('tematicas')->insert([
                'id' => self::TEMATICA_ID,
                'eje_id' => self::EJE_ID,
                'nombre' => self::TEMATICA_NOMBRE,
                'competencia' => null,
                'referente_alternativo' => null,
                'requiere_ra' => 0,
                'requiere_acompanamiento' => 0,
                'es_oficial' => 1,
                'institucion_id' => null,
                'estado' => 'borrador',
                'activo' => 1,
                'creado_por' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        } else {
            DB::table('tematicas')->where('id', self::TEMATICA_ID)->update([
                'nombre' => self::TEMATICA_NOMBRE,
                'eje_id' => self::EJE_ID,
                'estado' => 'borrador',
                'activo' => 1,
                'updated_at' => $ahora,
            ]);
        }

        DB::table('juegos')->whereIn('slug', self::SLUGS)->update([
            'tematica_id' => self::TEMATICA_ID,
            'updated_at' => $ahora,
        ]);

        // Temáticas creadas por error (una por reto/categoría).
        DB::table('tematicas')
            ->where('eje_id', self::EJE_ID)
            ->whereIn('id', [73, 74, 75, 76, 77, 78])
            ->delete();
    }

    public function down(): void
    {
        // No recreamos las 6 temáticas espurias; solo desvincula si hace falta.
        if (! Schema::hasTable('juegos')) {
            return;
        }

        DB::table('juegos')->whereIn('slug', self::SLUGS)->update([
            'tematica_id' => null,
            'updated_at' => now(),
        ]);
    }
};
