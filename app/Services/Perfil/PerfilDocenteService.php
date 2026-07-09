<?php

namespace App\Services\Perfil;

use App\Models\Observacion;
use App\Models\User;
use App\Services\ActividadAdminService;
use Carbon\Carbon;

/**
 * Datos de perfil para usuarios con rol docente.
 *
 * Incluye información personal editable (tabla docentes), estadísticas,
 * cargas activas y actividad reciente de seguridad.
 */
class PerfilDocenteService
{
    public function __construct(
        protected ActividadAdminService $actividadPerfil,
    ) {}

    public function construir(User $usuario): array
    {
        return [
            'usuario' => $usuario,
            'informacionPersonal' => $this->informacion($usuario),
            'estadisticas' => $this->estadisticas($usuario),
            'actividad' => $this->actividadPerfil->actividadRecienteDocente($usuario),
            'roles' => $this->roles(),
            'sesiones' => $this->sesiones($usuario),
            'ultimoAcceso' => $this->actividadPerfil->ultimoAcceso($usuario),
            'cargas' => $this->cargas($usuario),
        ];
    }

    /** Datos mostrados en el header y pestaña de información personal. */
    private function informacion(User $usuario): array
    {
        $docente = $usuario->docente;

        return [
            'nombre' => $usuario->nombre,
            'apellido' => $usuario->apellido,
            'email' => $usuario->email,
            'identificacion' => $usuario->identificacion,
            'rol' => $usuario->rol,
            'telefono' => $docente?->telefono,
            'direccion' => $docente?->direccion,
            'especialidad' => $docente?->especialidad,
            'fecha_ingreso' => $docente?->fecha_ingreso,
            'firma_url' => $docente?->firma_url,
            'foto_url' => $docente?->foto_url,
            'descripcion' => $docente?->descripcion,
            'estado' => $docente?->estado ?? $usuario->estado,
        ];
    }

    private function estadisticas(User $usuario): array
    {
        $cargas = $usuario->docente?->cargasActivas ?? collect();
        $estudiantes = $cargas
            ->pluck('ambiente.estudiantes')
            ->flatten()
            ->unique('id')
            ->count();
        $planeaciones = Observacion::where('user_id', $usuario->id)
            ->whereYear('created_at', date('Y'))
            ->count();

        return [
            [
                'titulo' => 'Grupos',
                'valor' => $cargas->count(),
                'icono' => 'fa-users-rectangle',
                'color' => 'blue',
            ],
            [
                'titulo' => 'Estudiantes',
                'valor' => $estudiantes,
                'icono' => 'fa-user-graduate',
                'color' => 'green',
            ],
            [
                'titulo' => 'Ambientes',
                'valor' => $cargas->pluck('ambiente_id')->unique()->count(),
                'icono' => 'fa-building',
                'color' => 'purple',
            ],
            [
                'titulo' => 'Observaciones',
                'valor' => $planeaciones,
                'icono' => 'fa-book-open',
                'color' => 'orange',
            ],
        ];
    }

    private function roles(): array
    {
        return [
            [
                'titulo' => 'Docente',
                'descripcion' => 'Gestión de grupos y planeaciones',
                'icono' => 'fa-chalkboard-user',
                'color' => 'green',
            ],
        ];
    }

    private function sesiones(User $usuario): array
    {
        return [
            [
                'titulo' => 'Actual',
                'ambiente' => $usuario->ultimoLogin?->ambiente ?? '—',
                'ip' => 'IP: '.($usuario->ultimoLogin?->ip ?? 'Sin registrar'),
                'fecha' => $usuario->ultimoLogin
                    ? Carbon::parse($usuario->ultimoLogin->fecha)->format('d/m/Y H:i')
                    : 'Sin registros',
                'icono' => 'fa-computer',
                'color' => 'success',
            ],
        ];
    }

    /** Cargas docentes activas para la pestaña de información personal. */
    private function cargas(User $usuario): array
    {
        return ($usuario->docente?->cargasActivas ?? collect())
            ->map(fn ($carga) => [
                'ambiente' => $carga->ambiente?->nombre ?? '—',
                'grado' => $carga->grado?->nombre ?? '—',
                'grupo' => $carga->grupo?->nombre ?? '—',
                'horas' => $carga->horas ?? 0,
            ])
            ->values()
            ->all();
    }
}
