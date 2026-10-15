<?php

return [
    /*
    | Slug del ambiente que atiende este nodo. Debe ser uno de `slugs`.
    | Sin valor por defecto: un nodo sin configurar no debe hacerse pasar por otro ambiente.
    */
    'slug' => env('AMBIENTE_SLUG'),

    /*
    | Los 5 ambientes fijos de PedNia (mismos slugs que la tabla ambientes).
    */
    'slugs' => [
        'expresion-artistica',
        'polimotor',
        'multisaberes',
        'multisensorial',
        'tecnologia',
    ],

    /*
    | En local (o con AMBIENTE_PRIORIZAR_SLUG=true) usa AMBIENTE_SLUG aunque la IP
    | del nodo coincida con otro ambiente en ambiente_institucion (pruebas en dev).
    | En producción la IP del pivot es la fuente de verdad.
    */
    'priorizar_slug' => env('AMBIENTE_PRIORIZAR_SLUG', env('APP_ENV') === 'local'),

    /*
    | IP simulada en local cuando la tablet solo alcanza una IP del PC.
    | Ej.: AMBIENTE_NODO_IP=192.168.1.14 → Multisensorial (según ambiente_institucion).
    | ?nodo_ip= en la URL tiene prioridad y actualiza la sesión.
    */
    'nodo_ip_local' => env('AMBIENTE_NODO_IP'),
];
