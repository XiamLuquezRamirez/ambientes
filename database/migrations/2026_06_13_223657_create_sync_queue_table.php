<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sync_queue', function (Blueprint $table) {
            $table->id();
            $table->string('entidad');
            $table->unsignedBigInteger('entidad_id');
            $table->enum('accion', ['create', 'update', 'delete', 'transfer']);
            $table->string('servidor_origen')->default('musica');
            $table->json('payload');
            $table->enum('estado', ['pendiente', 'enviado', 'confirmado', 'error'])->default('pendiente');
            $table->unsignedTinyInteger('intentos')->default(0);
            $table->timestamp('enviado_en')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_queue');
    }
};
