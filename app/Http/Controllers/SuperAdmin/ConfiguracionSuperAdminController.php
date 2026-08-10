<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Institucion;
use App\Models\Modulo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ConfiguracionSuperAdminController extends Controller
{
    /**
     * Listado de ambientes y módulos oficiales del catálogo del sistema.
     */
    public function index()
    {
        $ambientes = Ambiente::query()
            ->with([
                'modulosOficiales' => fn ($q) => $q->withCount([
                    'instituciones as instituciones_activas_count' => fn ($iq) => $iq
                        ->where('modulo_institucion.activo', true),
                    'temas as temas_activos_count' => fn ($tq) => $tq->where('activo', true),
                ]),
            ])
            ->withCount([
                'modulosOficiales',
                'modulosOficiales as modulos_oficiales_activos_count' => fn ($q) => $q->where('activo', true),
            ])
            ->orderBy('nombre')
            ->get();

        $totalInstituciones = Institucion::query()->where('activo', true)->count();

        return view('superAdmin.configuracion.index', compact('ambientes', 'totalInstituciones'));
    }

    public function mostrar(Modulo $modulo)
    {
        $this->asegurarOficial($modulo);

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

    public function store(Request $request, Ambiente $ambiente)
    {
        $datos = $this->validarModulo($request, $ambiente->id);

        $slug = $this->generarSlugUnico($datos['nombre'], $ambiente->id);
        $orden = $datos['orden'] ?? $this->siguienteOrden($ambiente->id);

        $modulo = DB::transaction(function () use ($ambiente, $datos, $slug, $orden) {
            $modulo = Modulo::create([
                'ambiente_id' => $ambiente->id,
                'institucion_id' => null,
                'nombre' => $datos['nombre'],
                'slug' => $slug,
                'descripcion' => $datos['descripcion'] ?? null,
                'orden' => $orden,
                'activo' => true,
                'visible_estudiantes' => true,
                'es_oficial' => true,
            ]);

            $this->vincularInstitucionesAmbiente($modulo, $ambiente->id);

            return $modulo;
        });

        $modulo->loadCount([
            'instituciones as instituciones_activas_count' => fn ($q) => $q
                ->where('modulo_institucion.activo', true),
            'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Módulo oficial creado correctamente.',
            'data' => $this->serializarModulo($modulo),
        ], 201);
    }

    public function update(Request $request, Modulo $modulo)
    {
        $this->asegurarOficial($modulo);

        $datos = $this->validarModulo($request, $modulo->ambiente_id, $modulo->id);

        $modulo->update([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
            'orden' => $datos['orden'] ?? $modulo->orden,
        ]);

        $modulo->refresh();
        $modulo->loadCount([
            'instituciones as instituciones_activas_count' => fn ($q) => $q
                ->where('modulo_institucion.activo', true),
            'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Módulo actualizado correctamente.',
            'data' => $this->serializarModulo($modulo),
        ]);
    }

    public function actualizarEstado(Modulo $modulo)
    {
        $this->asegurarOficial($modulo);

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

    public function mover(Request $request, Modulo $modulo)
    {
        $this->asegurarOficial($modulo);

        $datos = $request->validate([
            'direccion' => ['required', Rule::in(['arriba', 'abajo'])],
        ]);

        $vecino = Modulo::query()
            ->oficiales()
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

    private function serializarModulo(Modulo $modulo): array
    {
        return [
            'id' => $modulo->id,
            'ambiente_id' => $modulo->ambiente_id,
            'nombre' => $modulo->nombre,
            'slug' => $modulo->slug,
            'descripcion' => $modulo->descripcion,
            'orden' => (int) $modulo->orden,
            'activo' => (bool) $modulo->activo,
            'instituciones_activas_count' => (int) ($modulo->instituciones_activas_count ?? 0),
            'temas_activos_count' => (int) ($modulo->temas_activos_count ?? 0),
            'created_at' => $modulo->created_at?->translatedFormat('d M Y') ?? '—',
        ];
    }

    private function validarModulo(Request $request, int $ambienteId, ?int $moduloId = null): array
    {
        return $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('modulos', 'nombre')
                    ->where(fn ($q) => $q
                        ->where('ambiente_id', $ambienteId)
                        ->whereNull('institucion_id')
                        ->where('es_oficial', true))
                    ->ignore($moduloId),
            ],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'orden' => ['nullable', 'integer', 'min:0', 'max:255'],
        ], [
            'nombre.required' => 'El nombre del módulo es obligatorio.',
            'nombre.max' => 'El nombre no puede superar 100 caracteres.',
            'nombre.unique' => 'Ya existe un módulo oficial con ese nombre en este ambiente.',
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

    private function siguienteOrden(int $ambienteId): int
    {
        $max = (int) Modulo::query()
            ->oficiales()
            ->where('ambiente_id', $ambienteId)
            ->max('orden');

        return min(255, $max + 1);
    }

    private function vincularInstitucionesAmbiente(Modulo $modulo, int $ambienteId): void
    {
        $institucionIds = DB::table('ambiente_institucion')
            ->where('ambiente_id', $ambienteId)
            ->where('activo', true)
            ->pluck('institucion_id');

        if ($institucionIds->isEmpty()) {
            return;
        }

        $ahora = now();
        $filas = $institucionIds->map(fn ($id) => [
            'modulo_id' => $modulo->id,
            'institucion_id' => $id,
            'activo' => true,
            'created_at' => $ahora,
            'updated_at' => $ahora,
        ])->all();

        DB::table('modulo_institucion')->insertOrIgnore($filas);
    }

    private function asegurarOficial(Modulo $modulo): void
    {
        if (! $modulo->esOficial()) {
            abort(403, 'Solo se pueden gestionar módulos oficiales desde esta vista.');
        }
    }
}
