<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\ConfiguracionPin;
use App\Models\Estudiante;
use Illuminate\Database\Seeder;

class EstudiantesDemoSeeder extends Seeder
{
    public function run(): void
    {
        // Estudiantes globales demo con sus PINs
        $estudiantesData = [
            ['nombre' => 'Valentina', 'iniciales' => 'VA', 'color_avatar' => '#0F6E56', 'pin' => ['circulo',   'estrella',  'corazon']],
            ['nombre' => 'Mateo',     'iniciales' => 'MA', 'color_avatar' => '#534AB7', 'pin' => ['estrella',  'triangulo', 'luna']],
            ['nombre' => 'Sofía',     'iniciales' => 'SO', 'color_avatar' => '#854F0B', 'pin' => ['corazon',   'diamante',  'cuadrado']],
            ['nombre' => 'Juan',      'iniciales' => 'JU', 'color_avatar' => '#185FA5', 'pin' => ['triangulo', 'rayo',      'estrella']],
            ['nombre' => 'Camila',    'iniciales' => 'CA', 'color_avatar' => '#993C1D', 'pin' => ['luna',      'circulo',   'diamante']],
            ['nombre' => 'Luna',      'iniciales' => 'LU', 'color_avatar' => '#F59E0B', 'pin' => ['rayo',      'corazon',   'triangulo']],
        ];

        $estudiantes = [];
        foreach ($estudiantesData as $data) {
            $pin = $data['pin'];
            unset($data['pin']);
            $data['condicion'] = 'estandar';

            $estudiante = Estudiante::firstOrCreate(['nombre' => $data['nombre']], $data);

            ConfiguracionPin::firstOrCreate(
                ['estudiante_id' => $estudiante->id],
                ['figura_1' => $pin[0], 'figura_2' => $pin[1], 'figura_3' => $pin[2]]
            );

            $estudiantes[] = $estudiante;
        }

        // Asignar estudiantes a ambientes via pivot
        // Todos los demo están en Música y Polimotor
        // Valentina, Mateo y Sofía también están en Lógico
        // Juan y Camila también en Multisensorial y Tecnología
        $asignaciones = [
            'musica'         => ['Valentina', 'Mateo', 'Sofía', 'Juan', 'Camila', 'Luna'],
            'polimotor'      => ['Valentina', 'Mateo', 'Sofía', 'Juan', 'Camila', 'Luna'],
            'logico'         => ['Valentina', 'Mateo', 'Sofía'],
            'multisensorial' => ['Juan', 'Camila', 'Luna'],
            'tecnologia'     => ['Juan', 'Camila', 'Luna'],
        ];

        $indice = collect($estudiantes)->keyBy('nombre');

        foreach ($asignaciones as $slug => $nombres) {
            $ambiente = Ambiente::where('slug', $slug)->first();
            if (!$ambiente) continue;

            $ids = collect($nombres)
                ->map(fn ($n) => $indice->get($n)?->id)
                ->filter()
                ->all();

            $ambiente->estudiantes()->syncWithoutDetaching($ids);
        }
    }
}
