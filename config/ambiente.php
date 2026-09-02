<?php

return [
    'slug' => env('AMBIENTE_SLUG', 'musica'),

    /*
    | En local (o con AMBIENTE_PRIORIZAR_SLUG=true) usa AMBIENTE_SLUG aunque la IP
    | del nodo coincida con otro ambiente en ambiente_institucion (pruebas en dev).
    | En producción la IP del pivot es la fuente de verdad.
    */
    'priorizar_slug' => env('AMBIENTE_PRIORIZAR_SLUG', env('APP_ENV') === 'local'),

    /*
    | Alias legacy del nodo → slug real en tabla ambientes.
    | routes/ambientes/{slug}.php usa el alias; la BD usa el slug canónico.
    */
    'slugs_bd' => [
        'musica' => 'expresion-artistica',
        'logico' => 'multisaberes',
    ],

    /*
    | IP simulada en local cuando la tablet solo alcanza una IP del PC.
    | Ej.: AMBIENTE_NODO_IP=192.168.1.14 → Multisensorial (según ambiente_institucion).
    | ?nodo_ip= en la URL tiene prioridad y actualiza la sesión.
    */
    'nodo_ip_local' => env('AMBIENTE_NODO_IP'),
];
