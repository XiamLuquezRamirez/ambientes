<?php


namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class FigurasModel extends Model
{
    public static function getFiguras()
    {
        return [
            [
                'icon' => 'fas fa-circle',
                'color' => '#f933e9',
            ],
            [
                'icon' => 'fas fa-star',
                'color' => '#ff9019',
            ],
            [
                'icon' => 'fas fa-heart',
                'color' => '#ff0606',
            ],
            [
                'icon' => 'fas fa-fish',
                'color' => '#0f54ff',
            ],
            [
                'icon' => 'fas fa-square',
                'color' => '#437124',
            ],
            [
                'icon' => 'fas fa-moon',
                'color' => '#3f51b5',
            ],
            [
                'icon' => 'fas fa-diamond',
                'color' => '#9c27b0',
            ],
            [
                'icon' => 'fas fa-apple-whole',
                'color' => '#fd0a5d',
            ]
        ];
    }
}