<?php

return [
    'servidores' => [
        'expresion-artistica' => env('IP_EXPRESION_ARTISTICA', '192.168.1.20'),
        'polimotor'           => env('IP_POLIMOTOR',           '192.168.1.21'),
        'multisaberes'        => env('IP_MULTISABERES',        '192.168.1.22'),
        'multisensorial'      => env('IP_MULTISENSORIAL',      '192.168.1.23'),
        'tecnologia'          => env('IP_TECNOLOGIA',          '192.168.1.24'),
    ],

    'servidor_actual' => env('SERVIDOR_AMBIENTE'),

    'puerto_sync' => env('PUERTO_SYNC', 80),

    'modelos_sincronizables' => [
        'Estudiante',
        'Docente',
        'CargaDocente',
        'Matricula',
        'ConfiguracionPin',
        'Piar',
        'Grado',
        'Grupo',
        'Ambiente',
        'Modulo',
        'Eje',
    ],
];
