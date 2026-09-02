<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\RespondeCatalogoJuegos;
use App\Http\Controllers\Controller;
use App\Services\JuegoCatalogoService;
use Illuminate\Http\Request;

class JuegosSuperAdminController extends Controller
{
    use RespondeCatalogoJuegos;
    public function __construct(
        private JuegoCatalogoService $catalogo,
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
}
