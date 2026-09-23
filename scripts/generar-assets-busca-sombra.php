<?php

/**
 * Genera SVGs placeholder (color + sombra) para Busca la sombra.
 * Uso: php scripts/generar-assets-busca-sombra.php
 */

$dir = dirname(__DIR__).'/public/catalogo_juegos/Multisensorial/BuscaLaSombra/img';
$objDir = $dir.'/objetos';
$somDir = $dir.'/sombras';

foreach ([$objDir, $somDir] as $d) {
    if (! is_dir($d)) {
        mkdir($d, 0777, true);
    }
}

/**
 * Formas simples y distinguibles. Cada entrada: [paths colorados, fill principal, fills extra opcionales].
 * Las sombras usan el mismo path con fill #1a1a2e.
 */
$formas = [
    'manzana' => [
        'color' => '#e03131',
        'paths' => [
            '<ellipse cx="100" cy="115" rx="55" ry="58" fill="{c}"/>',
            '<path d="M100 55 Q90 30 100 20 Q110 30 100 55" fill="#2f9e44"/>',
            '<ellipse cx="78" cy="90" rx="12" ry="18" fill="#ff8787" opacity="0.45"/>',
        ],
    ],
    'carro' => [
        'color' => '#1c7ed6',
        'paths' => [
            '<path d="M35 130 L45 95 Q55 70 90 70 L150 70 Q175 70 185 95 L200 130 Z" fill="{c}"/>',
            '<rect x="70" y="78" width="40" height="28" rx="4" fill="#d0ebff"/>',
            '<rect x="120" y="78" width="40" height="28" rx="4" fill="#d0ebff"/>',
            '<circle cx="65" cy="135" r="18" fill="#212529"/>',
            '<circle cx="160" cy="135" r="18" fill="#212529"/>',
            '<circle cx="65" cy="135" r="8" fill="#adb5bd"/>',
            '<circle cx="160" cy="135" r="8" fill="#adb5bd"/>',
        ],
    ],
    'estrella' => [
        'color' => '#f59f00',
        'paths' => [
            '<polygon points="100,25 118,75 172,75 128,108 145,160 100,130 55,160 72,108 28,75 82,75" fill="{c}"/>',
        ],
    ],
    'pez' => [
        'color' => '#15aabf',
        'paths' => [
            '<ellipse cx="95" cy="100" rx="60" ry="38" fill="{c}"/>',
            '<polygon points="155,100 195,65 195,135" fill="{c}"/>',
            '<circle cx="60" cy="90" r="8" fill="#212529"/>',
            '<path d="M40 100 Q20 85 35 75" fill="none" stroke="#0b7285" stroke-width="4"/>',
        ],
    ],
    'arbol' => [
        'color' => '#2f9e44',
        'paths' => [
            '<rect x="88" y="120" width="24" height="50" rx="4" fill="#8d6e63"/>',
            '<circle cx="100" cy="90" r="48" fill="{c}"/>',
            '<circle cx="70" cy="105" r="32" fill="#40c057"/>',
            '<circle cx="130" cy="105" r="32" fill="#37b24d"/>',
        ],
    ],
    'mariposa' => [
        'color' => '#be4bdb',
        'paths' => [
            '<ellipse cx="55" cy="80" rx="38" ry="48" fill="#da77f2"/>',
            '<ellipse cx="145" cy="80" rx="38" ry="48" fill="#da77f2"/>',
            '<ellipse cx="60" cy="130" rx="28" ry="32" fill="{c}"/>',
            '<ellipse cx="140" cy="130" rx="28" ry="32" fill="{c}"/>',
            '<rect x="94" y="55" width="12" height="100" rx="6" fill="#495057"/>',
            '<circle cx="100" cy="50" r="10" fill="#495057"/>',
            '<path d="M95 42 Q80 20 70 30" fill="none" stroke="#495057" stroke-width="3"/>',
            '<path d="M105 42 Q120 20 130 30" fill="none" stroke="#495057" stroke-width="3"/>',
        ],
    ],
    'conejo' => [
        'color' => '#fab005',
        'paths' => [
            '<ellipse cx="75" cy="45" rx="14" ry="40" fill="{c}"/>',
            '<ellipse cx="125" cy="45" rx="14" ry="40" fill="{c}"/>',
            '<ellipse cx="75" cy="40" rx="7" ry="28" fill="#ffe3e3"/>',
            '<ellipse cx="125" cy="40" rx="7" ry="28" fill="#ffe3e3"/>',
            '<circle cx="100" cy="110" r="48" fill="{c}"/>',
            '<circle cx="82" cy="105" r="6" fill="#212529"/>',
            '<circle cx="118" cy="105" r="6" fill="#212529"/>',
            '<ellipse cx="100" cy="125" rx="10" ry="7" fill="#ff8787"/>',
        ],
    ],
    'flor' => [
        'color' => '#f06595',
        'paths' => [
            '<circle cx="100" cy="55" r="22" fill="{c}"/>',
            '<circle cx="140" cy="80" r="22" fill="{c}"/>',
            '<circle cx="130" cy="125" r="22" fill="{c}"/>',
            '<circle cx="70" cy="125" r="22" fill="{c}"/>',
            '<circle cx="60" cy="80" r="22" fill="{c}"/>',
            '<circle cx="100" cy="95" r="20" fill="#fcc419"/>',
            '<rect x="94" y="115" width="12" height="55" rx="4" fill="#2f9e44"/>',
        ],
    ],
    'pera' => [
        'color' => '#82c91e',
        'paths' => [
            '<path d="M100 40 C130 40 155 75 150 115 C145 155 55 155 50 115 C45 75 70 40 100 40 Z" fill="{c}"/>',
            '<path d="M100 40 Q95 22 105 18" fill="none" stroke="#5c3d2e" stroke-width="5" stroke-linecap="round"/>',
            '<ellipse cx="80" cy="95" rx="10" ry="16" fill="#c0eb75" opacity="0.5"/>',
        ],
    ],
    'pajaro' => [
        'color' => '#4c6ef5',
        'paths' => [
            '<ellipse cx="100" cy="110" rx="50" ry="35" fill="{c}"/>',
            '<circle cx="145" cy="85" r="28" fill="{c}"/>',
            '<polygon points="170,85 200,78 170,100" fill="#fd7e14"/>',
            '<circle cx="155" cy="80" r="5" fill="#212529"/>',
            '<path d="M70 100 Q40 60 90 75" fill="#748ffc"/>',
            '<ellipse cx="55" cy="130" rx="18" ry="8" fill="#364fc7"/>',
        ],
    ],
    'tortuga' => [
        'color' => '#2b8a3e',
        'paths' => [
            '<ellipse cx="100" cy="105" rx="58" ry="42" fill="{c}"/>',
            '<ellipse cx="100" cy="105" rx="40" ry="28" fill="#8ce99a"/>',
            '<circle cx="155" cy="95" r="20" fill="#37b24d"/>',
            '<circle cx="162" cy="90" r="4" fill="#212529"/>',
            '<ellipse cx="45" cy="125" rx="14" ry="10" fill="#37b24d"/>',
            '<ellipse cx="75" cy="145" rx="14" ry="10" fill="#37b24d"/>',
            '<ellipse cx="125" cy="145" rx="14" ry="10" fill="#37b24d"/>',
            '<ellipse cx="155" cy="125" rx="14" ry="10" fill="#37b24d"/>',
        ],
    ],
    'girasol' => [
        'color' => '#f59f00',
        'paths' => [
            '<circle cx="100" cy="55" r="20" fill="{c}"/>',
            '<circle cx="138" cy="72" r="20" fill="{c}"/>',
            '<circle cx="138" cy="112" r="20" fill="{c}"/>',
            '<circle cx="100" cy="130" r="20" fill="{c}"/>',
            '<circle cx="62" cy="112" r="20" fill="{c}"/>',
            '<circle cx="62" cy="72" r="20" fill="{c}"/>',
            '<circle cx="100" cy="92" r="28" fill="#5c3d2e"/>',
            '<rect x="94" y="120" width="12" height="50" rx="4" fill="#2f9e44"/>',
        ],
    ],
    'hoja' => [
        'color' => '#51cf66',
        'paths' => [
            '<path d="M100 30 Q160 80 100 170 Q40 80 100 30 Z" fill="{c}"/>',
            '<path d="M100 40 L100 160" fill="none" stroke="#2b8a3e" stroke-width="4"/>',
            '<path d="M100 80 Q130 90 140 110" fill="none" stroke="#2b8a3e" stroke-width="3"/>',
            '<path d="M100 100 Q70 110 60 130" fill="none" stroke="#2b8a3e" stroke-width="3"/>',
        ],
    ],
    'mosca' => [
        'color' => '#868e96',
        'paths' => [
            '<ellipse cx="100" cy="115" rx="28" ry="38" fill="{c}"/>',
            '<circle cx="100" cy="70" r="22" fill="#495057"/>',
            '<ellipse cx="55" cy="90" rx="32" ry="18" fill="#dee2e6" opacity="0.85"/>',
            '<ellipse cx="145" cy="90" rx="32" ry="18" fill="#dee2e6" opacity="0.85"/>',
            '<circle cx="92" cy="65" r="4" fill="#212529"/>',
            '<circle cx="108" cy="65" r="4" fill="#212529"/>',
            '<line x1="90" y1="52" x2="75" y2="35" stroke="#212529" stroke-width="3"/>',
            '<line x1="110" y1="52" x2="125" y2="35" stroke="#212529" stroke-width="3"/>',
        ],
    ],
    'abeja' => [
        'color' => '#fcc419',
        'paths' => [
            '<ellipse cx="100" cy="110" rx="45" ry="32" fill="{c}"/>',
            '<rect x="70" y="90" width="12" height="40" fill="#212529"/>',
            '<rect x="94" y="88" width="12" height="44" fill="#212529"/>',
            '<rect x="118" y="90" width="12" height="40" fill="#212529"/>',
            '<circle cx="145" cy="100" r="18" fill="{c}"/>',
            '<circle cx="152" cy="95" r="4" fill="#212529"/>',
            '<ellipse cx="70" cy="75" rx="28" ry="16" fill="#e7f5ff" opacity="0.9"/>',
            '<ellipse cx="100" cy="70" rx="28" ry="16" fill="#e7f5ff" opacity="0.9"/>',
        ],
    ],
    'gato' => [
        'color' => '#868e96',
        'paths' => [
            '<ellipse cx="70" cy="55" rx="12" ry="32" fill="{c}"/>',
            '<ellipse cx="100" cy="50" rx="12" ry="36" fill="{c}"/>',
            '<circle cx="90" cy="105" r="42" fill="{c}"/>',
            '<ellipse cx="90" cy="145" rx="48" ry="30" fill="{c}"/>',
            '<circle cx="75" cy="100" r="5" fill="#212529"/>',
            '<circle cx="100" cy="100" r="5" fill="#212529"/>',
            '<ellipse cx="88" cy="118" rx="8" ry="5" fill="#ff8787"/>',
            '<path d="M130 145 Q160 120 170 150" fill="{c}"/>',
        ],
    ],
    'perro' => [
        'color' => '#d9480f',
        'paths' => [
            '<ellipse cx="55" cy="70" rx="22" ry="28" fill="{c}"/>',
            '<ellipse cx="115" cy="70" rx="22" ry="28" fill="{c}"/>',
            '<circle cx="85" cy="105" r="45" fill="{c}"/>',
            '<ellipse cx="85" cy="150" rx="55" ry="28" fill="{c}"/>',
            '<circle cx="70" cy="100" r="6" fill="#212529"/>',
            '<circle cx="100" cy="100" r="6" fill="#212529"/>',
            '<ellipse cx="85" cy="120" rx="12" ry="8" fill="#212529"/>',
            '<path d="M130 145 Q165 130 175 160" fill="{c}"/>',
        ],
    ],
    'ardilla' => [
        'color' => '#e8590c',
        'paths' => [
            '<ellipse cx="130" cy="90" rx="22" ry="55" fill="#fd7e14"/>',
            '<ellipse cx="85" cy="120" rx="40" ry="32" fill="{c}"/>',
            '<circle cx="55" cy="85" r="28" fill="{c}"/>',
            '<ellipse cx="40" cy="60" rx="10" ry="18" fill="{c}"/>',
            '<circle cx="48" cy="80" r="4" fill="#212529"/>',
            '<ellipse cx="35" cy="95" rx="10" ry="6" fill="#ffc9c9"/>',
        ],
    ],
    'zorro' => [
        'color' => '#fd7e14',
        'paths' => [
            '<polygon points="55,40 70,90 40,90" fill="{c}"/>',
            '<polygon points="145,40 160,90 130,90" fill="{c}"/>',
            '<circle cx="100" cy="110" r="48" fill="{c}"/>',
            '<polygon points="100,110 70,150 130,150" fill="#fff4e6"/>',
            '<circle cx="80" cy="105" r="6" fill="#212529"/>',
            '<circle cx="120" cy="105" r="6" fill="#212529"/>',
            '<ellipse cx="100" cy="128" rx="10" ry="6" fill="#212529"/>',
            '<path d="M145 140 Q180 120 185 160" fill="{c}"/>',
        ],
    ],
    'avion' => [
        'color' => '#228be6',
        'paths' => [
            '<ellipse cx="100" cy="100" rx="70" ry="22" fill="{c}"/>',
            '<polygon points="100,100 30,60 45,100 30,140" fill="#74c0fc"/>',
            '<polygon points="150,85 190,55 195,90" fill="#74c0fc"/>',
            '<polygon points="150,115 190,145 195,110" fill="#74c0fc"/>',
            '<circle cx="145" cy="95" r="6" fill="#e7f5ff"/>',
            '<rect x="40" y="92" width="20" height="16" rx="3" fill="#1864ab"/>',
        ],
    ],
    'helicoptero' => [
        'color' => '#12b886',
        'paths' => [
            '<ellipse cx="100" cy="115" rx="55" ry="28" fill="{c}"/>',
            '<rect x="145" y="105" width="40" height="12" rx="3" fill="#087f5b"/>',
            '<rect x="90" y="70" width="20" height="30" fill="{c}"/>',
            '<rect x="30" y="68" width="140" height="8" rx="4" fill="#212529"/>',
            '<circle cx="80" cy="110" r="8" fill="#e6fcf5"/>',
            '<circle cx="110" cy="110" r="8" fill="#e6fcf5"/>',
            '<line x1="70" y1="143" x2="130" y2="143" stroke="#212529" stroke-width="6"/>',
        ],
    ],
    'cohete' => [
        'color' => '#fa5252',
        'paths' => [
            '<path d="M100 25 L130 90 L130 150 L70 150 L70 90 Z" fill="{c}"/>',
            '<circle cx="100" cy="95" r="16" fill="#a5d8ff"/>',
            '<polygon points="70,130 45,165 70,150" fill="#fd7e14"/>',
            '<polygon points="130,130 155,165 130,150" fill="#fd7e14"/>',
            '<polygon points="80,150 100,185 120,150" fill="#fcc419"/>',
        ],
    ],
    'avioneta' => [
        'color' => '#e64980',
        'paths' => [
            '<ellipse cx="100" cy="105" rx="55" ry="18" fill="{c}"/>',
            '<rect x="40" y="95" width="90" height="14" rx="4" fill="#f783ac"/>',
            '<polygon points="100,105 55,70 70,105" fill="#ffdeeb"/>',
            '<polygon points="100,105 55,140 70,105" fill="#ffdeeb"/>',
            '<circle cx="135" cy="100" r="10" fill="#fff0f6"/>',
            '<rect x="155" y="88" width="8" height="30" fill="#a61e4d"/>',
        ],
    ],
    'aguila' => [
        'color' => '#7950f2',
        'paths' => [
            '<ellipse cx="100" cy="115" rx="35" ry="28" fill="{c}"/>',
            '<circle cx="130" cy="95" r="22" fill="{c}"/>',
            '<polygon points="148,95 175,88 148,108" fill="#fd7e14"/>',
            '<path d="M70 110 Q20 60 80 85" fill="#9775fa"/>',
            '<path d="M70 120 Q15 150 75 130" fill="#9775fa"/>',
            '<circle cx="138" cy="90" r="4" fill="#212529"/>',
            '<polygon points="90,140 100,160 110,140" fill="#212529"/>',
        ],
    ],
];

function svgDoc(array $paths, string $color): string
{
    $inner = '';
    foreach ($paths as $p) {
        $inner .= str_replace('{c}', $color, $p)."\n";
    }

    return '<?xml version="1.0" encoding="UTF-8"?>'."\n".
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'."\n".
        '<rect width="200" height="200" fill="none"/>'."\n".
        $inner.
        '</svg>'."\n";
}

function svgSombra(array $paths): string
{
    // Silueta: unificar a un grupo negro; simplificamos pintando paths con negro
    // y quitando strokes claros / opacidades.
    $inner = '';
    foreach ($paths as $p) {
        $p = preg_replace('/fill="[^"]*"/', 'fill="#1a1a2e"', $p);
        $p = preg_replace('/stroke="[^"]*"/', 'stroke="#1a1a2e"', $p);
        $p = preg_replace('/opacity="[^"]*"/', '', $p);
        $inner .= $p."\n";
    }

    return '<?xml version="1.0" encoding="UTF-8"?>'."\n".
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'."\n".
        '<rect width="200" height="200" fill="none"/>'."\n".
        $inner.
        '</svg>'."\n";
}

$nombres = [
    'manzana' => 'Manzana',
    'carro' => 'Carro',
    'estrella' => 'Estrella',
    'pez' => 'Pez',
    'arbol' => 'Árbol',
    'mariposa' => 'Mariposa',
    'conejo' => 'Conejo',
    'flor' => 'Flor',
    'pera' => 'Pera',
    'pajaro' => 'Pájaro',
    'tortuga' => 'Tortuga',
    'girasol' => 'Girasol',
    'hoja' => 'Hoja',
    'mosca' => 'Mosca',
    'abeja' => 'Abeja',
    'gato' => 'Gato',
    'perro' => 'Perro',
    'ardilla' => 'Ardilla',
    'zorro' => 'Zorro',
    'avion' => 'Avión',
    'helicoptero' => 'Helicóptero',
    'cohete' => 'Cohete',
    'avioneta' => 'Avioneta',
    'aguila' => 'Águila',
];

$ok = 0;
foreach ($formas as $id => $meta) {
    $colorSvg = svgDoc($meta['paths'], $meta['color']);
    $sombraSvg = svgSombra($meta['paths']);
    file_put_contents($objDir.'/'.$id.'.svg', $colorSvg);
    file_put_contents($somDir.'/'.$id.'.svg', $sombraSvg);
    $ok++;
    echo "[OK] {$id}\n";
}

echo "\nGenerados {$ok} pares objeto/sombra en:\n  {$objDir}\n  {$somDir}\n";
