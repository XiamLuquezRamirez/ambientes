<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte los juegos EA restantes implementados (1 reto = 1 juego).
 * Generado desde scripts/manifest-partir-ea-restantes.json
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 6;

    private const EJE_ID = 21;

    private const MODULO_ID = 11;

    /** @var list<array{slug: string, nombre: string, carpeta: string, tematica_id: int, color: string, slug_antiguo: string}> */
    private const JUEGOS = [
        ['slug' => 'notas-de-colores', 'nombre' => "Notas de Colores", 'carpeta' => 'MemoriaMusical/NotasDeColores', 'tematica_id' => 51, 'color' => '#ef4444', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'secuencia-con-animales', 'nombre' => "Secuencia con Animales", 'carpeta' => 'MemoriaMusical/SecuenciaConAnimales', 'tematica_id' => 51, 'color' => '#f97316', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'instrumentos-de-juguete', 'nombre' => "Instrumentos de Juguete", 'carpeta' => 'MemoriaMusical/InstrumentosDeJuguete', 'tematica_id' => 51, 'color' => '#f59e0b', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'las-campanas-magicas', 'nombre' => "Las Campanas Mágicas", 'carpeta' => 'MemoriaMusical/LasCampanasMagicas', 'tematica_id' => 51, 'color' => '#84cc16', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'instrumentos-de-la-orquesta', 'nombre' => "Instrumentos de la Orquesta", 'carpeta' => 'MemoriaMusical/InstrumentosDeLaOrquesta', 'tematica_id' => 51, 'color' => '#22c55e', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'el-piano-de-neon', 'nombre' => "El Piano de Neón", 'carpeta' => 'MemoriaMusical/ElPianoDeNeon', 'tematica_id' => 51, 'color' => '#14b8a6', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'desafio-de-inversion-acustica', 'nombre' => "Desafío de Inversión Acústica", 'carpeta' => 'MemoriaMusical/DesafioDeInversionAcustica', 'tematica_id' => 51, 'color' => '#0ea5e9', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'la-gran-consola-maestra', 'nombre' => "La Gran Consola Maestra", 'carpeta' => 'MemoriaMusical/LaGranConsolaMaestra', 'tematica_id' => 51, 'color' => '#3b82f6', 'slug_antiguo' => 'memoria-musical'],
        ['slug' => 'el-cierre-del-timbre', 'nombre' => "El Cierre del Timbre", 'carpeta' => 'CompletaLaMelodia/ElCierreDelTimbre', 'tematica_id' => 52, 'color' => '#6366f1', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'el-xilofono-magico', 'nombre' => "El Xilófono Mágico", 'carpeta' => 'CompletaLaMelodia/ElXilofonoMagico', 'tematica_id' => 52, 'color' => '#8b5cf6', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'el-pajarito-cantor', 'nombre' => "El Pajarito Cantor", 'carpeta' => 'CompletaLaMelodia/ElPajaritoCantor', 'tematica_id' => 52, 'color' => '#a855f7', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'el-tren-de-la-estacion', 'nombre' => "El Tren de la Estación", 'carpeta' => 'CompletaLaMelodia/ElTrenDeLaEstacion', 'tematica_id' => 52, 'color' => '#ec4899', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'escala-musical-ascendente', 'nombre' => "Escala Musical Ascendente", 'carpeta' => 'CompletaLaMelodia/EscalaMusicalAscendente', 'tematica_id' => 52, 'color' => '#ef4444', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'reconocimiento-de-patrones', 'nombre' => "Reconocimiento de Patrones", 'carpeta' => 'CompletaLaMelodia/ReconocimientoDePatrones', 'tematica_id' => 52, 'color' => '#f97316', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'secuencia-melodica-rota', 'nombre' => "Secuencia Melódica Rota", 'carpeta' => 'CompletaLaMelodia/SecuenciaMelodicaRota', 'tematica_id' => 52, 'color' => '#f59e0b', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'el-gran-concierto-final', 'nombre' => "El Gran Concierto Final", 'carpeta' => 'CompletaLaMelodia/ElGranConciertoFinal', 'tematica_id' => 52, 'color' => '#84cc16', 'slug_antiguo' => 'completa-la-melodia'],
        ['slug' => 'formas-basicas-mitades', 'nombre' => "Formas Básicas (Mitades)", 'carpeta' => 'RompecabezasArtistico/FormasBasicasMitades', 'tematica_id' => 53, 'color' => '#22c55e', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'formas-geometricas-y-animales', 'nombre' => "Formas Geométricas y Animales", 'carpeta' => 'RompecabezasArtistico/FormasGeometricasYAnimales', 'tematica_id' => 53, 'color' => '#14b8a6', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'el-cuadro-de-frutas', 'nombre' => "El Cuadro de Frutas", 'carpeta' => 'RompecabezasArtistico/ElCuadroDeFrutas', 'tematica_id' => 53, 'color' => '#0ea5e9', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'el-paisaje-del-arcoiris', 'nombre' => "El Paisaje del Arcoíris", 'carpeta' => 'RompecabezasArtistico/ElPaisajeDelArcoiris', 'tematica_id' => 53, 'color' => '#3b82f6', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'rotacion-basica', 'nombre' => "Rotación Básica", 'carpeta' => 'RompecabezasArtistico/RotacionBasica', 'tematica_id' => 53, 'color' => '#6366f1', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'el-paisaje-nocturno', 'nombre' => "El Paisaje Nocturno", 'carpeta' => 'RompecabezasArtistico/ElPaisajeNocturno', 'tematica_id' => 53, 'color' => '#8b5cf6', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'el-globo-aerostatico', 'nombre' => "El Globo Aerostático", 'carpeta' => 'RompecabezasArtistico/ElGloboAerostatico', 'tematica_id' => 53, 'color' => '#a855f7', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'la-casita-en-el-campo', 'nombre' => "La Casita en el Campo", 'carpeta' => 'RompecabezasArtistico/LaCasitaEnElCampo', 'tematica_id' => 53, 'color' => '#ec4899', 'slug_antiguo' => 'rompecabezas-artistico'],
        ['slug' => 'las-manchas-de-la-mariquita', 'nombre' => "Las Manchas de la Mariquita", 'carpeta' => 'CompletaElDibujo/LasManchasDeLaMariquita', 'tematica_id' => 54, 'color' => '#ef4444', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'las-ruedas-del-carro', 'nombre' => "Las Ruedas del Carro", 'carpeta' => 'CompletaElDibujo/LasRuedasDelCarro', 'tematica_id' => 54, 'color' => '#f97316', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'los-petalos-de-la-flor', 'nombre' => "Los Pétalos de la Flor", 'carpeta' => 'CompletaElDibujo/LosPetalosDeLaFlor', 'tematica_id' => 54, 'color' => '#f59e0b', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'la-casita-y-su-puerta', 'nombre' => "La Casita y su Puerta", 'carpeta' => 'CompletaElDibujo/LaCasitaYSuPuerta', 'tematica_id' => 54, 'color' => '#84cc16', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'las-alas-de-la-mariposa-magica', 'nombre' => "Las Alas de la Mariposa Mágica", 'carpeta' => 'CompletaElDibujo/LasAlasDeLaMariposaMagica', 'tematica_id' => 54, 'color' => '#22c55e', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'la-constelacion-del-cohete', 'nombre' => "La Constelación del Cohete", 'carpeta' => 'CompletaElDibujo/LaConstelacionDelCohete', 'tematica_id' => 54, 'color' => '#14b8a6', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'la-mitad-faltante-del-robot', 'nombre' => "La Mitad Faltante del Robot", 'carpeta' => 'CompletaElDibujo/LaMitadFaltanteDelRobot', 'tematica_id' => 54, 'color' => '#0ea5e9', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'el-gran-castillo-medieval', 'nombre' => "El Gran Castillo Medieval", 'carpeta' => 'CompletaElDibujo/ElGranCastilloMedieval', 'tematica_id' => 54, 'color' => '#3b82f6', 'slug_antiguo' => 'completa-el-dibujo'],
        ['slug' => 'la-magia-de-la-paleta', 'nombre' => "La Magia de la Paleta", 'carpeta' => 'ElMundoDeLosColores/LaMagiaDeLaPaleta', 'tematica_id' => 55, 'color' => '#6366f1', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'pintar-con-las-huellas-de-los-dedos', 'nombre' => "Pintar con las Huellas de los Dedos", 'carpeta' => 'ElMundoDeLosColores/PintarConLasHuellasDeLosDedos', 'tematica_id' => 55, 'color' => '#8b5cf6', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'el-tren-de-la-pintura', 'nombre' => "El Tren de la Pintura", 'carpeta' => 'ElMundoDeLosColores/ElTrenDeLaPintura', 'tematica_id' => 55, 'color' => '#a855f7', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'el-cuadro-de-fuegos-artificiales', 'nombre' => "El Cuadro de Fuegos Artificiales", 'carpeta' => 'ElMundoDeLosColores/ElCuadroDeFuegosArtificiales', 'tematica_id' => 55, 'color' => '#ec4899', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'el-circulo-cromatico', 'nombre' => "El Círculo Cromático", 'carpeta' => 'ElMundoDeLosColores/ElCirculoCromatico', 'tematica_id' => 55, 'color' => '#ef4444', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'calidos-vs-frios', 'nombre' => "Cálidos vs. Fríos", 'carpeta' => 'ElMundoDeLosColores/CalidosVsFrios', 'tematica_id' => 55, 'color' => '#f97316', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'pintando-una-esfera-3d', 'nombre' => "Pintando una Esfera 3D", 'carpeta' => 'ElMundoDeLosColores/PintandoUnaEsfera3d', 'tematica_id' => 55, 'color' => '#f59e0b', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'el-cuadro-abstracto-maestro', 'nombre' => "El Cuadro Abstracto Maestro", 'carpeta' => 'ElMundoDeLosColores/ElCuadroAbstractoMaestro', 'tematica_id' => 55, 'color' => '#84cc16', 'slug_antiguo' => 'el-mundo-de-los-colores'],
        ['slug' => 'el-semaforo-magico', 'nombre' => "El Semáforo Mágico", 'carpeta' => 'ColoresYFormas/ElSemaforoMagico', 'tematica_id' => 56, 'color' => '#22c55e', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'la-casita-geometrica', 'nombre' => "La Casita Geométrica", 'carpeta' => 'ColoresYFormas/LaCasitaGeometrica', 'tematica_id' => 56, 'color' => '#14b8a6', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'el-camion-de-bloques', 'nombre' => "El Camión de Bloques", 'carpeta' => 'ColoresYFormas/ElCamionDeBloques', 'tematica_id' => 56, 'color' => '#0ea5e9', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'el-cohete-espacial-de-bloques', 'nombre' => "El Cohete Espacial de Bloques", 'carpeta' => 'ColoresYFormas/ElCoheteEspacialDeBloques', 'tematica_id' => 56, 'color' => '#3b82f6', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'el-vitral-geometrico', 'nombre' => "El Vitral Geométrico", 'carpeta' => 'ColoresYFormas/ElVitralGeometrico', 'tematica_id' => 56, 'color' => '#6366f1', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'construye-un-edificio-con-cubos', 'nombre' => "Construye un Edificio con Cubos", 'carpeta' => 'ColoresYFormas/ConstruyeUnEdificioConCubos', 'tematica_id' => 56, 'color' => '#8b5cf6', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'el-cuadro-estilo-mondrian', 'nombre' => "El Cuadro Estilo Mondrian", 'carpeta' => 'ColoresYFormas/ElCuadroEstiloMondrian', 'tematica_id' => 56, 'color' => '#a855f7', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'la-ciudad-del-futuro', 'nombre' => "La Ciudad del Futuro", 'carpeta' => 'ColoresYFormas/LaCiudadDelFuturo', 'tematica_id' => 56, 'color' => '#ec4899', 'slug_antiguo' => 'colores-y-formas'],
        ['slug' => 'el-osito-pintor', 'nombre' => "El Osito Pintor", 'carpeta' => 'EncuentraLasDiferencias/ElOsitoPintor', 'tematica_id' => 57, 'color' => '#ef4444', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'el-gato-artista', 'nombre' => "El Gato Artista", 'carpeta' => 'EncuentraLasDiferencias/ElGatoArtista', 'tematica_id' => 57, 'color' => '#f97316', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'el-jardin-de-flores', 'nombre' => "El Jardín de Flores", 'carpeta' => 'EncuentraLasDiferencias/ElJardinDeFlores', 'tematica_id' => 57, 'color' => '#f59e0b', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'el-paisaje-del-sol-y-la-nube', 'nombre' => "El Paisaje del Sol y la Nube", 'carpeta' => 'EncuentraLasDiferencias/ElPaisajeDelSolYLaNube', 'tematica_id' => 57, 'color' => '#84cc16', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'analisis-por-categoria', 'nombre' => "Análisis por Categoría", 'carpeta' => 'EncuentraLasDiferencias/AnalisisPorCategoria', 'tematica_id' => 57, 'color' => '#22c55e', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'el-cuadro-travieso', 'nombre' => "El Cuadro Travieso", 'carpeta' => 'EncuentraLasDiferencias/ElCuadroTravieso', 'tematica_id' => 57, 'color' => '#14b8a6', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'dos-cuadros-con-anomalias', 'nombre' => "Dos Cuadros con Anomalías", 'carpeta' => 'EncuentraLasDiferencias/DosCuadrosConAnomalias', 'tematica_id' => 57, 'color' => '#0ea5e9', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'el-viajero-del-tiempo', 'nombre' => "El Viajero del Tiempo", 'carpeta' => 'EncuentraLasDiferencias/ElViajeroDelTiempo', 'tematica_id' => 57, 'color' => '#3b82f6', 'slug_antiguo' => 'encuentra-las-diferencias'],
        ['slug' => 'la-gran-sonrisa', 'nombre' => "La Gran Sonrisa", 'carpeta' => 'ComoMeSiento/LaGranSonrisa', 'tematica_id' => 58, 'color' => '#6366f1', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'los-brazos-cruzados', 'nombre' => "Los Brazos Cruzados", 'carpeta' => 'ComoMeSiento/LosBrazosCruzados', 'tematica_id' => 58, 'color' => '#8b5cf6', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'el-abrazo-reconstituyente', 'nombre' => "El Abrazo Reconstituyente", 'carpeta' => 'ComoMeSiento/ElAbrazoReconstituyente', 'tematica_id' => 58, 'color' => '#a855f7', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'la-boca-en-o', 'nombre' => "La Boca en 'O'", 'carpeta' => 'ComoMeSiento/LaBocaEnO', 'tematica_id' => 58, 'color' => '#ec4899', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'frustracion-y-calma', 'nombre' => "Frustración y Calma", 'carpeta' => 'ComoMeSiento/FrustracionYCalma', 'tematica_id' => 58, 'color' => '#ef4444', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'el-susto-y-la-sorpresa', 'nombre' => "El Susto y la Sorpresa", 'carpeta' => 'ComoMeSiento/ElSustoYLaSorpresa', 'tematica_id' => 58, 'color' => '#f97316', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'el-medidor-de-alegria', 'nombre' => "El Medidor de Alegría", 'carpeta' => 'ComoMeSiento/ElMedidorDeAlegria', 'tematica_id' => 58, 'color' => '#f59e0b', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'el-actor-silencioso', 'nombre' => "El Actor Silencioso", 'carpeta' => 'ComoMeSiento/ElActorSilencioso', 'tematica_id' => 58, 'color' => '#84cc16', 'slug_antiguo' => 'como-me-siento'],
        ['slug' => 'bajo-el-mar', 'nombre' => "Bajo el Mar", 'carpeta' => 'EligeElEscenario/BajoElMar', 'tematica_id' => 59, 'color' => '#22c55e', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'el-castillo-real', 'nombre' => "El Castillo Real", 'carpeta' => 'EligeElEscenario/ElCastilloReal', 'tematica_id' => 59, 'color' => '#14b8a6', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'la-granja-de-los-animales', 'nombre' => "La Granja de los Animales", 'carpeta' => 'EligeElEscenario/LaGranjaDeLosAnimales', 'tematica_id' => 59, 'color' => '#0ea5e9', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'el-escenario-del-espacio', 'nombre' => "El Escenario del Espacio", 'carpeta' => 'EligeElEscenario/ElEscenarioDelEspacio', 'tematica_id' => 59, 'color' => '#3b82f6', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'noche-en-el-bosque-encantado', 'nombre' => "Noche en el Bosque Encantado", 'carpeta' => 'EligeElEscenario/NocheEnElBosqueEncantado', 'tematica_id' => 59, 'color' => '#6366f1', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'la-cueva-de-los-piratas', 'nombre' => "La Cueva de los Piratas", 'carpeta' => 'EligeElEscenario/LaCuevaDeLosPiratas', 'tematica_id' => 59, 'color' => '#8b5cf6', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'el-castillo-medieval', 'nombre' => "El Castillo Medieval", 'carpeta' => 'EligeElEscenario/ElCastilloMedieval', 'tematica_id' => 59, 'color' => '#a855f7', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'decora-el-escenario-del-circo-ubicacion-de-utileria-tematica', 'nombre' => "Decora el Escenario del Circo: Ubicación de Utilería Temática", 'carpeta' => 'EligeElEscenario/DecoraElEscenarioDelCircoUbicacionDeUtileriaTematica', 'tematica_id' => 59, 'color' => '#ec4899', 'slug_antiguo' => 'elige-el-escenario'],
        ['slug' => 'la-super-heroina', 'nombre' => "La Súper Heroína", 'carpeta' => 'VisteAlArtista/LaSuperHeroina', 'tematica_id' => 60, 'color' => '#ef4444', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'el-bombero-valiente', 'nombre' => "El Bombero Valiente", 'carpeta' => 'VisteAlArtista/ElBomberoValiente', 'tematica_id' => 60, 'color' => '#f97316', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'el-payasito-divertido', 'nombre' => "El Payasito Divertido", 'carpeta' => 'VisteAlArtista/ElPayasitoDivertido', 'tematica_id' => 60, 'color' => '#f59e0b', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'el-mago-de-las-estrellas', 'nombre' => "El Mago de las Estrellas", 'carpeta' => 'VisteAlArtista/ElMagoDeLasEstrellas', 'tematica_id' => 60, 'color' => '#84cc16', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'el-caballero-medieval', 'nombre' => "El Caballero Medieval", 'carpeta' => 'VisteAlArtista/ElCaballeroMedieval', 'tematica_id' => 60, 'color' => '#22c55e', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'la-estrella-de-rock-vs-el-astronauta', 'nombre' => "La Estrella de Rock vs. El Astronauta", 'carpeta' => 'VisteAlArtista/LaEstrellaDeRockVsElAstronauta', 'tematica_id' => 60, 'color' => '#14b8a6', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'el-detective-del-misterio', 'nombre' => "El Detective del Misterio", 'carpeta' => 'VisteAlArtista/ElDetectiveDelMisterio', 'tematica_id' => 60, 'color' => '#0ea5e9', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'la-exploradora-de-la-selva', 'nombre' => "La Exploradora de la Selva", 'carpeta' => 'VisteAlArtista/LaExploradoraDeLaSelva', 'tematica_id' => 60, 'color' => '#3b82f6', 'slug_antiguo' => 'viste-al-artista'],
        ['slug' => 'la-artista-pintora', 'nombre' => "La Artista Pintora", 'carpeta' => 'QuienUsaQue/LaArtistaPintora', 'tematica_id' => 61, 'color' => '#6366f1', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-doctor-zeus', 'nombre' => "El Doctor Zeus", 'carpeta' => 'QuienUsaQue/ElDoctorZeus', 'tematica_id' => 61, 'color' => '#8b5cf6', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-chef-de-la-cocina', 'nombre' => "El Chef de la Cocina", 'carpeta' => 'QuienUsaQue/ElChefDeLaCocina', 'tematica_id' => 61, 'color' => '#a855f7', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-musico-alegre', 'nombre' => "El Músico Alegre", 'carpeta' => 'QuienUsaQue/ElMusicoAlegre', 'tematica_id' => 61, 'color' => '#ec4899', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-astronomo', 'nombre' => "El Astrónomo", 'carpeta' => 'QuienUsaQue/ElAstronomo', 'tematica_id' => 61, 'color' => '#ef4444', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-arqueologo', 'nombre' => "El Arqueólogo", 'carpeta' => 'QuienUsaQue/ElArqueologo', 'tematica_id' => 61, 'color' => '#f97316', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'el-director-de-orquesta', 'nombre' => "El Director de Orquesta", 'carpeta' => 'QuienUsaQue/ElDirectorDeOrquesta', 'tematica_id' => 61, 'color' => '#f59e0b', 'slug_antiguo' => 'quien-usa-que'],
        ['slug' => 'atrapa-las-notas-musicales', 'nombre' => 'Atrapa las notas musicales', 'carpeta' => 'QuienUsaQue/AtrapaLasNotasMusicales', 'tematica_id' => 61, 'color' => '#84cc16', 'slug_antiguo' => 'quien-usa-que'],
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
                'ruta' => 'catalogo_juegos/ExpresionArtistica/'.$juego['carpeta'],
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
        // Irreversible de forma segura: solo borra los slugs nuevos.
        if (! Schema::hasTable('juegos')) {
            return;
        }
        DB::table('juegos')->whereIn('slug', array_column(self::JUEGOS, 'slug'))->delete();
    }
};
