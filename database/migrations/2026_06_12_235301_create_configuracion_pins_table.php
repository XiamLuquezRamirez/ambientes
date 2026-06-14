<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('configuracion_pins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
            $table->enum('figura_1', ['circulo', 'estrella', 'corazon', 'triangulo', 'cuadrado', 'luna', 'diamante', 'rayo']);
            $table->enum('figura_2', ['circulo', 'estrella', 'corazon', 'triangulo', 'cuadrado', 'luna', 'diamante', 'rayo']);
            $table->enum('figura_3', ['circulo', 'estrella', 'corazon', 'triangulo', 'cuadrado', 'luna', 'diamante', 'rayo']);
            $table->unsignedTinyInteger('intentos_fallidos')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracion_pins');
    }
};
