<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Modulo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ModulosAdminController extends Controller
{
    public function mostrar(Modulo $modulo)
    {
        $this->asegurarModuloPropio($modulo);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $modulo->id,
                'ambiente_id' => $modulo->ambiente_id,
                'nombre' => $modulo->nombre,
                'slug' => $modulo->slug,
                'descripcion' => $modulo->descripcion,
                'orden' => $modulo->orden,
                'activo' => (bool) $modulo->activo,
            ],
        ]);
    }

    public function guardar(Request $request, Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $datos = $this->validarModulo($request, $ambiente->id, $institucionId);
        $slug = $this->generarSlugUnico($datos['nombre'], $ambiente->id);
        $orden = $datos['orden'] ?? $this->siguienteOrden($ambiente->id, $institucionId);

        $modulo = DB::transaction(function () use ($ambiente, $datos, $slug, $orden, $institucionId) {
            $modulo = Modulo::create([
                'ambiente_id' => $ambiente->id,
                'institucion_id' => $institucionId,
                'nombre' => $datos['nombre'],
                'slug' => $slug,
                'descripcion' => $datos['descripcion'] ?? null,
                'orden' => $orden,
                'activo' => true,
                'visible_estudiantes' => true,
                'es_oficial' => false,
            ]);

            DB::table('modulo_institucion')->insertOrIgnore([
                'modulo_id' => $modulo->id,
                'institucion_id' => $institucionId,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $modulo;
        });

        $modulo->loadCount([
            'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
            'temas as temas_count',
            'ejes as ejes_count',
            'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Módulo adicional creado correctamente.',
            'data' => $this->serializarModulo($modulo, true),
        ], 201);
    }

    public function actualizar(Request $request, Modulo $modulo)
    {
        $this->asegurarModuloPropio($modulo);
        $institucionId = $this->institucionId();

        $datos = $this->validarModulo($request, $modulo->ambiente_id, $institucionId, $modulo->id);

        $modulo->update([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $datos['orden'] ?? $modulo->orden,
        ]);

        $modulo->refresh();
        $modulo->loadCount([
            'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
            'temas as temas_count',
            'ejes as ejes_count',
            'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Módulo actualizado correctamente.',
            'data' => $this->serializarModulo($modulo, true),
        ]);
    }

    public function actualizarEstado(Modulo $modulo)
    {
        $this->asegurarModuloPropio($modulo);

        $modulo->activo = ! $modulo->activo;
        $modulo->save();

        return response()->json([
            'success' => true,
            'message' => $modulo->activo
                ? 'Módulo activado correctamente.'
                : 'Módulo desactivado correctamente.',
            'activo' => (bool) $modulo->activo,
        ]);
    }

    /**
     * Elimina un módulo adicional solo si no tiene ejes ni temáticas.
     * Si tiene contenido, responde ofreciendo desactivar (el contenido se conserva).
     */
    public function eliminar(Modulo $modulo)
    {
        $this->asegurarModuloPropio($modulo);

        $ejesCount = (int) $modulo->ejes()->count();
        $temasCount = (int) $modulo->temas()->count();

        if ($ejesCount > 0 || $temasCount > 0) {
            return response()->json([
                'success' => false,
                'can_delete' => false,
                'puede_desactivar' => (bool) $modulo->activo,
                'ejes_count' => $ejesCount,
                'temas_count' => $temasCount,
                'message' => 'No se puede eliminar: el módulo tiene ejes o temáticas. Puede desactivarlo para conservar el contenido.',
            ], 422);
        }

        $ambienteId = $modulo->ambiente_id;
        $moduloId = $modulo->id;

        DB::transaction(function () use ($modulo) {
            DB::table('modulo_institucion')->where('modulo_id', $modulo->id)->delete();
            $modulo->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Módulo eliminado correctamente.',
            'data' => [
                'id' => $moduloId,
                'ambiente_id' => $ambienteId,
            ],
        ]);
    }

    public function mover(Request $request, Modulo $modulo)
    {
        $this->asegurarModuloPropio($modulo);
        $institucionId = $this->institucionId();

        $datos = $request->validate([
            'direccion' => ['required', Rule::in(['arriba', 'abajo'])],
        ]);

        $vecino = Modulo::query()
            ->deInstitucion($institucionId)
            ->where('ambiente_id', $modulo->ambiente_id)
            ->when(
                $datos['direccion'] === 'arriba',
                fn ($q) => $q->where('orden', '<', $modulo->orden)->orderByDesc('orden'),
                fn ($q) => $q->where('orden', '>', $modulo->orden)->orderBy('orden')
            )
            ->first();

        if (! $vecino) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede mover el módulo en esa dirección.',
            ], 422);
        }

        DB::transaction(function () use ($modulo, $vecino) {
            $ordenActual = $modulo->orden;
            $modulo->update(['orden' => $vecino->orden]);
            $vecino->update(['orden' => $ordenActual]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado correctamente.',
            'data' => [
                'modulo_id' => $modulo->id,
                'orden' => $modulo->fresh()->orden,
                'vecino_id' => $vecino->id,
                'vecino_orden' => $vecino->fresh()->orden,
            ],
        ]);
    }

    public function serializarModulo(Modulo $modulo, bool $esPropio, ?bool $activoInstitucion = null): array
    {
        return [
            'id' => $modulo->id,
            'ambiente_id' => $modulo->ambiente_id,
            'nombre' => $modulo->nombre,
            'slug' => $modulo->slug,
            'descripcion' => $modulo->descripcion,
            'orden' => (int) $modulo->orden,
            'activo' => (bool) $modulo->activo,
            'es_oficial' => $modulo->esOficial(),
            'es_propio' => $esPropio,
            'activo_institucion' => $activoInstitucion ?? (bool) $modulo->activo,
            'puede_gestionar' => $esPropio,
            'puede_gestionar_ejes' => $esPropio
                ? (bool) $modulo->activo
                : ((bool) $modulo->activo && (bool) ($activoInstitucion ?? true)),
            'temas_activos_count' => (int) ($modulo->temas_activos_count ?? 0),
            'ejes_propios_count' => (int) ($modulo->ejes_propios_count ?? $modulo->ejes_count ?? 0),
            'ejes_count' => (int) ($modulo->ejes_count ?? $modulo->ejes_propios_count ?? 0),
            'temas_count' => (int) ($modulo->temas_count ?? 0),
            'created_at' => $modulo->created_at?->translatedFormat('d M Y') ?? '—',
        ];
    }

    private function validarModulo(Request $request, int $ambienteId, int $institucionId, ?int $moduloId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('modulos', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('ambiente_id', $ambienteId)
                        ->where('institucion_id', $institucionId)
                        ->where('es_oficial', false))
                    ->ignore($moduloId),
            ],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'orden' => ['nullable', 'integer', 'min:1', 'max:255'],
        ], [
            'nombre.required' => 'El nombre del módulo es obligatorio.',
            'nombre.max' => 'El nombre no puede superar 100 caracteres.',
            'nombre.unique' => 'Ya existe un módulo adicional con ese nombre en este ambiente.',
        ]);
    }

    private function generarSlugUnico(string $nombre, int $ambienteId, ?int $ignoreId = null): string
    {
        $base = Str::slug($nombre) ?: 'modulo';
        $slug = $base;
        $i = 2;

        while (
            Modulo::query()
                ->where('ambiente_id', $ambienteId)
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    private function siguienteOrden(int $ambienteId, int $institucionId): int
    {
        $max = Modulo::query()
            ->deInstitucion($institucionId)
            ->where('ambiente_id', $ambienteId)
            ->max('orden');

        if ($max === null) {
            return 1;
        }

        return min(255, (int) $max + 1);
    }

    private function asegurarModuloPropio(Modulo $modulo): void
    {
        $institucionId = $this->institucionId();

        if (! $modulo->esDeInstitucion($institucionId)) {
            abort(403, 'Solo puede gestionar módulos adicionales de su institución.');
        }

        $this->asegurarAmbienteDeInstitucion($modulo->ambiente, $institucionId);
    }

    private function asegurarAmbienteDeInstitucion(Ambiente $ambiente, int $institucionId): void
    {
        $vinculo = $ambiente->instituciones()
            ->where('instituciones.id', $institucionId)
            ->first();

        if (! $vinculo || ! $vinculo->pivot->activo) {
            abort(403, 'El ambiente no está activo para esta institución.');
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
