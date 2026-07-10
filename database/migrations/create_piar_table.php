<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar', function (Blueprint $table) {
            $table->id();

            $table->foreignId('estudiante_id')
                ->unique()
                ->constrained('estudiantes')
                ->cascadeOnDelete();

            $table->foreignId('docente_id')
                ->nullable()
                ->constrained('docentes')
                ->nullOnDelete();

            $table->enum('estado', [
                'borrador',
                'revisado',
                'aprobado'
            ])->default('borrador');

            $table->integer('paso')->nullable();

            $table->text('fecha_diligenciamiento')->nullable();

            $table->timestamps();

            $table->integer('activo')->default(1);
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar');
    }
};