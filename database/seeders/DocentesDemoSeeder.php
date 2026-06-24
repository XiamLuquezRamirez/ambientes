<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DocentesDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('docentes')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        DB::table('docentes')->insert([
            ['id' => 1, 'user_id' => 2, 'telefono' => '12345678925', 'direccion' => 'direc', 'especialidad' => 'maestro', 'fecha_ingreso' => '2026-06-23', 'foto_url' => null, 'descripcion' => null, 'estado' => 'activo', 'created_at' => '2026-06-16 00:02:02', 'updated_at' => '2026-06-23 14:30:35'],
            ['id' => 2, 'user_id' => 4, 'telefono' => '12345678925', 'direccion' => 'direc', 'especialidad' => 'maestro', 'fecha_ingreso' => '2026-06-23', 'foto_url' => null, 'descripcion' => null, 'estado' => 'activo', 'created_at' => '2026-06-16 17:32:50', 'updated_at' => '2026-06-23 16:22:54'],
            ['id' => 3, 'user_id' => 5, 'telefono' => '12345678925', 'direccion' => 'direc', 'especialidad' => 'maestro', 'fecha_ingreso' => '2026-06-23', 'foto_url' => null, 'descripcion' => null, 'estado' => 'activo', 'created_at' => '2026-06-16 17:32:50', 'updated_at' => '2026-06-23 14:23:57'],
        ]);
    }
}
