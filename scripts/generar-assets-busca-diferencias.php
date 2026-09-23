<?php

/**
 * Genera SVGs base del parque para Busca las diferencias.
 * Uso: php scripts/generar-assets-busca-diferencias.php
 */

$dir = dirname(__DIR__).'/public/catalogo_juegos/Multisensorial/BuscaLasDiferencias/img';
if (! is_dir($dir)) {
    mkdir($dir, 0777, true);
}

function svgDoc(string $inner): string
{
    return '<?xml version="1.0" encoding="UTF-8"?>'."\n".
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">'."\n".
        $inner."\n</svg>\n";
}

function escena(array $opts): string
{
    $sol = $opts['sol'] ?? true;
    $flor3 = $opts['flor3'] ?? true;
    $pelotaColor = $opts['pelotaColor'] ?? '#fa5252';
    $hojaExtra = $opts['hojaExtra'] ?? true;
    $cuerdaCorta = $opts['cuerdaCorta'] ?? false;

    $ropeY = $cuerdaCorta ? 145 : 175;

    $parts = [];
    // cielo / suelo
    $parts[] = '<rect width="400" height="300" fill="#d0ebff"/>';
    $parts[] = '<rect y="190" width="400" height="110" fill="#8ce99a"/>';
    $parts[] = '<rect y="190" width="400" height="8" fill="#69db7c"/>';

    // sol
    if ($sol) {
        $parts[] = '<g id="sol">'.
            '<circle cx="340" cy="48" r="32" fill="#fcc419"/>'.
            '<g stroke="#f59f00" stroke-width="4" stroke-linecap="round">'.
            '<line x1="340" y1="6" x2="340" y2="18"/><line x1="340" y1="78" x2="340" y2="90"/>'.
            '<line x1="298" y1="48" x2="310" y2="48"/><line x1="370" y1="48" x2="382" y2="48"/>'.
            '<line x1="312" y1="20" x2="320" y2="28"/><line x1="360" y1="68" x2="368" y2="76"/>'.
            '<line x1="360" y1="28" x2="368" y2="20"/><line x1="312" y1="76" x2="320" y2="68"/>'.
            '</g></g>';
    }

    // árbol
    $parts[] = '<g id="arbol">'.
        '<rect x="58" y="145" width="18" height="55" rx="3" fill="#8d6e63"/>'.
        '<circle cx="67" cy="120" r="42" fill="#2f9e44"/>'.
        '<circle cx="45" cy="135" r="26" fill="#40c057"/>'.
        '<circle cx="90" cy="135" r="26" fill="#37b24d"/>';
    if ($hojaExtra) {
        $parts[] = '<ellipse cx="95" cy="105" rx="14" ry="10" fill="#51cf66" transform="rotate(25 95 105)"/>';
    }
    $parts[] = '</g>';

    // columpio
    $parts[] = '<g id="columpio">'.
        '<line x1="175" y1="95" x2="175" y2="195" stroke="#868e96" stroke-width="6"/>'.
        '<line x1="255" y1="95" x2="255" y2="195" stroke="#868e96" stroke-width="6"/>'.
        '<line x1="165" y1="95" x2="265" y2="95" stroke="#495057" stroke-width="8" stroke-linecap="round"/>'.
        // cuerda izquierda siempre completa
        '<line x1="200" y1="95" x2="200" y2="175" stroke="#212529" stroke-width="3"/>'.
        // cuerda derecha (puede ser más corta)
        '<line x1="230" y1="95" x2="230" y2="'.$ropeY.'" stroke="#212529" stroke-width="3"/>'.
        '<rect x="190" y="'.($cuerdaCorta ? 145 : 172).'" width="50" height="12" rx="3" fill="#e8590c"/>'.
        '</g>';

    // flores
    $parts[] = flor(120, 230, '#f06595');
    $parts[] = flor(155, 245, '#be4bdb');
    if ($flor3) {
        $parts[] = flor(190, 232, '#fa5252');
    }

    // pelota
    $parts[] = '<g id="pelota">'.
        '<circle cx="320" cy="250" r="28" fill="'.$pelotaColor.'"/>'.
        '<path d="M298 250 Q320 230 342 250 Q320 270 298 250" fill="none" stroke="#fff" stroke-width="3"/>'.
        '</g>';

    return implode("\n", $parts);
}

function flor(int $x, int $y, string $c): string
{
    return '<g class="flor">'.
        '<circle cx="'.($x).'" cy="'.($y - 14).'" r="9" fill="'.$c.'"/>'.
        '<circle cx="'.($x + 12).'" cy="'.($y - 4).'" r="9" fill="'.$c.'"/>'.
        '<circle cx="'.($x + 7).'" cy="'.($y + 12).'" r="9" fill="'.$c.'"/>'.
        '<circle cx="'.($x - 7).'" cy="'.($y + 12).'" r="9" fill="'.$c.'"/>'.
        '<circle cx="'.($x - 12).'" cy="'.($y - 4).'" r="9" fill="'.$c.'"/>'.
        '<circle cx="'.$x.'" cy="'.$y.'" r="8" fill="#fcc419"/>'.
        '<line x1="'.$x.'" y1="'.($y + 8).'" x2="'.$x.'" y2="'.($y + 28).'" stroke="#2f9e44" stroke-width="4"/>'.
        '</g>';
}

$variantes = [
    'parque_a' => [
        'sol' => true, 'flor3' => true, 'pelotaColor' => '#fa5252',
        'hojaExtra' => true, 'cuerdaCorta' => false,
    ],
    'parque_b_3' => [
        'sol' => false, 'flor3' => false, 'pelotaColor' => '#1c7ed6',
        'hojaExtra' => true, 'cuerdaCorta' => false,
    ],
    'parque_b_4' => [
        'sol' => false, 'flor3' => false, 'pelotaColor' => '#1c7ed6',
        'hojaExtra' => false, 'cuerdaCorta' => false,
    ],
    'parque_b_5' => [
        'sol' => false, 'flor3' => false, 'pelotaColor' => '#1c7ed6',
        'hojaExtra' => false, 'cuerdaCorta' => true,
    ],
];

foreach ($variantes as $name => $opts) {
    $path = $dir.'/'.$name.'.svg';
    file_put_contents($path, svgDoc(escena($opts)));
    echo "[OK] {$name}.svg\n";
}

echo "\nAssets en {$dir}\n";
