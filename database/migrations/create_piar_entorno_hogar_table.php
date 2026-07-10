<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_entorno_hogar', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->string('nombre_madre')->nullable();

            $table->string('ocupacion_madre')->nullable();

            $table->string('nivel_madre', 100)->nullable();

            $table->string('nombre_padre')->nullable();

            $table->string('ocupacion_padre')->nullable();

            $table->string('nivel_padre', 100)->nullable();

            $table->string('nombre_cuidador')->nullable();

            $table->string('nivel_cuidador', 100)->nullable();

            $table->string('telefono_cuidador', 30)->nullable();

            $table->string('parentesco_cuidador', 100)->nullable();

            $table->string('correo_cuidador')->nullable();

            $table->integer('numero_hermanos')->nullable();

            $table->integer('lugar_ocupa')->nullable();

            $table->text('apoyo_crianza')->nullable();

            $table->text('personas_con_quien_vive')->nullable();

            $table->timestamps();

            $table->foreign('id_piar')
                ->references('id')
                ->on('piar')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_entorno_hogar');
    }
};