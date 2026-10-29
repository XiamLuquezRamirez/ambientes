<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Corrige nombres basura del scrapeo (markdown, typos, truncados) en juegos ya partidos.
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private const NOMBRES = [
        'atrapa-las-notas-musicales' => 'Atrapa las notas musicales',
        'busca-la-bocal-i' => 'Busca La Vocal I',
        'foco-discriminacion-de-formas-geometricas-aereas-y-proporciones' => 'Discriminación de formas geométricas aéreas',
        'laboratorio-de-limpieza-y-revelado-tactil' => 'Laboratorio de limpieza y revelado táctil',
        'redisenado-canasta-de-la-vista' => 'Canasta de la vista',
        'con-que-sentido-sentimos-la-campana-estimulo-sonoro-asociacion-con-el-senti' => '¿Con qué sentido sentimos la campana?',
        'con-que-sentido-sentimos-la-flor-estimulo-olfativo-asociacion-con-el-sentid' => '¿Con qué sentido sentimos la flor?',
        'con-que-sentido-sentimos-el-heladoestimulo-gustativo-asociacion-con-el-sent' => '¿Con qué sentido sentimos el helado?',
        'con-que-sentido-sentimos-el-sol-estimulo-luminosovisual-asociacion-con-el' => '¿Con qué sentido sentimos el sol?',
        'cual-objeto-es-el-intruso-que-no-estaba-antesmemoria-de-trabajo-reconocimien' => '¿Cuál objeto es el intruso?',
        'cual-objeto-se-escondio-y-falta-memoria-de-trabajo-evocacion-del-elemento-au' => '¿Cuál objeto se escondió?',
        'deteccion-del-objeto-intruso-memoria-de-trabajo' => 'Detección del objeto intruso',
        'identificacion-del-objeto-faltante-memoria-de-evocacion-ausente-identificar-el' => 'Identificación del objeto faltante',
        'el-cambio-de-color-de-la-pelota-cambio-de-atributo-cualitativo' => 'El cambio de color de la pelota',
        'la-desaparicion-de-la-campana-cambio-por-sustraccion-sustraccion-obvia-3-el' => 'La desaparición de la campana',
        'la-aparicion-de-la-estrella-cambio-por-adicion-aparicion-de-elemento-nuevo' => 'La aparición de la estrella',
        'que-cambio-en-la-escena-cambio-de-atributo-cualitativo' => '¿Qué cambió en la escena?',
        'que-objeto-desapareciocambio-por-sustraccion-ausencia-de-elemento-4-eleme' => '¿Qué objeto desapareció?',
        'que-objeto-nuevo-apareciocambio-por-adicion-aparicion-de-elemento-intruso' => '¿Qué objeto nuevo apareció?',
        'el-objeto-de-colores-en-el-cielo-deduccion-por-pista-visual-4-opciones' => 'El objeto de colores en el cielo',
        'el-objeto-musical-ruidoso-deduccion-por-pista-auditiva-4-opciones' => 'El objeto musical ruidoso',
        'el-objeto-de-aroma-dulce-deduccion-por-pista-olfativa-4-opciones' => 'El objeto de aroma dulce',
        'el-objeto-dulce-y-frio-deduccion-por-pista-gustativatermica-4-opciones' => 'El objeto dulce y frío',
        'el-espectro-de-luz-deduccion-multivariable-5-opciones' => 'El espectro de luz',
        'el-instrumento-de-percusion-deduccion-por-accion-y-mecanica-del-sonido-5-opci' => 'El instrumento de percusión',
        'la-esencia-concentrada-deduccion-quimica-y-esencia-5-opciones' => 'La esencia concentrada',
        'el-alimento-congelado-deduccion-termica-y-sensorial-doble-5-opciones' => 'El alimento congelado',
        'canasta-del-oido' => 'Canasta del oído',
        'que-suena' => '¿Qué suena?',
        'que-objeto-suena' => '¿Qué objeto suena?',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();
        foreach (self::NOMBRES as $slug => $nombre) {
            DB::table('juegos')->where('slug', $slug)->update([
                'nombre' => $nombre,
                'updated_at' => $ahora,
            ]);
        }
    }

    public function down(): void
    {
        // Irreversible de forma segura: los nombres previos eran basura de scrapeo.
    }
};
