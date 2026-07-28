<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_acta_compromiso_actividades', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_acta_compromiso');

            $table->string('nombre');

            $table->text('descripcion')->nullable();

            $table->string('frecuencia', 100)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_acta_compromiso_actividades');
    }
};