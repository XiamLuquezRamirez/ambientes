<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Institucion;
use App\Services\InstitucionLogoService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ConfiguracionAdminController extends Controller
{
    public function __construct(
        private InstitucionLogoService $logoService,
    ) {}

    public function listar()
    {
        $institucion = Institucion::with('ambientes')->findOrFail($this->institucionId());
        $ambientes = $institucion->ambientes;

        return view('admin.configuracion.institucion.index', compact('ambientes', 'institucion'));
    }

    /**
     * Actualiza solo datos básicos de la institución de la sesión.
     * Servidores y módulos no se modifican desde el panel admin.
     */
    public function actualizar(Request $request)
    {
        $institucion = Institucion::findOrFail($this->institucionId());

        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20|unique:instituciones,codigo_dane,'.$institucion->id,
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'correo_contacto' => 'required|email|max:255',
        ]);

        if (! filled($institucion->logo)) {
            throw ValidationException::withMessages([
                'logo' => ['El logo de la institución es obligatorio. Suba uno antes de guardar.'],
            ]);
        }

        $institucion->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'Datos de la institución actualizados correctamente.',
        ]);
    }

    /**
     * Datos de la institución de la sesión (incluye ambientes y logo solo para lectura/visualización).
     */
    public function verDatosInstitucion($id)
    {
        $institucionId = $this->institucionId();

        if ((int) $id !== $institucionId) {
            abort(403, 'No autorizado.');
        }

        $institucion = Institucion::with('ambientes')->findOrFail($institucionId);

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
        ]);
    }

    /**
     * Sube o reemplaza el logo de la institución de la sesión.
     */
    public function subirLogo(Request $request)
    {
        $institucion = Institucion::findOrFail($this->institucionId());

        $request->validate([
            'logo' => 'required|file|mimes:jpeg,jpg,png|max:'.InstitucionLogoService::MAX_KILOBYTES,
        ]);

        try {
            $resultado = $this->logoService->guardar($institucion, $request->file('logo'));
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Logo actualizado correctamente.',
            'logo_url_publica' => $resultado['logo_url_publica'],
            'iniciales' => $resultado['iniciales'],
        ]);
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
