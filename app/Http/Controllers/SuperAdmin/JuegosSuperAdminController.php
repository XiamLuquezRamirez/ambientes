<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\RespondeCatalogoJuegos;
use App\Http\Controllers\Controller;
use App\Models\Juego;
use App\Services\JuegoCatalogoService;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Http\Request;

class JuegosSuperAdminController extends Controller
{
    use RespondeCatalogoJuegos;

    public function __construct(
        private JuegoCatalogoService $catalogo,
        private ParametrosPerfilAprendizajeService $parametrosPerfil,
    ) {}

    public function listar(Request $request)
    {
        $datos = $this->catalogo->listarDesdeRequest($request);

        if ($request->boolean('json')) {
            return $this->respuestaCatalogoJuegosJson($datos, $this->catalogo);
        }

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.catalogo.juegos.partials._grid', $datos)->render(),
            ]);
        }

        return view('superAdmin.catalogo.juegos.index', $datos);
    }

    public function preview(Juego $juego)
    {
        if (! $juego->urlPaquete()) {
            abort(404, 'Este juego no tiene paquete para vista previa.');
        }

        $rutaAbsoluta = public_path(trim((string) $juego->ruta, '/').'/index.html');
        if (! is_file($rutaAbsoluta)) {
            abort(404, 'No se encontró el index.html del paquete.');
        }

        $valores = $this->parametrosPerfil->valoresEstandar();

        return view('superAdmin.catalogo.juegos.preview', [
            'juego' => $juego,
            'urlPaquete' => $juego->urlPaquete(),
            'perfilPayload' => [
                'perfil_id' => 1,
                'perfil_clave' => 'estandar',
                'fuente' => 'preview_superadmin',
                'valores' => $valores,
            ],
        ]);
    }
}
