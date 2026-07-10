<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_acta_compromiso', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            $table->text('compromisos')->nullable();

            $table->timestamps();      
            
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_acta_compromiso');
    }
};