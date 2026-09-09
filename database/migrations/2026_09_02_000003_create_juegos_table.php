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

        // Los motores del constructor de experiencias (rompecabezas/memoria/colorear/secuencia)
        // son fijos en frontend. Esta tabla solo almacena paquetes del catálogo SuperAdmin
        // (sembrados en migraciones posteriores con `ruta`).
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('juegos');
    }
};
