<?php

namespace App\Services\Docente;

use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\Estudiante;
use Illuminate\Support\Collection;

class AsistenciaService
{
    public function obtenerDelDia(CargaDocente $carga): Collection
    {
        return Asistencia::where('carga_docente_id', $carga->id)
            ->whereDate('fecha', today())
            ->get()
            ->keyBy('estudiante_id');
    }

    public function listaTomada(CargaDocente $carga, int $totalEstudiantes): bool
    {
        $registrados = Asistencia::where('carga_docente_id', $carga->id)
            ->whereDate('fecha', today())
            ->count();

        return $totalEstudiantes > 0 && $registrados === $totalEstudiantes;
    }

    public function historialAsistencia(Estudiante $estudiante)
    {
        $inicio = now()->subDays(29)->startOfDay();

        $registros = Asistencia::where('estudiante_id', $estudiante->id)
            ->whereBetween('fecha', [$inicio, today()])
            ->get()
            ->keyBy(fn ($a) => $a->fecha->format('Y-m-d'));

        $historial = collect();

        for ($fecha = today(); $fecha->gte($inicio); $fecha->subDay()) {

            $key = $fecha->format('Y-m-d');

            $historial->push([
                'fecha' => $fecha->copy(),
                'estado' => match (true) {
                    isset($registros[$key]) && $registros[$key]->presente => 'presente',
                    isset($registros[$key]) && ! $registros[$key]->presente => 'ausente',
                    default => 'sin_registro',
                },
            ]);
        }

        return $historial;
    }
}
