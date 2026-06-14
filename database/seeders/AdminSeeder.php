<?php
namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\Configuracion;
use App\Models\Docente;
use App\Models\SyncQueue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Crear admin (sin ambiente)
        Docente::firstOrCreate(
            ['email' => 'admin@aulasreggio.test'],
            [
                'nombre'     => 'Administrador',
                'password'   => Hash::make('password'),
                'rol'        => 'admin',
                'ambiente_id'=> null,
                'activo'     => true,
            ]
        );

        // Docente líder de Música
        $musica = Ambiente::where('slug', 'musica')->first();
        if ($musica) {
            Docente::firstOrCreate(
                ['email' => 'docente.musica@aulasreggio.test'],
                [
                    'nombre'     => 'Docente Líder Música',
                    'password'   => Hash::make('password'),
                    'rol'        => 'docente_lider',
                    'ambiente_id'=> $musica->id,
                    'activo'     => true,
                ]
            );
        }

        // Configuraciones por defecto
        Configuracion::set('tiempo_sesion_minutos', '60');
        Configuracion::set('intentos_max_pin', '5');
        Configuracion::set('idioma', 'es');
        Configuracion::set('zona_horaria', 'America/Bogota');

        // Datos mock de sync_queue (de los otros 4 servidores)
        $servidores = ['polimotor', 'logico', 'multisensorial', 'tecnologia'];
        foreach ($servidores as $slug) {
            if (!SyncQueue::where('servidor_origen', $slug)->exists()) {
                SyncQueue::create([
                    'entidad'         => 'Estudiante',
                    'entidad_id'      => 1,
                    'accion'          => 'update',
                    'servidor_origen' => $slug,
                    'payload'         => ['nombre' => 'Valentina', 'activo' => true],
                    'estado'          => 'confirmado',
                ]);
            }
        }
    }
}
