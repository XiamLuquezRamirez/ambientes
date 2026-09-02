<?php

namespace App\Services\Docente;

use App\Models\CargaDocente;

class MonitorSesionService
{
    public function obtenerEstudiantesConectados(CargaDocente $carga)
    {
        return $carga->estudiantes->where('conectado', true);
    }
}
