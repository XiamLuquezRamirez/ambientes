<?php

namespace App\Services;

use App\Models\CargaDocente;
use App\Models\Estudiante;
use App\Models\Matricula;
use Illuminate\Support\Collection;

class EstudiantePerfilAprendizajeService
{
    /**
     * @return Collection<int, int>
     */
    public function estudiantesIdsAccesiblesDocente(int $docenteId, ?int $anioLectivo = null): Collection
    {
        $anio = $anioLectivo ?? (int) date('Y');

        $cargas = CargaDocente::query()
            ->where('docente_id', $docenteId)
            ->where('activo', true)
            ->where('anio_lectivo', $anio)
            ->get();

        if ($cargas->isEmpty()) {
            return collect();
        }

        return Matricula::query()
            ->where('estado', 'activo')
            ->where('anio_lectivo', $anio)
            ->where(function ($query) use ($cargas) {
                foreach ($cargas as $carga) {
                    $query->orWhere(function ($q) use ($carga) {
                        $q->where('grado_id', $carga->grado_id)
                            ->where('grupo_id', $carga->grupo_id);
                    });
                }
            })
            ->pluck('estudiante_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    public function conteoActivosPorPerfilAprendizajeDocente(int $institucionId, int $docenteId): array
    {
        $estudiantesIds = $this->estudiantesIdsAccesiblesDocente($docenteId);

        if ($estudiantesIds->isEmpty()) {
            return [];
        }

        $filas = Estudiante::query()
            ->selectRaw('perfil_aprendizaje_id, COUNT(*) as activos')
            ->where('institucion_id', $institucionId)
            ->where('activo', true)
            ->whereIn('id', $estudiantesIds)
            ->whereNotNull('perfil_aprendizaje_id')
            ->groupBy('perfil_aprendizaje_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $activos = (int) $fila->activos;
            $mapa[(int) $fila->perfil_aprendizaje_id] = [
                'total' => $activos,
                'activos' => $activos,
            ];
        }

        return $mapa;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function estudiantesAsociados(
        int $perfilAprendizajeId,
        int $institucionId,
        int $docenteId
    ): Collection {
        $estudiantesIds = $this->estudiantesIdsAccesiblesDocente($docenteId);

        if ($estudiantesIds->isEmpty()) {
            return collect();
        }

        return Estudiante::query()
            ->where('institucion_id', $institucionId)
            ->where('perfil_aprendizaje_id', $perfilAprendizajeId)
            ->where('activo', true)
            ->whereIn('id', $estudiantesIds)
            ->with(['matriculaActiva.grado', 'matriculaActiva.grupo'])
            ->orderBy('nombre')
            ->orderBy('apellido')
            ->get()
            ->map(fn (Estudiante $e) => [
                'estudiante_id' => $e->id,
                'nombre' => $e->nombre_completo,
                'grado' => $e->matriculaActiva?->grado?->nombre,
                'grupo' => $e->matriculaActiva?->grupo?->nombre,
                'ficha_url' => route('panel.estudiantes.show', $e),
            ])
            ->values();
    }
}
