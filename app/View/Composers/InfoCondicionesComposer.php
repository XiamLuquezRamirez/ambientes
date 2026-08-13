<?php

namespace App\View\Composers;

use App\Services\InfoCondicionesService;
use Illuminate\View\View;

class InfoCondicionesComposer
{
    public function __construct(
        private readonly InfoCondicionesService $servicio
    ) {}

    public function compose(View $view): void
    {
        $condiciones = $this->servicio->listarCondiciones();
        $condicionesDetalle = [];

        foreach ($condiciones as $item) {
            $detalle = $this->servicio->obtenerCondicion($item['slug']);
            if ($detalle !== null) {
                $condicionesDetalle[$item['slug']] = $detalle;
            }
        }

        $view->with([
            'infoCondiciones' => $condiciones,
            'infoCondicionesDetalle' => $condicionesDetalle,
            'infoCondicionesMapa' => $this->servicio->mapaContenidosBotones($condicionesDetalle),
            'infoCondicionesServicio' => $this->servicio,
        ]);
    }
}
