<?php

namespace App\Services\Docente;

class MonitorSesionService
{
    public function obtenerEstudiantesConectados(CargaDocente $carga)
    {
        return $carga->estudiantes->where('conectado', true);
    }
}
