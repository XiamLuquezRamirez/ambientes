<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_ajuste_razonable', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->unsignedBigInteger('docente_orientador_id')->nullable();

            $table->unsignedBigInteger('docente_apoyo_pedagogico_id')->nullable();

            $table->unsignedBigInteger('docente_coordinador_pedagogico_id')->nullable();

            $table->text('docente_orientador_area')->nullable();

            $table->text('docente_apoyo_pedagogico_area')->nullable();

            $table->text('docente_coordinador_pedagogico_area')->nullable();

            $table->timestamps();

            $table->foreign('id_piar')
                ->references('id')
                ->on('piar')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_ajuste_razonable');
    }
};