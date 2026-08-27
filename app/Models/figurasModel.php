<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Catálogo único de figuras para el PIN del estudiante.
 * Staff (panel/admin) y kiosco (tablet) deben usar este mismo listado.
 */
class FigurasModel extends Model
{
    /** @return array<int, array{icon: string, color: string, nombre: string}> */
    public static function getFiguras(): array
    {
        return [
            ['icon' => 'fas fa-circle', 'color' => '#f933e9', 'nombre' => 'Círculo'],
            ['icon' => 'fas fa-star', 'color' => '#ff9019', 'nombre' => 'Estrella'],
            ['icon' => 'fas fa-heart', 'color' => '#ff0606', 'nombre' => 'Corazón'],
            ['icon' => 'fas fa-fish', 'color' => '#0f54ff', 'nombre' => 'Pez'],
            ['icon' => 'fas fa-square', 'color' => '#437124', 'nombre' => 'Cuadrado'],
            ['icon' => 'fas fa-moon', 'color' => '#3f51b5', 'nombre' => 'Luna'],
            ['icon' => 'fas fa-diamond', 'color' => '#9c27b0', 'nombre' => 'Diamante'],
            ['icon' => 'fas fa-apple-whole', 'color' => '#fd0a5d', 'nombre' => 'Manzana'],
        ];
    }

    /** @return list<string> */
    public static function iconosValidos(): array
    {
        return array_column(static::getFiguras(), 'icon');
    }

    public static function esIconoValido(string $icon): bool
    {
        return in_array($icon, static::iconosValidos(), true);
    }

    /** @return array{icon: string, color: string}|null */
    public static function buscarPorIcono(string $icon): ?array
    {
        foreach (static::getFiguras() as $figura) {
            if ($figura['icon'] === $icon) {
                return $figura;
            }
        }

        return null;
    }
}
