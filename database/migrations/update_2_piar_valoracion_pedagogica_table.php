<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('piar_valoracion_pedagogica', function (Blueprint $table) {
            $table->string('dba_ate_1',10)->nullable();
            $table->text('dba_ate_1_obs')->nullable();
            $table->string('dba_ate_2',10)->nullable();
            $table->text('dba_ate_2_obs')->nullable();
            $table->string('dba_ate_3',10)->nullable();
            $table->text('dba_ate_3_obs')->nullable();
            $table->string('dba_ate_4',10)->nullable();
            $table->text('dba_ate_4_obs')->nullable();
            $table->string('dba_ate_4_tiempo',10)->nullable();

        
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
                'dba_ate_1','dba_ate_1_obs','dba_ate_2','dba_ate_2_obs',
                'dba_ate_3','dba_ate_3_obs','dba_ate_4','dba_ate_4_obs',
                'dba_ate_4_tiempo','dba_per_1','dba_per_1_obs','dba_per_2','dba_per_2_obs',
                'dba_per_3','dba_per_3_obs','dba_per_4','dba_per_4_obs',
                'dba_per_5','dba_per_5_obs','dba_fe_1','dba_fe_1_obs','dba_fe_2','dba_fe_2_obs',
                'dba_fe_3','dba_fe_3_obs','dba_fe_4','dba_fe_4_obs','dba_fe_5','dba_fe_5_obs',
                'dba_fe_6','dba_fe_6_obs','dba_lc_1','dba_lc_1_obs','dba_lc_2','dba_lc_2_obs',
                'dba_lc_3','dba_lc_3_obs','dba_lc_4','dba_lc_4_obs','dba_lc_5','dba_lc_5_obs',  
                'dba_lc_6','dba_lc_6_obs','dba_lc_7','dba_lc_7_obs','dba_lc_8','dba_lc_8_obs',
                'dba_lc_9','dba_lc_9_obs','dba_lc_10','dba_lc_10_obs','habilidades_destrezas','estrategias_acciones'
            ]);
        });
    }
};