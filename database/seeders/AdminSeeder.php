<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Configuracion;
use App\Models\Docente;
use App\Models\Grado;
use App\Models\Grupo;
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
                'nombre' => 'Administrador',
                'password' => Hash::make('password'),
                'rol' => 'admin',
                'estado' => 'activo',
            ]
        );

        // Docente demo — Música, Jardín A
        $usuarioDocente = User::firstOrCreate(
            ['email' => 'docente.musica@aulasreggio.test'],
            [
                'nombre' => 'Docente Música',
                'password' => Hash::make('password'),
                'rol' => 'docente',
                'estado' => 'activo',
            ]
        );

        // Actualizar rol si quedó con valor antiguo
        if (in_array($usuarioDocente->rol, ['docente_lider', 'docente_auxiliar'])) {
            $usuarioDocente->update(['rol' => 'docente']);
        }

        $docente = Docente::firstOrCreate(
            ['user_id' => $usuarioDocente->id],
            ['especialidad' => 'Educación Musical']
        );

        // Asignar carga: Música → Jardín A del año actual
        $ambiente = Ambiente::where('slug', 'musica')->first();
        $grado = Grado::where('nombre', 'Jardin')->first();
        $grupo = $grado ? Grupo::where('grado_id', $grado->id)
            ->where('nombre', 'A')
            ->where('anio_lectivo', date('Y'))
            ->first() : null;

        if ($ambiente && $grado && $grupo) {
            CargaDocente::updateOrCreate(
                [
                    'docente_id' => $docente->id,
                    'ambiente_id' => $ambiente->id,
                    'grado_id' => $grado->id,
                    'grupo_id' => $grupo->id,
                    'anio_lectivo' => date('Y'),
                ],
                ['activo' => true]
            );
        }

        // Configuraciones por defecto
        Configuracion::set('tiempo_sesion_minutos', '60');
        Configuracion::set('intentos_max_pin', '5');
        Configuracion::set('idioma', 'es');
        Configuracion::set('zona_horaria', 'America/Bogota');

        // Datos mock de sync_queue
        foreach (['polimotor', 'logico', 'multisensorial', 'tecnologia'] as $slug) {
            if (! SyncQueue::where('servidor_origen', $slug)->exists()) {
                SyncQueue::create([
                    'entidad' => 'Estudiante',
                    'entidad_id' => 1,
                    'accion' => 'update',
                    'servidor_origen' => $slug,
                    'payload' => ['nombre' => 'Valentina', 'estado' => 'activo'],
                    'estado' => 'confirmado',
                ]);
            }
        }
    }
}
