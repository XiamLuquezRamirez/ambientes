<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Modulo;
use Illuminate\Http\Request;

class AmbienteAdminController extends Controller
{
    /**
     * Lista los ambientes configurados para el administrador.
     *
     * El listado incluye conteos relacionados de grados habilitados, estudiantes activos,
     * cargas docentes activas y módulos (incluyendo módulos activos).
     */
    public function listar()
    {
        $ambientes = Ambiente::withCount([
            'gradosHabilitados',
            'estudiantesAmbiente as estudiantes_count' => fn ($q) => $q->where('anio_lectivo', date('Y')),
            'cargasDocente' => fn ($q) => $q->where('activo', true)->where('anio_lectivo', date('Y')),
            'modulos',
            'modulos as modulos_activos_count' => fn ($q) => $q->where('activo', true),
        ])
            ->with('gradosHabilitados')
            ->orderBy('nombre')
            ->get();

        return view('admin.ambientes.index', compact('ambientes'));
    }

    /**
     * Actualiza la dirección IP del servidor asociado a un ambiente.
     *
     * Valida el campo como IP opcional y guarda el valor en el modelo.
     */
    public function actualizarIp(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate(['servidor_ip' => 'nullable|ip']);
        $ambiente->update(['servidor_ip' => $datos['servidor_ip'] ?? null]);

        return response()->json(['ok' => true, 'servidor_ip' => $ambiente->servidor_ip]);
    }

    /**
     * Actualiza el cupo predeterminado de un ambiente.
     *
     * Valida que el valor sea un entero entre 1 y 100.
     */
    public function actualizarCupo(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate(['cupo_defecto' => 'required|integer|min:1|max:100']);
        $ambiente->update($datos);

        return response()->json(['ok' => true, 'cupo_defecto' => $ambiente->cupo_defecto]);
    }

    /**
     * Verifica si el servidor del ambiente responde en el puerto HTTP 80.
     *
     * Retorna JSON con estado de conexión y mensaje legible.
     */
    public function verificarConexion(Ambiente $ambiente)
    {
        $ip = $ambiente->servidor_ip;

        if (! $ip) {
            return response()->json(['ok' => false, 'mensaje' => 'IP no configurada para este ambiente.']);
        }

        $socket = @fsockopen($ip, 80, $errno, $errstr, 2);
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
     * Devuelve la lista de docentes asignados a un ambiente en el periodo actual.
     *
     * Incluye relaciones de ambiente, grado y grupo para mostrar datos completos.
     */
    public function docentesDelPeriodo(Ambiente $ambiente)
    {
        $cargas = $ambiente->cargasDocente()
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
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
     * Devuelve los módulos disponibles de un ambiente.
     *
     * Se utiliza en la administración para gestionar visibilidad y activación.
     */
    public function modulos(Ambiente $ambiente)
    {
        $modulos = $ambiente->modulos()
            ->get(['id', 'nombre', 'icono', 'orden', 'activo', 'visible_estudiantes']);

        return response()->json(['ok' => true, 'modulos' => $modulos]);
    }

    /**
     * Alterna un campo booleano del módulo (activo o visible para estudiantes).
     */
    public function activarModulo(Request $request, Ambiente $ambiente, Modulo $modulo)
    {
        $campo = $request->validate(['campo' => 'required|in:activo,visible_estudiantes'])['campo'];
        $modulo->update([$campo => ! $modulo->$campo]);

        return response()->json(['ok' => true, $campo => (bool) $modulo->$campo]);
    }

    public function listado()
    {
        return response()->json(
            Ambiente::select('id', 'nombre', 'icono')
                ->orderBy('nombre')
                ->get()
        );
    }

    public function gradoslistado(Request $request, Ambiente $ambiente)
    {
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
}
