<?php

namespace App\View\Composers;

use App\Models\Estudiante;
use App\Services\AdaptacionKioscoService;
use Illuminate\View\View;

class ParametrosKioscoComposer
{
    public function __construct(
        private AdaptacionKioscoService $adaptacion,
    ) {}

    public function compose(View $view): void
    {
        $request = request();
        $estudiante = $request->attributes->get('estudiante_nino');

        if ($estudiante instanceof Estudiante) {
            $payload = $this->adaptacion->asegurarEnSesion($request, $estudiante);
        } else {
            $payload = $this->adaptacion->obtenerDeSesion($request)
                ?? $this->adaptacion->payloadInactivo();
        }

        $view->with('kioscoPerfil', $payload);
    }
}
