<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Database\Seeder;

class AmbientesSeeder extends Seeder
{
    public function run(): void
    {
        $ambientes = [
            ['nombre' => 'Música',         'slug' => 'musica',         'color_hex' => '#0F6E56', 'icono' => '🎵', 'servidor_ip' => '192.168.1.20'],
            ['nombre' => 'Polimotor',      'slug' => 'polimotor',      'color_hex' => '#534AB7', 'icono' => '🤸', 'servidor_ip' => '192.168.1.21'],
            ['nombre' => 'Lógico',         'slug' => 'logico',         'color_hex' => '#854F0B', 'icono' => '🧠', 'servidor_ip' => '192.168.1.22'],
            ['nombre' => 'Multisensorial', 'slug' => 'multisensorial', 'color_hex' => '#185FA5', 'icono' => '🌿', 'servidor_ip' => '192.168.1.23'],
            ['nombre' => 'Tecnología',     'slug' => 'tecnologia',     'color_hex' => '#993C1D', 'icono' => '💡', 'servidor_ip' => '192.168.1.24'],
        ];

        foreach ($ambientes as $data) {
            Ambiente::firstOrCreate(['slug' => $data['slug']], array_merge($data, ['activo' => true]));
        }

        $grados = Grado::orderBy('orden')->get()->keyBy('nombre');
        $anio   = date('Y');

        $config = [
            'musica'         => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'polimotor'      => ['grados' => ['Prejardin', 'Jardin'],               'letras' => ['A', 'B']],
            'logico'         => ['grados' => ['Jardin', 'Transicion'],              'letras' => ['A', 'B']],
            'multisensorial' => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'tecnologia'     => ['grados' => ['Transicion'],                        'letras' => ['A']],
        ];

        foreach ($config as $slug => $setup) {
            $ambiente = Ambiente::where('slug', $slug)->first();
            if (!$ambiente) continue;

            foreach ($setup['grados'] as $nombreGrado) {
                $grado = $grados[$nombreGrado] ?? null;
                if (!$grado) continue;

                // Habilitar grado en el ambiente
                $ambiente->todosGrados()->syncWithoutDetaching([
                    $grado->id => ['activo' => true],
                ]);

                // Crear grupos demo
                foreach ($setup['letras'] as $letra) {
                    Grupo::firstOrCreate(
                        [
                            'ambiente_id'  => $ambiente->id,
                            'grado_id'     => $grado->id,
                            'nombre'       => $letra,
                            'anio_lectivo' => $anio,
                        ],
                        ['cupo_maximo' => 25, 'activo' => true]
                    );
                }
            }
        }
    }
}
