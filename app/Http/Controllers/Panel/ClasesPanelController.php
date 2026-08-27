<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CargaDocente;
use App\Models\Clase;
use App\Models\Eje;
use App\Models\Experiencia;
use App\Models\Modulo;
use App\Services\ClaseKioscoService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClasesPanelController extends Controller
{
    public function __construct(
        private ClaseKioscoService $claseKiosco,
    ) {}

    public function listar()
    {
        $carga = $this->resolverCargaContexto();

        if (! $carga) {
            return redirect()
                ->route('panel.principal')
                ->with('warning', 'Primero selecciona un ambiente, grado y grupo desde el inicio.');
        }

        $clases = Clase::query()
            ->deCarga($carga->id)
            ->delDocente($carga->docente_id)
            ->delAnio($carga->anio_lectivo)
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get();

        $ambientesModulos = $this->arbolCurriculoAmbiente(
            (int) $carga->ambiente_id,
            $this->institucionId()
        );

        $gruposReplica = $this->gruposReplicaDelGrado($carga);
        $experienciasUsadasPorCarga = $this->experienciasUsadasPorCarga($carga, $gruposReplica);

        return view('panel.clases.index', compact(
            'carga',
            'clases',
            'ambientesModulos',
            'gruposReplica',
            'experienciasUsadasPorCarga',
        ));
    }

    public function guardar(Request $request)
    {
        $carga = $this->resolverCargaContexto();

        if (! $carga) {
            return response()->json([
                'success' => false,
                'message' => 'Primero selecciona un ambiente, grado y grupo desde el inicio.',
            ], 422);
        }

        $datos = $request->validate([
            'modulo_id' => ['required', 'integer', 'exists:modulos,id'],
            'eje_id' => ['required', 'integer', 'exists:ejes,id'],
            'tematica_id' => ['required', 'integer', 'exists:tematicas,id'],
            'experiencia_id' => ['required', 'integer', 'exists:experiencias,id'],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'fecha' => ['nullable', 'date'],
            'estado' => ['nullable', Rule::in(Clase::ESTADOS)],
            'carga_docente_ids' => ['required', 'array', 'min:1'],
            'carga_docente_ids.*' => ['integer', 'exists:carga_docente,id'],
        ]);

        $experiencia = Experiencia::query()
            ->with(['tematica.eje.modulo'])
            ->findOrFail($datos['experiencia_id']);

        $errorCadena = $this->validarCadenaCurricular($carga, $datos, $experiencia);
        if ($errorCadena) {
            return response()->json([
                'success' => false,
                'message' => $errorCadena,
            ], 422);
        }

        $cargasDestino = CargaDocente::query()
            ->whereIn('id', $datos['carga_docente_ids'])
            ->where('docente_id', $carga->docente_id)
            ->where('ambiente_id', $carga->ambiente_id)
            ->where('grado_id', $carga->grado_id)
            ->where('activo', true)
            ->where('anio_lectivo', $carga->anio_lectivo)
            ->get();

        if ($cargasDestino->count() !== count(array_unique($datos['carga_docente_ids']))) {
            return response()->json([
                'success' => false,
                'message' => 'Uno o más grupos seleccionados no pertenecen a tu carga en este grado y ambiente.',
            ], 422);
        }

        $cargasConDuplicado = Clase::query()
            ->with('cargaDocente.grupo')
            ->where('experiencia_id', $datos['experiencia_id'])
            ->where('anio_lectivo', $carga->anio_lectivo)
            ->whereIn('carga_docente_id', $cargasDestino->pluck('id'))
            ->get();

        if ($cargasConDuplicado->isNotEmpty()) {
            $grupos = $cargasConDuplicado
                ->map(fn (Clase $clase) => $clase->cargaDocente?->grupo?->nombre ?? 'grupo')
                ->unique()
                ->values()
                ->join(', ');

            return response()->json([
                'success' => false,
                'message' => "Esta experiencia ya está agregada en: {$grupos}.",
            ], 422);
        }

        $estado = $datos['estado'] ?? Clase::ESTADO_BORRADOR;

        if ($estado === Clase::ESTADO_ACTIVA) {
            if ($cargasDestino->count() > 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Solo puede haber una clase activa por ambiente y fecha. Elige un solo grupo o crea en borrador.',
                ], 422);
            }

            if (empty($datos['fecha'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Una clase activa necesita fecha.',
                ], 422);
            }
        }

        $creadas = [];

        DB::transaction(function () use ($cargasDestino, $datos, $estado, &$creadas) {
            if ($estado === Clase::ESTADO_ACTIVA && ! empty($datos['fecha'])) {
                $this->claseKiosco->demotarOtrasActivas(
                    (int) $cargasDestino->first()->ambiente_id,
                    $datos['fecha']
                );
            }

            foreach ($cargasDestino as $cargaDestino) {
                $clase = Clase::create([
                    'carga_docente_id' => $cargaDestino->id,
                    'docente_id' => $cargaDestino->docente_id,
                    'ambiente_id' => $cargaDestino->ambiente_id,
                    'modulo_id' => $datos['modulo_id'],
                    'eje_id' => $datos['eje_id'],
                    'tematica_id' => $datos['tematica_id'],
                    'experiencia_id' => $datos['experiencia_id'],
                    'nombre' => $datos['nombre'],
                    'descripcion' => $datos['descripcion'] ?? null,
                    'fecha' => $datos['fecha'] ?? null,
                    'estado' => $estado,
                    'anio_lectivo' => $cargaDestino->anio_lectivo,
                ]);

                $creadas[] = $clase;
            }
        });

        $total = count($creadas);
        $mensaje = $total === 1
            ? 'Clase creada correctamente.'
            : "Se crearon {$total} clases (una por grupo seleccionado).";

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => [
                'total' => $total,
                'ids' => collect($creadas)->pluck('id')->values(),
            ],
        ], 201);
    }

    public function actualizarEstado(Request $request, Clase $clase)
    {
        $carga = $this->resolverCargaContexto();

        if (! $carga || (int) $clase->carga_docente_id !== (int) $carga->id) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes modificar esta clase.',
            ], 403);
        }

        $datos = $request->validate([
            'estado' => ['required', Rule::in(Clase::ESTADOS)],
        ]);

        $nuevoEstado = $datos['estado'];

        if ($nuevoEstado === Clase::ESTADO_ACTIVA) {
            if (! $clase->fecha) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asigna una fecha antes de activar la clase.',
                ], 422);
            }

            DB::transaction(function () use ($clase, $nuevoEstado) {
                $this->claseKiosco->demotarOtrasActivas(
                    (int) $clase->ambiente_id,
                    $clase->fecha->format('Y-m-d'),
                    $clase->id
                );
                $clase->update(['estado' => $nuevoEstado]);
            });
        } else {
            $clase->update(['estado' => $nuevoEstado]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Estado actualizado.',
            'data' => [
                'id' => $clase->id,
                'estado' => $clase->fresh()->estado,
                'etiqueta' => $clase->fresh()->etiquetaEstado(),
                'badge' => $clase->fresh()->badgeEstado(),
            ],
        ]);
    }

    /**
     * Resuelve la carga activa del docente desde sesión:
     * 1) carga_docente_id
     * 2) ambiente_id + grado_id + grupo_id
     */
    private function resolverCargaContexto(): ?CargaDocente
    {
        $docente = Auth::guard('docente')->user()?->docente;

        if (! $docente) {
            return null;
        }

        $anio = (int) date('Y');
        $base = CargaDocente::query()
            ->with(['ambiente', 'grado', 'grupo'])
            ->where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', $anio);

        if (session()->has('carga_docente_id')) {
            $carga = (clone $base)
                ->where('id', session('carga_docente_id'))
                ->first();

            if ($carga) {
                return $carga;
            }
        }

        if (session('ambiente_id') && session('grado_id') && session('grupo_id')) {
            $carga = (clone $base)
                ->where('ambiente_id', session('ambiente_id'))
                ->where('grado_id', session('grado_id'))
                ->where('grupo_id', session('grupo_id'))
                ->first();

            if ($carga) {
                session(['carga_docente_id' => $carga->id]);

                return $carga;
            }
        }

        return null;
    }

    /**
     * @param  array{modulo_id:int,eje_id:int,tematica_id:int,experiencia_id:int}  $datos
     */
    private function validarCadenaCurricular(CargaDocente $carga, array $datos, Experiencia $experiencia): ?string
    {
        $tematica = $experiencia->tematica;
        $eje = $tematica?->eje;
        $modulo = $eje?->modulo;

        if (! $tematica || ! $eje || ! $modulo) {
            return 'La experiencia no tiene una cadena curricular completa.';
        }

        if ((int) $experiencia->tematica_id !== (int) $datos['tematica_id']) {
            return 'La experiencia no pertenece a la temática seleccionada.';
        }

        if ((int) $tematica->eje_id !== (int) $datos['eje_id']) {
            return 'La temática no pertenece al eje seleccionado.';
        }

        if ((int) $eje->modulo_id !== (int) $datos['modulo_id']) {
            return 'El eje no pertenece al módulo seleccionado.';
        }

        if ((int) $modulo->ambiente_id !== (int) $carga->ambiente_id) {
            return 'El módulo no pertenece al ambiente de la carga seleccionada.';
        }

        return null;
    }

    /**
     * Experiencias ya vinculadas a una clase por carga (mismo docente y año).
     *
     * @return array<int|string, list<int>>
     */
    private function experienciasUsadasPorCarga(CargaDocente $carga, Collection $gruposReplica): array
    {
        $cargaIds = $gruposReplica
            ->pluck('carga_docente_id')
            ->unique()
            ->values();

        if ($cargaIds->isEmpty()) {
            return [];
        }

        return Clase::query()
            ->whereIn('carga_docente_id', $cargaIds)
            ->where('docente_id', $carga->docente_id)
            ->where('anio_lectivo', $carga->anio_lectivo)
            ->get(['carga_docente_id', 'experiencia_id'])
            ->groupBy('carga_docente_id')
            ->map(fn (Collection $filas) => $filas->pluck('experiencia_id')->unique()->values()->all())
            ->all();
    }

    /**
     * Grupos del mismo grado/ambiente donde el docente tiene carga activa.
     *
     * @return Collection<int, array{carga_docente_id:int,grupo_id:int,nombre:string,es_actual:bool}>
     */
    private function gruposReplicaDelGrado(CargaDocente $carga): Collection
    {
        return CargaDocente::query()
            ->with('grupo:id,nombre')
            ->where('docente_id', $carga->docente_id)
            ->where('ambiente_id', $carga->ambiente_id)
            ->where('grado_id', $carga->grado_id)
            ->where('activo', true)
            ->where('anio_lectivo', $carga->anio_lectivo)
            ->orderBy('grupo_id')
            ->get()
            ->map(fn (CargaDocente $item) => [
                'carga_docente_id' => (int) $item->id,
                'grupo_id' => (int) $item->grupo_id,
                'nombre' => $item->grupo->nombre ?? ('Grupo '.$item->grupo_id),
                'es_actual' => (int) $item->id === (int) $carga->id,
            ])
            ->values();
    }

    /**
     * Árbol ambiente → módulos → ejes (mismo criterio que el catálogo de experiencias).
     */
    private function arbolCurriculoAmbiente(int $ambienteId, int $institucionId): Collection
    {
        $ambiente = Ambiente::query()
            ->where('id', $ambienteId)
            ->whereHas(
                'instituciones',
                fn ($q) => $q
                    ->where('instituciones.id', $institucionId)
                    ->where('ambiente_institucion.activo', true)
            )
            ->first();

        if (! $ambiente) {
            return collect();
        }

        $oficiales = Modulo::query()
            ->oficiales()
            ->where('activo', true)
            ->where('ambiente_id', $ambiente->id)
            ->whereHas(
                'instituciones',
                fn ($q) => $q
                    ->where('instituciones.id', $institucionId)
                    ->where('modulo_institucion.activo', true)
            )
            ->orderBy('orden')
            ->get()
            ->map(fn (Modulo $modulo) => [
                'modelo' => $modulo,
                'es_propio' => false,
            ]);

        $propios = Modulo::query()
            ->deInstitucion($institucionId)
            ->where('ambiente_id', $ambiente->id)
            ->where('activo', true)
            ->orderBy('orden')
            ->get()
            ->map(fn (Modulo $modulo) => [
                'modelo' => $modulo,
                'es_propio' => true,
            ]);

        $items = $oficiales->concat($propios)
            ->sortBy(fn ($item) => $item['modelo']->orden)
            ->values();

        $moduloIds = $items->pluck('modelo.id')->unique()->values();

        $ejesPorModulo = $moduloIds->isEmpty()
            ? collect()
            : Eje::query()
                ->whereIn('modulo_id', $moduloIds)
                ->where(function ($q) use ($institucionId) {
                    $q->where(fn ($oficial) => $oficial->oficiales())
                        ->orWhere(fn ($propio) => $propio->deInstitucion($institucionId));
                })
                ->orderBy('orden')
                ->get()
                ->groupBy('modulo_id');

        $items = $items->map(function (array $item) use ($ejesPorModulo, $institucionId) {
            $modulo = $item['modelo'];
            $ejes = ($ejesPorModulo->get($modulo->id) ?? collect())->values();

            $item['ejes_oficiales'] = $ejes->filter(fn (Eje $eje) => $eje->esOficial())->values();
            $item['ejes_propios'] = $ejes->filter(fn (Eje $eje) => $eje->esDeInstitucion($institucionId))->values();

            return $item;
        })->values();

        $ambiente->setRelation('modulosInstitucion', $items);

        return collect([$ambiente]);
    }

    private function institucionId(): int
    {
        $id = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;

        abort_unless($id, 403, 'No hay institución en sesión.');

        return (int) $id;
    }
}
