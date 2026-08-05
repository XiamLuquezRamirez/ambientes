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
        'perfil_aprendizaje_no_confirmado' => 'perfil de aprendizaje personalizado no confirmado',
        'otro' => 'Otro',
    ];

    public function autorizarPerfilAprendizajePersonalizadoInstitucion(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado, int $institucionId): void
    {
        $pertenece = $perfilAprendizajePersonalizado->institucion_id === null
            || (int) $perfilAprendizajePersonalizado->institucion_id === $institucionId;

        if (! $pertenece) {
            abort(403, 'El perfil de aprendizaje personalizado no pertenece a esta institución.');
        }
    }

    /**
     * @return Collection<int, EstudiantePerfilAprendizajePersonalizado>
     */
    public function asignacionesActivas(
        PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado,
        int $institucionId,
        ?int $docenteId = null
    ): Collection {
        $consulta = EstudiantePerfilAprendizajePersonalizado::query()
            ->where('perfil_aprendizaje_personalizado_id', $perfilAprendizajePersonalizado->id)
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->with([
                'estudiante.matriculaActiva.grado',
                'estudiante.matriculaActiva.grupo',
                'docente.user',
            ])
            ->orderByDesc('fecha_activacion');

        if ($docenteId !== null) {
            $consulta->where('docente_id', $docenteId);
        }

        return $consulta->get();
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    public function conteoActivosPorPerfilAprendizajePersonalizado(int $institucionId): array
    {
        $filas = EstudiantePerfilAprendizajePersonalizado::query()
            ->selectRaw('perfil_aprendizaje_personalizado_id, COUNT(*) as activos')
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->groupBy('perfil_aprendizaje_personalizado_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $activos = (int) $fila->activos;
            $mapa[(int) $fila->perfil_aprendizaje_personalizado_id] = [
                'total' => $activos,
                'activos' => $activos,
            ];
        }

        return $mapa;
    }

    /**
     * @return array<int, array{total:int,activos:int}>
     */
    public function conteoActivosPorPerfilAprendizajePersonalizadoDocente(int $institucionId, int $docenteId): array
    {
        $filas = EstudiantePerfilAprendizajePersonalizado::query()
            ->selectRaw('perfil_aprendizaje_personalizado_id, COUNT(*) as activos')
            ->activas()
            ->where('docente_id', $docenteId)
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId))
            ->groupBy('perfil_aprendizaje_personalizado_id')
            ->get();

        $mapa = [];
        foreach ($filas as $fila) {
            $activos = (int) $fila->activos;
            $mapa[(int) $fila->perfil_aprendizaje_personalizado_id] = [
                'total' => $activos,
                'activos' => $activos,
            ];
        }

        return $mapa;
    }

    public function conteoActivosPerfilAprendizajePersonalizado(int $perfilAprendizajeId, int $institucionId, ?int $docenteId = null): int
    {
        $consulta = EstudiantePerfilAprendizajePersonalizado::query()
            ->where('perfil_aprendizaje_personalizado_id', $perfilAprendizajeId)
            ->activas()
            ->whereHas('estudiante', fn ($q) => $q->where('institucion_id', $institucionId));

        if ($docenteId !== null) {
            $consulta->where('docente_id', $docenteId);
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
                ->where('id', $asignacion->estudiante_id)
                ->where('perfil_aprendizaje_personalizado_id', $asignacion->perfil_aprendizaje_personalizado_id)
                ->update(['perfil_aprendizaje_personalizado_id' => null]);
        });
    }
}
