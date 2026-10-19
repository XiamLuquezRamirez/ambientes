<?php

namespace App\Services;

/**
 * Colores de la ficha del PIN. Cada alumno se pinta con la silla cuyo color
 * se parece más a su `color_avatar`. El marco de "¿Quién eres tú?" no usa esta paleta.
 */
class PaletaAulaService
{
    public const SILLA_DEFECTO = 'F06747';

    /**
     * @var array<string, array{archivo: string, marco: string, tinta: string}>
     */
    public const SILLAS = [
        'F06747' => ['archivo' => 'silla_naranja.png', 'marco' => '#F06747', 'tinta' => '#B34B33'],
        'C64757' => ['archivo' => 'silla_rosa.png', 'marco' => '#C64757', 'tinta' => '#8E333E'],
        'A1B947' => ['archivo' => 'silla_verde.png', 'marco' => '#A1B947', 'tinta' => '#738433'],
        'C46040' => ['archivo' => 'silla_naranja.png', 'marco' => '#C46040', 'tinta' => '#8C4530'],
        'AD92B1' => ['archivo' => 'silla_morado.png', 'marco' => '#AD92B1', 'tinta' => '#7C6980'],
        'F49625' => ['archivo' => 'silla_naranja.png', 'marco' => '#F49625', 'tinta' => '#B06B1A'],
        '73A7E3' => ['archivo' => 'silla_azul.png', 'marco' => '#73A7E3', 'tinta' => '#5278A3'],
        'EE6C84' => ['archivo' => 'silla_rosa.png', 'marco' => '#EE6C84', 'tinta' => '#AB4E5F'],
        '57B1A8' => ['archivo' => 'silla_cian.png', 'marco' => '#57B1A8', 'tinta' => '#3E7F79'],
        'E7A396' => ['archivo' => 'silla_naranja.png', 'marco' => '#E7A396', 'tinta' => '#A6756C'],
        // Alumnos ya registrados con paletas anteriores siguen coincidiendo exacto.
        'FC583A' => ['archivo' => 'silla_naranja.png', 'marco' => '#FC583A', 'tinta' => '#B53F2A'],
        '25ABA6' => ['archivo' => 'silla_cian.png', 'marco' => '#25ABA6', 'tinta' => '#1B7B78'],
        '79B40C' => ['archivo' => 'silla_verde.png', 'marco' => '#79B40C', 'tinta' => '#578209'],
        'A173AC' => ['archivo' => 'silla_morado.png', 'marco' => '#A173AC', 'tinta' => '#74537C'],
        'FE8D01' => ['archivo' => 'silla_naranja.png', 'marco' => '#FE8D01', 'tinta' => '#B76601'],
        '3E83EC' => ['archivo' => 'silla_azul.png', 'marco' => '#3E83EC', 'tinta' => '#2D5EAA'],
        'FD5070' => ['archivo' => 'silla_rosa.png', 'marco' => '#FD5070', 'tinta' => '#B63A51'],
        'CE5127' => ['archivo' => 'silla_naranja.png', 'marco' => '#CE5127', 'tinta' => '#943A1C'],
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
