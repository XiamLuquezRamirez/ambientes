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

            // =========================
            // CLM
            // =========================

            $table->string('clm_1',10)->nullable();
            $table->text('clm_1_obs')->nullable();
            $table->string('clm_2',10)->nullable();
            $table->text('clm_2_obs')->nullable();
            $table->string('clm_3',10)->nullable();
            $table->text('clm_3_obs')->nullable();
            $table->string('clm_4',10)->nullable();
            $table->text('clm_4_obs')->nullable();
            $table->integer('clm_5_desde')->nullable();
            $table->integer('clm_5_hasta')->nullable();
            $table->string('clm_5',10)->nullable();
            $table->text('clm_5_obs')->nullable();
            $table->string("clm_6",10)->nullable();
            $table->text("clm_6_obs")->nullable();
            $table->string("clm_7",10)->nullable();
            $table->text("clm_7_obs")->nullable();
            $table->string("clm_8",10)->nullable();
            $table->text("clm_8_obs")->nullable();
            $table->string("clm_9",10)->nullable();
            $table->text("clm_9_obs")->nullable();
            $table->string("clm_10",10)->nullable();
            $table->text("clm_10_obs")->nullable();
            $table->string("clm_11",10)->nullable();
            $table->text("clm_11_obs")->nullable();
            $table->string("clm_12",10)->nullable();
            $table->text("clm_12_obs")->nullable();
            $table->string("clm_13",10)->nullable();
            $table->text("clm_13_obs")->nullable();
            $table->string("clm_14",10)->nullable();
            $table->text("clm_14_obs")->nullable();
            $table->string("clm_15",10)->nullable();
            $table->text("clm_15_obs")->nullable();
            $table->string("clm_16",10)->nullable();
            $table->text("clm_16_obs")->nullable();
            $table->string("clm_17",10)->nullable();
            $table->text("clm_17_obs")->nullable();
            $table->string("clm_18",10)->nullable();
            $table->text("clm_18_obs")->nullable();
            $table->string("clm_19",10)->nullable();
            $table->text("clm_19_obs")->nullable();
            

            $table->text('clm_observaciones')->nullable();

            // =========================
            // DBA MEM
            // =========================

          
            $table->string("dba_mem_1",10)->nullable();
            $table->text("dba_mem_1_obs")->nullable();
            $table->string("dba_mem_2",10)->nullable();
            $table->text("dba_mem_2_obs")->nullable();
            $table->string("dba_mem_3",10)->nullable();
            $table->text("dba_mem_3_obs")->nullable();
            $table->string("dba_mem_4",10)->nullable();
            $table->text("dba_mem_4_obs")->nullable();
            $table->string("dba_mem_5",10)->nullable();
            $table->text("dba_mem_5_obs")->nullable();
            $table->string("dba_mem_6",10)->nullable();
            $table->text("dba_mem_6_obs")->nullable();
            $table->string("dba_mem_7",10)->nullable();
            $table->text("dba_mem_7_obs")->nullable();


            // DBA ATE

            $table->string("dba_ate_1",10)->nullable();
            $table->text("dba_ate_1_obs")->nullable();
            $table->string("dba_ate_2",10)->nullable();
            $table->text("dba_ate_2_obs")->nullable();
            $table->string("dba_ate_3",10)->nullable();
            $table->text("dba_ate_3_obs")->nullable();
            $table->string("dba_ate_4",10)->nullable();
            $table->text("dba_ate_4_obs")->nullable();
            

            $table->string('dba_ate_4_tiempo',10)->nullable();

            // DBA PER

            $table->string("dba_per_1",10)->nullable();
            $table->text("dba_per_1_obs")->nullable();
            $table->string("dba_per_2",10)->nullable();
            $table->text("dba_per_2_obs")->nullable();
            $table->string("dba_per_3",10)->nullable();
            $table->text("dba_per_3_obs")->nullable();
            $table->string("dba_per_4",10)->nullable();
            $table->text("dba_per_4_obs")->nullable();
            $table->string("dba_per_5",10)->nullable();
            $table->text("dba_per_5_obs")->nullable();

            // DBA FE

            $table->string("dba_fe_1",10)->nullable();
            $table->text("dba_fe_1_obs")->nullable();
            $table->string("dba_fe_2",10)->nullable();
            $table->text("dba_fe_2_obs")->nullable();
            $table->string("dba_fe_3",10)->nullable();
            $table->text("dba_fe_3_obs")->nullable();
            $table->string("dba_fe_4",10)->nullable();
            $table->text("dba_fe_4_obs")->nullable();
            $table->string("dba_fe_5",10)->nullable();
            $table->text("dba_fe_5_obs")->nullable();
            $table->string("dba_fe_6",10)->nullable();
            $table->text("dba_fe_6_obs")->nullable();

            // DBA LC

            $table->string("dba_lc_1",10)->nullable();
            $table->text("dba_lc_1_obs")->nullable();
            $table->string("dba_lc_2",10)->nullable();
            $table->text("dba_lc_2_obs")->nullable();
            $table->string("dba_lc_3",10)->nullable();
            $table->text("dba_lc_3_obs")->nullable();
            $table->string("dba_lc_4",10)->nullable();
            $table->text("dba_lc_4_obs")->nullable();
            $table->string("dba_lc_5",10)->nullable();
            $table->text("dba_lc_5_obs")->nullable();
            $table->string("dba_lc_6",10)->nullable();
            $table->text("dba_lc_6_obs")->nullable();
            $table->string("dba_lc_7",10)->nullable();
            $table->text("dba_lc_7_obs")->nullable();
            $table->string("dba_lc_8",10)->nullable();
            $table->text("dba_lc_8_obs")->nullable();
            $table->string("dba_lc_9",10)->nullable();
            $table->text("dba_lc_9_obs")->nullable();
            $table->string("dba_lc_10",10)->nullable();
            $table->text("dba_lc_10_obs")->nullable();

            $table->text('habilidades_destrezas')->nullable();
            $table->text('estrategias_acciones')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('piar_valoracion_pedagogica');
    }
};