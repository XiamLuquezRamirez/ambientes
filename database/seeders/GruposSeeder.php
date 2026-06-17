<?php

namespace Database\Seeders;

use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Database\Seeder;

class GruposSeeder extends Seeder
{
    public function run(): void
    {
        $anio = date('Y');

        Grado::all()->each(function ($grado) use ($anio) {
            foreach (['A', 'B'] as $letra) {
                Grupo::updateOrCreate(
                    [
                        'grado_id'     => $grado->id,
                        'nombre'       => $letra,
                        'anio_lectivo' => $anio,
                    ],
                    [
                        'cupo_maximo' => 25,
                        'activo'      => true,
                    ]
                );
            }
        });
    }
}
