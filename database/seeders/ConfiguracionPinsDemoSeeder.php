<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfiguracionPinsDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('configuracion_pins')->truncate();

        DB::table('configuracion_pins')->insert([
            ['id' =>  7, 'estudiante_id' => 31, 'figura_1' => 'fas fa-square', 'color_figura_1' => '#437124', 'figura_2' => 'fas fa-square', 'color_figura_2' => '#437124', 'figura_3' => 'fas fa-square', 'color_figura_3' => '#437124', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 15:23:30', 'updated_at' => '2026-06-23 16:03:55'],
            ['id' =>  8, 'estudiante_id' => 32, 'figura_1' => 'fas fa-heart',  'color_figura_1' => '#ff0606', 'figura_2' => 'fas fa-heart',  'color_figura_2' => '#ff0606', 'figura_3' => 'fas fa-heart',  'color_figura_3' => '#ff0606', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 15:31:26', 'updated_at' => '2026-06-23 16:03:33'],
            ['id' =>  9, 'estudiante_id' => 33, 'figura_1' => 'fas fa-star',   'color_figura_1' => '#ff9019', 'figura_2' => 'fas fa-heart',  'color_figura_2' => '#ff0606', 'figura_3' => 'fas fa-fish',   'color_figura_3' => '#0f54ff', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 15:34:40', 'updated_at' => '2026-06-23 15:34:40'],
            ['id' => 10, 'estudiante_id' => 34, 'figura_1' => 'fas fa-fish',   'color_figura_1' => '#0f54ff', 'figura_2' => 'fas fa-heart',  'color_figura_2' => '#ff0606', 'figura_3' => 'fas fa-circle', 'color_figura_3' => '#f933e9', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 15:35:48', 'updated_at' => '2026-06-23 15:35:48'],
            ['id' => 11, 'estudiante_id' => 13, 'figura_1' => 'fas fa-fish',   'color_figura_1' => '#0f54ff', 'figura_2' => 'fas fa-fish',   'color_figura_2' => '#0f54ff', 'figura_3' => 'fas fa-fish',   'color_figura_3' => '#0f54ff', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 16:14:31', 'updated_at' => '2026-06-23 17:12:10'],
            ['id' => 12, 'estudiante_id' => 11, 'figura_1' => 'fas fa-square', 'color_figura_1' => '#437124', 'figura_2' => 'fas fa-square', 'color_figura_2' => '#437124', 'figura_3' => 'fas fa-square', 'color_figura_3' => '#437124', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 16:15:42', 'updated_at' => '2026-06-23 16:15:42'],
            ['id' => 13, 'estudiante_id' =>  5, 'figura_1' => 'fas fa-square', 'color_figura_1' => '#437124', 'figura_2' => 'fas fa-square', 'color_figura_2' => '#437124', 'figura_3' => 'fas fa-square', 'color_figura_3' => '#437124', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 16:16:06', 'updated_at' => '2026-06-23 16:16:06'],
            ['id' => 14, 'estudiante_id' => 12, 'figura_1' => 'fas fa-heart',  'color_figura_1' => '#ff0606', 'figura_2' => 'fas fa-fish',   'color_figura_2' => '#0f54ff', 'figura_3' => 'fas fa-square', 'color_figura_3' => '#437124', 'intentos_fallidos' => 0, 'created_at' => '2026-06-23 16:39:05', 'updated_at' => '2026-06-23 16:39:05'],
        ]);

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
