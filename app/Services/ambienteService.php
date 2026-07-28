<?php

namespace App\Services;
use Illuminate\Support\Facades\Auth;
use App\Models\Ambiente;

class AmbienteService
{
  public function getAmbientes()
  {
    
        $docente = Auth::guard('docente')->user()->docente;
        $anio = date('Y');
        $ambientes = Ambiente::whereHas('cargasDocente', function ($q) use ($docente, $anio) {
            $q->where('docente_id', $docente->id)
                ->where('activo', true)
                ->where('anio_lectivo', $anio);
        })->with([
            'cargasDocente' => function ($q) use ($docente, $anio) {
                $q->where('docente_id', $docente->id)
                    ->where('activo', true)
                    ->where('anio_lectivo', $anio);
            },
        ])
        ->orderBy('nombre')
        ->get();

        $ambientes->each(function ($ambiente) {

            $cargas = $ambiente->cargasDocente;
            $ambiente->grados_count = $cargas
                ->pluck('grado_id')
                ->unique()
                ->count();

            $ambiente->grupos_count = $cargas
                ->pluck('grupo_id')
                ->unique()
                ->count();

        });

        $url_actual = url()->current();

        return [
            'ambientes' => $ambientes,
            'url_actual' => $url_actual
        ];
    }
}
