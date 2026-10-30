<?php

/**
 * Unifica portadas: inicio-fondo.css/js + kicker con nombre del reto.
 * Uso: php scripts/normalizar-portadas-inicio.php
 */
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

const CSS_VER = '20261030b';
const JS_VER = '20261030b';

function sinEdad(string $s): string
{
    return trim(preg_replace('/\s*\(\s*\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*a[ñn]os?\s*\)\s*$/iu', '', $s) ?? $s);
}

function rutaComunRelativa(string $relPublic): string
{
    $parts = explode('/', trim(str_replace('\\', '/', $relPublic), '/'));
    // catalogo_juegos / Ambiente / ... / Pack
    $under = array_slice($parts, 1);
    if (($under[0] ?? '') === 'Polimotor' && count($under) === 2) {
        return '../comun/';
    }

    return str_repeat('../', count($under)).'Polimotor/comun/';
}

function nombrePortada(string $dir, string $html): string
{
    $cfgNombre = '';
    if (is_file($dir.DIRECTORY_SEPARATOR.'config.json')) {
        $cfg = json_decode((string) file_get_contents($dir.DIRECTORY_SEPARATOR.'config.json'), true);
        $cfgNombre = is_array($cfg) ? trim((string) ($cfg['nombre'] ?? '')) : '';
    }
    if ($cfgNombre !== '') {
        return sinEdad($cfgNombre);
    }
    if (preg_match('/<title>([^<]*)<\/title>/iu', $html, $m)) {
        return sinEdad(trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
    }

    return '';
}

$base = public_path('catalogo_juegos');
$pubLen = strlen(public_path()) + 1;
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS));

$stats = [
    'tocados' => 0,
    'css_js' => 0,
    'kicker' => 0,
    'title' => 0,
    'omitidos' => 0,
];

foreach ($it as $f) {
    if ($f->getFilename() !== 'index.html') {
        continue;
    }
    $path = $f->getPathname();
    $dir = $f->getPath();
    $rel = str_replace('\\', '/', substr($dir, $pubLen));
    $html = (string) file_get_contents($path);
    $orig = $html;

    if (! str_contains($html, 'pantalla-inicio') || ! str_contains($html, 'btn-empecemos')) {
        $stats['omitidos']++;
        continue;
    }

    $comun = rutaComunRelativa($rel);
    $cssTag = '<link rel="stylesheet" href="'.$comun.'inicio-fondo.css?v='.CSS_VER.'">';
    $jsTag = '<script src="'.$comun.'inicio-fondo.js?v='.JS_VER.'"></script>';

    // Actualizar versiones existentes o insertar.
    if (preg_match('/inicio-fondo\.css\?v=[^"\']+/', $html)) {
        $html = preg_replace('/inicio-fondo\.css\?v=[^"\']+/', 'inicio-fondo.css?v='.CSS_VER, $html);
    }
    if (preg_match('/inicio-fondo\.js\?v=[^"\']+/', $html)) {
        $html = preg_replace('/inicio-fondo\.js\?v=[^"\']+/', 'inicio-fondo.js?v='.JS_VER, $html);
    }

    if (! str_contains($html, 'inicio-fondo.css')) {
        if (preg_match('/(<link[^>]+href="style\.css[^"]*"[^>]*>)/i', $html, $m)) {
            $html = str_replace($m[1], $m[1]."\n\t".$cssTag, $html);
        } elseif (preg_match('/(<\/head>)/i', $html, $m)) {
            $html = str_replace($m[1], "\t".$cssTag."\n".$m[1], $html);
        }
        $stats['css_js']++;
    }

    if (! str_contains($html, 'inicio-fondo.js')) {
        if (str_contains($html, 'inicio-fondo.css')) {
            $html = preg_replace(
                '/(<link[^>]+inicio-fondo\.css[^>]*>)/i',
                '$1'."\n\t".$jsTag,
                $html,
                1
            );
        } elseif (preg_match('/(<\/head>)/i', $html, $m)) {
            $html = str_replace($m[1], "\t".$jsTag."\n".$m[1], $html);
        }
        $stats['css_js']++;
    }

    $nombre = nombrePortada($dir, $html);
    if ($nombre === '') {
        if ($html !== $orig) {
            file_put_contents($path, $html);
            $stats['tocados']++;
        }
        continue;
    }

    $escaped = htmlspecialchars($nombre, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    // Sync <title>
    if (preg_match('/<title>([^<]*)<\/title>/iu', $html, $tm)) {
        $titleActual = trim(html_entity_decode($tm[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if (sinEdad($titleActual) !== $nombre && $titleActual !== $nombre) {
            $html = preg_replace('/<title>[^<]*<\/title>/iu', '<title>'.$escaped.'</title>', $html, 1);
            $stats['title']++;
        }
    }

    if (preg_match('/<p\b[^>]*\bclass="inicio-kicker"[^>]*>[^<]*<\/p>/u', $html)) {
        $html = preg_replace(
            '/(<p\b[^>]*\bclass="inicio-kicker"[^>]*>)([^<]*)(<\/p>)/u',
            '$1'.$escaped.'$3',
            $html,
            1
        );
    } else {
        // Insertar kicker justo antes del botón Empecemos.
        $kickerHtml = '<p class="inicio-kicker">'.$escaped.'</p>'."\n\t\t\t";
        if (preg_match('/(<button[^>]*id="btn-empecemos"[^>]*>)/i', $html)) {
            $html = preg_replace(
                '/(<button[^>]*id="btn-empecemos"[^>]*>)/i',
                $kickerHtml.'$1',
                $html,
                1
            );
            $stats['kicker']++;
        }
    }

    if ($html !== $orig) {
        file_put_contents($path, $html);
        $stats['tocados']++;
    }
}

echo json_encode($stats, JSON_PRETTY_PRINT)."\n";
