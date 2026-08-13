<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class InfoCondicionesService
{
    private const RUTA_BASE = 'assets/info-condiciones';

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listarCondiciones(): array
    {
        $ruta = public_path(self::RUTA_BASE.'/condiciones.json');

        if (! File::exists($ruta)) {
            return [];
        }

        $datos = json_decode(File::get($ruta), true);

        return array_map(function (array $condicion): array {
            $slug = $condicion['slug'] ?? '';
            $condicion['icono'] = $this->rutaIconoCondicion($slug);

            return $condicion;
        }, $datos['condiciones'] ?? []);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function obtenerCondicion(string $slug): ?array
    {
        $ruta = public_path(self::RUTA_BASE.'/data/'.$slug.'.json');

        if (! File::exists($ruta)) {
            return null;
        }

        $condicion = json_decode(File::get($ruta), true);

        if (! is_array($condicion) || ($condicion['slug'] ?? null) !== $slug) {
            return null;
        }

        if (isset($condicion['botones']) && is_array($condicion['botones'])) {
            $condicion['botones'] = array_slice(
                array_map(fn (array $boton) => $this->normalizarBoton($boton), $condicion['botones']),
                0,
                11
            );
        }

        return $condicion;
    }

    /**
     * @param  array<string, array<string, mixed>>  $condicionesDetalle
     * @return array<string, array<string, array{titulo: string, contenido_html: string}>>
     */
    public function mapaContenidosBotones(array $condicionesDetalle): array
    {
        $mapa = [];

        foreach ($condicionesDetalle as $slug => $condicion) {
            foreach ($condicion['botones'] ?? [] as $boton) {
                $mapa[$slug][$boton['id']] = [
                    'titulo' => $boton['titulo'] ?? '',
                    'contenido_html' => $boton['contenido_html'] ?? '',
                ];
            }
        }

        return $mapa;
    }

    public function slugEsValido(string $slug): bool
    {
        return collect($this->listarCondiciones())->contains(fn ($c) => ($c['slug'] ?? null) === $slug);
    }

    public function assetUrl(?string $ruta): ?string
    {
        if ($ruta === null || $ruta === '') {
            return null;
        }

        return asset($ruta);
    }

    public function rutaIconoCondicion(string $slug): ?string
    {
        if ($slug === '') {
            return null;
        }

        $base = public_path(self::RUTA_BASE.'/imagenes/iconos/'.$slug);

        foreach (['png', 'jpg', 'jpeg', 'webp'] as $extension) {
            if (File::exists($base.'.'.$extension)) {
                return self::RUTA_BASE.'/imagenes/iconos/'.$slug.'.'.$extension;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $boton
     * @return array<string, mixed>
     */
    private function normalizarBoton(array $boton): array
    {
        if (empty($boton['contenido_html']) && ! empty($boton['texto'])) {
            $boton['contenido_html'] = '<p>'.e($boton['texto']).'</p>';
        }

        unset($boton['texto']);

        return $boton;
    }
}
