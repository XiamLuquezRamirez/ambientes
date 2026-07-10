<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('piar_valoracion_pedagogica', function (Blueprint $table) {

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
            $table->string('clm_6',10)->nullable();
            $table->text('clm_6_obs')->nullable();
            $table->string('clm_7',10)->nullable();
            $table->text('clm_7_obs')->nullable();
            $table->string('clm_8',10)->nullable();
            $table->text('clm_8_obs')->nullable();
            $table->string('clm_9',10)->nullable();
            $table->text('clm_9_obs')->nullable();
            $table->string('clm_10',10)->nullable();
            $table->text('clm_10_obs')->nullable();
            $table->string('clm_11',10)->nullable();
            $table->text('clm_11_obs')->nullable();
            $table->string('clm_12',10)->nullable();
            $table->text('clm_12_obs')->nullable();
            $table->string('clm_13',10)->nullable();
            $table->text('clm_13_obs')->nullable();
            $table->string('clm_14',10)->nullable();
            $table->text('clm_14_obs')->nullable();
            $table->string('clm_15',10)->nullable();
            $table->text('clm_15_obs')->nullable();
            $table->string('clm_16',10)->nullable();
            $table->text('clm_16_obs')->nullable();
            $table->string('clm_17',10)->nullable();
            $table->text('clm_17_obs')->nullable();
            $table->string('clm_18',10)->nullable();
            $table->text('clm_18_obs')->nullable();
            $table->string('clm_19',10)->nullable();
            $table->text('clm_19_obs')->nullable();

            $table->text('clm_observaciones')->nullable();

            // =========================
            // DBA MEM
            // =========================

            $table->string('dba_mem_1',10)->nullable();
            $table->text('dba_mem_1_obs')->nullable();
            $table->string('dba_mem_2',10)->nullable();
            $table->text('dba_mem_2_obs')->nullable();
            $table->string('dba_mem_3',10)->nullable();
            $table->text('dba_mem_3_obs')->nullable();
            $table->string('dba_mem_4',10)->nullable();
            $table->text('dba_mem_4_obs')->nullable();
            $table->string('dba_mem_5',10)->nullable();
            $table->text('dba_mem_5_obs')->nullable();
            $table->string('dba_mem_6',10)->nullable();
            $table->text('dba_mem_6_obs')->nullable();
            $table->string('dba_mem_7',10)->nullable();
            $table->text('dba_mem_7_obs')->nullable();

            // =========================
            // DBA ATE
            // =========================

            $table->string('dba_ate_1',10)->nullable();
            $table->text('dba_ate_1_obs')->nullable();
            $table->string('dba_ate_2',10)->nullable();
            $table->text('dba_ate_2_obs')->nullable();
            $table->string('dba_ate_3',10)->nullable();
            $table->text('dba_ate_3_obs')->nullable();
            $table->string('dba_ate_4',10)->nullable();
            $table->text('dba_ate_4_obs')->nullable();
            $table->string('dba_ate_4_tiempo',10)->nullable();

            // =========================
            // DBA PER
            // =========================

            $table->string('dba_per_1',10)->nullable();
            $table->text('dba_per_1_obs')->nullable();
            $table->string('dba_per_2',10)->nullable();
            $table->text('dba_per_2_obs')->nullable();
            $table->string('dba_per_3',10)->nullable();
            $table->text('dba_per_3_obs')->nullable();
            $table->string('dba_per_4',10)->nullable();
            $table->text('dba_per_4_obs')->nullable();
            $table->string('dba_per_5',10)->nullable();
            $table->text('dba_per_5_obs')->nullable();

            // =========================
            // DBA FE
            // =========================

            $table->string('dba_fe_1',10)->nullable();
            $table->text('dba_fe_1_obs')->nullable();
            $table->string('dba_fe_2',10)->nullable();
            $table->text('dba_fe_2_obs')->nullable();
            $table->string('dba_fe_3',10)->nullable();
            $table->text('dba_fe_3_obs')->nullable();
            $table->string('dba_fe_4',10)->nullable();
            $table->text('dba_fe_4_obs')->nullable();
            $table->string('dba_fe_5',10)->nullable();
            $table->text('dba_fe_5_obs')->nullable();
            $table->string('dba_fe_6',10)->nullable();
            $table->text('dba_fe_6_obs')->nullable();

            // =========================
            // DBA LC
            // =========================

            $table->string('dba_lc_1',10)->nullable();
            $table->text('dba_lc_1_obs')->nullable();
            $table->string('dba_lc_2',10)->nullable();
            $table->text('dba_lc_2_obs')->nullable();
            $table->string('dba_lc_3',10)->nullable();
            $table->text('dba_lc_3_obs')->nullable();
            $table->string('dba_lc_4',10)->nullable();
            $table->text('dba_lc_4_obs')->nullable();
            $table->string('dba_lc_5',10)->nullable();
            $table->text('dba_lc_5_obs')->nullable();
            $table->string('dba_lc_6',10)->nullable();
            $table->text('dba_lc_6_obs')->nullable();
            $table->string('dba_lc_7',10)->nullable();
            $table->text('dba_lc_7_obs')->nullable();
            $table->string('dba_lc_8',10)->nullable();
            $table->text('dba_lc_8_obs')->nullable();
            $table->string('dba_lc_9',10)->nullable();
            $table->text('dba_lc_9_obs')->nullable();
            $table->string('dba_lc_10',10)->nullable();
            $table->text('dba_lc_10_obs')->nullable();

            $table->text('habilidades_destrezas')->nullable();
            $table->text('estrategias_acciones')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('piar_valoracion_pedagogica', function (Blueprint $table) {

            $table->dropColumn([
                'clm_1','clm_1_obs','clm_2','clm_2_obs','clm_3','clm_3_obs',
                'clm_4','clm_4_obs','clm_5_desde','clm_5_hasta','clm_5','clm_5_obs',
                'clm_6','clm_6_obs','clm_7','clm_7_obs','clm_8','clm_8_obs',
                'clm_9','clm_9_obs','clm_10','clm_10_obs','clm_11','clm_11_obs',
                'clm_12','clm_12_obs','clm_13','clm_13_obs','clm_14','clm_14_obs',
                'clm_15','clm_15_obs','clm_16','clm_16_obs','clm_17','clm_17_obs',
                'clm_18','clm_18_obs','clm_19','clm_19_obs','clm_observaciones',

                'dba_mem_1','dba_mem_1_obs','dba_mem_2','dba_mem_2_obs',
                'dba_mem_3','dba_mem_3_obs','dba_mem_4','dba_mem_4_obs',
                'dba_mem_5','dba_mem_5_obs','dba_mem_6','dba_mem_6_obs',
                'dba_mem_7','dba_mem_7_obs',

                'dba_ate_1','dba_ate_1_obs','dba_ate_2','dba_ate_2_obs',
                'dba_ate_3','dba_ate_3_obs','dba_ate_4','dba_ate_4_obs',
                'dba_ate_4_tiempo',

                'dba_per_1','dba_per_1_obs','dba_per_2','dba_per_2_obs',
                'dba_per_3','dba_per_3_obs','dba_per_4','dba_per_4_obs',
                'dba_per_5','dba_per_5_obs',

                'dba_fe_1','dba_fe_1_obs','dba_fe_2','dba_fe_2_obs',
                'dba_fe_3','dba_fe_3_obs','dba_fe_4','dba_fe_4_obs',
                'dba_fe_5','dba_fe_5_obs','dba_fe_6','dba_fe_6_obs',

                'dba_lc_1','dba_lc_1_obs','dba_lc_2','dba_lc_2_obs',
                'dba_lc_3','dba_lc_3_obs','dba_lc_4','dba_lc_4_obs',
                'dba_lc_5','dba_lc_5_obs','dba_lc_6','dba_lc_6_obs',
                'dba_lc_7','dba_lc_7_obs','dba_lc_8','dba_lc_8_obs',
                'dba_lc_9','dba_lc_9_obs','dba_lc_10','dba_lc_10_obs',

                'habilidades_destrezas',
                'estrategias_acciones',
            ]);
        });
    }
};