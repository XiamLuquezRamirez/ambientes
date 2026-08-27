<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SeguridadAccion;
use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Modulo;
use App\Services\SeguridadService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AmbienteAdminController extends Controller
{
    /**
     * Lista los ambientes contratados por la institución del administrador.
     *
     * IP/puerto vienen del pivot ambiente_institucion. Conteos de estudiantes,
     * docentes y módulos se limitan a esa institución.
     */
    public function listar()
    {
        $institucionId = $this->institucionId();

        $ambientes = Ambiente::whereHas('instituciones', function ($q) use ($institucionId) {
            $q->where('instituciones.id', $institucionId)
                ->where('ambiente_institucion.activo', true);
        })
            ->with([
                'gradosHabilitados',
                'instituciones' => function ($q) use ($institucionId) {
                    $q->where('instituciones.id', $institucionId);
                },
            ])
            ->withCount([
                'gradosHabilitados',
                'estudiantesAmbiente as estudiantes_count' => fn ($q) => $q
                    ->where('anio_lectivo', date('Y'))
                    ->whereHas('estudiante', fn ($e) => $e->where('institucion_id', $institucionId)),
                'cargasDocente' => fn ($q) => $q
                    ->where('activo', true)
                    ->where('anio_lectivo', date('Y'))
                    ->whereHas('docente.user', fn ($u) => $u->where('institucion_id', $institucionId)),
            ])
            ->orderBy('nombre')
            ->get();

        $conteosModulos = $this->conteosModulosPorAmbiente($ambientes->pluck('id'), $institucionId);

        foreach ($ambientes as $ambiente) {
            $vinculo = $ambiente->instituciones->first();
            $ambiente->setAttribute('servidor_ip', $vinculo?->pivot?->ip);
            $ambiente->setAttribute('servidor_puerto', $vinculo?->pivot?->puerto);

            $conteo = $conteosModulos[$ambiente->id] ?? ['total' => 0, 'activos' => 0];
            $ambiente->modulos_count = $conteo['total'];
            $ambiente->modulos_activos_count = $conteo['activos'];
        }

        return view('admin.ambientes.index', compact('ambientes'));
    }

    /**
     * Actualiza la IP del servidor del ambiente para la institución en sesión.
     */
    public function actualizarIp(Request $request, Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $datos = $request->validate(['servidor_ip' => 'nullable|ip']);
        $ip = $datos['servidor_ip'] ?? null;

        $ambiente->instituciones()->updateExistingPivot($institucionId, [
            'ip' => $ip,
            'updated_at' => now(),
        ]);

        SeguridadService::registrar(
            Auth::guard('docente')->id(),
            Auth::guard('docente')->id(),
            SeguridadAccion::AMBIENTE_EDITED,
            'IP del servidor actualizada.',
            $request,
            $ambiente->nombre,
        );

        return response()->json(['ok' => true, 'servidor_ip' => $ip]);
    }

    /**
     * Actualiza el cupo predeterminado de un ambiente.
     *
     * Valida que el valor sea un entero entre 1 y 100.
     */
    public function actualizarCupo(Request $request, Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $datos = $request->validate(['cupo_defecto' => 'required|integer|min:1|max:100']);
        $ambiente->update($datos);

        SeguridadService::registrar(
            Auth::guard('docente')->id(),
            Auth::guard('docente')->id(),
            SeguridadAccion::AMBIENTE_EDITED,
            'Cupo predeterminado actualizado.',
            $request,
            $ambiente->nombre,
        );

        return response()->json(['ok' => true, 'cupo_defecto' => $ambiente->cupo_defecto]);
    }

    /**
     * Verifica si el servidor del ambiente (IP de la institución) responde en el puerto HTTP.
     */
    public function verificarConexion(Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $vinculo = $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);
        $ip = $vinculo->pivot->ip;
        $puerto = (int) ($vinculo->pivot->puerto ?: 80);

        if (! $ip) {
            return response()->json(['ok' => false, 'mensaje' => 'IP no configurada para este ambiente.']);
        }

        $socket = @fsockopen($ip, $puerto, $errno, $errstr, 2);
        $enLinea = false;

        if ($socket) {
            fclose($socket);
            $enLinea = true;
        }

        return response()->json([
            'ok' => $enLinea,
            'mensaje' => $enLinea ? "Servidor {$ip} en línea." : "Servidor {$ip} sin respuesta.",
        ]);
    }

    /**
     * Docentes de la institución asignados al ambiente en el periodo actual.
     */
    public function docentesDelPeriodo(Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $cargas = $ambiente->cargasDocente()
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->whereHas('docente.user', fn ($u) => $u->where('institucion_id', $institucionId))
            ->with(['docente.user', 'grado', 'grupo'])
            ->get();

        $docentes = $cargas->map(fn ($c) => [
            'nombre' => $c->docente->user->nombre ?? '—',
            'email' => $c->docente->user->email ?? '—',
            'grado' => $c->grado?->nombre ?? '—',
            'grupo' => $c->grupo?->nombre ?? '—',
        ]);

        return response()->json(['ok' => true, 'docentes' => $docentes]);
    }

    /**
     * Módulos del ambiente para la institución (oficiales vinculados + propios).
     */
    public function modulos(Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $modulos = $this->modulosDeInstitucion($ambiente->id, $institucionId);

        return response()->json(['ok' => true, 'modulos' => $modulos->values()]);
    }

    /**
     * Alterna estado de módulo para la institución:
     * - Oficiales: solo `modulo_institucion.activo` (no toca el catálogo del superAdmin).
     * - Propios: `activo` / `visible_estudiantes` del módulo local.
     */
    public function activarModulo(Request $request, Ambiente $ambiente, Modulo $modulo)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        if ((int) $modulo->ambiente_id !== (int) $ambiente->id) {
            abort(404);
        }

        $campo = $request->validate(['campo' => 'required|in:activo,visible_estudiantes'])['campo'];

        if ($modulo->esOficial()) {
            if ($campo !== 'activo') {
                return response()->json([
                    'ok' => false,
                    'mensaje' => 'En módulos oficiales solo puede activar o desactivar para su institución.',
                ], 422);
            }

            if (! $modulo->activo) {
                return response()->json([
                    'ok' => false,
                    'mensaje' => 'Este módulo oficial está desactivado en el catálogo.',
                ], 422);
            }

            $vinculo = DB::table('modulo_institucion')
                ->where('modulo_id', $modulo->id)
                ->where('institucion_id', $institucionId)
                ->first();

            if (! $vinculo) {
                return response()->json([
                    'ok' => false,
                    'mensaje' => 'Este módulo no está asignado a su institución.',
                ], 403);
            }

            $nuevo = ! (bool) $vinculo->activo;

            DB::table('modulo_institucion')
                ->where('modulo_id', $modulo->id)
                ->where('institucion_id', $institucionId)
                ->update([
                    'activo' => $nuevo,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'ok' => true,
                'activo' => $nuevo,
                'puede_gestionar' => true,
                'puede_toggle_activo' => true,
                'puede_toggle_visible' => false,
            ]);
        }

        if (! $modulo->esDeInstitucion($institucionId)) {
            abort(403, 'Solo puede gestionar módulos de su institución.');
        }

        if ($campo === 'visible_estudiantes' && ! $modulo->activo) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'Active el módulo antes de cambiar la visibilidad.',
            ], 422);
        }

        $modulo->update([$campo => ! $modulo->$campo]);
        $modulo->refresh();

        return response()->json([
            'ok' => true,
            $campo => (bool) $modulo->$campo,
            'activo' => (bool) $modulo->activo,
            'puede_gestionar' => (bool) $modulo->activo,
            'puede_toggle_activo' => true,
            'puede_toggle_visible' => (bool) $modulo->activo,
        ]);
    }

    public function listado()
    {
        $institucionId = $this->institucionId();

        return response()->json(
            Ambiente::select('id', 'nombre', 'icono')
                ->whereHas('instituciones', function ($q) use ($institucionId) {
                    $q->where('instituciones.id', $institucionId)
                        ->where('ambiente_institucion.activo', true);
                })
                ->orderBy('nombre')
                ->get()
        );
    }

    public function gradoslistado(Request $request, Ambiente $ambiente)
    {
        $institucionId = $this->institucionId();
        $this->asegurarAmbienteDeInstitucion($ambiente, $institucionId);

        $anio = $request->anio_lectivo ?? date('Y');

        $grados = $ambiente->gradosHabilitados()
            ->whereHas('grupos', function ($q) use ($anio, $ambiente) {

                $q->where('anio_lectivo', $anio)
                    ->where('activo', true)
                    // Solo se excluyen los grupos ocupados en este ambiente; el mismo grupo puede usarse en otros ambientes.
                    ->whereDoesntHave('cargasDocente', function ($sub) use ($anio, $ambiente) {

                        $sub->where('anio_lectivo', $anio)
                            ->where('ambiente_id', $ambiente->id)
                            ->where('activo', true);

                    });

            })
            ->select('grados.id', 'grados.nombre')
            ->orderBy('orden')
            ->get();

        return response()->json($grados);
    }

    /**
     * @param  Collection<int, int|string>  $ambienteIds
     * @return array<int, array{total: int, activos: int}>
     */
    private function conteosModulosPorAmbiente(Collection $ambienteIds, int $institucionId): array
    {
        if ($ambienteIds->isEmpty()) {
            return [];
        }

        $conteos = [];
        foreach ($ambienteIds as $id) {
            $conteos[(int) $id] = ['total' => 0, 'activos' => 0];
        }

        foreach ($this->modulosDeInstitucion($ambienteIds, $institucionId) as $modulo) {
            $ambienteId = (int) $modulo['ambiente_id'];
            if (! isset($conteos[$ambienteId])) {
                continue;
            }
            $conteos[$ambienteId]['total']++;
            if ($modulo['disponible']) {
                $conteos[$ambienteId]['activos']++;
            }
        }

        return $conteos;
    }

    /**
     * @param  int|Collection<int, int|string>  $ambienteId
     */
    private function modulosDeInstitucion(int|Collection $ambienteId, int $institucionId): Collection
    {
        $ids = $ambienteId instanceof Collection
            ? $ambienteId->map(fn ($id) => (int) $id)->values()
            : collect([(int) $ambienteId]);

        if ($ids->isEmpty()) {
            return collect();
        }

        $oficiales = Modulo::query()
            ->oficiales()
            ->where('activo', true)
            ->whereIn('ambiente_id', $ids)
            ->whereHas(
                'instituciones',
                fn ($q) => $q->where('instituciones.id', $institucionId)
            )
            ->with([
                'instituciones' => fn ($q) => $q->where('instituciones.id', $institucionId),
            ])
            ->orderBy('orden')
            ->get(['id', 'ambiente_id', 'nombre', 'icono', 'orden', 'activo', 'visible_estudiantes', 'es_oficial', 'institucion_id'])
            ->map(function (Modulo $modulo) {
                $activoInstitucion = (bool) optional($modulo->instituciones->first())->pivot?->activo;

                return [
                    'id' => $modulo->id,
                    'ambiente_id' => $modulo->ambiente_id,
                    'nombre' => $modulo->nombre,
                    'icono' => $modulo->icono,
                    'orden' => $modulo->orden,
                    'activo' => $activoInstitucion,
                    'visible_estudiantes' => (bool) $modulo->visible_estudiantes,
                    'es_oficial' => true,
                    'disponible' => $activoInstitucion,
                    'puede_gestionar' => true,
                    'puede_toggle_activo' => true,
                    'puede_toggle_visible' => false,
                ];
            });

        $propios = Modulo::query()
            ->deInstitucion($institucionId)
            ->whereIn('ambiente_id', $ids)
            ->orderBy('orden')
            ->get(['id', 'ambiente_id', 'nombre', 'icono', 'orden', 'activo', 'visible_estudiantes', 'es_oficial', 'institucion_id'])
            ->map(function (Modulo $modulo) {
                $activo = (bool) $modulo->activo;

                return [
                    'id' => $modulo->id,
                    'ambiente_id' => $modulo->ambiente_id,
                    'nombre' => $modulo->nombre,
                    'icono' => $modulo->icono,
                    'orden' => $modulo->orden,
                    'activo' => $activo,
                    'visible_estudiantes' => (bool) $modulo->visible_estudiantes,
                    'es_oficial' => false,
                    'disponible' => $activo,
                    'puede_gestionar' => true,
                    'puede_toggle_activo' => true,
                    'puede_toggle_visible' => $activo,
                ];
            });

        return $oficiales
            ->concat($propios)
            ->sortBy('orden')
            ->values();
    }

    private function asegurarAmbienteDeInstitucion(Ambiente $ambiente, int $institucionId)
    {
        $vinculo = $ambiente->instituciones()
            ->where('instituciones.id', $institucionId)
            ->wherePivot('activo', true)
            ->first();

        if (! $vinculo) {
            abort(403, 'El ambiente no está activo para esta institución.');
        }

        return $vinculo;
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
