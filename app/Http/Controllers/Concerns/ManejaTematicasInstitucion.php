<?php

namespace App\Http\Controllers\Concerns;

use App\Models\CatalogoDBA;
use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Tematica;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Endpoints y validaciones de temáticas del colegio compartidos por Admin y Panel.
 * Cada controlador define cómo se resuelve la institución y quién puede ver/gestionar.
 * Requiere la propiedad $curriculo (TematicaCurriculoService).
 */
trait ManejaTematicasInstitucion
{
    abstract private function institucionId(): int;

    abstract private function asegurarEjeVisible(Eje $eje, int $institucionId, bool $paraEscribir = false): void;

    abstract private function asegurarTematicaGestionable(Tematica $tematica, int $institucionId): void;

    public function buscarDbas(Request $request)
    {
        $institucionId = $this->institucionId();

        $consulta = CatalogoDBA::query()
            ->with(['area:id,nombre', 'grado:id,nombre'])
            ->where('estado', true)
            ->where(function ($q) use ($institucionId) {
                $q->whereNull('institucion_id')
                    ->orWhere('institucion_id', $institucionId);
            })
            ->orderBy('codigo');

        if ($request->filled('grado_id')) {
            $consulta->where('grado_id', (int) $request->grado_id);
        }
        if ($request->filled('area_id')) {
            $consulta->where('area_id', (int) $request->area_id);
        }
        if ($request->filled('q')) {
            $q = trim((string) $request->q);
            $consulta->where(function ($inner) use ($q) {
                $inner->where('codigo', 'like', "%{$q}%")
                    ->orWhere('descripcion', 'like', "%{$q}%");
            });
        }

        $data = $consulta->limit(50)->get()->map(fn (CatalogoDBA $dba) => [
            'id' => $dba->id,
            'codigo' => $dba->codigo,
            'descripcion' => $dba->descripcion,
            'area' => $dba->area?->nombre,
            'grado' => $dba->grado?->nombre,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function actualizarEstado(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $tematica = $this->curriculo->toggleActivoTematica($tematica);

        return response()->json([
            'success' => true,
            'message' => $tematica->activo
                ? 'Temática activada correctamente.'
                : 'Temática desactivada correctamente.',
            'activo' => (bool) $tematica->activo,
        ]);
    }

    public function eliminar(Tematica $tematica)
    {
        $institucionId = $this->institucionId();
        $this->asegurarTematicaGestionable($tematica, $institucionId);

        $experienciasCount = (int) $tematica->experiencias()->count();

        if ($experienciasCount > 0) {
            return response()->json([
                'success' => false,
                'can_delete' => false,
                'puede_desactivar' => (bool) $tematica->activo,
                'experiencias_count' => $experienciasCount,
                'message' => 'No se puede eliminar: la temática tiene experiencias. Puede desactivarla para conservar el contenido.',
            ], 422);
        }

        $ejeId = $tematica->eje_id;
        $tematicaId = $tematica->id;
        $tematica->delete();

        return response()->json([
            'success' => true,
            'message' => 'Temática eliminada correctamente.',
            'data' => [
                'id' => $tematicaId,
                'eje_id' => $ejeId,
            ],
        ]);
    }

    private function validarTematica(Request $request, int $ejeId, int $institucionId, ?int $tematicaId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('tematicas', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('eje_id', $ejeId)
                        ->where('institucion_id', $institucionId)
                        ->where('es_oficial', false))
                    ->ignore($tematicaId),
            ],
            'competencia' => ['nullable', 'string', 'max:100'],
            'referente_alternativo' => ['nullable', 'string', 'max:1000'],
            'requiere_ra' => ['sometimes', 'boolean'],
            'requiere_acompanamiento' => ['sometimes', 'boolean'],
            'indicadores' => ['nullable', 'array'],
            'indicadores.*.id' => ['nullable', 'integer'],
            'indicadores.*.descripcion' => ['required', 'string', 'max:300'],
            'indicadores.*.orden' => ['nullable', 'integer', 'min:1', 'max:255'],
            'dbas' => ['nullable', 'array'],
            'dbas.*.catalogo_dba_id' => ['required', 'integer', 'exists:catalogo_dba,id'],
            'dbas.*.relacion' => ['required', Rule::in(['principal', 'complementario'])],
            'dbas.*.observacion' => ['nullable', 'string', 'max:1000'],
        ], [
            'nombre.required' => 'El nombre de la temática es obligatorio.',
            'nombre.unique' => 'Ya existe una temática del colegio con ese nombre en este eje.',
            'indicadores.*.descripcion.required' => 'La descripción del indicador es obligatoria.',
            'indicadores.*.descripcion.max' => 'Cada indicador de logro admite máximo 300 caracteres.',
        ]);
    }

    private function asegurarTematicaVisible(Tematica $tematica, int $institucionId): void
    {
        if ($tematica->esOficial() || $tematica->esDeInstitucion($institucionId)) {
            $tematica->loadMissing('eje.modulo');
            $this->asegurarEjeVisible($tematica->eje, $institucionId);

            return;
        }

        abort(403, 'No puede consultar esta temática.');
    }

    private function asegurarAmbienteActivoContratado(int $ambienteId, int $institucionId): void
    {
        $activo = Institucion::query()
            ->whereKey($institucionId)
            ->whereHas(
                'ambientesActivos',
                fn ($q) => $q->where('ambientes.id', $ambienteId)
            )
            ->exists();

        if (! $activo) {
            abort(403, 'El ambiente no está activo para esta institución.');
        }
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
