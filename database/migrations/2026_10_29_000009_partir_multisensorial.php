<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Parte los juegos Multisensorial implementados (1 reto = 1 juego).
 * Generado desde scripts/manifest-partir-multisensorial.json
 */
return new class extends Migration
{
    private const AMBIENTE_ID = 9;

    private const EJE_ID = 12;

    private const MODULO_ID = 10;

    /** @var list<array{slug: string, nombre: string, carpeta: string, tematica_id: int, color: string, slug_antiguo: string}> */
    private const JUEGOS = [
        ['slug' => "encuentra-el-rojo-3-anos", 'nombre' => "Encuentra El Rojo (3 Años)", 'carpeta' => "EncuentraElColor/EncuentraElRojo3Anos", 'tematica_id' => 9, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-amarillo-3-anos", 'nombre' => "Encuentra El Amarillo (3 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAmarillo3Anos", 'tematica_id' => 9, 'color' => "#f97316", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-azul-3-anos", 'nombre' => "Encuentra El Azul (3 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAzul3Anos", 'tematica_id' => 9, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-rojo-4-anos", 'nombre' => "Encuentra El Rojo (4 Años)", 'carpeta' => "EncuentraElColor/EncuentraElRojo4Anos", 'tematica_id' => 9, 'color' => "#84cc16", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-amarillo-4-anos", 'nombre' => "Encuentra El Amarillo (4 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAmarillo4Anos", 'tematica_id' => 9, 'color' => "#22c55e", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-azul-4-anos", 'nombre' => "Encuentra El Azul (4 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAzul4Anos", 'tematica_id' => 9, 'color' => "#14b8a6", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-verde-4-anos", 'nombre' => "Encuentra El Verde (4 Años)", 'carpeta' => "EncuentraElColor/EncuentraElVerde4Anos", 'tematica_id' => 9, 'color' => "#0ea5e9", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-naranja-4-anos", 'nombre' => "Encuentra El Naranja (4 Años)", 'carpeta' => "EncuentraElColor/EncuentraElNaranja4Anos", 'tematica_id' => 9, 'color' => "#3b82f6", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-rojo-5-6-anos", 'nombre' => "Encuentra El Rojo (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElRojo56Anos", 'tematica_id' => 9, 'color' => "#6366f1", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-amarillo-5-6-anos", 'nombre' => "Encuentra El Amarillo (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAmarillo56Anos", 'tematica_id' => 9, 'color' => "#8b5cf6", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-azul-5-6-anos", 'nombre' => "Encuentra El Azul (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElAzul56Anos", 'tematica_id' => 9, 'color' => "#a855f7", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-verde-5-6-anos", 'nombre' => "Encuentra El Verde (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElVerde56Anos", 'tematica_id' => 9, 'color' => "#ec4899", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-naranja-5-6-anos", 'nombre' => "Encuentra El Naranja (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElNaranja56Anos", 'tematica_id' => 9, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-morado-5-6-anos", 'nombre' => "Encuentra El Morado (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElMorado56Anos", 'tematica_id' => 9, 'color' => "#f97316", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "encuentra-el-rosado-5-6-anos", 'nombre' => "Encuentra El Rosado (5-6 Años)", 'carpeta' => "EncuentraElColor/EncuentraElRosado56Anos", 'tematica_id' => 9, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-el-color"],
        ['slug' => "la-manzana-perdida-y-el-proyector", 'nombre' => "¡La Manzana Perdida Y El Proyector!", 'carpeta' => "BuscaLaSombra/LaManzanaPerdidaYElProyector", 'tematica_id' => 10, 'color' => "#84cc16", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "el-carro-de-sombras-animadas", 'nombre' => "¡El Carro De Sombras Animadas!", 'carpeta' => "BuscaLaSombra/ElCarroDeSombrasAnimadas", 'tematica_id' => 10, 'color' => "#22c55e", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "la-mariposa-magica-y-el-misterio-de-la-luz", 'nombre' => "La Mariposa Mágica Y El Misterio De La Luz", 'carpeta' => "BuscaLaSombra/LaMariposaMagicaYElMisterioDeLaLuz", 'tematica_id' => 10, 'color' => "#14b8a6", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "escaner-de-la-mariposa-magica", 'nombre' => "Escáner De La Mariposa Mágica", 'carpeta' => "BuscaLaSombra/EscanerDeLaMariposaMagica", 'tematica_id' => 10, 'color' => "#0ea5e9", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "el-misterio-del-conejo-y-los-animales-del-bosque", 'nombre' => "El Misterio Del Conejo Y Los Animales Del Bosque", 'carpeta' => "BuscaLaSombra/ElMisterioDelConejoYLosAnimalesDelBosque", 'tematica_id' => 10, 'color' => "#3b82f6", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "foco-discriminacion-de-formas-geometricas-aereas-y-proporciones", 'nombre' => "**foco:** Discriminación De Formas Geométricas Aéreas Y Proporciones.", 'carpeta' => "BuscaLaSombra/FocoDiscriminacionDeFormasGeometricasAereasYProporciones", 'tematica_id' => 10, 'color' => "#6366f1", 'slug_antiguo' => "busca-la-sombra"],
        ['slug' => "el-ala-magica-de-la-mariposa", 'nombre' => "¡El Ala Mágica De La Mariposa!", 'carpeta' => "CompletaLaFigura/ElAlaMagicaDeLaMariposa", 'tematica_id' => 11, 'color' => "#8b5cf6", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "el-rescate-en-el-lodo-y-taller-de-llantas", 'nombre' => "¡El Rescate En El Lodo Y Taller De Llantas!", 'carpeta' => "CompletaLaFigura/ElRescateEnElLodoYTallerDeLlantas", 'tematica_id' => 11, 'color' => "#a855f7", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "el-techo-de-la-casita-del-parque", 'nombre' => "¡El Techo De La Casita Del Parque!", 'carpeta' => "CompletaLaFigura/ElTechoDeLaCasitaDelParque", 'tematica_id' => 11, 'color' => "#ec4899", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "el-escaner-de-simetria-de-la-mariposa-magica", 'nombre' => "¡El Escáner De Simetría De La Mariposa Mágica!", 'carpeta' => "CompletaLaFigura/ElEscanerDeSimetriaDeLaMariposaMagica", 'tematica_id' => 11, 'color' => "#ef4444", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "el-ajuste-de-diametro-en-el-carro-de-pruebas", 'nombre' => "¡El Ajuste De Diámetro En El Carro De Pruebas!", 'carpeta' => "CompletaLaFigura/ElAjusteDeDiametroEnElCarroDePruebas", 'tematica_id' => 11, 'color' => "#f97316", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "el-ensamblaje-arquitectonico-de-la-casa", 'nombre' => "¡El Ensamblaje Arquitectónico De La Casa!", 'carpeta' => "CompletaLaFigura/ElEnsamblajeArquitectonicoDeLaCasa", 'tematica_id' => 11, 'color' => "#f59e0b", 'slug_antiguo' => "completa-la-figura"],
        ['slug' => "donde-quedo-el-sol", 'nombre' => "¿Dónde Quedó El Sol?", 'carpeta' => "BuscaLasDiferencias/DondeQuedoElSol", 'tematica_id' => 12, 'color' => "#84cc16", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "la-flor-perdida", 'nombre' => "La Flor Perdida", 'carpeta' => "BuscaLasDiferencias/LaFlorPerdida", 'tematica_id' => 12, 'color' => "#22c55e", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "la-pelota-traviesa", 'nombre' => "La Pelota Traviesa", 'carpeta' => "BuscaLasDiferencias/LaPelotaTraviesa", 'tematica_id' => 12, 'color' => "#14b8a6", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "el-sol-faltante-en-el-cielo", 'nombre' => "¡El Sol Faltante En El Cielo!", 'carpeta' => "BuscaLasDiferencias/ElSolFaltanteEnElCielo", 'tematica_id' => 12, 'color' => "#0ea5e9", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "la-pelota-traviesa-2", 'nombre' => "La Pelota Traviesa", 'carpeta' => "BuscaLasDiferencias/LaPelotaTraviesa2", 'tematica_id' => 12, 'color' => "#3b82f6", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "la-flor-faltante-en-el-jardin", 'nombre' => "La Flor Faltante En El Jardín", 'carpeta' => "BuscaLasDiferencias/LaFlorFaltanteEnElJardin", 'tematica_id' => 12, 'color' => "#6366f1", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "la-hoja-perdida-del-arbol", 'nombre' => "La Hoja Perdida Del Árbol", 'carpeta' => "BuscaLasDiferencias/LaHojaPerdidaDelArbol", 'tematica_id' => 12, 'color' => "#8b5cf6", 'slug_antiguo' => "busca-las-diferencias"],
        ['slug' => "mochila", 'nombre' => "Mochila", 'carpeta' => "MemoriaVisual/Mochila", 'tematica_id' => 13, 'color' => "#a855f7", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "hoja", 'nombre' => "Hoja", 'carpeta' => "MemoriaVisual/Hoja", 'tematica_id' => 13, 'color' => "#ec4899", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "globos", 'nombre' => "Globos", 'carpeta' => "MemoriaVisual/Globos", 'tematica_id' => 13, 'color' => "#ef4444", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "caminito", 'nombre' => "Caminito", 'carpeta' => "MemoriaVisual/Caminito", 'tematica_id' => 13, 'color' => "#f97316", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "mochila-2", 'nombre' => "Mochila", 'carpeta' => "MemoriaVisual/Mochila2", 'tematica_id' => 13, 'color' => "#f59e0b", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "hoja-2", 'nombre' => "Hoja", 'carpeta' => "MemoriaVisual/Hoja2", 'tematica_id' => 13, 'color' => "#84cc16", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "globos-2", 'nombre' => "Globos", 'carpeta' => "MemoriaVisual/Globos2", 'tematica_id' => 13, 'color' => "#22c55e", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "caminito-2", 'nombre' => "Caminito", 'carpeta' => "MemoriaVisual/Caminito2", 'tematica_id' => 13, 'color' => "#14b8a6", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "vitrina", 'nombre' => "Vitrina", 'carpeta' => "MemoriaVisual/Vitrina", 'tematica_id' => 13, 'color' => "#0ea5e9", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "desaparecido", 'nombre' => "Desaparecido", 'carpeta' => "MemoriaVisual/Desaparecido", 'tematica_id' => 13, 'color' => "#3b82f6", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "posiciones", 'nombre' => "Posiciones", 'carpeta' => "MemoriaVisual/Posiciones", 'tematica_id' => 13, 'color' => "#6366f1", 'slug_antiguo' => "memoria-visual"],
        ['slug' => "sonidos-de-animales", 'nombre' => "Sonidos De Animales", 'carpeta' => "QueSonidoEscuchas/SonidosDeAnimales", 'tematica_id' => 14, 'color' => "#8b5cf6", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "otros-sonidos-de-animales", 'nombre' => "Otros Sonidos De Animales", 'carpeta' => "QueSonidoEscuchas/OtrosSonidosDeAnimales", 'tematica_id' => 14, 'color' => "#a855f7", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "otros-sonidos-de-la-naturaleza", 'nombre' => "Otros Sonidos De La Naturaleza", 'carpeta' => "QueSonidoEscuchas/OtrosSonidosDeLaNaturaleza", 'tematica_id' => 14, 'color' => "#ec4899", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "sonidos-de-objetos", 'nombre' => "Sonidos De Objetos", 'carpeta' => "QueSonidoEscuchas/SonidosDeObjetos", 'tematica_id' => 14, 'color' => "#ef4444", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "que-sonido-escuchas", 'nombre' => "¿Qué Sonido Escuchas?", 'carpeta' => "QueSonidoEscuchas/QueSonidoEscuchas", 'tematica_id' => 14, 'color' => "#f97316", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "que-sonido-es", 'nombre' => "¿Qué Sonido Es?", 'carpeta' => "QueSonidoEscuchas/QueSonidoEs", 'tematica_id' => 14, 'color' => "#f59e0b", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "sonidos-similares", 'nombre' => "Sonidos Similares", 'carpeta' => "QueSonidoEscuchas/SonidosSimilares", 'tematica_id' => 14, 'color' => "#84cc16", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "escucha-y-recuerda", 'nombre' => "Escucha Y Recuerda", 'carpeta' => "QueSonidoEscuchas/EscuchaYRecuerda", 'tematica_id' => 14, 'color' => "#22c55e", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "que-sonido-falta", 'nombre' => "¿Qué Sonido Falta?", 'carpeta' => "QueSonidoEscuchas/QueSonidoFalta", 'tematica_id' => 14, 'color' => "#14b8a6", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "la-mision-final", 'nombre' => "La Mision Final", 'carpeta' => "QueSonidoEscuchas/LaMisionFinal", 'tematica_id' => 14, 'color' => "#0ea5e9", 'slug_antiguo' => "que-sonido-escuchas"],
        ['slug' => "donde-esta-el-perro", 'nombre' => "¿Donde Está El Perro?", 'carpeta' => "EncuentraElSonido/DondeEstaElPerro", 'tematica_id' => 15, 'color' => "#3b82f6", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "encuentra-la-trompeta", 'nombre' => "Encuentra La Trompeta", 'carpeta' => "EncuentraElSonido/EncuentraLaTrompeta", 'tematica_id' => 15, 'color' => "#6366f1", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "donde-esta-el-pajaro", 'nombre' => "¿Donde Está El Pajaro?", 'carpeta' => "EncuentraElSonido/DondeEstaElPajaro", 'tematica_id' => 15, 'color' => "#8b5cf6", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "encuentra-el-sonido-de-la-lluvia", 'nombre' => "Encuentra El Sonido De La Lluvia", 'carpeta' => "EncuentraElSonido/EncuentraElSonidoDeLaLluvia", 'tematica_id' => 15, 'color' => "#a855f7", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "encuentra-el-sonido", 'nombre' => "Encuentra El Sonido", 'carpeta' => "EncuentraElSonido/EncuentraElSonido", 'tematica_id' => 15, 'color' => "#ec4899", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "localiza-el-sonido", 'nombre' => "Localiza El Sonido", 'carpeta' => "EncuentraElSonido/LocalizaElSonido", 'tematica_id' => 15, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "sonidos-en-diferentes-lugares", 'nombre' => "Sonidos En Diferentes Lugares", 'carpeta' => "EncuentraElSonido/SonidosEnDiferentesLugares", 'tematica_id' => 15, 'color' => "#f97316", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "encuentra-el-sonido-entre-distractores", 'nombre' => "Encuentra El Sonido Entre Distractores", 'carpeta' => "EncuentraElSonido/EncuentraElSonidoEntreDistractores", 'tematica_id' => 15, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "el-sonido-viajero", 'nombre' => "El Sonido Viajero", 'carpeta' => "EncuentraElSonido/ElSonidoViajero", 'tematica_id' => 15, 'color' => "#84cc16", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "mision-final-donde-esta", 'nombre' => "Misión Final ¿Donde Está?", 'carpeta' => "EncuentraElSonido/MisionFinalDondeEsta", 'tematica_id' => 15, 'color' => "#22c55e", 'slug_antiguo' => "encuentra-el-sonido"],
        ['slug' => "dos-sonidos", 'nombre' => "Dos Sonidos", 'carpeta' => "RepiteLaSecuencia/DosSonidos", 'tematica_id' => 16, 'color' => "#14b8a6", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "dos-instrumentos", 'nombre' => "Dos Instrumentos", 'carpeta' => "RepiteLaSecuencia/DosInstrumentos", 'tematica_id' => 16, 'color' => "#0ea5e9", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "tres-sonidos", 'nombre' => "Tres Sonidos", 'carpeta' => "RepiteLaSecuencia/TresSonidos", 'tematica_id' => 16, 'color' => "#3b82f6", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "secuencia-con-distractor", 'nombre' => "Secuencia Con Distractor", 'carpeta' => "RepiteLaSecuencia/SecuenciaConDistractor", 'tematica_id' => 16, 'color' => "#6366f1", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "gran-secuencia-final", 'nombre' => "Gran Secuencia Final", 'carpeta' => "RepiteLaSecuencia/GranSecuenciaFinal", 'tematica_id' => 16, 'color' => "#8b5cf6", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "secuencia-de-3-sonidos", 'nombre' => "Secuencia De 3 Sonidos", 'carpeta' => "RepiteLaSecuencia/SecuenciaDe3Sonidos", 'tematica_id' => 16, 'color' => "#a855f7", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "secuencia-de-3-sonidos-diferentes", 'nombre' => "Secuencia De 3 Sonidos Diferentes", 'carpeta' => "RepiteLaSecuencia/SecuenciaDe3SonidosDiferentes", 'tematica_id' => 16, 'color' => "#ec4899", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "secuencia-de-4-sonidos", 'nombre' => "Secuencia De 4 Sonidos", 'carpeta' => "RepiteLaSecuencia/SecuenciaDe4Sonidos", 'tematica_id' => 16, 'color' => "#ef4444", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "secuencia-con-cambio", 'nombre' => "Secuencia Con Cambio", 'carpeta' => "RepiteLaSecuencia/SecuenciaConCambio", 'tematica_id' => 16, 'color' => "#f97316", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "el-gran-codigo-secreto", 'nombre' => "El Gran Codigo Secreto", 'carpeta' => "RepiteLaSecuencia/ElGranCodigoSecreto", 'tematica_id' => 16, 'color' => "#f59e0b", 'slug_antiguo' => "repite-la-secuencia"],
        ['slug' => "que-escuchaste", 'nombre' => "¿Qué Escuchaste?", 'carpeta' => "MemoriaAuditiva/QueEscuchaste", 'tematica_id' => 17, 'color' => "#84cc16", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "recuerda-dos-sonidos", 'nombre' => "Recuerda Dos Sonidos", 'carpeta' => "MemoriaAuditiva/RecuerdaDosSonidos", 'tematica_id' => 17, 'color' => "#22c55e", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "que-sonido-se-repitio", 'nombre' => "¿Qué Sonido Se Repitió?", 'carpeta' => "MemoriaAuditiva/QueSonidoSeRepitio", 'tematica_id' => 17, 'color' => "#14b8a6", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "que-sonido-desaparecio", 'nombre' => "¿Qué Sonido Desapareció?", 'carpeta' => "MemoriaAuditiva/QueSonidoDesaparecio", 'tematica_id' => 17, 'color' => "#0ea5e9", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "recuerda-el-sonido", 'nombre' => "Recuerda El Sonido", 'carpeta' => "MemoriaAuditiva/RecuerdaElSonido", 'tematica_id' => 17, 'color' => "#3b82f6", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "recuerda-los-sonidos", 'nombre' => "Recuerda Los Sonidos", 'carpeta' => "MemoriaAuditiva/RecuerdaLosSonidos", 'tematica_id' => 17, 'color' => "#6366f1", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "el-sonido-repetido", 'nombre' => "El Sonido Repetido", 'carpeta' => "MemoriaAuditiva/ElSonidoRepetido", 'tematica_id' => 17, 'color' => "#8b5cf6", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "que-cambio", 'nombre' => "¿Qué Cambió?", 'carpeta' => "MemoriaAuditiva/QueCambio", 'tematica_id' => 17, 'color' => "#a855f7", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "que-sonido-cambia", 'nombre' => "¿Qué Sonido Cambia?", 'carpeta' => "MemoriaAuditiva/QueSonidoCambia", 'tematica_id' => 17, 'color' => "#ec4899", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "el-gran-desafio-de-memoria", 'nombre' => "El Gran Desafío De Memoria", 'carpeta' => "MemoriaAuditiva/ElGranDesafioDeMemoria", 'tematica_id' => 17, 'color' => "#ef4444", 'slug_antiguo' => "memoria-auditiva"],
        ['slug' => "que-suena", 'nombre' => "¿Que Suena?", 'carpeta' => "AsociaSonidoEImagen/QueSuena", 'tematica_id' => 18, 'color' => "#f97316", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "que-objeto-suena", 'nombre' => "¿Qué Objeto Suena!", 'carpeta' => "AsociaSonidoEImagen/QueObjetoSuena", 'tematica_id' => 18, 'color' => "#f59e0b", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "escucha-y-asocia", 'nombre' => "Escucha Y Asocia", 'carpeta' => "AsociaSonidoEImagen/EscuchaYAsocia", 'tematica_id' => 18, 'color' => "#84cc16", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "un-sonido-de-viaje", 'nombre' => "Un Sonido De Viaje", 'carpeta' => "AsociaSonidoEImagen/UnSonidoDeViaje", 'tematica_id' => 18, 'color' => "#22c55e", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "que-escuchaste-2", 'nombre' => "¿Qué Escuchaste?", 'carpeta' => "AsociaSonidoEImagen/QueEscuchaste", 'tematica_id' => 18, 'color' => "#14b8a6", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "sonido-y-objeto", 'nombre' => "Sonido Y Objeto", 'carpeta' => "AsociaSonidoEImagen/SonidoYObjeto", 'tematica_id' => 18, 'color' => "#0ea5e9", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "sonido-de-una-maquina", 'nombre' => "Sonido De Una Máquina", 'carpeta' => "AsociaSonidoEImagen/SonidoDeUnaMaquina", 'tematica_id' => 18, 'color' => "#3b82f6", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "sonido-de-transporte", 'nombre' => "Sonido De Transporte", 'carpeta' => "AsociaSonidoEImagen/SonidoDeTransporte", 'tematica_id' => 18, 'color' => "#6366f1", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "sonido-de-una-accion", 'nombre' => "Sonido De Una Acción", 'carpeta' => "AsociaSonidoEImagen/SonidoDeUnaAccion", 'tematica_id' => 18, 'color' => "#8b5cf6", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "sonido-del-agua", 'nombre' => "Sonido Del Agua", 'carpeta' => "AsociaSonidoEImagen/SonidoDelAgua", 'tematica_id' => 18, 'color' => "#a855f7", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "la-gran-asociacion", 'nombre' => "La Gran Asociación", 'carpeta' => "AsociaSonidoEImagen/LaGranAsociacion", 'tematica_id' => 18, 'color' => "#ec4899", 'slug_antiguo' => "asocia-sonido-e-imagen"],
        ['slug' => "buscando-la-textura-suave-como-el-algodon", 'nombre' => "¡Buscando La Textura Suave Como El Algodón!", 'carpeta' => "EncuentraLaTextura/BuscandoLaTexturaSuaveComoElAlgodon", 'tematica_id' => 19, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "buscando-la-textura-aspera-de-la-lija", 'nombre' => "¡Buscando La Textura Áspera De La Lija!", 'carpeta' => "EncuentraLaTextura/BuscandoLaTexturaAsperaDeLaLija", 'tematica_id' => 19, 'color' => "#f97316", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "buscando-la-textura-lisa-de-la-piedra-del-rio", 'nombre' => "¡Buscando La Textura Lisa De La Piedra Del Río!", 'carpeta' => "EncuentraLaTextura/BuscandoLaTexturaLisaDeLaPiedraDelRio", 'tematica_id' => 19, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "el-sillon-incomodo-de-zeus", 'nombre' => "¡El Sillón Incómodo De Zeus!", 'carpeta' => "EncuentraLaTextura/ElSillonIncomodoDeZeus", 'tematica_id' => 19, 'color' => "#84cc16", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "la-mesa-magica-de-madera-rustica", 'nombre' => "¡La Mesa Mágica De Madera Rústica!", 'carpeta' => "EncuentraLaTextura/LaMesaMagicaDeMaderaRustica", 'tematica_id' => 19, 'color' => "#22c55e", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "frotado-artistico-de-la-naturaleza", 'nombre' => "¡Frotado Artístico De La Naturaleza!", 'carpeta' => "EncuentraLaTextura/FrotadoArtisticoDeLaNaturaleza", 'tematica_id' => 19, 'color' => "#14b8a6", 'slug_antiguo' => "encuentra-la-textura"],
        ['slug' => "el-peluche-esponjoso", 'nombre' => "¡El Peluche Esponjoso!", 'carpeta' => "SuaveOAspero/ElPelucheEsponjoso", 'tematica_id' => 20, 'color' => "#0ea5e9", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "la-hoja-de-lija-rugosa", 'nombre' => "¡La Hoja De Lija Rugosa!", 'carpeta' => "SuaveOAspero/LaHojaDeLijaRugosa", 'tematica_id' => 20, 'color' => "#3b82f6", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "el-copo-de-algodon-magico", 'nombre' => "¡El Copo De Algodón Mágico!", 'carpeta' => "SuaveOAspero/ElCopoDeAlgodonMagico", 'tematica_id' => 20, 'color' => "#6366f1", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "el-oso-de-peluche", 'nombre' => "¡El Oso De Peluche!", 'carpeta' => "SuaveOAspero/ElOsoDePeluche", 'tematica_id' => 20, 'color' => "#8b5cf6", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "la-hoja-de-lija", 'nombre' => "¡La Hoja De Lija!", 'carpeta' => "SuaveOAspero/LaHojaDeLija", 'tematica_id' => 20, 'color' => "#a855f7", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "el-copo-de-algodon", 'nombre' => "¡El Copo De Algodón!", 'carpeta' => "SuaveOAspero/ElCopoDeAlgodon", 'tematica_id' => 20, 'color' => "#ec4899", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "la-corteza-de-arbol", 'nombre' => "¡La Corteza De Árbol!", 'carpeta' => "SuaveOAspero/LaCortezaDeArbol", 'tematica_id' => 20, 'color' => "#ef4444", 'slug_antiguo' => "suave-o-aspero"],
        ['slug' => "el-festin-de-la-cesta-nube", 'nombre' => "¡El Festín De La Cesta Nube!", 'carpeta' => "ClasificaPorTextura/ElFestinDeLaCestaNube", 'tematica_id' => 21, 'color' => "#f97316", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "la-coleccion-de-la-cesta-roca", 'nombre' => "¡La Colección De La Cesta Roca!", 'carpeta' => "ClasificaPorTextura/LaColeccionDeLaCestaRoca", 'tematica_id' => 21, 'color' => "#f59e0b", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "el-gran-granero-de-texturas", 'nombre' => "¡El Gran Granero De Texturas!", 'carpeta' => "ClasificaPorTextura/ElGranGraneroDeTexturas", 'tematica_id' => 21, 'color' => "#84cc16", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "clasificacion-en-el-modulo-suave", 'nombre' => "¡Clasificación En El Módulo Suave!", 'carpeta' => "ClasificaPorTextura/ClasificacionEnElModuloSuave", 'tematica_id' => 21, 'color' => "#22c55e", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "clasificacion-en-la-tolva-aspera", 'nombre' => "¡Clasificación En La Tolva Áspera!", 'carpeta' => "ClasificaPorTextura/ClasificacionEnLaTolvaAspera", 'tematica_id' => 21, 'color' => "#14b8a6", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "deslizamiento-en-el-modulo-liso", 'nombre' => "¡Deslizamiento En El Módulo Liso!", 'carpeta' => "ClasificaPorTextura/DeslizamientoEnElModuloLiso", 'tematica_id' => 21, 'color' => "#0ea5e9", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "prueba-de-baches-en-el-modulo-rugoso", 'nombre' => "¡Prueba De Baches En El Módulo Rugoso!", 'carpeta' => "ClasificaPorTextura/PruebaDeBachesEnElModuloRugoso", 'tematica_id' => 21, 'color' => "#3b82f6", 'slug_antiguo' => "clasifica-por-textura"],
        ['slug' => "buscando-la-pareja-suave-del-algodon", 'nombre' => "¡Buscando La Pareja Suave Del Algodón!", 'carpeta' => "RelacionaIguales/BuscandoLaParejaSuaveDelAlgodon", 'tematica_id' => 22, 'color' => "#6366f1", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "buscando-la-pareja-rasposa-de-la-lija", 'nombre' => "¡Buscando La Pareja Rasposa De La Lija!", 'carpeta' => "RelacionaIguales/BuscandoLaParejaRasposaDeLaLija", 'tematica_id' => 22, 'color' => "#8b5cf6", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "buscando-la-pareja-delicada-de-la-seda", 'nombre' => "¡Buscando La Pareja Delicada De La Seda!", 'carpeta' => "RelacionaIguales/BuscandoLaParejaDelicadaDeLaSeda", 'tematica_id' => 22, 'color' => "#a855f7", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "buscando-la-pareja-pulida-del-vidrio", 'nombre' => "¡Buscando La Pareja Pulida Del Vidrio!", 'carpeta' => "RelacionaIguales/BuscandoLaParejaPulidaDelVidrio", 'tematica_id' => 22, 'color' => "#ec4899", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "identificacion-de-la-textura-muelle", 'nombre' => "Identificación De La Textura Muelle", 'carpeta' => "RelacionaIguales/IdentificacionDeLaTexturaMuelle", 'tematica_id' => 22, 'color' => "#ef4444", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "identificacion-de-la-textura-abrasiva", 'nombre' => "Identificación De La Textura Abrasiva", 'carpeta' => "RelacionaIguales/IdentificacionDeLaTexturaAbrasiva", 'tematica_id' => 22, 'color' => "#f97316", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "identificacion-de-la-textura-sedosa", 'nombre' => "Identificación De La Textura Sedosa", 'carpeta' => "RelacionaIguales/IdentificacionDeLaTexturaSedosa", 'tematica_id' => 22, 'color' => "#f59e0b", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "identificacion-de-la-textura-pulida-y-lisa", 'nombre' => "Identificación De La Textura Pulida Y Lisa", 'carpeta' => "RelacionaIguales/IdentificacionDeLaTexturaPulidaYLisa", 'tematica_id' => 22, 'color' => "#84cc16", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "identificacion-de-la-textura-porosa-y-flexible", 'nombre' => "Identificación De La Textura Porosa Y Flexible", 'carpeta' => "RelacionaIguales/IdentificacionDeLaTexturaPorosaYFlexible", 'tematica_id' => 22, 'color' => "#22c55e", 'slug_antiguo' => "relaciona-iguales"],
        ['slug' => "descubre-el-objeto-escondido", 'nombre' => "¡Descubre El Objeto Escondido!", 'carpeta' => "DescubreElObjeto/DescubreElObjetoEscondido", 'tematica_id' => 23, 'color' => "#14b8a6", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "descubre-el-objeto-escondido-2", 'nombre' => "¡Descubre El Objeto Escondido!", 'carpeta' => "DescubreElObjeto/DescubreElObjetoEscondido2", 'tematica_id' => 23, 'color' => "#0ea5e9", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "descubre-el-objeto-escondido-3", 'nombre' => "¡Descubre El Objeto Escondido!", 'carpeta' => "DescubreElObjeto/DescubreElObjetoEscondido3", 'tematica_id' => 23, 'color' => "#3b82f6", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "descifrando-la-pista-del-oso-de-peluche", 'nombre' => "Descifrando La Pista Del Oso De Peluche", 'carpeta' => "DescubreElObjeto/DescifrandoLaPistaDelOsoDePeluche", 'tematica_id' => 23, 'color' => "#6366f1", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "descifrando-la-pista-de-la-corteza", 'nombre' => "Descifrando La Pista De La Corteza", 'carpeta' => "DescubreElObjeto/DescifrandoLaPistaDeLaCorteza", 'tematica_id' => 23, 'color' => "#8b5cf6", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "laboratorio-de-limpieza-y-revelado-tactil", 'nombre' => "\"laboratorio De Limpieza Y Revelado Táctil\"", 'carpeta' => "DescubreElObjeto/LaboratorioDeLimpiezaYReveladoTactil", 'tematica_id' => 23, 'color' => "#a855f7", 'slug_antiguo' => "descubre-el-objeto"],
        ['slug' => "con-que-sentido-sentimos-la-campana-estimulo-sonoro-asociacion-con-el-senti", 'nombre' => "¿Con Qué Sentido Sentimos La Campana?: Estímulo Sonoro | Asociación Con El Senti", 'carpeta' => "EncuentraLaPareja/ConQueSentidoSentimosLaCampanaEstimuloSonoroAsociacionConElSenti", 'tematica_id' => 24, 'color' => "#ec4899", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "con-que-sentido-sentimos-la-flor-estimulo-olfativo-asociacion-con-el-sentid", 'nombre' => "¿Con Qué Sentido Sentimos La Flor?: Estímulo Olfativo | Asociación Con El Sentid", 'carpeta' => "EncuentraLaPareja/ConQueSentidoSentimosLaFlorEstimuloOlfativoAsociacionConElSentid", 'tematica_id' => 24, 'color' => "#ef4444", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "con-que-sentido-sentimos-el-heladoestimulo-gustativo-asociacion-con-el-sent", 'nombre' => "¿Con Qué Sentido Sentimos El Helado?:estímulo Gustativo | Asociación Con El Sent", 'carpeta' => "EncuentraLaPareja/ConQueSentidoSentimosElHeladoEstimuloGustativoAsociacionConElSent", 'tematica_id' => 24, 'color' => "#f97316", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "con-que-sentido-sentimos-el-sol-estimulo-luminosovisual-asociacion-con-el", 'nombre' => "¿Con Qué Sentido Sentimos El Sol?: Estímulo Luminoso/visual | Asociación Con El", 'carpeta' => "EncuentraLaPareja/ConQueSentidoSentimosElSolEstimuloLuminosoVisualAsociacionConEl", 'tematica_id' => 24, 'color' => "#f59e0b", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "conectando-la-campana", 'nombre' => "Conectando La Campana", 'carpeta' => "EncuentraLaPareja/ConectandoLaCampana", 'tematica_id' => 24, 'color' => "#84cc16", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "conectando-la-flor", 'nombre' => "Conectando La Flor", 'carpeta' => "EncuentraLaPareja/ConectandoLaFlor", 'tematica_id' => 24, 'color' => "#22c55e", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "conectando-el-helado", 'nombre' => "Conectando El Helado", 'carpeta' => "EncuentraLaPareja/ConectandoElHelado", 'tematica_id' => 24, 'color' => "#14b8a6", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "conectando-el-sol", 'nombre' => "Conectando El Sol", 'carpeta' => "EncuentraLaPareja/ConectandoElSol", 'tematica_id' => 24, 'color' => "#0ea5e9", 'slug_antiguo' => "encuentra-la-pareja"],
        ['slug' => "cual-objeto-es-el-intruso-que-no-estaba-antesmemoria-de-trabajo-reconocimien", 'nombre' => "¿Cuál Objeto Es El Intruso Que No Estaba Antes?:memoria De Trabajo: Reconocimien", 'carpeta' => "ObservaYRecuerda/CualObjetoEsElIntrusoQueNoEstabaAntesMemoriaDeTrabajoReconocimien", 'tematica_id' => 25, 'color' => "#3b82f6", 'slug_antiguo' => "observa-y-recuerda"],
        ['slug' => "cual-objeto-se-escondio-y-falta-memoria-de-trabajo-evocacion-del-elemento-au", 'nombre' => "¿Cuál Objeto Se Escondió Y Falta?: Memoria De Trabajo: Evocación Del Elemento Au", 'carpeta' => "ObservaYRecuerda/CualObjetoSeEscondioYFaltaMemoriaDeTrabajoEvocacionDelElementoAu", 'tematica_id' => 25, 'color' => "#6366f1", 'slug_antiguo' => "observa-y-recuerda"],
        ['slug' => "deteccion-del-objeto-intruso-memoria-de-trabajo", 'nombre' => "Detección Del Objeto Intruso: Memoria De Trabajo", 'carpeta' => "ObservaYRecuerda/DeteccionDelObjetoIntrusoMemoriaDeTrabajo", 'tematica_id' => 25, 'color' => "#8b5cf6", 'slug_antiguo' => "observa-y-recuerda"],
        ['slug' => "identificacion-del-objeto-faltante-memoria-de-evocacion-ausente-identificar-el", 'nombre' => "Identificación Del Objeto Faltante: Memoria De Evocación Ausente: Identificar El", 'carpeta' => "ObservaYRecuerda/IdentificacionDelObjetoFaltanteMemoriaDeEvocacionAusenteIdentificarEl", 'tematica_id' => 25, 'color' => "#a855f7", 'slug_antiguo' => "observa-y-recuerda"],
        ['slug' => "deteccion-de-cambio-de-posicion", 'nombre' => "Detección De Cambio De Posición", 'carpeta' => "ObservaYRecuerda/DeteccionDeCambioDePosicion", 'tematica_id' => 25, 'color' => "#ec4899", 'slug_antiguo' => "observa-y-recuerda"],
        ['slug' => "redisenado-canasta-de-la-vista", 'nombre' => "Rediseñado: \"canasta De La Vista", 'carpeta' => "ClasificaPorLosSentidos/RedisenadoCanastaDeLaVista", 'tematica_id' => 26, 'color' => "#ef4444", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "canasta-del-oido", 'nombre' => "Canasta Del Oído", 'carpeta' => "ClasificaPorLosSentidos/CanastaDelOido", 'tematica_id' => 26, 'color' => "#f97316", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "canasta-del-olfato", 'nombre' => "Canasta Del Olfato", 'carpeta' => "ClasificaPorLosSentidos/CanastaDelOlfato", 'tematica_id' => 26, 'color' => "#f59e0b", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "clasificacion-doble", 'nombre' => "Clasificación Doble", 'carpeta' => "ClasificaPorLosSentidos/ClasificacionDoble", 'tematica_id' => 26, 'color' => "#84cc16", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "clasificacion-doble-2", 'nombre' => "Clasificación Doble", 'carpeta' => "ClasificaPorLosSentidos/ClasificacionDoble2", 'tematica_id' => 26, 'color' => "#22c55e", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "multiple-discriminacion", 'nombre' => "Múltiple Discriminación", 'carpeta' => "ClasificaPorLosSentidos/MultipleDiscriminacion", 'tematica_id' => 26, 'color' => "#14b8a6", 'slug_antiguo' => "clasifica-por-los-sentidos"],
        ['slug' => "el-cambio-de-color-de-la-pelota-cambio-de-atributo-cualitativo", 'nombre' => "El Cambio De Color De La Pelota: Cambio De Atributo Cualitativo", 'carpeta' => "QueCambio/ElCambioDeColorDeLaPelotaCambioDeAtributoCualitativo", 'tematica_id' => 27, 'color' => "#0ea5e9", 'slug_antiguo' => "que-cambio"],
        ['slug' => "la-desaparicion-de-la-campana-cambio-por-sustraccion-sustraccion-obvia-3-el", 'nombre' => "La Desaparición De La Campana: Cambio Por Sustracción / Sustracción Obvia | 3 El", 'carpeta' => "QueCambio/LaDesaparicionDeLaCampanaCambioPorSustraccionSustraccionObvia3El", 'tematica_id' => 27, 'color' => "#3b82f6", 'slug_antiguo' => "que-cambio"],
        ['slug' => "la-aparicion-de-la-estrella-cambio-por-adicion-aparicion-de-elemento-nuevo", 'nombre' => "La Aparición De La Estrella: Cambio Por Adición / Aparición De Elemento Nuevo |", 'carpeta' => "QueCambio/LaAparicionDeLaEstrellaCambioPorAdicionAparicionDeElementoNuevo", 'tematica_id' => 27, 'color' => "#6366f1", 'slug_antiguo' => "que-cambio"],
        ['slug' => "que-cambio-en-la-escena-cambio-de-atributo-cualitativo", 'nombre' => "¿Qué Cambió En La Escena?: Cambio De Atributo Cualitativo", 'carpeta' => "QueCambio/QueCambioEnLaEscenaCambioDeAtributoCualitativo", 'tematica_id' => 27, 'color' => "#8b5cf6", 'slug_antiguo' => "que-cambio"],
        ['slug' => "que-objeto-desapareciocambio-por-sustraccion-ausencia-de-elemento-4-eleme", 'nombre' => "¿Qué Objeto Desapareció?:cambio Por Sustracción / Ausencia De Elemento | 4 Eleme", 'carpeta' => "QueCambio/QueObjetoDesaparecioCambioPorSustraccionAusenciaDeElemento4Eleme", 'tematica_id' => 27, 'color' => "#a855f7", 'slug_antiguo' => "que-cambio"],
        ['slug' => "que-objeto-nuevo-apareciocambio-por-adicion-aparicion-de-elemento-intruso", 'nombre' => "¿Qué Objeto Nuevo Apareció?:cambio Por Adición / Aparición De Elemento Intruso |", 'carpeta' => "QueCambio/QueObjetoNuevoAparecioCambioPorAdicionAparicionDeElementoIntruso", 'tematica_id' => 27, 'color' => "#ec4899", 'slug_antiguo' => "que-cambio"],
        ['slug' => "el-objeto-de-colores-en-el-cielo-deduccion-por-pista-visual-4-opciones", 'nombre' => "El Objeto De Colores En El Cielo: Deducción Por Pista Visual | 4 Opciones.", 'carpeta' => "ExploraYDescubre/ElObjetoDeColoresEnElCieloDeduccionPorPistaVisual4Opciones", 'tematica_id' => 28, 'color' => "#ef4444", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-objeto-musical-ruidoso-deduccion-por-pista-auditiva-4-opciones", 'nombre' => "El Objeto Musical Ruidoso: Deducción Por Pista Auditiva | 4 Opciones.", 'carpeta' => "ExploraYDescubre/ElObjetoMusicalRuidosoDeduccionPorPistaAuditiva4Opciones", 'tematica_id' => 28, 'color' => "#f97316", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-objeto-de-aroma-dulce-deduccion-por-pista-olfativa-4-opciones", 'nombre' => "El Objeto De Aroma Dulce: Deducción Por Pista Olfativa | 4 Opciones.", 'carpeta' => "ExploraYDescubre/ElObjetoDeAromaDulceDeduccionPorPistaOlfativa4Opciones", 'tematica_id' => 28, 'color' => "#f59e0b", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-objeto-dulce-y-frio-deduccion-por-pista-gustativatermica-4-opciones", 'nombre' => "El Objeto Dulce Y Frío: Deducción Por Pista Gustativa/térmica | 4 Opciones.", 'carpeta' => "ExploraYDescubre/ElObjetoDulceYFrioDeduccionPorPistaGustativaTermica4Opciones", 'tematica_id' => 28, 'color' => "#84cc16", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-espectro-de-luz-deduccion-multivariable-5-opciones", 'nombre' => "El Espectro De Luz: Deducción Multivariable | 5 Opciones", 'carpeta' => "ExploraYDescubre/ElEspectroDeLuzDeduccionMultivariable5Opciones", 'tematica_id' => 28, 'color' => "#22c55e", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-instrumento-de-percusion-deduccion-por-accion-y-mecanica-del-sonido-5-opci", 'nombre' => "El Instrumento De Percusión: Deducción Por Acción Y Mecánica Del Sonido | 5 Opci", 'carpeta' => "ExploraYDescubre/ElInstrumentoDePercusionDeduccionPorAccionYMecanicaDelSonido5Opci", 'tematica_id' => 28, 'color' => "#14b8a6", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "la-esencia-concentrada-deduccion-quimica-y-esencia-5-opciones", 'nombre' => "La Esencia Concentrada: Deducción Química Y Esencia | 5 Opciones", 'carpeta' => "ExploraYDescubre/LaEsenciaConcentradaDeduccionQuimicaYEsencia5Opciones", 'tematica_id' => 28, 'color' => "#0ea5e9", 'slug_antiguo' => "explora-y-descubre"],
        ['slug' => "el-alimento-congelado-deduccion-termica-y-sensorial-doble-5-opciones", 'nombre' => "El Alimento Congelado: Deducción Térmica Y Sensorial Doble | 5 Opciones", 'carpeta' => "ExploraYDescubre/ElAlimentoCongeladoDeduccionTermicaYSensorialDoble5Opciones", 'tematica_id' => 28, 'color' => "#3b82f6", 'slug_antiguo' => "explora-y-descubre"],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        // Catálogo partido supera 255 entradas: orden era tinyint.
        Schema::table('juegos', function ($table) {
            $table->unsignedSmallInteger('orden')->default(0)->change();
        });

        $ahora = now();
        $antiguos = array_values(array_unique(array_column(self::JUEGOS, 'slug_antiguo')));
        $nuevos = array_column(self::JUEGOS, 'slug');
        DB::table('juegos')->whereIn('slug', array_merge($antiguos, $nuevos))->delete();

        $ordenBase = ((int) DB::table('juegos')->max('orden')) + 1;

        foreach (self::JUEGOS as $i => $juego) {
            $ejeId = (int) (DB::table('tematicas')->where('id', $juego['tematica_id'])->value('eje_id') ?: self::EJE_ID);
            DB::table('juegos')->insert([
                'slug' => $juego['slug'],
                'ambiente_id' => self::AMBIENTE_ID,
                'eje_id' => $ejeId,
                'tematica_id' => $juego['tematica_id'],
                'modulo_id' => self::MODULO_ID,
                'ruta' => 'catalogo_juegos/Multisensorial/'.$juego['carpeta'],
                'nombre' => $juego['nombre'],
                'descripcion' => null,
                'imagen' => null,
                'color' => $juego['color'],
                'orden' => $ordenBase + $i,
                'activo' => 1,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
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
