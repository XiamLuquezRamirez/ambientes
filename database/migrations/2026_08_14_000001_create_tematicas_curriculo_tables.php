<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tematicas')) {
            Schema::create('tematicas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('eje_id')->constrained('ejes')->cascadeOnDelete();
                $table->string('nombre', 150);
                $table->string('competencia', 100)->nullable();
                $table->text('referente_alternativo')->nullable();
                $table->boolean('requiere_ra')->default(false);
                $table->boolean('requiere_acompanamiento')->default(false);
                $table->boolean('es_oficial')->default(true);
                $table->foreignId('institucion_id')
                    ->nullable()
                    ->constrained('instituciones')
                    ->nullOnDelete();
                $table->enum('estado', ['borrador', 'activa', 'archivada'])->default('borrador');
                $table->boolean('activo')->default(true);
                $table->foreignId('creado_por')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('experiencias')) {
            Schema::create('experiencias', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tematica_id')->constrained('tematicas')->cascadeOnDelete();
                $table->foreignId('grado_id')->constrained('grados')->restrictOnDelete();
                $table->string('nombre', 150);
                $table->text('objetivo');
                $table->text('proposito')->nullable();
                $table->text('habilidades')->nullable();
                $table->unsignedTinyInteger('duracion_minutos')->default(20);
                $table->text('referente_aprendizaje')->nullable();
                $table->enum('estado', ['borrador', 'activa', 'archivada'])->default('borrador');
                $table->boolean('activo')->default(true);
                $table->foreignId('creado_por')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('experiencia_materiales')) {
            Schema::create('experiencia_materiales', function (Blueprint $table) {
                $table->id();
                $table->foreignId('experiencia_id')->constrained('experiencias')->cascadeOnDelete();
                $table->string('nombre', 150);
                $table->string('cantidad', 60);
                $table->boolean('es_obligatorio')->default(true);
                $table->unsignedTinyInteger('orden')->default(1);
            });
        }

        if (! Schema::hasTable('indicadores_logro')) {
            Schema::create('indicadores_logro', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tematica_id')->constrained('tematicas')->cascadeOnDelete();
                $table->string('descripcion', 300);
                $table->unsignedTinyInteger('orden')->default(1);
            });
        }

        if (! Schema::hasTable('tematica_dba')) {
            Schema::create('tematica_dba', function (Blueprint $table) {
                $table->foreignId('tematica_id')->constrained('tematicas')->cascadeOnDelete();
                $table->foreignId('catalogo_dba_id')->constrained('catalogo_dba')->cascadeOnDelete();
                $table->enum('relacion', ['principal', 'complementario'])->default('principal');
                $table->text('observacion')->nullable();
                $table->primary(['tematica_id', 'catalogo_dba_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tematica_dba');
        Schema::dropIfExists('indicadores_logro');
        Schema::dropIfExists('experiencia_materiales');
        Schema::dropIfExists('experiencias');
        Schema::dropIfExists('tematicas');
    }
};
