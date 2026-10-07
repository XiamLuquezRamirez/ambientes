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

        // `cola_sincronizacion.accion` es enum('create','update','delete','transfer').
        $acciones = ['created' => 'create', 'updated' => 'update', 'deleted' => 'delete'];

        foreach ($acciones as $evento => $accion) {
            static::$evento(function ($modelo) use ($evento, $accion, $servidor) {
                SyncQueue::create([
                    'entidad'         => class_basename($modelo),
                    'entidad_id'      => (string) $modelo->getKey(),
                    'accion'          => $accion,
                    'servidor_origen' => $servidor,
                    'payload'         => $evento !== 'deleted' ? $modelo->toArray() : [],
                    'estado'          => 'pendiente',
                ]);
            });
        }
    }
}
