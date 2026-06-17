<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AmbienteAdminController extends Controller
{
    public function listar()
    {
        $ambientes = Ambiente::withCount([
            'gradosHabilitados',
            'grupos' => fn($q) => $q->where('activo', true)->where('anio_lectivo', date('Y')),
        ])
        ->with('gradosHabilitados')
        ->orderBy('nombre')
        ->get();

        return view('admin.ambientes.index', compact('ambientes'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:255',
            'slug'        => 'required|string|max:255|unique:ambientes,slug',
            'color_hex'   => 'required|string|max:9',
            'icono'       => 'required|string|max:255',
            'servidor_ip' => 'nullable|ip',
        ]);

        $datos['activo'] = true;
        Ambiente::create($datos);

        if ($request->ajax()) {
            return response()->json(['ok' => true, 'mensaje' => 'Ambiente creado exitosamente.']);
        }

        return redirect()->route('admin.ambientes')->with('success', 'Ambiente creado exitosamente.');
    }

    public function actualizar(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:255',
            'slug'        => 'required|string|max:255|unique:ambientes,slug,' . $ambiente->id,
            'color_hex'   => 'required|string|max:9',
            'icono'       => 'required|string|max:255',
            'servidor_ip' => 'nullable|ip',
        ]);

        $ambiente->update($datos);

        if ($request->ajax()) {
            return response()->json(['ok' => true, 'mensaje' => 'Ambiente actualizado exitosamente.']);
        }

        return redirect()->route('admin.ambientes')->with('success', 'Ambiente actualizado exitosamente.');
    }

    public function toggleActivo(Ambiente $ambiente)
    {
        $ambiente->update(['activo' => !$ambiente->activo]);

        return response()->json([
            'activo'  => $ambiente->activo,
            'mensaje' => $ambiente->activo ? 'Ambiente activado.' : 'Ambiente desactivado.',
        ]);
    }

    public function verificarConexion(Ambiente $ambiente)
    {
        return response()->json(['ok' => false, 'mensaje' => 'Pendiente de implementación.'], 501);
    }
}
