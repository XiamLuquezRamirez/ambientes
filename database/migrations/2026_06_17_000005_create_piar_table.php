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
                  ->onDelete('cascade');
            $table->foreignId('docente_id')
                  ->nullable()
                  ->constrained('docentes')
                  ->onDelete('set null');
            $table->year('anio_lectivo');
            $table->text('descripcion_diagnostico')->nullable();
            $table->text('barreras_aprendizaje')->nullable();
            $table->text('ajustes_propuestos')->nullable();
            $table->enum('estado', ['borrador', 'revisado', 'aprobado'])->default('borrador');
            $table->string('archivo_adjunto')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar');
    }
};
