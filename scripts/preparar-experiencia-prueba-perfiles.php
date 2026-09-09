<?php

/**
 * Reconstruye la experiencia 26 (clase activa) como recorrido de prueba
 * de adaptaciones por perfil de aprendizaje, y reescribe JSON institución 1.
 *
 * Uso: php scripts/preparar-experiencia-prueba-perfiles.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\BloqueExperiencia;
use App\Models\Experiencia;
use App\Services\BloqueExperienciaService;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Support\Facades\DB;

const EXP_ID = 26;
const INSTITUCION_ID = 1;

/** Archivos ya existentes en storage/app/public/experiencias/26/bloques */
const M = [
    'colores' => 'images_1__6a9f12d69e283.jpg',
    'rojo' => 'paint-splash-red-abstract-blot-burgundy-cartoon-paint-splatter-vector_6a9f13f23c935.jpg',
    'platano' => 'images_2__6a9f142d784e3.jpg',
    'limon' => 'Dibujo-Basico-Limon_6a9f14066a866.jpg',
    'camion' => 'fire-truck-coloring-page-isolated-for-kids-free-vector_6a9f143342f12.jpg',
    'mar' => 'mar_6a9f14856adf3.jpg',
    'fresa' => 'Fresa-Facil_6a9f148ab4bed.jpg',
    'girasol' => 'girasol_6a9f1490bea1a.jpg',
    'uvas' => 'icon-bunch-of-grapes-with-a-leaf-contour-drawing-of-fruit-illustration-vector_6a9ae101d714b.jpg',
    'fondo' => 'Fondo_prueba_6a9741b1d7c8e.png',
    'video' => 'PAJARO_VIDEO_6a99cb3728889.mp4',
    'bienvenida_img' => 'buen_trabajo_6a958737241c6.jpg',
];

$bloquesSvc = app(BloqueExperienciaService::class);
$paramsSvc = app(ParametrosPerfilAprendizajeService::class);

$exp = Experiencia::query()->findOrFail(EXP_ID);

echo "=== 1. Actualizar meta experiencia {$exp->id} ===\n";
$exp->update([
    'nombre' => 'Colores — prueba de perfiles',
    'objetivo' => 'Recorrido de prueba para validar adaptaciones del kiosco según perfil de aprendizaje (visual, audio, opciones, juegos, dibujo, timer, pausas).',
    'duracion_minutos' => 30,
    'estado' => Experiencia::ESTADO_ACTIVA,
    'activo' => true,
]);
echo "OK nombre={$exp->nombre}\n";

echo "\n=== 2. Limpiar bloques movibles ===\n";
DB::transaction(function () use ($exp) {
    $exp->bloques()
        ->whereNotIn('tipo', [
            BloqueExperiencia::TIPO_BIENVENIDA,
            BloqueExperiencia::TIPO_RECOMPENSA,
        ])
        ->get()
        ->each(function (BloqueExperiencia $b) {
            // Emoción y el resto son eliminables; instrucciones_audio en cascade/null
            $b->instruccionesAudio()->delete();
            $b->delete();
            echo "DEL id={$b->id} tipo={$b->tipo}\n";
        });
});

$exp->refresh();
$bloquesSvc->asegurarObligatorios($exp);
$bienvenida = $exp->bloques()->where('tipo', BloqueExperiencia::TIPO_BIENVENIDA)->firstOrFail();
$recompensa = $exp->bloques()->where('tipo', BloqueExperiencia::TIPO_RECOMPENSA)->firstOrFail();

$audio = fn (string $texto, string $personaje = 'zoe'): array => [
    ['texto' => $texto, 'personaje' => $personaje],
];

echo "\n=== 3. Configurar bienvenida + recompensa ===\n";
$bloquesSvc->actualizarDatos($bienvenida, [
    'personaje' => 'personaje',
    'tipo_media' => 'imagen',
    'imagen' => M['bienvenida_img'],
    'video' => '',
    'descripcion_accesible' => 'Niño feliz con los pulgares arriba',
    'instruccion' => '¡Hola! Hoy vamos a jugar con los colores.',
], $audio('¡Hola! Hoy vamos a jugar con los colores. Escucha y mira con atención.'));

$bloquesSvc->actualizarDatos($recompensa, [
    'tipo' => 'Trofeo',
    'insignia' => null,
    'instruccion' => '¡Excelente! Completaste la prueba de colores.',
], $audio('¡Excelente trabajo! Completaste la actividad de colores.'));

echo "OK bienvenida={$bienvenida->id} recompensa={$recompensa->id}\n";

/**
 * Agrega bloque y configura datos + audio. Devuelve el modelo.
 *
 * @param  array<string, mixed>  $datos
 * @param  list<array{texto:string,personaje:string}>  $instrucciones
 */
$add = function (string $tipo, array $datos, array $instrucciones) use ($bloquesSvc, $exp): BloqueExperiencia {
    $bloque = $bloquesSvc->agregar($exp->fresh(), $tipo);
    $bloquesSvc->actualizarDatos($bloque, $datos, $instrucciones);
    echo "ADD id={$bloque->id} tipo={$tipo}\n";

    return $bloque->fresh();
};

echo "\n=== 4. Crear bloques de prueba ===\n";

// Video → subtítulos (auditiva/visual), TTS
$video = $add('video', [
    'archivo' => M['video'],
    'descripcion_accesible' => 'Un pájaro de colores canta y se mueve',
    'descripcion' => 'Mira el pájaro de colores. Observa bien sus colores.',
    'instruccion' => 'Mira el pájaro de colores.',
], $audio('Mira el pájaro de colores. Observa bien sus colores.'));

// Imagen zoom → gestos (solo toque vs pinch)
$imagen = $add('imagen', [
    'archivo' => M['colores'],
    'descripcion' => 'Círculos de muchos colores',
    'instruccion' => 'Mira estos colores. ¿Reconoces alguno?',
], $audio('Mira estos colores. ¿Reconoces alguno? Puedes acercar la imagen si quieres.'));

// Pregunta CON imagen + 4 opciones imagen → opciones_max, intentos, layout media, feedback
$pregImg = $add('pregunta', [
    'texto' => '¿Qué pintamos de este color?',
    'imagen' => M['rojo'],
    'tipo_opts' => 'imagen_texto',
    'intentos' => '3',
    'al_agotar' => 'Mostrar respuesta correcta',
    'fb_ok' => '¡Muy bien! El camión es rojo.',
    'fb_err' => 'Mira otra vez. Busca algo de color rojo.',
    'instruccion' => '¿Qué pintamos de color rojo?',
    'opciones' => [
        ['texto' => 'Plátano', 'emoji' => '', 'imagen' => M['platano'], 'correcta' => false],
        ['texto' => 'Limón', 'emoji' => '', 'imagen' => M['limon'], 'correcta' => false],
        ['texto' => 'Camión', 'emoji' => '', 'imagen' => M['camion'], 'correcta' => true],
        ['texto' => 'Uvas', 'emoji' => '', 'imagen' => M['uvas'], 'correcta' => false],
    ],
], $audio('¿Qué pintamos de color rojo? Toca la imagen correcta.'));

// Pregunta emoji ×4 (sin imagen enunciado) → opciones_max puro
$pregEmoji = $add('pregunta', [
    'texto' => '¿De qué color es el sol?',
    'imagen' => '',
    'tipo_opts' => 'emoji_texto',
    'intentos' => '3',
    'al_agotar' => 'Mostrar respuesta correcta',
    'fb_ok' => '¡Sí! El sol es amarillo.',
    'fb_err' => 'Piensa otra vez. ¿Qué color brilla en el cielo de día?',
    'instruccion' => '¿De qué color es el sol?',
    'opciones' => [
        ['texto' => 'Azul', 'emoji' => '🔵', 'imagen' => '', 'correcta' => false],
        ['texto' => 'Amarillo', 'emoji' => '🟡', 'imagen' => '', 'correcta' => true],
        ['texto' => 'Verde', 'emoji' => '🟢', 'imagen' => '', 'correcta' => false],
        ['texto' => 'Rojo', 'emoji' => '🔴', 'imagen' => '', 'correcta' => false],
    ],
], $audio('¿De qué color es el sol? Elige una opción.'));

// Reto 2 pasos ×4 opciones → refuerzo cada paso / cada 2 pasos
$reto = $add('reto', [
    'descripcion' => 'Reto de colores',
    'instruccion' => 'Completa los dos pasos del reto.',
    'intentos' => '3',
    'al_agotar' => 'Mostrar respuesta correcta',
    'fb_ok' => '¡Paso logrado!',
    'fb_err' => 'Inténtalo otra vez.',
    'pasos' => [
        [
            'pregunta' => '¿Qué color tiene el mar?',
            'opciones' => [
                ['emoji' => '🔵', 'label' => 'Azul', 'imagen' => '', 'correcta' => true],
                ['emoji' => '🔴', 'label' => 'Rojo', 'imagen' => '', 'correcta' => false],
                ['emoji' => '🟡', 'label' => 'Amarillo', 'imagen' => '', 'correcta' => false],
                ['emoji' => '🟢', 'label' => 'Verde', 'imagen' => '', 'correcta' => false],
            ],
        ],
        [
            'pregunta' => '¿Qué color tiene la fresa?',
            'opciones' => [
                ['emoji' => '🟢', 'label' => 'Verde', 'imagen' => '', 'correcta' => false],
                ['emoji' => '🔵', 'label' => 'Azul', 'imagen' => '', 'correcta' => false],
                ['emoji' => '🔴', 'label' => 'Rojo', 'imagen' => '', 'correcta' => true],
                ['emoji' => '🟡', 'label' => 'Amarillo', 'imagen' => '', 'correcta' => false],
            ],
        ],
    ],
], $audio('Completa los dos pasos del reto de colores.'));

// Dibujo → paleta_reducida, grosor, deshacer, lienzo
$dibujo = $add('dibujo', [
    'fondo' => M['fondo'],
    'guardar_evidencia' => true,
    'nota_evidencia' => 'Dibujo de prueba perfiles',
    'instruccion' => 'Dibuja tu color favorito.',
], $audio('Dibuja tu color favorito en el lienzo.'));

// Memoria 6 pares → memoria_pares_max, juego_bordes
$memoria = $add('juego', [
    'juego_id' => 'memoria',
    'juego_nombre' => 'Memoria de colores',
    'juego_imagen' => '',
    'juego_piezas' => '',
    'imagen_1' => M['limon'],
    'imagen_2' => M['fresa'],
    'imagen_3' => M['girasol'],
    'imagen_4' => M['mar'],
    'imagen_5' => M['camion'],
    'imagen_6' => M['uvas'],
    'instruccion' => 'Encuentra las parejas iguales.',
], $audio('Encuentra las parejas iguales. Toca dos cartas.'));

// Rompecabezas 9 → rompecabezas_piezas_max
$puzzle = $add('juego', [
    'juego_id' => 'rompecabezas',
    'juego_nombre' => 'Arma la imagen',
    'juego_imagen' => M['colores'],
    'juego_piezas' => '9 piezas',
    'instruccion' => 'Arma el rompecabezas de colores.',
], $audio('Arma el rompecabezas. Coloca cada pieza en su lugar.'));

// Secuencia 4 → secuencia_pasos_max
$seq = $add('juego', [
    'juego_id' => 'secuencia',
    'juego_nombre' => 'Ordena los colores',
    'seq_1' => M['rojo'],
    'seq_2' => M['limon'],
    'seq_3' => M['mar'],
    'seq_4' => M['girasol'],
    'instruccion' => 'Ordena las imágenes del uno al cuatro.',
], $audio('Ordena las imágenes del uno al cuatro.'));

// Emoción
$emocion = $add('emocion', [
    'cantidad' => '4',
    'instruccion' => '¿Cómo te sentiste con esta actividad?',
], $audio('¿Cómo te sentiste con esta actividad? Toca una cara.'));

echo "\n=== 5. Reordenar recorrido ===\n";
$ordenIds = [
    $video->id,
    $imagen->id,
    $pregImg->id,
    $pregEmoji->id,
    $reto->id,
    $dibujo->id,
    $memoria->id,
    $puzzle->id,
    $seq->id,
    $emocion->id,
];
$list = $bloquesSvc->reordenar($exp->fresh(), $ordenIds);
foreach ($list as $b) {
    echo "  {$b['orden']}. {$b['tipo']} (id {$b['id']})\n";
}

echo "\n=== 6. JSON perfiles institución 1 (contraste de prueba) ===\n";
$base = config('parametros_perfil.base', []);
$presets = config('parametros_perfil.presets', []);
$merge = fn (string $clave, array $extra = []) => array_merge($base, $presets[$clave] ?? [], $extra);

$perfilesJson = [
    1 => ['estandar', $merge('estandar', [
        'login_tipo' => 'pin_3',
        'audio_instruc' => 'opcional',
        'opciones_max' => 4,
        'intentos_max' => 3,
        'progreso' => 'barra',
        'feedback_demora_ms' => 400,
        'tiempo_max_bloque' => 0,
        'pausa_entre_bloques' => false,
        'fondo_pantalla' => 'blanco',
        'memoria_pares_max' => 6,
        'rompecabezas_piezas_max' => 9,
        'secuencia_pasos_max' => 4,
        'btn_size' => 72,
        'font_size' => 16,
    ])],
    2 => ['tdah', $merge('tdah', [
        'login_tipo' => 'pin_3',
        'btn_size' => 80,
        'btn_spacing' => 16,
        'opciones_max' => 3,
        'tiempo_max_bloque' => 45,
        'pausa_entre_bloques' => true,
        'duracion_pausa_seg' => 3,
        'progreso' => 'barra prominente',
        'refuerzo' => 'cada 2 pasos',
        'feedback_demora_ms' => 0,
        'anim_decorativas' => false,
        'elementos_flotantes' => false,
        'auto_avance' => false,
        'modo_color' => 'normal',
        'audio_instruc' => 'automático',
    ])],
    3 => ['tea', $merge('tea', [
        'login_tipo' => 'pin_3',
        'opciones_max' => 2,
        'audio_instruc' => 'manual',
        'auto_avance' => false,
        'tiempo_max_bloque' => 0,
        'pausa_entre_bloques' => true,
        'duracion_pausa_seg' => 5,
        'error_visible' => false,
        'refuerzo' => 'cada paso',
        'progreso' => 'pasos',
        'gestos' => 'solo toque',
        'paleta_reducida' => true,
        'deshacer' => false,
        'memoria_pares_max' => 2,
        'rompecabezas_piezas_max' => 4,
        'secuencia_pasos_max' => 2,
        'fondo_pantalla' => 'crema',
    ])],
    4 => ['down', $merge('down', [
        'login_tipo' => 'pin_3',
        'audio_instruc' => 'automático',
        'opciones_max' => 2,
        'intentos_max' => 5,
        'lectura_facil' => true,
        'voz_narradora' => 'muy_lenta',
        'velocidad_voz' => 70,
        'repeticion_audio' => true,
        'progreso' => 'círculos',
        'pausa_entre_bloques' => true,
        'duracion_pausa_seg' => 5,
        'error_visible' => false,
        'memoria_pares_max' => 2,
        'rompecabezas_piezas_max' => 4,
        'secuencia_pasos_max' => 2,
        'paleta_reducida' => true,
        'auto_avance' => false,
    ])],
    5 => ['disc_visual', $merge('disc_visual', [
        'login_tipo' => 'pin_3',
        'btn_size' => 96,
        'font_size' => 24,
        'opciones_max' => 2,
        'intentos_max' => 5,
        'contraste' => 'máximo',
        'cursor_grande' => true,
        'audio_instruc' => 'automático',
        'subtitulos' => true,
        'repeticion_audio' => true,
        'voz_narradora' => 'lenta',
        'velocidad_voz' => 85,
        'progreso' => 'barra prominente',
        'juego_bordes' => true,
        'lienzo_cuadriculado' => true,
        'grosor_pincel' => 14,
        'elementos_flotantes' => false,
        'anim_decorativas' => false,
        'fondo_pantalla' => 'gris_suave',
    ])],
    6 => ['disc_auditiva', $merge('disc_auditiva', [
        'login_tipo' => 'pin_3',
        'audio_instruc' => 'desactivado',
        'subtitulos' => true,
        'contraste' => 'alto',
        'refuerzo_visual' => true,
        'refuerzo_sonido' => false,
        'refuerzo_tipo' => 'animación',
        'opciones_max' => 3,
        'fondo_pantalla' => 'blanco',
        'btn_size' => 80,
    ])],
    9 => ['disc_intelectual', $merge('disc_intelectual', [
        'login_tipo' => 'pin_3',
        'audio_instruc' => 'automático',
        'opciones_max' => 2,
        'intentos_max' => 5,
        'lectura_facil' => true,
        'progreso' => 'círculos',
        'pausa_entre_bloques' => true,
        'duracion_pausa_seg' => 5,
        'voz_narradora' => 'lenta',
        'velocidad_voz' => 80,
        'repeticion_audio' => true,
        'memoria_pares_max' => 2,
        'rompecabezas_piezas_max' => 4,
        'secuencia_pasos_max' => 2,
        'paleta_reducida' => true,
        'error_visible' => false,
        'fondo_pantalla' => 'crema',
    ])],
    10 => ['disc_motriz', $merge('disc_motriz', [
        'login_tipo' => 'pin_3',
        'btn_size' => 104,
        'btn_spacing' => 20,
        'cursor_grande' => true,
        'gestos' => 'solo toque',
        'grosor_pincel' => 16,
        'lienzo_cuadriculado' => true,
        'opciones_max' => 3,
        'audio_instruc' => 'opcional',
        'fondo_pantalla' => 'blanco',
        'progreso' => 'barra',
    ])],
];

foreach ($perfilesJson as $perfilId => [$clave, $valores]) {
    $paramsSvc->guardarInstitucion(INSTITUCION_ID, 'inclusion', $perfilId, $valores);
    echo "OK inclusion/{$perfilId}.json ← {$clave} opts={$valores['opciones_max']} audio={$valores['audio_instruc']} btn={$valores['btn_size']}\n";
}

echo "\n=== HOJA DE PRUEBA POR BLOQUE ===\n";
$guia = <<<'TXT'
Orden | Bloque              | Qué verificar según perfil
------+---------------------+--------------------------------------------------
1     | Bienvenida + imagen | TTS auto/manual/off · voz lenta · repetición · fondo
2     | Video pájaro        | Subtítulos (visual/auditiva) · sin audio (auditiva)
3     | Imagen colores      | Gestos: solo toque (TEA/física) vs pinch+zoom
4     | Pregunta+imagen×4   | opciones_max 4→3→2 · imagen grande · intentos · feedback/demora/error
5     | Pregunta emoji×4    | Recorte de opciones sin imagen de enunciado
6     | Reto 2 pasos        | refuerzo cada paso vs cada 2 pasos · badge
7     | Dibujo              | paleta 4 colores · sin deshacer · grosor · cuadrícula
8     | Memoria 6           | pares_max 6→2 · bordes gruesos (visual)
9     | Puzzle 9            | piezas_max 9→4 · bordes
10    | Secuencia 4         | pasos_max 4→2
11    | Emoción             | tipografía / contraste
12    | Recompensa          | cierre

Niños (inst 1): Camila=Estándar · Andrea=TDAH · Andres=TEA · Fabian MQ=Down
                Fabian M=Visual · Hugo=Auditiva · José7=Intelectual · José8=Física
Tras /salir entra con otro niño. Recarga forzada en tablet si no ves cambios CSS.
TXT;
echo $guia."\n";
echo "\nListo. Experiencia ".EXP_ID." lista para pruebas en kiosco.\n";
