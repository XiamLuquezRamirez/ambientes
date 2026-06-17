<?php

namespace App\Traits;

use App\Models\SyncQueue;

trait Sincronizable
{
    public static function bootSincronizable(): void
    {
        $servidor = config('red.servidor_actual');
        if (!$servidor) {
            return;
        }

        foreach (['created', 'updated', 'deleted'] as $evento) {
            static::$evento(function ($modelo) use ($evento, $servidor) {
                SyncQueue::create([
                    'entidad'         => class_basename($modelo),
                    'entidad_id'      => $modelo->getKey(),
                    'accion'          => $evento,
                    'servidor_origen' => $servidor,
                    'payload'         => $evento !== 'deleted' ? $modelo->toArray() : [],
                    'estado'          => 'pendiente',
                ]);
            });
        }
    }
}
