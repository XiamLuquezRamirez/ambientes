<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grados', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 60);
            $table->tinyInteger('edad_anos');
            $table->string('descripcion')->nullable();
            $table->tinyInteger('orden');
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        DB::table('grados')->insert([
            [
                'nombre'      => 'Prejardin',
                'edad_anos'   => 3,
                'descripcion' => 'Para ninos de 3 anos. Socializacion y desarrollo motriz.',
                'orden'       => 1,
                'activo'      => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'Jardin',
                'edad_anos'   => 4,
                'descripcion' => 'Para ninos de 4 anos. Colores, numeros y letras.',
                'orden'       => 2,
                'activo'      => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'nombre'      => 'Transicion',
                'edad_anos'   => 5,
                'descripcion' => 'Para ninos de 5 anos. Lectoescritura y habilidades logicas.',
                'orden'       => 3,
                'activo'      => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('grados');
    }
};
