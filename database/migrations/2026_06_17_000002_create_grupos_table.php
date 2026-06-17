<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grupos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grado_id')
                  ->constrained('grados')
                  ->onDelete('restrict');
            $table->string('nombre', 10);
            $table->year('anio_lectivo');
            $table->tinyInteger('cupo_maximo')->default(30);
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['grado_id', 'nombre', 'anio_lectivo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grupos');
    }
};
