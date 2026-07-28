<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_medicamento', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_entorno_salud');

            $table->string('cual');

            $table->string('frecuencia');

            $table->string('horario');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_medicamento');
    }
};