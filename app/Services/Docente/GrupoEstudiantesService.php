<?php

namespace App\Services\Docente;

use App\Models\CargaDocente;
use App\Models\Matricula;
use Illuminate\Support\Collection;

class GrupoEstudiantesService
{
    public function obtenerMatriculas(CargaDocente $carga): Collection
    {
        return Matricula::query()
            ->join('estudiante_ambiente', function ($join) use ($carga) {
                $join->on('estudiante_ambiente.estudiante_id', '=', 'matriculas.estudiante_id')
                    ->where('estudiante_ambiente.ambiente_id', $carga->ambiente_id)
                    ->where('estudiante_ambiente.anio_lectivo', $carga->anio_lectivo)
                    ->where('estudiante_ambiente.estado', 'activo');
            })
            ->where('matriculas.grado_id', $carga->grado_id)
            ->where('matriculas.grupo_id', $carga->grupo_id)
            ->where('matriculas.anio_lectivo', $carga->anio_lectivo)
            ->where('matriculas.estado', 'activo')
            ->with([
                'estudiante.piar',
                'estudiante.configuracionPin',
                'estudiante.perfilAprendizaje',
            ])
            ->select('matriculas.*')
            ->get();
    }

    public function listar(CargaDocente $carga): Collection
    {
        $matriculas = $this->obtenerMatriculas($carga);

        return $matriculas->map(function ($matricula) {

            $estudiante = $matricula->estudiante;

            return [
                'id' => $estudiante->id,
                'nombre' => $estudiante->nombre,
                'apellido' => $estudiante->apellido,
                'activo' => $estudiante->activo,
                'color_avatar' => $estudiante->color_avatar ?? '#2563EB',
                'avatar_url' => $estudiante->avatar_url,
                'iniciales' => $estudiante->iniciales ?? strtoupper(substr($estudiante->nombre ?? 'E', 0, 2)),
                'perfil_aprendizaje_nombre' => $estudiante->perfilAprendizaje?->nombre,
                'perfil_aprendizaje_id' => $estudiante->perfil_aprendizaje_id,
                'tiene_pin' => $estudiante->configuracionPin !== null,
                'tiene_piar' => $estudiante->piar !== null,
                'estado' => $matricula->estado,
                'matricula_id' => $matricula->id,
            ];

        });
    }

    public function contar(CargaDocente $carga): int
    {
        return Matricula::query()
            ->join('estudiante_ambiente', function ($join) use ($carga) {
                $join->on('estudiante_ambiente.estudiante_id', '=', 'matriculas.estudiante_id')
                    ->where('estudiante_ambiente.ambiente_id', $carga->ambiente_id)
                    ->where('estudiante_ambiente.anio_lectivo', $carga->anio_lectivo)
                    ->where('estudiante_ambiente.estado', 'activo');
            })
            ->where('matriculas.grado_id', $carga->grado_id)
            ->where('matriculas.grupo_id', $carga->grupo_id)
            ->where('matriculas.anio_lectivo', $carga->anio_lectivo)
            ->where('matriculas.estado', 'activo')
            ->count();
    }
}
