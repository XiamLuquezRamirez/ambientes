<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_ajuste_razonable_item', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_ajuste_razonable');

            $table->string('area')->nullable();

            $table->text('barrera')->nullable();

            $table->string('tipo')->nullable();

            $table->text('apoyo')->nullable();

            $table->text('descripcion')->nullable();

            $table->text('seguimiento')->nullable();

            $table->timestamps();

            $table->foreign('id_ajuste_razonable')
                ->references('id')
                ->on('piar_ajuste_razonable')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_ajuste_razonable_item');
    }
};