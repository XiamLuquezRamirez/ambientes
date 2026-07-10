<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_entorno_salud', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->string('afiliado_salud', 10)->nullable();

            $table->string('regimen', 50)->nullable();

            $table->string('eps')->nullable();

            $table->string('lugar_emergencia')->nullable();

            $table->string('diagnostico_medico', 10)->nullable();

            $table->text('cual_diagnostico')->nullable();

            $table->string('atencion_medica', 10)->nullable();

            $table->string('tratamiento_integral', 10)->nullable();

            $table->string('consume_medicamentos', 10)->nullable();

            $table->string('ayudas_tecnicas', 10)->nullable();

            $table->text('cuales_ayudas')->nullable();

            $table->timestamps();

            $table->foreign('id_piar')
                ->references('id')
                ->on('piar')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_entorno_salud');
    }
};