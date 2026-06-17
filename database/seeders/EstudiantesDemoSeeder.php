<?php

namespace Database\Seeders;

use App\Models\ConfiguracionPin;
use App\Models\Estudiante;
use App\Models\Grado;
use App\Models\Grupo;
use App\Models\Matricula;
use Illuminate\Database\Seeder;

class EstudiantesDemoSeeder extends Seeder
{
    public function run(): void
    {
        $estudiantesData = [
            ['nombre' => 'Valentina', 'iniciales' => 'VA', 'color_avatar' => '#0F6E56', 'pin' => ['circulo',   'estrella',  'corazon']],
            ['nombre' => 'Mateo',     'iniciales' => 'MA', 'color_avatar' => '#534AB7', 'pin' => ['estrella',  'triangulo', 'luna']],
            ['nombre' => 'Sofía',     'iniciales' => 'SO', 'color_avatar' => '#854F0B', 'pin' => ['corazon',   'diamante',  'cuadrado']],
            ['nombre' => 'Juan',      'iniciales' => 'JU', 'color_avatar' => '#185FA5', 'pin' => ['triangulo', 'rayo',      'estrella']],
            ['nombre' => 'Camila',    'iniciales' => 'CA', 'color_avatar' => '#993C1D', 'pin' => ['luna',      'circulo',   'diamante']],
            ['nombre' => 'Luna',      'iniciales' => 'LU', 'color_avatar' => '#F59E0B', 'pin' => ['rayo',      'corazon',   'triangulo']],
        ];

        // Jardín A del año actual para todos los estudiantes demo
        $grado = Grado::where('nombre', 'Jardin')->first();
        $grupo = $grado ? Grupo::where('grado_id', $grado->id)
                               ->where('nombre', 'A')
                               ->where('anio_lectivo', date('Y'))
                               ->first() : null;

        foreach ($estudiantesData as $data) {
            $pin = $data['pin'];
            unset($data['pin']);
            $data['condicion'] = 'estandar';
            $data['activo']    = true;

            $estudiante = Estudiante::firstOrCreate(['nombre' => $data['nombre']], $data);

            ConfiguracionPin::firstOrCreate(
                ['estudiante_id' => $estudiante->id],
                ['figura_1' => $pin[0], 'figura_2' => $pin[1], 'figura_3' => $pin[2]]
            );

            if ($grado && $grupo) {
                Matricula::updateOrCreate(
                    [
                        'estudiante_id' => $estudiante->id,
                        'anio_lectivo'  => date('Y'),
                    ],
                    [
                        'grado_id'      => $grado->id,
                        'grupo_id'      => $grupo->id,
                        'estado'        => 'activo',
                        'fecha_ingreso' => now()->startOfYear(),
                    ]
                );
            }
        }
    }
}
