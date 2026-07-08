<?php

namespace App\Services\Perfil;

use App\Models\Docente;
use App\Models\Estudiante;
use App\Models\Matricula;
use App\Models\Observacion;
use App\Models\User;
use App\Services\ActividadAdminService;
use Carbon\Carbon;

class PerfilAdminService
{
    public function __construct(
        protected ActividadAdminService $actividadAdmin
    ) {}

    public function construir(User $usuario): array
    {
        return [
            'usuario' => $usuario,
            'informacionPersonal' => $this->informacion($usuario),
            'estadisticas' => $this->estadisticas(),
            'actividad' => $this->actividadAdmin->actividadReciente($usuario),
            'roles' => $this->roles(),
            'sesiones' => $this->sesiones($usuario),
            'ultimoAcceso' => $this->actividadAdmin->ultimoAcceso($usuario),
            'cargas' => [],
        ];
    }

    private function informacion(User $usuario): array
    {
        return [
            'nombre' => $usuario->nombre,
            'apellido' => $usuario->apellido,
            'email' => $usuario->email,
            'identificacion' => $usuario->identificacion,
            'rol' => $usuario->rol,
        ];
    }

    private function estadisticas(): array
    {
        return [
            [
                'titulo' => 'Docentes gestionados',
                'valor' => Docente::count(),
                'icono' => 'fa-chalkboard-user',
                'color' => 'green',
            ],
            [
                'titulo' => 'Estudiantes registrados',
                'valor' => Estudiante::count(),
                'icono' => 'fa-users',
                'color' => 'blue',
            ],
            [
                'titulo' => 'Matrículas activas',
                'valor' => Matricula::count(),
                'icono' => 'fa-book',
                'color' => 'purple',
            ],
            [
                'titulo' => 'Reportes generados',
                'valor' => Observacion::count(),
                'icono' => 'fa-file-pen',
                'color' => 'orange',
            ],
        ];
    }

    private function roles(): array
    {
        return [
            [
                'titulo' => 'Administrador',
                'descripcion' => 'Acceso completo al sistema',
                'icono' => 'fa-user-shield',
                'color' => 'azul',
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
}
