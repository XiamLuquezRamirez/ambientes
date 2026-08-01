<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SuperAdmin\CondicionOrdenController;
use App\Http\Controllers\SuperAdmin\CondicionTransitoriaOrdenController;
use App\Models\Ambiente;
use App\Models\Institucion;
use App\Services\InstitucionLogoService;
use Illuminate\Http\Request;

class ConfiguracionAdminController extends Controller
{
    public function __construct(
        private InstitucionLogoService $logoService,
        private readonly CondicionOrdenController $condicionOrdenController,
        private readonly CondicionTransitoriaOrdenController $condicionTransitoriaOrdenController,
    ) {}

    public function listar()
    {
        $ambientes = Ambiente::all();
        $institucion = session('institucion_id');

        return view('admin.configuracion.index', compact('ambientes', 'institucion'));
    }

    public function actualizar(Request $request)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    /**
     * Datos de una institución para el modal de edición (incluye ambientes y logo público).
     */
    public function verDatosInstitucion($id)
    {
        $institucion = Institucion::with('ambientes')->findOrFail($id);

        $ambientes = $institucion->ambientes->map(function ($ambiente) {
            return [
                'id' => $ambiente->id,
                'nombre' => $ambiente->nombre,
                'ip' => $ambiente->pivot->ip,
                'puerto' => $ambiente->pivot->puerto,
                'activo' => (bool) $ambiente->pivot->activo,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $institucion->id,
                'nombre' => $institucion->nombre,
                'codigo_dane' => $institucion->codigo_dane,
                'municipio' => $institucion->municipio,
                'departamento' => $institucion->departamento,
                'correo_contacto' => $institucion->correo_contacto,
                'activo' => (bool) $institucion->activo,
                'logo' => $institucion->logo,
                'logo_url_publica' => $this->logoService->urlPublica($institucion->logo),
                'iniciales' => $this->logoService->iniciales($institucion),
                'ambientes' => $ambientes,
            ],
            'condiciones_orden' => $this->condicionOrdenController->listarPorInstitucion((int) $id),
            'condiciones_transitorias_orden' => $this->condicionTransitoriaOrdenController->listarPorInstitucion((int) $id),
        ]);
    }
}
