<?php

return [
    'slug' => env('AMBIENTE_SLUG', 'musica'),

    /*
    | Alias legacy del nodo → slug real en tabla ambientes.
    | routes/ambientes/{slug}.php usa el alias; la BD usa el slug canónico.
    */
    'slugs_bd' => [
        'musica' => 'expresion-artistica',
        'logico' => 'multisaberes',
    ],
];
