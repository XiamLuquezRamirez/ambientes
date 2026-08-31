<?php

namespace App\Support;

class AssetVersion
{
    /**
     * Devuelve la URL de un asset público con un parámetro de versión basado en
     * la fecha de modificación del archivo (cache-busting). Si el archivo no
     * existe, usa el timestamp actual para no cachear una URL rota.
     *
     * Uso en Blade: @assetv('assets/js/recorrido-nino.js')
     */
    public static function url(string $ruta): string
    {
        $absoluta = public_path($ruta);
        $version = @filemtime($absoluta) ?: time();

        return asset($ruta).'?v='.$version;
    }
}
