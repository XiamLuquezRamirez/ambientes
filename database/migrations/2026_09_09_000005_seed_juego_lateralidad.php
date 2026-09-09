<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $ambientePolimotorId = DB::table('ambientes')->where('slug', 'polimotor')->value('id');
        if (! $ambientePolimotorId) {
            return;
        }

        $ruta = 'catalogo_juegos/Polimotor/Lateralidad';
        if (DB::table('juegos')->where('ruta', $ruta)->exists()) {
            return;
        }

        $row = [
            'ambiente_id' => $ambientePolimotorId,
            'modulo_id' => null,
            'eje_id' => null,
            'tematica_id' => null,
            'tipo' => 'lateralidad',
            'ruta' => $ruta,
            'nombre' => 'Lateralidad (derecha/izquierda)',
            'descripcion' => 'Discriminar derecha e izquierda tocando la parte del cuerpo indicada.',
            'icono' => 'fa-arrows-left-right',
            'color' => '#a5d6a7',
            'orden' => 3,
            'activo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('juegos', 'canal')) {
            $row['canal'] = 'banco';
        }

        DB::table('juegos')->insert($row);
    }

    public function down(): void
    {
        DB::table('juegos')->where('ruta', 'catalogo_juegos/Polimotor/Lateralidad')->delete();
    }
};
