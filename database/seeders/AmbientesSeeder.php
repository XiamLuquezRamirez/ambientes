<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class AmbientesSeeder extends Seeder
{
    public function run(): void
    {
        $ambientes = [
            ['nombre' => 'Expresión Artística', 'slug' => 'expresion-artistica', 'color_hex' => '#0F6E56', 'icono' => '🎨', 'servidor_ip' => '192.168.1.20'],
            ['nombre' => 'Polimotor',           'slug' => 'polimotor',           'color_hex' => '#534AB7', 'icono' => '🤸', 'servidor_ip' => '192.168.1.21'],
            ['nombre' => 'Multisaberes',        'slug' => 'multisaberes',        'color_hex' => '#854F0B', 'icono' => '🧠', 'servidor_ip' => '192.168.1.22'],
            ['nombre' => 'Multisensorial',      'slug' => 'multisensorial',      'color_hex' => '#185FA5', 'icono' => '✋', 'servidor_ip' => '192.168.1.23'],
            ['nombre' => 'Tecnología',          'slug' => 'tecnologia',          'color_hex' => '#993C1D', 'icono' => '💻', 'servidor_ip' => '192.168.1.24'],
        ];

        foreach ($ambientes as $data) {
            Ambiente::firstOrCreate(['slug' => $data['slug']], array_merge($data, ['activo' => true]));
        }

        $grados = Grado::orderBy('orden')->get()->keyBy('nombre');
        $anio   = date('Y');

        $config = [
            'expresion-artistica' => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'polimotor'           => ['grados' => ['Prejardin', 'Jardin'],               'letras' => ['A', 'B']],
            'multisaberes'        => ['grados' => ['Jardin', 'Transicion'],              'letras' => ['A', 'B']],
            'multisensorial'      => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'tecnologia'          => ['grados' => ['Transicion'],                        'letras' => ['A']],
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
                    $criteriosGrupo = [
                        'grado_id'     => $grado->id,
                        'nombre'       => $letra,
                        'anio_lectivo' => $anio,
                    ];

                    if (Schema::hasColumn('grupos', 'ambiente_id')) {
                        $criteriosGrupo['ambiente_id'] = $ambiente->id;
                    }

                    Grupo::updateOrCreate(
                        $criteriosGrupo,
                        ['cupo_maximo' => 25, 'activo' => true]
                    );
                }
            }
        }
    }
}
