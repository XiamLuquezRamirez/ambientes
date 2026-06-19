<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Modulo;
use Illuminate\Http\Request;

class AmbienteAdminController extends Controller
{
    public function listar()
    {
        $ambientes = Ambiente::withCount([
            'gradosHabilitados',
            'estudiantesAmbiente as estudiantes_count' => fn($q) => $q->where('anio_lectivo', date('Y')),
            'cargasDocente' => fn($q) => $q->where('activo', true)->where('anio_lectivo', date('Y')),
            'modulos',
            'modulos as modulos_activos_count' => fn($q) => $q->where('activo', true),
        ])
        ->with('gradosHabilitados')
        ->orderBy('nombre')
        ->get();

        return view('admin.ambientes.index', compact('ambientes'));
    }

    public function actualizarIp(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate(['servidor_ip' => 'nullable|ip']);
        $ambiente->update(['servidor_ip' => $datos['servidor_ip'] ?? null]);

        return response()->json(['ok' => true, 'servidor_ip' => $ambiente->servidor_ip]);
    }

    public function actualizarCupo(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate(['cupo_defecto' => 'required|integer|min:1|max:100']);
        $ambiente->update($datos);

        return response()->json(['ok' => true, 'cupo_defecto' => $ambiente->cupo_defecto]);
    }

    public function verificarConexion(Ambiente $ambiente)
    {
        $ip = $ambiente->servidor_ip;

        if (!$ip) {
            return response()->json(['ok' => false, 'mensaje' => 'IP no configurada para este ambiente.']);
        }

        $socket = @fsockopen($ip, 80, $errno, $errstr, 2);
        $enLinea = false;

        if ($socket) {
            fclose($socket);
            $enLinea = true;
        }

        return response()->json([
            'ok'     => $enLinea,
            'mensaje' => $enLinea ? "Servidor {$ip} en línea." : "Servidor {$ip} sin respuesta.",
        ]);
    }

    public function docentesDelPeriodo(Ambiente $ambiente)
    {
        $cargas = $ambiente->cargasDocente()
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->with(['docente.user', 'grado', 'grupo'])
            ->get();

        $docentes = $cargas->map(fn($c) => [
            'nombre' => $c->docente->user->nombre ?? '—',
            'email'  => $c->docente->user->email  ?? '—',
            'grado'  => $c->grado?->nombre         ?? '—',
            'grupo'  => $c->grupo?->nombre         ?? '—',
        ]);

        return response()->json(['ok' => true, 'docentes' => $docentes]);
    }

    public function modulos(Ambiente $ambiente)
    {
        $modulos = $ambiente->modulos()
            ->get(['id', 'nombre', 'icono', 'orden', 'activo', 'visible_estudiantes']);

        return response()->json(['ok' => true, 'modulos' => $modulos]);
    }

    public function toggleModulo(Request $request, Ambiente $ambiente, Modulo $modulo)
    {
        $campo = $request->validate(['campo' => 'required|in:activo,visible_estudiantes'])['campo'];
        $modulo->update([$campo => !$modulo->$campo]);

        return response()->json(['ok' => true, $campo => (bool) $modulo->$campo]);
    }
}
