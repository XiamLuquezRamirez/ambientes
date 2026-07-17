<?php

namespace App\Services\Docente;

use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\Estudiante;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

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

    public function resumenAsistencia(Estudiante $estudiante): array
    {
        $historial = $this->historialAsistencia($estudiante);

        $registrados = $historial->filter(fn ($d) => $d['estado'] !== 'sin_registro');

        $presentes = $registrados->where('estado', 'presente')->count();

        $ausentes = $registrados->where('estado', 'ausente')->count();

        $total = $registrados->count();

        $porcentaje = $total > 0
            ? round(($presentes / $total) * 100)
            : 100;

        return [
            'presentes' => $presentes,
            'ausentes' => $ausentes,
            'registrados' => $total,
            'porcentaje' => $porcentaje,
            'alerta' => $porcentaje < 75,
        ];
    }

    public function reportePeriodoGrupo(
        CargaDocente $carga,
        ?string $desde,
        ?string $hasta
    ): array {
        $estudiantes = app(GrupoEstudiantesService::class)->listar($carga);

        $inicio = $desde
            ? Carbon::parse($desde)->startOfDay()
            : now()->startOfMonth();

        $fin = $hasta
            ? Carbon::parse($hasta)->endOfDay()
            : now()->endOfMonth();

        if ($inicio->gt($fin)) {
            throw ValidationException::withMessages([
                'hasta' => 'La fecha final debe ser posterior a la fecha inicial.',
            ]);
        }

        $asistencias = Asistencia::where('carga_docente_id', $carga->id)
            ->whereBetween('fecha', [$inicio, $fin])
            ->get()
            ->groupBy('estudiante_id');

        return collect($estudiantes)
            ->map(function ($estudiante) use ($asistencias) {

                $registros = $asistencias->get($estudiante['id'], collect());

                $registradas = $registros->count();

                $presentes = $registros
                    ->where('presente', true)
                    ->count();

                $porcentaje = $registradas > 0
                    ? round(($presentes / $registradas) * 100)
                    : 0;

                if ($porcentaje >= 90) {
                    $estado = 'Excelente';
                    $color = 'success';
                    $icono = '🟢';
                } elseif ($porcentaje >= 75) {
                    $estado = 'Aceptable';
                    $color = 'warning';
                    $icono = '🟠';
                } else {
                    $estado = 'Requiere seguimiento';
                    $color = 'danger';
                    $icono = '🔴';
                }

                return [
                    'nombre' => $estudiante['nombre'],
                    'apellido' => $estudiante['apellido'],
                    'presentes' => $presentes,
                    'registradas' => $registradas,
                    'porcentaje' => $porcentaje,
                    'estado' => $estado,
                    'color' => $color,
                    'icono' => $icono,
                ];
            })
            ->sortBy('porcentaje')
            ->values()
            ->all();
    }

    public function exportarReporteAsistencia(
        CargaDocente $carga,
        ?string $desde,
        ?string $hasta
    ) {
        $reporte = $this->reportePeriodoGrupo($carga, $desde, $hasta);

        return Pdf::loadView('panel.pdf.reporte', [
            'reporte' => $reporte,
            'carga' => $carga,
            'desde' => $desde,
            'hasta' => $hasta,
        ]);
    }
}
