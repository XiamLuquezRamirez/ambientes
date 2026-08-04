<?php

namespace App\Services;

use App\Models\PerfilAprendizajePersonalizado;
use App\Models\Estudiante;
use App\Models\EstudiantePerfilAprendizajePersonalizado;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EstudiantePerfilAprendizajePersonalizadoService
{
    public const MOTIVOS_CIERRE = [
        'diagnostico_formal' => 'Diagnóstico formal confirmado',
        'condicion_no_confirmada' => 'Condición no confirmada',
        'otro' => 'Otro',
    ];

    public function autorizarCondicionInstitucion(PerfilAprendizajePersonalizado $condicion, int $institucionId): void
    {
        $pertenece = $condicion->id_institucion === null
            || (int) $condicion->id_institucion === $institucionId;

        if (! $pertenece) {
            abort(403, 'La condición no pertenece a esta institución.');
        }
    }

    /**
     * @return Collection<int, EstudiantePerfilAprendizajePersonalizado>
     */
    public function asignacionesActivas(
        PerfilAprendizajePersonalizado $condicion,
        int $institucionId,
        ?int $docenteId = null
    ): Collection {
        $consulta = EstudiantePerfilAprendizajePersonalizado::query()
            ->where('id_condicion_transitoria', $condicion->id)
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->with([
                'estudiante.matriculaActiva.grado',
                'estudiante.matriculaActiva.grupo',
                'docente.user',
            ])
            ->orderByDesc('fecha_activacion');

        if ($docenteId !== null) {
            $consulta->where('id_docente', $docenteId);
        }

        return $consulta->get();
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    public function conteoActivosPorCondicion(int $institucionId): array
    {
        $filas = EstudiantePerfilAprendizajePersonalizado::query()
            ->selectRaw('id_condicion_transitoria, COUNT(*) as activos')
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->groupBy('id_condicion_transitoria')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $activos = (int) $fila->activos;
            $mapa[(int) $fila->id_condicion_transitoria] = [
                'total' => $activos,
                'activos' => $activos,
            ];
        }

        return $mapa;
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    public function conteoActivosPorCondicionDocente(int $institucionId, int $docenteId): array
    {
        $filas = EstudiantePerfilAprendizajePersonalizado::query()
            ->selectRaw('id_condicion_transitoria, COUNT(*) as activos')
            ->activas()
            ->where('id_docente', $docenteId)
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->groupBy('id_condicion_transitoria')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $activos = (int) $fila->activos;
            $mapa[(int) $fila->id_condicion_transitoria] = [
                'total' => $activos,
                'activos' => $activos,
            ];
        }

        return $mapa;
    }

    public function conteoActivosCondicion(int $condicionId, int $institucionId, ?int $docenteId = null): int
    {
        $consulta = EstudiantePerfilAprendizajePersonalizado::query()
            ->where('id_condicion_transitoria', $condicionId)
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId));

        if ($docenteId !== null) {
            $consulta->where('id_docente', $docenteId);
        }

        return $consulta->count();
    }

    public function serializarAsignacion(EstudiantePerfilAprendizajePersonalizado $asignacion, bool $puedeDesasociar): array
    {
        $estudiante = $asignacion->estudiante;
        $matricula = $estudiante?->matriculaActiva;
        $docente = $asignacion->docente?->user;

        return [
            'asignacion_id' => $asignacion->id,
            'estudiante_id' => $estudiante?->id,
            'nombre' => $estudiante?->nombre_completo ?? '—',
            'grado' => $matricula?->grado?->nombre,
            'grupo' => $matricula?->grupo?->nombre,
            'fecha_activacion' => $asignacion->fecha_activacion?->format('d/m/Y H:i'),
            'docente' => $docente ? trim("{$docente->nombre} {$docente->apellido}") : '—',
            'observacion' => $asignacion->observacion,
            'puede_desasociar' => $puedeDesasociar,
            'ficha_url' => $estudiante
                ? route('panel.estudiantes.show', $estudiante)
                : null,
        ];
    }

    public function desasociar(
        EstudiantePerfilAprendizajePersonalizado $asignacion,
        string $motivoCierre,
        string $observacionCierre
    ): void {
        if (! $asignacion->activa) {
            abort(422, 'Esta asignación ya fue cerrada.');
        }

        DB::transaction(function () use ($asignacion, $motivoCierre, $observacionCierre) {
            $asignacion->update([
                'activa' => false,
                'fecha_cierre' => now(),
                'motivo_cierre' => $motivoCierre,
                'observacion_cierre' => trim($observacionCierre),
            ]);

            Estudiante::query()
                ->where('id', $asignacion->id_estudiante)
                ->where('condicion_transitoria_id', $asignacion->id_condicion_transitoria)
                ->update(['condicion_transitoria_id' => null]);
        });
    }
}
