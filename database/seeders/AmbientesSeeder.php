<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use Illuminate\Database\Seeder;

class AmbientesSeeder extends Seeder
{
    public function run(): void
    {
        $ambientes = [
            ['nombre' => 'Música',         'slug' => 'musica',         'color_hex' => '#0F6E56', 'icono' => '🎵', 'servidor_ip' => '192.168.1.20'],
            ['nombre' => 'Polimotor',       'slug' => 'polimotor',      'color_hex' => '#534AB7', 'icono' => '🤸', 'servidor_ip' => '192.168.1.21'],
            ['nombre' => 'Lógico',          'slug' => 'logico',         'color_hex' => '#854F0B', 'icono' => '🧠', 'servidor_ip' => '192.168.1.22'],
            ['nombre' => 'Multisensorial',  'slug' => 'multisensorial', 'color_hex' => '#185FA5', 'icono' => '🌿', 'servidor_ip' => '192.168.1.23'],
            ['nombre' => 'Tecnología',      'slug' => 'tecnologia',     'color_hex' => '#993C1D', 'icono' => '💡', 'servidor_ip' => '192.168.1.24'],
        ];

        foreach ($ambientes as $data) {
            Ambiente::firstOrCreate(['slug' => $data['slug']], $data);
        }
    }
}
