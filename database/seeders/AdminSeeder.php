<?php
namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\Configuracion;
use App\Models\DocentePerfil;
use App\Models\SyncQueue;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        // Admin (sin perfil de docente)
        User::firstOrCreate(
            ['email' => 'admin@aulasreggio.test'],
            [
                'nombre'   => 'Administrador',
                'password' => Hash::make('password'),
                'rol'      => 'admin',
                'activo'   => true,
            ]
        );

        // Docente líder de Música
        $musica = Ambiente::where('slug', 'musica')->first();
        if ($musica) {
            $docente = User::firstOrCreate(
                ['email' => 'docente.musica@aulasreggio.test'],
                [
                    'nombre'   => 'Docente Líder Música',
                    'password' => Hash::make('password'),
                    'rol'      => 'docente_lider',
                    'activo'   => true,
                ]
            );

            DocentePerfil::firstOrCreate(
                ['user_id' => $docente->id],
                ['ambiente_id' => $musica->id]
            );
        }

        // Configuraciones por defecto
        Configuracion::set('tiempo_sesion_minutos', '60');
        Configuracion::set('intentos_max_pin', '5');
        Configuracion::set('idioma', 'es');
        Configuracion::set('zona_horaria', 'America/Bogota');

        // Datos mock de sync_queue
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
