<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('juegos', function (Blueprint $table) {
            if (! Schema::hasColumn('juegos', 'ruta')) {
                $table->string('ruta', 255)->nullable()->after('tipo');
            }
        });

        // Si una corrida previa dejó `canal`, no lo tocamos aquí (lo limpia 000004).

        $ambientePolimotorId = DB::table('ambientes')->where('slug', 'polimotor')->value('id');
        if (! $ambientePolimotorId) {
            return;
        }

        $now = now();
        $paquetes = [
            [
                'ambiente_id' => $ambientePolimotorId,
                'modulo_id' => null,
                'eje_id' => null,
                'tematica_id' => null,
                'tipo' => 'rompecabezas_cuerpo',
                'ruta' => 'catalogo_juegos/Polimotor/Rompecabezas',
                'nombre' => 'Rompecabezas del cuerpo',
                'descripcion' => 'Armar el cuerpo humano arrastrando piezas según el nivel de edad.',
                'icono' => 'fa-puzzle-piece',
                'color' => '#ffd54f',
                'orden' => 1,
                'activo' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'ambiente_id' => $ambientePolimotorId,
                'modulo_id' => null,
                'eje_id' => null,
                'tematica_id' => null,
                'tipo' => 'reconocimiento_partes',
                'ruta' => 'catalogo_juegos/Polimotor/Reconocimiento',
                'nombre' => 'Reconocimiento de partes del cuerpo',
                'descripcion' => 'Tocar las partes del cuerpo indicadas según el nivel de edad.',
                'icono' => 'fa-hand-pointer',
                'color' => '#81d4fa',
                'orden' => 2,
                'activo' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($paquetes as $paquete) {
            $existe = DB::table('juegos')->where('ruta', $paquete['ruta'])->exists();
            if (! $existe) {
                // Incluir canal solo si la columna aún existe (entornos a medias).
                if (Schema::hasColumn('juegos', 'canal')) {
                    $paquete['canal'] = 'banco';
                }
                DB::table('juegos')->insert($paquete);
            }
        }
    }

    public function down(): void
    {
        DB::table('juegos')->whereIn('ruta', [
            'catalogo_juegos/Polimotor/Rompecabezas',
            'catalogo_juegos/Polimotor/Reconocimiento',
        ])->delete();

        Schema::table('juegos', function (Blueprint $table) {
            if (Schema::hasColumn('juegos', 'ruta')) {
                $table->dropColumn('ruta');
            }
        });
    }
};
