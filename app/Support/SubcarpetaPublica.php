<?php

namespace App\Support;

/**
 * Permite servir la app desde una subcarpeta de URL (p. ej. ingeer.co/ambientes/)
 * cuando la raíz web es la carpeta del proyecto y un .htaccess reescribe todo a public/.
 *
 * En ese caso Apache entrega SCRIPT_NAME=/ambientes/public/index.php con
 * REQUEST_URI=/ambientes/login, y Symfony no logra deducir la base (/ambientes).
 * Se corrige SCRIPT_NAME para que la base y el path de la ruta salgan bien.
 *
 * Con la raíz web en public/ (nodos LAN, artisan serve) SCRIPT_NAME es /index.php
 * y no se modifica nada.
 */
final class SubcarpetaPublica
{
    private const SUFIJO = '/public/index.php';

    /**
     * Ruta absoluta desde la raíz del sitio con la base de la app: '/storage/x' o '/ambientes/storage/x'.
     * Fuera de una petición HTTP (CLI, tests) la base es ''.
     */
    public static function url(string $ruta): string
    {
        $base = '';
        $app = \Illuminate\Container\Container::getInstance();
        if ($app->bound('request')) {
            $base = rtrim((string) $app->make('request')->getBaseUrl(), '/');
        }

        return $base.'/'.ltrim($ruta, '/');
    }

    public static function ajustar(array &$server): void
    {
        $script = (string) ($server['SCRIPT_NAME'] ?? '');
        if (! str_ends_with($script, self::SUFIJO)) {
            return;
        }

        $prefijo = substr($script, 0, -strlen(self::SUFIJO));
        $uri = (string) ($server['REQUEST_URI'] ?? '/');

        // Acceso explícito a /public/...: Symfony ya lo resuelve.
        if (str_starts_with($uri, $prefijo.'/public/') || $uri === $prefijo.'/public') {
            return;
        }

        if ($prefijo !== '' && $uri !== $prefijo && ! str_starts_with($uri, $prefijo.'/')) {
            return;
        }

        $server['SCRIPT_NAME'] = $prefijo.'/index.php';
        $server['PHP_SELF'] = $prefijo.'/index.php';
    }
}
