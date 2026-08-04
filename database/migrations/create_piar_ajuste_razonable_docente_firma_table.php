<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_ajuste_razonable_docente_firma', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_ajuste_razonable');

            $table->unsignedBigInteger('docente_id');

            $table->text('area')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_ajuste_razonable_docente_firma');
    }
};