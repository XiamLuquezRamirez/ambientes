<?php

namespace App\Http\Controllers\Concerns;

use App\Services\JuegoCatalogoService;

trait RespondeCatalogoJuegos
{
    /**
     * @param  array<string, mixed>  $datos
     */
    protected function respuestaCatalogoJuegosJson(array $datos, JuegoCatalogoService $catalogo): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'juegos' => $catalogo->serializarColeccionJson($datos['juegos']->getCollection()),
                'pagination' => [
                    'current_page' => $datos['juegos']->currentPage(),
                    'last_page' => $datos['juegos']->lastPage(),
                    'per_page' => $datos['juegos']->perPage(),
                    'total' => $datos['juegos']->total(),
                ],
                'estadisticas' => $datos['estadisticas'] ?? null,
            ],
        ]);
    }
}
