<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Services\CatalogoInstitucionAdminService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EjesAdminController extends Controller
{
    public function listar(CatalogoInstitucionAdminService $catalogo)
    {
        $ambientesModulos = $catalogo->ambientesConModulosYEjes($this->institucionId());

        return view('admin.catalogo.ejes.index', compact('ambientesModulos'));
    }

    public function listarPorModulo(Modulo $modulo)
    {
        $institucionId = $this->institucionId();
        $this->asegurarModuloAccesible($modulo, $institucionId);
        $moduloActivo = $this->moduloActivoParaInstitucion($modulo, $institucionId);

        $ejes = Eje::query()
            ->where('modulo_id', $modulo->id)
            ->where(function ($q) use ($institucionId) {
                $q->where(fn ($oficial) => $oficial->oficiales())
                    ->orWhere(fn ($propio) => $propio->deInstitucion($institucionId));
            })
            ->withCount([
                'tematicas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
                'temas as temas_count',
            ])
            ->orderBy('orden')
            ->get()
            ->map(fn (Eje $eje) => $this->serializarEje($eje, $institucionId, $moduloActivo));

        return response()->json([
            'success' => true,
            'data' => [
                'modulo' => [
                    'id' => $modulo->id,
                    'nombre' => $modulo->nombre,
                    'es_oficial' => $modulo->esOficial(),
                    'activo_para_institucion' => $moduloActivo,
                ],
                'ejes' => $ejes,
            ],
        ]);
    }

    public function guardar(Request $request, Modulo $modulo)
    {
        $institucionId = $this->institucionId();
        $this->asegurarModuloAccesible($modulo, $institucionId, true);

        $datos = $this->validarEje($request, $modulo->id, $institucionId);
        $slug = $this->generarSlugUnico($datos['nombre'], $modulo->id);
        $orden = $datos['orden'] ?? $this->siguienteOrden($modulo->id, $institucionId);

        $eje = Eje::create([
            'modulo_id' => $modulo->id,
            'institucion_id' => $institucionId,
            'nombre' => $datos['nombre'],
            'slug' => $slug,
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $orden,
            'activo' => true,
            'es_oficial' => false,
        ]);

        $eje->loadCount([
            'tematicas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
            'temas as temas_count',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eje creado correctamente.',
            'data' => $this->serializarEje($eje, $institucionId, true),
        ], 201);
    }

    public function mostrar(Eje $eje)
    {
        $this->asegurarEjeGestionable($eje);

        $eje->loadCount([
            'tematicas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
            'temas as temas_count',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->serializarEje($eje, $this->institucionId(), true),
        ]);
    }

    public function actualizar(Request $request, Eje $eje)
    {
        $this->asegurarEjeGestionable($eje);
        $institucionId = $this->institucionId();

        $datos = $this->validarEje($request, $eje->modulo_id, $institucionId, $eje->id);

        $eje->update([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $datos['orden'] ?? $eje->orden,
        ]);

        $eje->refresh();
        $eje->loadCount([
            'tematicas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
            'temas as temas_count',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eje actualizado correctamente.',
            'data' => $this->serializarEje($eje, $institucionId, true),
        ]);
    }

    public function actualizarEstado(Eje $eje)
    {
        $this->asegurarEjeGestionable($eje);

        $eje->activo = ! $eje->activo;
        $eje->save();

        return response()->json([
            'success' => true,
            'message' => $eje->activo
                ? 'Eje activado correctamente.'
                : 'Eje desactivado correctamente.',
            'activo' => (bool) $eje->activo,
        ]);
    }

    /**
     * Elimina un eje del colegio solo si no tiene temáticas.
     * Si tiene contenido, responde ofreciendo desactivar.
     */
    public function eliminar(Eje $eje)
    {
        $this->asegurarEjeGestionable($eje);

        $temasCount = (int) $eje->temas()->count();

        if ($temasCount > 0) {
            return response()->json([
                'success' => false,
                'can_delete' => false,
                'puede_desactivar' => (bool) $eje->activo,
                'temas_count' => $temasCount,
                'message' => 'No se puede eliminar: el eje tiene temáticas. Puede desactivarlo para conservar el contenido.',
            ], 422);
        }

        $moduloId = $eje->modulo_id;
        $ejeId = $eje->id;
        $eje->delete();

        return response()->json([
            'success' => true,
            'message' => 'Eje eliminado correctamente.',
            'data' => [
                'id' => $ejeId,
                'modulo_id' => $moduloId,
            ],
        ]);
    }

    public function mover(Request $request, Eje $eje)
    {
        $this->asegurarEjeGestionable($eje);
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'direccion' => ['required', Rule::in(['arriba', 'abajo'])],
        ]);

        $vecino = Eje::query()
            ->deInstitucion($institucionId)
            ->where('modulo_id', $eje->modulo_id)
            ->when(
                $datos['direccion'] === 'arriba',
                fn ($q) => $q->where('orden', '<', $eje->orden)->orderByDesc('orden'),
                fn ($q) => $q->where('orden', '>', $eje->orden)->orderBy('orden')
            )
            ->first();

        if (! $vecino) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede mover el eje en esa dirección.',
            ], 422);
        }

        DB::transaction(function () use ($eje, $vecino) {
            $ordenActual = $eje->orden;
            $eje->update(['orden' => $vecino->orden]);
            $vecino->update(['orden' => $ordenActual]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado correctamente.',
            'data' => [
                'eje_id' => $eje->id,
                'orden' => $eje->fresh()->orden,
                'vecino_id' => $vecino->id,
                'vecino_orden' => $vecino->fresh()->orden,
            ],
        ]);
    }

    private function serializarEje(Eje $eje, int $institucionId, ?bool $moduloActivo = null): array
    {
        $esPropio = $eje->esDeInstitucion($institucionId);
        $activoModulo = $moduloActivo ?? $this->moduloActivoParaInstitucion($eje->modulo, $institucionId);

        return [
            'id' => $eje->id,
            'modulo_id' => $eje->modulo_id,
            'nombre' => $eje->nombre,
            'slug' => $eje->slug,
            'descripcion' => $eje->descripcion,
            'orden' => (int) $eje->orden,
            'activo' => (bool) $eje->activo,
            'es_oficial' => $eje->esOficial(),
            'es_propio' => $esPropio,
            'puede_gestionar' => $esPropio && $activoModulo,
            'tematicas_oficiales_activas_count' => (int) ($eje->tematicas_activas_count ?? 0),
            'temas_count' => (int) ($eje->temas_count ?? 0),
        ];
    }

    private function validarEje(Request $request, int $moduloId, int $institucionId, ?int $ejeId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('ejes', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('modulo_id', $moduloId)
                        ->where('institucion_id', $institucionId)
                        ->where('es_oficial', false))
                    ->ignore($ejeId),
            ],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'orden' => ['nullable', 'integer', 'min:1', 'max:255'],
        ], [
            'nombre.required' => 'El nombre del eje es obligatorio.',
            'nombre.max' => 'El nombre no puede superar 100 caracteres.',
            'nombre.unique' => 'Ya existe un eje del colegio con ese nombre en este módulo.',
        ]);
    }

    private function generarSlugUnico(string $nombre, int $moduloId, ?int $ignoreId = null): string
    {
        $base = Str::slug($nombre) ?: 'eje';
        $slug = $base;
        $i = 2;

        while (
            Eje::query()
                ->where('modulo_id', $moduloId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    private function siguienteOrden(int $moduloId, int $institucionId): int
    {
        $max = Eje::query()
            ->deInstitucion($institucionId)
            ->where('modulo_id', $moduloId)
            ->max('orden');

        if ($max === null) {
            return 1;
        }

        return min(255, (int) $max + 1);
    }

    private function asegurarModuloAccesible(Modulo $modulo, int $institucionId, bool $soloActivos = false): void
    {
        $this->asegurarAmbienteActivoContratado($modulo->ambiente_id, $institucionId);

        if ($modulo->esDeInstitucion($institucionId)) {
            if ($soloActivos && ! $modulo->activo) {
                abort(422, 'El módulo no está activo.');
            }

            return;
        }

        if (! $modulo->esOficial()) {
            abort(403, 'No puede gestionar este módulo.');
        }

        $vinculo = $modulo->instituciones()
            ->where('instituciones.id', $institucionId)
            ->wherePivot('activo', true)
            ->first();

        if (! $vinculo || ! $modulo->activo) {
            abort(403, 'Este módulo oficial no está activo para su institución.');
        }
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

    private function moduloActivoParaInstitucion(Modulo $modulo, int $institucionId): bool
    {
        if ($modulo->esDeInstitucion($institucionId)) {
            return (bool) $modulo->activo;
        }

        if (! $modulo->esOficial() || ! $modulo->activo) {
            return false;
        }

        return $modulo->instituciones()
            ->where('instituciones.id', $institucionId)
            ->wherePivot('activo', true)
            ->exists();
    }

    private function asegurarEjePropio(Eje $eje): void
    {
        $institucionId = $this->institucionId();

        if (! $eje->esDeInstitucion($institucionId)) {
            abort(403, 'Solo puede gestionar ejes propios de su institución.');
        }

        $this->asegurarAmbienteActivoContratado($eje->modulo->ambiente_id, $institucionId);
    }

    /** Eje propio + módulo activo para la institución. */
    private function asegurarEjeGestionable(Eje $eje): void
    {
        $this->asegurarEjePropio($eje);

        if (! $this->moduloActivoParaInstitucion($eje->modulo, $this->institucionId())) {
            abort(422, 'El módulo no está activo. Actívelo para gestionar ejes del colegio.');
        }
    }

    private function institucionId(): int
    {
        $id = session('institucion_id');

        if (! $id) {
            abort(403, 'No hay institución en sesión.');
        }

        return (int) $id;
    }
}
