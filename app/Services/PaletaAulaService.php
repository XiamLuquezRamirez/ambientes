<?php

namespace App\Services;

/**
 * Colores del kiosco "¿Quién eres tú?": cada alumno se pinta con la silla cuyo color
 * se parece más a su `color_avatar` (lista de alumnos y ficha del PIN).
 */
class PaletaAulaService
{
    public const SILLA_DEFECTO = '0494FC';

    /**
     * @var array<string, array{archivo: string, marco: string, tinta: string}>
     */
    public const SILLAS = [
        '0494FC' => ['archivo' => 'silla_azul.png', 'marco' => '#0494FC', 'tinta' => '#0474C8'],
        '18BC54' => ['archivo' => 'silla_verde.png', 'marco' => '#18BC54', 'tinta' => '#0F8F3E'],
        'FCB400' => ['archivo' => 'silla_naranja.png', 'marco' => '#FCB400', 'tinta' => '#C47E00'],
        '4C007C' => ['archivo' => 'silla_morado.png', 'marco' => '#4C007C', 'tinta' => '#4C007C'],
        'F8349C' => ['archivo' => 'silla_rosa.png', 'marco' => '#F8349C', 'tinta' => '#E01484'],
        '1CC8FC' => ['archivo' => 'silla_cian.png', 'marco' => '#1CC8FC', 'tinta' => '#0094C4'],
    ];

    /**
     * @return array{archivo: string, marco: string, tinta: string}
     */
    public static function sillaPara(?string $colorAvatar): array
    {
        $hex = strtoupper(ltrim((string) $colorAvatar, '#'));

        if (isset(self::SILLAS[$hex])) {
            return self::SILLAS[$hex];
        }

        $silla = self::SILLAS[self::SILLA_DEFECTO];
        $rgb = sscanf(str_pad(substr($hex, 0, 6), 6, '0'), '%02x%02x%02x');
        if (! is_array($rgb) || count($rgb) !== 3) {
            return $silla;
        }

        $distancia = PHP_INT_MAX;
        foreach (self::SILLAS as $hexSilla => $opcion) {
            [$r, $g, $b] = sscanf($hexSilla, '%02x%02x%02x');
            $d = ($rgb[0] - $r) ** 2 + ($rgb[1] - $g) ** 2 + ($rgb[2] - $b) ** 2;
            if ($d < $distancia) {
                $distancia = $d;
                $silla = $opcion;
            }
        }

        return $silla;
    }
}
