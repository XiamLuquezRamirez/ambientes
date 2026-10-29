<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte los juegos Multisaberes implementados (1 reto = 1 juego).
 * Generado desde scripts/manifest-partir-multisaberes.json
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 8;

    private const EJE_ID = 19;

    private const MODULO_ID = 3;

    /** @var list<array{slug: string, nombre: string, carpeta: string, tematica_id: int, color: string, slug_antiguo: string}> */
    private const JUEGOS = [
        ['slug' => "encuentra-la-a", 'nombre' => "Encuentra La A", 'carpeta' => "DescubreLasVocales/EncuentraLaA", 'tematica_id' => 38, 'color' => "#ef4444", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "donde-esta-la-e", 'nombre' => "¿Dónde Está La E?", 'carpeta' => "DescubreLasVocales/DondeEstaLaE", 'tematica_id' => 38, 'color' => "#f97316", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "busca-la-bocal-i", 'nombre' => "Busca la Bocal I", 'carpeta' => "DescubreLasVocales/BuscaLaBocalI", 'tematica_id' => 38, 'color' => "#f59e0b", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "encuentra-la-vocal-o", 'nombre' => "Encuentra La Vocal O", 'carpeta' => "DescubreLasVocales/EncuentraLaVocalO", 'tematica_id' => 38, 'color' => "#84cc16", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "donde-esta-la-u", 'nombre' => "¿Donde Está La U?", 'carpeta' => "DescubreLasVocales/DondeEstaLaU", 'tematica_id' => 38, 'color' => "#22c55e", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "descubre-la-vocal", 'nombre' => "Descubre La Vocal", 'carpeta' => "DescubreLasVocales/DescubreLaVocal", 'tematica_id' => 38, 'color' => "#14b8a6", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "encuentra-la-vocal-que-suena", 'nombre' => "Encuentra La Vocal Que Suena", 'carpeta' => "DescubreLasVocales/EncuentraLaVocalQueSuena", 'tematica_id' => 38, 'color' => "#0ea5e9", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "una-nueva-vocal", 'nombre' => "Una Nueva Vocal", 'carpeta' => "DescubreLasVocales/UnaNuevaVocal", 'tematica_id' => 38, 'color' => "#3b82f6", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "escucha-y-reconoce", 'nombre' => "Escucha Y Reconoce", 'carpeta' => "DescubreLasVocales/EscuchaYReconoce", 'tematica_id' => 38, 'color' => "#6366f1", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "las-vocales-cambian-de-lugar", 'nombre' => "Las Vocales Cambian De Lugar", 'carpeta' => "DescubreLasVocales/LasVocalesCambianDeLugar", 'tematica_id' => 38, 'color' => "#8b5cf6", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "reconoce-sin-ayudas-visuales", 'nombre' => "Reconoce Sin Ayudas Visuales", 'carpeta' => "DescubreLasVocales/ReconoceSinAyudasVisuales", 'tematica_id' => 38, 'color' => "#a855f7", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "el-gran-desafio", 'nombre' => "El Gran Desafío", 'carpeta' => "DescubreLasVocales/ElGranDesafio", 'tematica_id' => 38, 'color' => "#ec4899", 'slug_antiguo' => "descubre-las-vocales"],
        ['slug' => "el-avion", 'nombre' => "El Avión", 'carpeta' => "ConQueVocalComienza/ElAvion", 'tematica_id' => 39, 'color' => "#ef4444", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "el-elefante", 'nombre' => "El Elefante", 'carpeta' => "ConQueVocalComienza/ElElefante", 'tematica_id' => 39, 'color' => "#f97316", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-iguana", 'nombre' => "La Iguana", 'carpeta' => "ConQueVocalComienza/LaIguana", 'tematica_id' => 39, 'color' => "#f59e0b", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "el-oso", 'nombre' => "El Oso", 'carpeta' => "ConQueVocalComienza/ElOso", 'tematica_id' => 39, 'color' => "#84cc16", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "las-uvas", 'nombre' => "Las Uvas", 'carpeta' => "ConQueVocalComienza/LasUvas", 'tematica_id' => 39, 'color' => "#22c55e", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-vocal-a-escondida", 'nombre' => "La Vocal A Escondida", 'carpeta' => "ConQueVocalComienza/LaVocalAEscondida", 'tematica_id' => 39, 'color' => "#14b8a6", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-vocal-e-escondida", 'nombre' => "La Vocal E Escondida", 'carpeta' => "ConQueVocalComienza/LaVocalEEscondida", 'tematica_id' => 39, 'color' => "#0ea5e9", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-vocal-i-escondida", 'nombre' => "La Vocal I Escondida", 'carpeta' => "ConQueVocalComienza/LaVocalIEscondida", 'tematica_id' => 39, 'color' => "#3b82f6", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-vocal-o-escondida", 'nombre' => "La Vocal O Escondida", 'carpeta' => "ConQueVocalComienza/LaVocalOEscondida", 'tematica_id' => 39, 'color' => "#6366f1", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "la-vocal-u-escondida", 'nombre' => "La Vocal U Escondida", 'carpeta' => "ConQueVocalComienza/LaVocalUEscondida", 'tematica_id' => 39, 'color' => "#8b5cf6", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "el-detective-de-las-vocales", 'nombre' => "El Detective De Las Vocales", 'carpeta' => "ConQueVocalComienza/ElDetectiveDeLasVocales", 'tematica_id' => 39, 'color' => "#a855f7", 'slug_antiguo' => "con-que-vocal-comienza"],
        ['slug' => "construye-la-vocal-a", 'nombre' => "Construye La Vocal A", 'carpeta' => "ConstruyeLaVocal/ConstruyeLaVocalA", 'tematica_id' => 40, 'color' => "#ec4899", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "las-piezas-de-la-vocal-e", 'nombre' => "Las Piezas De La Vocal E", 'carpeta' => "ConstruyeLaVocal/LasPiezasDeLaVocalE", 'tematica_id' => 40, 'color' => "#ef4444", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "la-vocal-i-necesita-ayuda", 'nombre' => "La Vocal I Necesita Ayuda", 'carpeta' => "ConstruyeLaVocal/LaVocalINecesitaAyuda", 'tematica_id' => 40, 'color' => "#f97316", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "arma-la-vocal-o", 'nombre' => "Arma La Vocal O", 'carpeta' => "ConstruyeLaVocal/ArmaLaVocalO", 'tematica_id' => 40, 'color' => "#f59e0b", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "completa-la-vocal-u", 'nombre' => "Completa La Vocal U", 'carpeta' => "ConstruyeLaVocal/CompletaLaVocalU", 'tematica_id' => 40, 'color' => "#84cc16", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "activa-las-maquinas-de-las-vocales", 'nombre' => "Activa Las Maquinas De Las Vocales", 'carpeta' => "ConstruyeLaVocal/ActivaLasMaquinasDeLasVocales", 'tematica_id' => 40, 'color' => "#22c55e", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "construye-la-vocal-a-2", 'nombre' => "Construye La Vocal A", 'carpeta' => "ConstruyeLaVocal/ConstruyeLaVocalA2", 'tematica_id' => 40, 'color' => "#14b8a6", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "la-vocal-e-perdio-sus-segmentos", 'nombre' => "La Vocal E Perdió Sus Segmentos", 'carpeta' => "ConstruyeLaVocal/LaVocalEPerdioSusSegmentos", 'tematica_id' => 40, 'color' => "#0ea5e9", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "la-vocal-i-en-gravedad-cero", 'nombre' => "La Vocal I En Gravedad Cero", 'carpeta' => "ConstruyeLaVocal/LaVocalIEnGravedadCero", 'tematica_id' => 40, 'color' => "#3b82f6", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "el-anillo-de-la-vocal-o", 'nombre' => "El Anillo De La Vocal O", 'carpeta' => "ConstruyeLaVocal/ElAnilloDeLaVocalO", 'tematica_id' => 40, 'color' => "#6366f1", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "completa-la-vocal-u-2", 'nombre' => "Completa La Vocal U", 'carpeta' => "ConstruyeLaVocal/CompletaLaVocalU2", 'tematica_id' => 40, 'color' => "#8b5cf6", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "el-portal-de-las-cinco-vocales", 'nombre' => "El Portal De Las Cinco Vocales", 'carpeta' => "ConstruyeLaVocal/ElPortalDeLasCincoVocales", 'tematica_id' => 40, 'color' => "#a855f7", 'slug_antiguo' => "construye-la-vocal"],
        ['slug' => "descubre-la-primera-pareja", 'nombre' => "Descubre La Primera Pareja", 'carpeta' => "EncuentraLaPareja/DescubreLaPrimeraPareja", 'tematica_id' => 41, 'color' => "#ec4899", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "una-nueva-pareja", 'nombre' => "Una Nueva Pareja", 'carpeta' => "EncuentraLaPareja/UnaNuevaPareja", 'tematica_id' => 41, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "el-jardin-florecido", 'nombre' => "El Jardín Florecido", 'carpeta' => "EncuentraLaPareja/ElJardinFlorecido", 'tematica_id' => 41, 'color' => "#f97316", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "los-primeros-espejos", 'nombre' => "Los Primeros Espejos", 'carpeta' => "EncuentraLaPareja/LosPrimerosEspejos", 'tematica_id' => 41, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "el-espejo-cambiante", 'nombre' => "El Espejo Cambiante", 'carpeta' => "EncuentraLaPareja/ElEspejoCambiante", 'tematica_id' => 41, 'color' => "#84cc16", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "la-camara-de-las-cinco-vocales", 'nombre' => "La Camara De Las Cinco Vocales", 'carpeta' => "EncuentraLaPareja/LaCamaraDeLasCincoVocales", 'tematica_id' => 41, 'color' => "#22c55e", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "abre-el-castillo", 'nombre' => "Abre El Castillo", 'carpeta' => "EncuentraLaPareja/AbreElCastillo", 'tematica_id' => 41, 'color' => "#14b8a6", 'slug_antiguo' => "encuentra-la-pareja-2"],
        ['slug' => "el-puente-de-la-vocal", 'nombre' => "El Puente De La Vocal", 'carpeta' => "ElRetoDeLasVocales/ElPuenteDeLaVocal", 'tematica_id' => 42, 'color' => "#0ea5e9", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "la-rueda-de-las-imagenes", 'nombre' => "La Rueda De Las Imágenes", 'carpeta' => "ElRetoDeLasVocales/LaRuedaDeLasImagenes", 'tematica_id' => 42, 'color' => "#3b82f6", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "las-rocas-saltarinas", 'nombre' => "Las Rocas Saltarinas", 'carpeta' => "ElRetoDeLasVocales/LasRocasSaltarinas", 'tematica_id' => 42, 'color' => "#6366f1", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "la-puerta-misteriosa", 'nombre' => "La Puerta Misteriosa", 'carpeta' => "ElRetoDeLasVocales/LaPuertaMisteriosa", 'tematica_id' => 42, 'color' => "#8b5cf6", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "la-lluvia-de-vocales", 'nombre' => "La Lluvia De Vocales", 'carpeta' => "ElRetoDeLasVocales/LaLluviaDeVocales", 'tematica_id' => 42, 'color' => "#a855f7", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "los-cristales-perdidos", 'nombre' => "Los Cristales Perdidos", 'carpeta' => "ElRetoDeLasVocales/LosCristalesPerdidos", 'tematica_id' => 42, 'color' => "#ec4899", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "el-robot-despistado", 'nombre' => "El Robot Despistado", 'carpeta' => "ElRetoDeLasVocales/ElRobotDespistado", 'tematica_id' => 42, 'color' => "#ef4444", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "el-camino-de-las-vocales", 'nombre' => "El Camino De Las Vocales", 'carpeta' => "ElRetoDeLasVocales/ElCaminoDeLasVocales", 'tematica_id' => 42, 'color' => "#f97316", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "repara-el-generador", 'nombre' => "Repara El Generador", 'carpeta' => "ElRetoDeLasVocales/ReparaElGenerador", 'tematica_id' => 42, 'color' => "#f59e0b", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "el-desafio-de-las-imagenes", 'nombre' => "El Desafío De Las Imágenes", 'carpeta' => "ElRetoDeLasVocales/ElDesafioDeLasImagenes", 'tematica_id' => 42, 'color' => "#84cc16", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "activa-el-planeta", 'nombre' => "Activa El Planeta", 'carpeta' => "ElRetoDeLasVocales/ActivaElPlaneta", 'tematica_id' => 42, 'color' => "#22c55e", 'slug_antiguo' => "el-reto-de-las-vocales"],
        ['slug' => "encuentra-la-a-2", 'nombre' => "Encuentra la a", 'carpeta' => "CuentaLosObjetos/EncuentraLaA", 'tematica_id' => 43, 'color' => "#14b8a6", 'slug_antiguo' => "cuenta-los-objetos"],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $ahora = now();
        $antiguos = array_values(array_unique(array_column(self::JUEGOS, 'slug_antiguo')));
        DB::table('juegos')->whereIn('slug', $antiguos)->delete();

        $ordenBase = ((int) DB::table('juegos')->max('orden')) + 1;

        foreach (self::JUEGOS as $i => $juego) {
            $ejeId = (int) (DB::table('tematicas')->where('id', $juego['tematica_id'])->value('eje_id') ?: self::EJE_ID);
            $payload = [
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => $ejeId,
                'tematica_id' => $juego['tematica_id'],
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/Multisaberes/'.$juego['carpeta'],
                'nombre' => $juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => $juego['color'],
                'orden' => $ordenBase + $i,
                'activo' => 1,
                'updated_at' => $ahora,
            ];

            if (DB::table('juegos')->where('slug', $juego['slug'])->exists()) {
                DB::table('juegos')->where('slug', $juego['slug'])->update($payload);
            } else {
                DB::table('juegos')->insert(array_merge($payload, [
                    'slug' => $juego['slug'],
                    'created_at' => $ahora,
                ]));
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }
        DB::table('juegos')->whereIn('slug', array_column(self::JUEGOS, 'slug'))->delete();
    }
};
