<?php

namespace App\Http\Controllers;

use App\Services\InfoCondicionesService;
use Illuminate\Http\Request;

class InfoCondicionesController extends Controller
{
    public function __construct(
        private readonly InfoCondicionesService $servicio
    ) {}

    public function index(Request $request)
    {
        $datos = $this->datosVista(
            $request->filled('condicion') ? $request->string('condicion')->toString() : null
        );

        $datos['infoCondiciones'] = $datos['condiciones'];
        $datos['infoCondicionesDetalle'] = $datos['condicionesDetalle'];
        $datos['infoCondicionesMapa'] = $datos['mapaContenidos'];
        $datos['infoCondicionesServicio'] = $datos['servicio'];

        return view('info-condiciones.index', $datos);
    }

    public function mostrar(string $slug)
    {
        if (! $this->servicio->slugEsValido($slug)) {
            abort(404);
        }

        if ($this->servicio->obtenerCondicion($slug) === null) {
            abort(404);
        }

        $datos = $this->datosVista($slug);
        $datos['infoCondiciones'] = $datos['condiciones'];
        $datos['infoCondicionesDetalle'] = $datos['condicionesDetalle'];
        $datos['infoCondicionesMapa'] = $datos['mapaContenidos'];
        $datos['infoCondicionesServicio'] = $datos['servicio'];

        return view('info-condiciones.index', $datos);
    }

    /**
     * @return array<string, mixed>
     */
    private function datosVista(?string $slugActivo = null): array
    {
        $condiciones = $this->servicio->listarCondiciones();
        $condicionesDetalle = [];

        foreach ($condiciones as $item) {
            $detalle = $this->servicio->obtenerCondicion($item['slug']);
            if ($detalle !== null) {
                $condicionesDetalle[$item['slug']] = $detalle;
            }
        }

        $condicionActiva = $slugActivo ? ($condicionesDetalle[$slugActivo] ?? null) : null;

        return [
            'condiciones' => $condiciones,
            'condicionesDetalle' => $condicionesDetalle,
            'condicionActiva' => $condicionActiva,
            'mapaContenidos' => $this->servicio->mapaContenidosBotones($condicionesDetalle),
            'servicio' => $this->servicio,
        ];
    }
}
