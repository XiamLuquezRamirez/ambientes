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
                'estudiante.condicion',
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
                'color_avatar' => $estudiante->color_avatar ?? '#2563EB',
                'avatar' => $estudiante->avatar,
                'iniciales' => $estudiante->iniciales ?? strtoupper(substr($estudiante->nombre ?? 'E', 0, 2)),
                'condicion' => $estudiante->condicion?->nombre,
                'condicion_id' => $estudiante->condicion_id,
                'tiene_pin' => $estudiante->configuracionPin !== null,
                'tiene_piar' => $estudiante->piar !== null,
                'estado' => $matricula->estado,
                'matricula_id' => $matricula->id,
            ];

        });
    }

    public function obtener(CargaDocente $carga): Collection
    {
        return $this->obtenerMatriculas($carga)
            ->pluck('estudiante');
    }
}
