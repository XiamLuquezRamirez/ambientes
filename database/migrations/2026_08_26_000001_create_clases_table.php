<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clases', function (Blueprint $table) {
            $table->id();

            $table->foreignId('carga_docente_id')
                ->constrained('carga_docente')
                ->cascadeOnDelete();

            $table->foreignId('docente_id')
                ->constrained('docentes')
                ->cascadeOnDelete();

            $table->foreignId('ambiente_id')
                ->constrained('ambientes')
                ->cascadeOnDelete();

            $table->foreignId('modulo_id')
                ->nullable()
                ->constrained('modulos')
                ->nullOnDelete();

            $table->foreignId('eje_id')
                ->nullable()
                ->constrained('ejes')
                ->nullOnDelete();

            $table->foreignId('tematica_id')
                ->nullable()
                ->constrained('tematicas')
                ->nullOnDelete();

            $table->foreignId('experiencia_id')
                ->nullable()
                ->constrained('experiencias')
                ->nullOnDelete();

            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->date('fecha')->nullable();
            $table->string('estado', 20)->default('borrador');
            $table->unsignedSmallInteger('anio_lectivo');

            $table->timestamps();

            $table->index(['carga_docente_id', 'anio_lectivo']);
            $table->index(['docente_id', 'ambiente_id', 'anio_lectivo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clases');
    }
};
