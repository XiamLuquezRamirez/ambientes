<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Modulo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EjesSuperAdminController extends Controller
{
    public function listar()
    {
        $ambientes = Ambiente::query()
            ->with([
                'modulosOficiales' => fn ($q) => $q
                    ->with([
                        'ejesOficiales' => fn ($eq) => $eq
                            ->withCount([
                                'tematicas as tematicas_oficiales_activas_count' => fn ($tq) => $tq
                                    ->where('activo', true)
                                    ->where('es_oficial', true),
                                'temas as temas_count',
                            ])
                            ->orderBy('orden'),
                    ])
                    ->orderBy('orden'),
            ])
            ->orderBy('nombre')
            ->get()
            ->each(function (Ambiente $ambiente) {
                $total = 0;
                $activos = 0;

                foreach ($ambiente->modulosOficiales as $modulo) {
                    $ejes = $modulo->ejesOficiales;
                    $modulo->ejes_total_count = $ejes->count();
                    $modulo->ejes_activos_count = $ejes->where('activo', true)->count();
                    $total += $modulo->ejes_total_count;
                    $activos += $modulo->ejes_activos_count;
                }

                $ambiente->ejes_total_count = $total;
                $ambiente->ejes_activos_count = $activos;
            });

        return view('superAdmin.catalogo.ejes.index', compact('ambientes'));
    }

    /**
     * Lista los ejes oficiales de un módulo.
     */
    public function listarPorModulo(Modulo $modulo)
    {
        $this->asegurarModuloOficial($modulo);

        $ejes = Eje::query()
            ->oficiales()
            ->where('modulo_id', $modulo->id)
            ->withCount([
                'tematicas as tematicas_oficiales_activas_count' => fn ($q) => $q
                    ->where('activo', true)
                    ->where('es_oficial', true),
                'temas as temas_count',
            ])
            ->orderBy('orden')
            ->get()
            ->map(fn (Eje $eje) => $this->serializarEje($eje));

        return response()->json([
            'success' => true,
            'data' => [
                'modulo' => [
                    'id' => $modulo->id,
                    'nombre' => $modulo->nombre,
                    'activo' => (bool) $modulo->activo,
                ],
                'ejes' => $ejes,
            ],
        ]);
    }

    public function guardar(Request $request, Modulo $modulo)
    {
        $this->asegurarModuloOficial($modulo);

        $datos = $this->validarEje($request, $modulo->id);
        $slug = $this->generarSlugUnico($datos['nombre'], $modulo->id);
        $orden = $datos['orden'] ?? $this->siguienteOrden($modulo->id);

        $eje = Eje::create([
            'modulo_id' => $modulo->id,
            'institucion_id' => null,
            'nombre' => $datos['nombre'],
            'slug' => $slug,
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $orden,
            'activo' => true,
            'es_oficial' => true,
        ]);

        $eje->loadCount([
            'tematicas as tematicas_oficiales_activas_count' => fn ($q) => $q
                ->where('activo', true)
                ->where('es_oficial', true),
            'temas as temas_count',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eje creado correctamente.',
            'data' => $this->serializarEje($eje),
        ], 201);
    }

    public function mostrar(Eje $eje)
    {
        $this->asegurarEjeOficial($eje);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $eje->id,
                'modulo_id' => $eje->modulo_id,
                'nombre' => $eje->nombre,
                'slug' => $eje->slug,
                'descripcion' => $eje->descripcion,
                'orden' => $eje->orden,
                'activo' => (bool) $eje->activo,
            ],
        ]);
    }

    public function actualizar(Request $request, Eje $eje)
    {
        $this->asegurarEjeOficial($eje);

        $datos = $this->validarEje($request, $eje->modulo_id, $eje->id);

        $eje->update([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $datos['orden'] ?? $eje->orden,
        ]);

        $eje->refresh();
        $eje->loadCount([
            'tematicas as tematicas_oficiales_activas_count' => fn ($q) => $q
                ->where('activo', true)
                ->where('es_oficial', true),
            'temas as temas_count',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Eje actualizado correctamente.',
            'data' => $this->serializarEje($eje),
        ]);
    }

    public function actualizarEstado(Eje $eje)
    {
        $this->asegurarEjeOficial($eje);

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

    public function mover(Request $request, Eje $eje)
    {
        $this->asegurarEjeOficial($eje);

        $datos = $request->validate([
            'direccion' => ['required', Rule::in(['arriba', 'abajo'])],
        ]);

        $vecino = Eje::query()
            ->oficiales()
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

    private function serializarEje(Eje $eje): array
    {
        return [
            'id' => $eje->id,
            'modulo_id' => $eje->modulo_id,
            'nombre' => $eje->nombre,
            'slug' => $eje->slug,
            'descripcion' => $eje->descripcion,
            'orden' => (int) $eje->orden,
            'activo' => (bool) $eje->activo,
            'es_oficial' => $eje->esOficial(),
            'puede_gestionar' => true,
            'tematicas_oficiales_activas_count' => (int) ($eje->tematicas_oficiales_activas_count ?? 0),
            'temas_count' => (int) ($eje->temas_count ?? 0),
        ];
    }

    private function validarEje(Request $request, int $moduloId, ?int $ejeId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('ejes', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('modulo_id', $moduloId)
                        ->whereNull('institucion_id')
                        ->where('es_oficial', true))
                    ->ignore($ejeId),
            ],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'orden' => ['nullable', 'integer', 'min:1', 'max:255'],
        ], [
            'nombre.required' => 'El nombre del eje es obligatorio.',
            'nombre.max' => 'El nombre no puede superar 100 caracteres.',
            'nombre.unique' => 'Ya existe un eje oficial con ese nombre en este módulo.',
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

    private function siguienteOrden(int $moduloId): int
    {
        $max = Eje::query()
            ->oficiales()
            ->where('modulo_id', $moduloId)
            ->max('orden');

        if ($max === null) {
            return 1;
        }

        return min(255, (int) $max + 1);
    }

    private function asegurarModuloOficial(Modulo $modulo): void
    {
        if (! $modulo->esOficial()) {
            abort(403, 'Solo se pueden gestionar ejes de módulos oficiales desde esta vista.');
        }
    }

    private function asegurarEjeOficial(Eje $eje): void
    {
        if (! $eje->esOficial()) {
            abort(403, 'Solo se pueden gestionar ejes oficiales desde esta vista.');
        }
    }
}
