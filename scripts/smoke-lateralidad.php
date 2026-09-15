<?php

/**
 * Smoke rápido de invariantes de Lateralidad vs requerimientos.
 * Uso: php scripts/smoke-lateralidad.php
 */

$c = json_decode(file_get_contents(__DIR__.'/../public/catalogo_juegos/Polimotor/Lateralidad/config.json'), true);
$js = file_get_contents(__DIR__.'/../public/catalogo_juegos/Polimotor/Lateralidad/script.js');
$fail = 0;
$ok = 0;

function assert_true(bool $cond, string $msg): void
{
    global $fail, $ok;
    if ($cond) {
        echo "[OK]  {$msg}\n";
        $ok++;
    } else {
        echo "[FAIL] {$msg}\n";
        $fail++;
    }
}

$n3 = $c['niveles'][0];
$n4 = $c['niveles'][1];
$n5 = $c['niveles'][2];

assert_true($n3['zonas'] === ['izquierda', 'derecha'], '3 años: 2 zonas');
assert_true($n4['zonas'] === ['izquierda', 'centro', 'derecha'], '4 años: 3 zonas');
assert_true(count($n5['retos'][0]['pasos'] ?? []) === 2, '5 años r1: 2 subpasos');
assert_true(! empty($n3['retos'][1]['salirEscena']), '3 años r2 salirEscena');
assert_true(! empty($n4['retos'][2]['caminaAlFinal']), '4 años r3 caminaAlFinal');
assert_true(($n5['retos'][1]['pregunta']['relacion'] ?? '') === 'derecha_de', '5 años r2 derecha_de');
assert_true(($n5['retos'][2]['modoRespuesta'] ?? '') === 'botones', '5 años r3 botones');
assert_true(str_contains($c['objetos']['dino']['img'] ?? '', 'Dinosaurio.png'), 'Dinosaurio.png');

assert_true(str_contains($js, 'pctFuera'), 'JS pctFuera');
assert_true(str_contains($js, 'caminando'), 'JS caminando Zoe');
assert_true((bool) preg_match('/orden\s*=\s*\[\s*"izquierda"\s*,\s*"centro"\s*,\s*"derecha"\s*\]/', $js), 'Intro L→C→R');
assert_true((bool) preg_match('/function pctParaZona\(zona\)/', $js), 'pctParaZona(zona)');
assert_true(str_contains($js, 'function renderZonasVacias(zonas)'), 'renderZonasVacias sin canal click');
assert_true(! str_contains($js, 'slot.addEventListener("click"'), 'Sin click en zona-slot');

// Relacional 5 años
$orden = ['gato', 'dino', 'celular', 'manzana'];
assert_true($orden[array_search('gato', $orden, true) + 1] === 'dino', 'derecha_de gato => dino');
assert_true($orden[array_search('manzana', $orden, true) - 1] === 'celular', 'izquierda_de manzana => celular');

echo "\nSmoke OK={$ok} FAIL={$fail}\n";
exit($fail ? 1 : 0);
