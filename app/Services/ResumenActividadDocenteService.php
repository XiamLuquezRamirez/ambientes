<?php

namespace App\Services;

use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\Docente;
use App\Models\Observacion;
use App\Models\User;

class ResumenActividadDocenteService
{
    /**
     * Arma el resumen de carga docente y actividad pedagógica del año lectivo actual.
     */
    public function construir(User $usuario): array
    {
        $anio = (int) date('Y');
        $perfil = $usuario->docente;

        if (! $perfil) {
            return [
                'anio' => $anio,
                'cargas' => [],
                'totales' => [
                    'estudiantes' => 0,
                    'observaciones' => 0,
                    'asistencias' => 0,
                ],
                'tiene_carga' => false,
            ];
        }

        $perfil->loadMissing(['cargasActivas.ambiente', 'cargasActivas.grado', 'cargasActivas.grupo']);

        $cargas = $this->formatearAsignacionesActuales($perfil)->values()->all();
        $estudianteIds = CargaDocente::obtenerIdsEstudiantesDeCargas($perfil->cargasActivas, $anio);

        $totalObservaciones = Observacion::where('user_id', $usuario->id)
            ->whereYear('created_at', $anio)
            ->count();

        $totalAsistencias = $estudianteIds->isEmpty()
            ? 0
            : Asistencia::whereIn('estudiante_id', $estudianteIds)
                ->whereYear('fecha', $anio)
                ->count();

        return [
            'anio' => $anio,
            'cargas' => $cargas,
            'totales' => [
                'estudiantes' => $estudianteIds->count(),
                'observaciones' => $totalObservaciones,
                'asistencias' => $totalAsistencias,
            ],
            'tiene_carga' => count($cargas) > 0,
        ];
    }

    private function formatearAsignacionesActuales(Docente $docente)
    {
        $cargas = $docente->cargasActivas;
        CargaDocente::asignarConteoEstudiantes($cargas, (int) date('Y'));

        return $cargas
            ->sortBy([
                ['ambiente.nombre', 'asc'],
                ['grado.orden', 'asc'],
                ['grupo.nombre', 'asc'],
            ])
            ->values()
            ->map(fn (CargaDocente $carga) => [
                'id' => $carga->id,
                'ambiente' => $carga->ambiente?->nombre ?? '—',
                'ambiente_id' => $carga->ambiente_id,
                'grado' => $carga->grado?->nombre ?? '—',
                'grado_id' => $carga->grado_id,
                'grupo' => $carga->grupo?->nombre ?? '—',
                'grupo_id' => $carga->grupo_id,
                'anio_lectivo' => $carga->anio_lectivo,
                'estado' => $carga->activo ? 'Activo' : 'Inactivo',
                'estudiantes' => $carga->total_estudiantes ?? 0,
            ]);
    }
}
