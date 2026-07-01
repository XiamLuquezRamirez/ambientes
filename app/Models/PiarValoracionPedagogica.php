<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PiarValoracionPedagogica extends Model
{
    protected $table = 'piar_valoracion_pedagogica';

    protected $fillable = [
        'id_piar',

        // Valoración pedagógica
        'vp_mov_apoyo_sistema',
        'vp_mov_apoyo_sistema_obs',
        'vp_mov_ajustes_espacio',
        'vp_mov_ajustes_espacio_obs',
        'vp_mov_ajustes_movilidad',
        'vp_mov_ajustes_movilidad_obs',
        'vp_mov_motricidad_fina',
        'vp_mov_motricidad_fina_obs',
        'vp_mov_adaptacion_agarrar',
        'vp_mov_adaptacion_agarrar_obs',
        'vp_mov_intensidad',

        'vp_com_apoyo_sistema',
        'vp_com_apoyo_sistema_obs',
        'vp_com_aditamentos',
        'vp_com_aditamentos_obs',
        'vp_com_ajustes',
        'vp_com_ajustes_obs',
        'vp_com_intensidad',

        'vp_info_apoyo_sistema',
        'vp_info_apoyo_sistema_obs',
        'vp_info_ajustes',
        'vp_info_ajustes_obs',
        'vp_info_intensidad',

        'vp_soc_apoyo_regulacion',
        'vp_soc_apoyo_regulacion_obs',
        'vp_soc_ajustes_interaccion',
        'vp_soc_ajustes_interaccion_obs',
        'vp_soc_intensidad',

        'vp_acad_ajustes_permanencia',
        'vp_acad_ajustes_permanencia_obs',
        'vp_acad_ajustes_tiempos',
        'vp_acad_ajustes_tiempos_obs',
        'vp_acad_intensidad',

        'vp_observaciones',

        // CLE
        'cle_1','cle_1_obs',
        'cle_2','cle_2_obs',
        'cle_3','cle_3_obs',
        'cle_4','cle_4_obs',
        'cle_5','cle_5_obs',
        'cle_6','cle_6_obs',
        'cle_7','cle_7_obs',
        'cle_8','cle_8_obs',
        'cle_9','cle_9_obs',
        'cle_10','cle_10_obs',
        'cle_11','cle_11_obs',
        'cle_12','cle_12_obs',
        'cle_13','cle_13_obs',
        'cle_14','cle_14_obs',
        'cle_15','cle_15_obs',
        'cle_16','cle_16_obs',
        'cle_17','cle_17_obs',
        'cle_18','cle_18_obs',
        'cle_observaciones',

        // CLM
        'clm_1','clm_1_obs',
        'clm_2','clm_2_obs',
        'clm_3','clm_3_obs',
        'clm_4','clm_4_obs',
        'clm_5_desde','clm_5_hasta',
        'clm_5','clm_5_obs',
        'clm_6','clm_6_obs',
        'clm_7','clm_7_obs',
        'clm_8','clm_8_obs',
        'clm_9','clm_9_obs',
        'clm_10','clm_10_obs',
        'clm_11','clm_11_obs',
        'clm_12','clm_12_obs',
        'clm_13','clm_13_obs',
        'clm_14','clm_14_obs',
        'clm_15','clm_15_obs',
        'clm_16','clm_16_obs',
        'clm_17','clm_17_obs',
        'clm_18','clm_18_obs',
        'clm_19','clm_19_obs',
        'clm_observaciones',

        // DBA Memoria
        'dba_mem_1','dba_mem_1_obs',
        'dba_mem_2','dba_mem_2_obs',
        'dba_mem_3','dba_mem_3_obs',
        'dba_mem_4','dba_mem_4_obs',
        'dba_mem_5','dba_mem_5_obs',
        'dba_mem_6','dba_mem_6_obs',
        'dba_mem_7','dba_mem_7_obs',

        // DBA Atención
        'dba_ate_1','dba_ate_1_obs',
        'dba_ate_2','dba_ate_2_obs',
        'dba_ate_3','dba_ate_3_obs',
        'dba_ate_4','dba_ate_4_obs',

        // DBA Percepción
        'dba_per_1','dba_per_1_obs',
        'dba_per_2','dba_per_2_obs',
        'dba_per_3','dba_per_3_obs',
        'dba_per_4','dba_per_4_obs',
        'dba_per_5','dba_per_5_obs',

        // DBA Funciones Ejecutivas
        'dba_fe_1','dba_fe_1_obs',
        'dba_fe_2','dba_fe_2_obs',
        'dba_fe_3','dba_fe_3_obs',
        'dba_fe_4','dba_fe_4_obs',
        'dba_fe_5','dba_fe_5_obs',
        'dba_fe_6','dba_fe_6_obs',

        // DBA Lenguaje y Comunicación
        'dba_lc_1','dba_lc_1_obs',
        'dba_lc_2','dba_lc_2_obs',
        'dba_lc_3','dba_lc_3_obs',
        'dba_lc_4','dba_lc_4_obs',
        'dba_lc_5','dba_lc_5_obs',
        'dba_lc_6','dba_lc_6_obs',
        'dba_lc_7','dba_lc_7_obs',
        'dba_lc_8','dba_lc_8_obs',
        'dba_lc_9','dba_lc_9_obs',
        'dba_lc_10','dba_lc_10_obs',

        'habilidades_destrezas',
        'estrategias_acciones',
    ];
}