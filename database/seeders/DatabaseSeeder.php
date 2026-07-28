<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DocentesDemoSeeder::class,
            AdminSeeder::class,
            EstudianteSeeder::class,
            AmbientesSeeder::class,
            GruposSeeder::class,
            ConfiguracionPinsDemoSeeder::class,
        ]);
    }
}
