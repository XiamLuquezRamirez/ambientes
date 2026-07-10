<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_datos_generales', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->string('vinculado')->nullable();

            $table->string('victima', 10)->nullable();

            $table->string('registro_victima')->nullable();

            $table->string('centro_proteccion', 10)->nullable();

            $table->string('cual_centro_proteccion')->nullable();

            $table->string('grupo_etnico', 10)->nullable();

            $table->string('cual_etnico')->nullable();

            $table->text('capacidades')->nullable();

            $table->text('gustos')->nullable();

            $table->text('expectativas_estudiante')->nullable();

            $table->text('expectativas_familia')->nullable();

            $table->text('redes_apoyo')->nullable();

            $table->text('otras')->nullable();

            $table->date('fecha_diligenciamiento')->nullable();

            $table->timestamps();

            $table->foreign('id_piar')
                ->references('id')
                ->on('piar')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_datos_generales');
    }
};