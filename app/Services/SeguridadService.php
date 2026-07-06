<?php

namespace App\Services;

use App\Enums\SeguridadAccion;
use App\Models\SeguridadLog;
use Illuminate\Http\Request;

class SeguridadService
{
    /**
     * Registra una acción de seguridad en seguridad_logs.
     *
     * @param  int  $userId  Usuario afectado por la acción.
     * @param  int|null  $actorId  Usuario que ejecutó la acción (admin autenticado).
     * @param  string|null  $registroAfectado  Nombre o referencia legible del registro (ej. nombre del usuario creado).
     */
    public static function registrar(
        int $userId,
        ?int $actorId,
        SeguridadAccion $accion,
        string $descripcion,
        ?Request $request = null,
        ?string $registroAfectado = null,
    ): void {

        SeguridadLog::create([
            'user_id' => $userId,
            'actor_user_id' => $actorId,
            'accion' => $accion,
            'descripcion' => $descripcion,
            'registro_afectado' => $registroAfectado,
            'ip' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
