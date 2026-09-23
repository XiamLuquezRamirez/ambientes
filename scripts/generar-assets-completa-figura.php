<?php

/**
 * Genera SVGs placeholder para Completa La Figura.
 * Uso: php scripts/generar-assets-completa-figura.php
 */

$base = dirname(__DIR__).'/public/catalogo_juegos/Multisensorial/CompletaLaFigura/img';
$figDir = $base.'/figuras';
$pieDir = $base.'/piezas';
foreach ([$figDir, $pieDir] as $d) {
    if (! is_dir($d)) {
        mkdir($d, 0777, true);
    }
}

function svg(string $inner, int $w = 280, int $h = 220): string
{
    return '<?xml version="1.0" encoding="UTF-8"?>'."\n".
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '.$w.' '.$h.'" width="'.$w.'" height="'.$h.'">'."\n".
        '<rect width="'.$w.'" height="'.$h.'" fill="none"/>'."\n".
        $inner."\n</svg>\n";
}

function write(string $path, string $content): void
{
    file_put_contents($path, $content);
    echo '[OK] '.basename(dirname($path)).'/'.basename($path)."\n";
}

/* ── Figuras: base (incompleta) y completa ───────────────────── */

// Mariposa: falta ala derecha
$mariposaCuerpo = <<<'SVG'
  <ellipse cx="95" cy="95" rx="34" ry="44" fill="#da77f2"/>
  <ellipse cx="100" cy="145" rx="26" ry="30" fill="#be4bdb"/>
  <rect x="128" y="70" width="12" height="95" rx="6" fill="#495057"/>
  <circle cx="134" cy="62" r="12" fill="#495057"/>
  <path d="M128 52 Q110 30 100 38" fill="none" stroke="#495057" stroke-width="3"/>
  <path d="M140 52 Q158 30 168 38" fill="none" stroke="#495057" stroke-width="3"/>
SVG;

write($figDir.'/mariposa_base.svg', svg(
    $mariposaCuerpo.
    // hueco / silueta del ala faltante
    '<ellipse cx="200" cy="95" rx="38" ry="48" fill="none" stroke="#adb5bd" stroke-width="3" stroke-dasharray="8 6" opacity="0.85"/>'.
    '<ellipse cx="195" cy="145" rx="28" ry="32" fill="none" stroke="#adb5bd" stroke-width="3" stroke-dasharray="8 6" opacity="0.85"/>'
));

write($figDir.'/mariposa_completa.svg', svg(
    $mariposaCuerpo.
    '<ellipse cx="200" cy="95" rx="38" ry="48" fill="#da77f2"/>'.
    '<ellipse cx="195" cy="145" rx="28" ry="32" fill="#be4bdb"/>'
));

// Carro: falta rueda derecha
$carroCuerpo = <<<'SVG'
  <path d="M40 145 L55 100 Q70 70 110 70 L190 70 Q225 70 240 100 L255 145 Z" fill="#1c7ed6"/>
  <rect x="95" y="82" width="45" height="32" rx="4" fill="#d0ebff"/>
  <rect x="155" y="82" width="45" height="32" rx="4" fill="#d0ebff"/>
  <circle cx="85" cy="155" r="22" fill="#212529"/>
  <circle cx="85" cy="155" r="10" fill="#adb5bd"/>
SVG;

write($figDir.'/carro_base.svg', svg(
    $carroCuerpo.
    '<circle cx="210" cy="155" r="22" fill="none" stroke="#adb5bd" stroke-width="3" stroke-dasharray="7 5" opacity="0.9"/>'
));

write($figDir.'/carro_completa.svg', svg(
    $carroCuerpo.
    '<circle cx="210" cy="155" r="22" fill="#212529"/>'.
    '<circle cx="210" cy="155" r="10" fill="#adb5bd"/>'
));

// Casa: falta techo
$casaCuerpo = <<<'SVG'
  <rect x="70" y="110" width="140" height="95" fill="#fab005"/>
  <rect x="115" y="145" width="40" height="60" fill="#e67700"/>
  <rect x="85" y="130" width="28" height="28" fill="#74c0fc"/>
  <rect x="165" y="130" width="28" height="28" fill="#74c0fc"/>
SVG;

write($figDir.'/casa_base.svg', svg(
    $casaCuerpo.
    '<polygon points="140,35 55,115 225,115" fill="none" stroke="#adb5bd" stroke-width="3" stroke-dasharray="8 6" opacity="0.9"/>'
));

write($figDir.'/casa_completa.svg', svg(
    '<polygon points="140,35 55,115 225,115" fill="#e03131"/>'.
    $casaCuerpo
));

/* ── Piezas ──────────────────────────────────────────────────── */

$piezas = [
    'ala_mariposa' => [
        120, 140,
        '<ellipse cx="60" cy="50" rx="38" ry="48" fill="#da77f2"/>'.
        '<ellipse cx="55" cy="100" rx="28" ry="32" fill="#be4bdb"/>',
    ],
    'ala_forma_diff' => [
        120, 140,
        '<path d="M60 20 Q100 50 90 110 Q50 120 30 80 Q20 40 60 20 Z" fill="#da77f2"/>'.
        '<ellipse cx="55" cy="95" rx="22" ry="26" fill="#be4bdb"/>',
    ],
    'ala_tamano_diff' => [
        120, 140,
        '<ellipse cx="60" cy="55" rx="28" ry="36" fill="#da77f2"/>'.
        '<ellipse cx="56" cy="95" rx="20" ry="24" fill="#be4bdb"/>',
    ],
    'ala_insecto' => [
        120, 140,
        '<ellipse cx="60" cy="70" rx="42" ry="22" fill="#868e96" opacity="0.85"/>'.
        '<ellipse cx="55" cy="95" rx="30" ry="16" fill="#ced4da"/>',
    ],
    'oreja_conejo' => [
        100, 140,
        '<ellipse cx="50" cy="70" rx="18" ry="55" fill="#fab005"/>'.
        '<ellipse cx="50" cy="65" rx="9" ry="40" fill="#ffe3e3"/>',
    ],
    'hoja' => [
        110, 140,
        '<path d="M55 20 Q95 70 55 130 Q15 70 55 20 Z" fill="#51cf66"/>'.
        '<path d="M55 30 L55 120" fill="none" stroke="#2b8a3e" stroke-width="3"/>',
    ],
    'rueda' => [
        100, 100,
        '<circle cx="50" cy="50" r="40" fill="#212529"/>'.
        '<circle cx="50" cy="50" r="18" fill="#adb5bd"/>'.
        '<circle cx="50" cy="50" r="6" fill="#495057"/>',
    ],
    'rueda_grande' => [
        100, 100,
        '<circle cx="50" cy="50" r="48" fill="#212529"/>'.
        '<circle cx="50" cy="50" r="22" fill="#adb5bd"/>'.
        '<circle cx="50" cy="50" r="7" fill="#495057"/>',
    ],
    'rueda_pequena' => [
        100, 100,
        '<circle cx="50" cy="50" r="28" fill="#212529"/>'.
        '<circle cx="50" cy="50" r="12" fill="#adb5bd"/>'.
        '<circle cx="50" cy="50" r="5" fill="#495057"/>',
    ],
    'estrella' => [
        110, 110,
        '<polygon points="55,8 63,40 96,40 70,60 78,94 55,74 32,94 40,60 14,40 47,40" fill="#f59f00"/>',
    ],
    'flor' => [
        110, 110,
        '<circle cx="55" cy="30" r="16" fill="#f06595"/>'.
        '<circle cx="78" cy="48" r="16" fill="#f06595"/>'.
        '<circle cx="70" cy="75" r="16" fill="#f06595"/>'.
        '<circle cx="40" cy="75" r="16" fill="#f06595"/>'.
        '<circle cx="32" cy="48" r="16" fill="#f06595"/>'.
        '<circle cx="55" cy="55" r="14" fill="#fcc419"/>',
    ],
    'pelota' => [
        100, 100,
        '<circle cx="50" cy="50" r="40" fill="#fa5252"/>'.
        '<path d="M20 50 Q50 20 80 50 Q50 80 20 50" fill="none" stroke="#fff" stroke-width="4"/>'.
        '<path d="M50 12 L50 88" fill="none" stroke="#fff" stroke-width="3"/>',
    ],
    'circulo' => [
        100, 100,
        '<circle cx="50" cy="50" r="40" fill="#868e96"/>',
    ],
    'techo' => [
        160, 100,
        '<polygon points="80,12 10,88 150,88" fill="#e03131"/>',
    ],
    'techo_forma_diff' => [
        160, 100,
        '<path d="M20 88 L20 40 Q80 5 140 40 L140 88 Z" fill="#e03131"/>',
    ],
    'techo_ancho' => [
        180, 100,
        '<polygon points="90,18 5,88 175,88" fill="#e03131"/>',
    ],
    'techo_pequeno' => [
        120, 90,
        '<polygon points="60,18 18,78 102,78" fill="#e03131"/>',
    ],
    'sol' => [
        110, 110,
        '<circle cx="55" cy="55" r="28" fill="#fcc419"/>'.
        '<g stroke="#f59f00" stroke-width="4" stroke-linecap="round">'.
        '<line x1="55" y1="8" x2="55" y2="22"/><line x1="55" y1="88" x2="55" y2="102"/>'.
        '<line x1="8" y1="55" x2="22" y2="55"/><line x1="88" y1="55" x2="102" y2="55"/>'.
        '<line x1="20" y1="20" x2="30" y2="30"/><line x1="80" y1="80" x2="90" y2="90"/>'.
        '<line x1="80" y1="30" x2="90" y2="20"/><line x1="20" y1="90" x2="30" y2="80"/>'.
        '</g>',
    ],
    'arbol' => [
        110, 140,
        '<rect x="48" y="95" width="14" height="35" rx="3" fill="#8d6e63"/>'.
        '<circle cx="55" cy="70" r="38" fill="#2f9e44"/>'.
        '<circle cx="35" cy="85" r="22" fill="#40c057"/>'.
        '<circle cx="75" cy="85" r="22" fill="#37b24d"/>',
    ],
    'copa_arbol' => [
        110, 100,
        '<circle cx="55" cy="55" r="40" fill="#2f9e44"/>'.
        '<circle cx="35" cy="65" r="24" fill="#40c057"/>'.
        '<circle cx="75" cy="65" r="24" fill="#37b24d"/>',
    ],
    'nube' => [
        140, 90,
        '<ellipse cx="55" cy="50" rx="32" ry="22" fill="#dee2e6"/>'.
        '<ellipse cx="85" cy="45" rx="36" ry="26" fill="#e9ecef"/>'.
        '<ellipse cx="110" cy="52" rx="28" ry="20" fill="#dee2e6"/>',
    ],
    'triangulo' => [
        120, 100,
        '<polygon points="60,12 12,88 108,88" fill="#868e96"/>',
    ],
];

foreach ($piezas as $id => $meta) {
    [$w, $h, $inner] = $meta;
    write($pieDir.'/'.$id.'.svg', svg($inner, $w, $h));
}

echo "\nAssets listos en:\n  {$figDir}\n  {$pieDir}\n";
