<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\RespondeCatalogoJuegos;
use App\Http\Controllers\Controller;
use App\Services\JuegoCatalogoService;
use Illuminate\Http\Request;

class JuegosAdminController extends Controller
{
    use RespondeCatalogoJuegos;
    public function __construct(
        private JuegoCatalogoService $catalogo,
    ) {}

    public function listar(Request $request)
    {
        $datos = $this->catalogo->listarDesdeRequest($request, true);

        return $this->respuestaCatalogoJuegosJson($datos, $this->catalogo);
    }
}
