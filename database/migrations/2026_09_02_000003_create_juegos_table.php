<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('juegos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modulo_id')->constrained('modulos')->cascadeOnDelete();
            $table->string('tipo', 40);
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->string('icono', 80)->default('fa-gamepad');
            $table->string('color', 20)->default('#2563eb');
            $table->unsignedTinyInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->index(['modulo_id', 'activo', 'orden']);
        });

        $defaults = [
            [
                'tipo' => 'rompecabezas',
                'nombre' => 'Rompecabezas',
                'descripcion' => 'Armar la imagen arrastrando piezas',
                'icono' => 'fa-puzzle-piece',
                'color' => '#d97706',
                'orden' => 1,
            ],
            [
                'tipo' => 'memoria',
                'nombre' => 'Memoria',
                'descripcion' => 'Encontrar parejas de imágenes iguales',
                'icono' => 'fa-clone',
                'color' => '#0284c7',
                'orden' => 2,
            ],
            [
                'tipo' => 'colorear',
                'nombre' => 'Colorear',
                'descripcion' => 'Pintar sobre una imagen en blanco y negro',
                'icono' => 'fa-palette',
                'color' => '#a855f7',
                'orden' => 3,
            ],
            [
                'tipo' => 'secuencia',
                'nombre' => 'Secuencia',
                'descripcion' => 'Ordenar imágenes en el paso correcto',
                'icono' => 'fa-arrow-down-wide-short',
                'color' => '#0f6e56',
                'orden' => 4,
            ],
        ];

        $moduloIds = DB::table('modulos')
            ->where('es_oficial', true)
            ->whereNull('institucion_id')
            ->pluck('id');

        $now = now();
        $rows = [];
        foreach ($moduloIds as $moduloId) {
            foreach ($defaults as $juego) {
                $rows[] = array_merge($juego, [
                    'modulo_id' => $moduloId,
                    'activo' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if ($rows !== []) {
            DB::table('juegos')->insert($rows);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('juegos');
    }
};
