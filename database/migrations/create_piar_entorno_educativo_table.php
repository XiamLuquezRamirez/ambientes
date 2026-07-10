<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_entorno_educativo', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->string('vinculado_otra_institucion', 10)->nullable();

            $table->text('instituciones_anteriores')->nullable();

            $table->text('motivo_no_vinculado')->nullable();

            $table->string('ultimo_grado', 100)->nullable();

            $table->string('estado_ultimo_grado', 100)->nullable();

            $table->text('observaciones_estado')->nullable();

            $table->string('recibe_informe_pedagogico', 10)->nullable();

            $table->string('institucion_informe')->nullable();

            $table->string('programas_complementarios', 10)->nullable();

            $table->text('cuales_programas')->nullable();

            $table->timestamps();

            $table->foreign('id_piar')
                ->references('id')
                ->on('piar')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_entorno_educativo');
    }
};