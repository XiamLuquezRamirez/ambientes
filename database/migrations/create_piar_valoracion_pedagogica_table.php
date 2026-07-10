<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('piar_valoracion_pedagogica', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('id_piar');

            // =========================
            // VALORACIÓN PEDAGÓGICA
            // =========================

            $table->string('vp_mov_apoyo_sistema', 10)->nullable();
            $table->text('vp_mov_apoyo_sistema_obs')->nullable();
            $table->string('vp_mov_ajustes_espacio', 10)->nullable();
            $table->text('vp_mov_ajustes_espacio_obs')->nullable();
            $table->string('vp_mov_ajustes_movilidad', 10)->nullable();
            $table->text('vp_mov_ajustes_movilidad_obs')->nullable();
            $table->string('vp_mov_motricidad_fina', 10)->nullable();
            $table->text('vp_mov_motricidad_fina_obs')->nullable();
            $table->string('vp_mov_adaptacion_agarrar', 10)->nullable();
            $table->text('vp_mov_adaptacion_agarrar_obs')->nullable();
            $table->string('vp_mov_intensidad', 50)->nullable();

            $table->string('vp_com_apoyo_sistema', 10)->nullable();
            $table->text('vp_com_apoyo_sistema_obs')->nullable();
            $table->string('vp_com_aditamentos', 10)->nullable();
            $table->text('vp_com_aditamentos_obs')->nullable();
            $table->string('vp_com_ajustes', 10)->nullable();
            $table->text('vp_com_ajustes_obs')->nullable();
            $table->string('vp_com_intensidad', 50)->nullable();

            $table->string('vp_info_apoyo_sistema', 10)->nullable();
            $table->text('vp_info_apoyo_sistema_obs')->nullable();
            $table->string('vp_info_ajustes', 10)->nullable();
            $table->text('vp_info_ajustes_obs')->nullable();
            $table->string('vp_info_intensidad', 50)->nullable();

            $table->string('vp_soc_apoyo_regulacion', 10)->nullable();
            $table->text('vp_soc_apoyo_regulacion_obs')->nullable();
            $table->string('vp_soc_ajustes_interaccion', 10)->nullable();
            $table->text('vp_soc_ajustes_interaccion_obs')->nullable();
            $table->string('vp_soc_intensidad', 50)->nullable();

            $table->string('vp_acad_ajustes_permanencia', 10)->nullable();
            $table->text('vp_acad_ajustes_permanencia_obs')->nullable();
            $table->string('vp_acad_ajustes_tiempos', 10)->nullable();
            $table->text('vp_acad_ajustes_tiempos_obs')->nullable();
            $table->string('vp_acad_intensidad', 50)->nullable();

            $table->text('vp_observaciones')->nullable();

            // =========================
            // CLE 1 - 18
            // =========================

          
            $table->string("cle_1", 10)->nullable();
            $table->text("cle_1_obs")->nullable();
            $table->string("cle_2", 10)->nullable();
            $table->text("cle_2_obs")->nullable();
            $table->string("cle_3", 10)->nullable();
            $table->text("cle_3_obs")->nullable();
            $table->string("cle_4", 10)->nullable();
            $table->text("cle_4_obs")->nullable();
            $table->string("cle_5", 10)->nullable();
            $table->text("cle_5_obs")->nullable();
            $table->string("cle_6", 10)->nullable();
            $table->text("cle_6_obs")->nullable();
            $table->string("cle_7", 10)->nullable();
            $table->text("cle_7_obs")->nullable();
            $table->string("cle_8", 10)->nullable();
            $table->text("cle_8_obs")->nullable();
            $table->string("cle_9", 10)->nullable();
            $table->text("cle_9_obs")->nullable();
            $table->string("cle_10", 10)->nullable();
            $table->text("cle_10_obs")->nullable();
            $table->string("cle_11", 10)->nullable();
            $table->text("cle_11_obs")->nullable();
            $table->string("cle_12", 10)->nullable();
            $table->text("cle_12_obs")->nullable();
            $table->string("cle_13", 10)->nullable();
            $table->text("cle_13_obs")->nullable();
            $table->string("cle_14", 10)->nullable();
            $table->text("cle_14_obs")->nullable();
            $table->string("cle_15", 10)->nullable();
            $table->text("cle_15_obs")->nullable();
            $table->string("cle_16", 10)->nullable();
            $table->text("cle_16_obs")->nullable();
            $table->string("cle_17", 10)->nullable();
            $table->text("cle_17_obs")->nullable();
            $table->string("cle_18", 10)->nullable();
            $table->text("cle_18_obs")->nullable();
           

            $table->text('cle_observaciones')->nullable();

           
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_valoracion_pedagogica');
    }
};