<?php

return [
    'servidores' => [
        'musica'         => env('IP_MUSICA',         '192.168.1.20'),
        'polimotor'      => env('IP_POLIMOTOR',      '192.168.1.21'),
        'logico'         => env('IP_LOGICO',         '192.168.1.22'),
        'multisensorial' => env('IP_MULTISENSORIAL', '192.168.1.23'),
        'tecnologia'     => env('IP_TECNOLOGIA',     '192.168.1.24'),
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
    ],
];
