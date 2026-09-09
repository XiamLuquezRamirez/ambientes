<?php

/**
 * Prepara pruebas reales de adaptación por perfil (institución 1).
 *
 * - Reescribe JSON inclusion de institución 1 según necesidad real de cada condición.
 * - Valores por perfil_id real de BD (1–6, 9, 10) + presets de config.
 * - Habilita perfil físico (10) en orden institucional si falta.
 * - Asigna 1 niño por perfil entre los de la clase activa de hoy.
 * - Crea PIN simple (misma figura × 3) a quien no tenga PIN usable.
 *
 * Uso: php scripts/preparar-pruebas-perfiles-inst1.php
 */

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ambiente;
use App\Models\Clase;
use App\Models\ConfiguracionPin;
use App\Models\Estudiante;
use App\Models\FigurasModel;
use App\Models\PerfilAprendizajeOrden;
use App\Services\ClaseKioscoService;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Support\Facades\DB;

const INSTITUCION_ID = 1;

$params = app(ParametrosPerfilAprendizajeService::class);
$claseKiosco = app(ClaseKioscoService::class);

/**
 * Valores por perfil_id real de BD (mapa_perfiles: 1–6, 9, 10).
 *
 * @return array<int, array{clave: string, nombre: string, valores: array<string, mixed>}>
 */
function definicionesPrueba(): array
{
    $base = config('parametros_perfil.base', []);
    $presets = config('parametros_perfil.presets', []);

    $merge = function (string $clave, array $extra = []) use ($base, $presets): array {
        return array_merge($base, $presets[$clave] ?? [], $extra);
    };

    // Alineado con scripts/preparar-experiencia-prueba-perfiles.php (contraste de prueba).
    return [
        1 => [
            'clave' => 'estandar',
            'nombre' => 'Estandar',
            'valores' => $merge('estandar', [
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
            ]),
        ],
        2 => [
            'clave' => 'tdah',
            'nombre' => 'TDAH',
            'valores' => $merge('tdah', [
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
            ]),
        ],
        3 => [
            'clave' => 'tea',
            'nombre' => 'TEA',
            'valores' => $merge('tea', [
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
            ]),
        ],
        4 => [
            'clave' => 'down',
            'nombre' => 'Síndrome de Down',
            'valores' => $merge('down', [
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
            ]),
        ],
        5 => [
            'clave' => 'disc_visual',
            'nombre' => 'Discapacidad Visual',
            'valores' => $merge('disc_visual', [
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
            ]),
        ],
        6 => [
            'clave' => 'disc_auditiva',
            'nombre' => 'Discapacidad Auditiva',
            'valores' => $merge('disc_auditiva', [
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
            ]),
        ],
        9 => [
            'clave' => 'disc_intelectual',
            'nombre' => 'Discapacidad Intelectual',
            'valores' => $merge('disc_intelectual', [
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
            ]),
        ],
        10 => [
            'clave' => 'disc_motriz',
            'nombre' => 'Discapacidad Física',
            'valores' => $merge('disc_motriz', [
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
            ]),
        ],
    ];
}

echo "=== 1. Escribir JSON institución ".INSTITUCION_ID." ===\n";
foreach (definicionesPrueba() as $perfilId => $def) {
    $valores = $params->completarValores($def['valores']);
    $params->guardarInstitucion(INSTITUCION_ID, 'inclusion', $perfilId, $valores);
    echo "OK inclusion/{$perfilId}.json ← {$def['nombre']} ({$def['clave']})";
    echo " btn={$valores['btn_size']} fondo={$valores['fondo_pantalla']} audio={$valores['audio_instruc']} opts={$valores['opciones_max']}\n";
}

echo "\n=== 2. Habilitar perfiles en orden institución ===\n";
$ahora = now();
$maxOrden = (int) (PerfilAprendizajeOrden::query()->where('institucion_id', INSTITUCION_ID)->max('orden') ?? -1);
foreach (array_keys(definicionesPrueba()) as $perfilId) {
    $fila = PerfilAprendizajeOrden::query()->firstOrNew([
        'institucion_id' => INSTITUCION_ID,
        'perfil_aprendizaje_id' => $perfilId,
    ]);
    if (! $fila->exists) {
        $maxOrden++;
        $fila->orden = $maxOrden;
        $fila->created_at = $ahora;
    }
    $fila->activa = true;
    $fila->updated_at = $ahora;
    $fila->save();
    echo "OK orden perfil {$perfilId} activa\n";
}

echo "\n=== 3. Localizar clase activa de hoy ===\n";
$clase = null;
$ambiente = null;
foreach (Ambiente::query()->where('activo', true)->get() as $amb) {
    $c = $claseKiosco->claseActivaHoy($amb);
    if ($c) {
        $clase = $c;
        $ambiente = $amb;
        break;
    }
}

if (! $clase) {
    echo "FAIL: no hay clase activa hoy. No se asignan estudiantes.\n";
    exit(1);
}

echo "Ambiente={$ambiente->slug} clase={$clase->id} exp={$clase->experiencia_id}\n";
$alumnos = $claseKiosco->estudiantesDeClase($clase)
    ->filter(fn (Estudiante $e) => (int) $e->institucion_id === INSTITUCION_ID)
    ->values();

if ($alumnos->isEmpty()) {
    echo "FAIL: la clase no tiene alumnos de institución 1.\n";
    exit(1);
}

// FIGURAS fáciles de recordar para pruebas (misma × 3)
$figurasPrueba = [
    'fas fa-circle',
    'fas fa-star',
    'fas fa-heart',
    'fas fa-fish',
    'fas fa-square',
    'fas fa-moon',
    'fas fa-diamond',
    'fas fa-apple-whole',
];

/**
 * Prioridad de asignación: 1 niño por perfil distinto.
 * Preferimos quien ya tenga PIN; si no, se crea.
 */
$plan = [
    1 => null,  // estándar
    2 => null,  // tdah
    3 => null,  // tea
    4 => null,  // down
    5 => null,  // visual
    6 => null,  // auditiva
    9 => null,  // intelectual
    10 => null, // física
];

// Preferencias iniciales si ya están asignados o son buenos candidatos
$preferidos = [
    2 => 13, // Andrea ya TDAH
    1 => 5,  // Camila control
    3 => 11, // Andres
    4 => 12, // Fabian con PIN
];

$porId = $alumnos->keyBy('id');
foreach ($preferidos as $perfilId => $estudianteId) {
    if ($porId->has($estudianteId) && $plan[$perfilId] === null) {
        $plan[$perfilId] = $estudianteId;
    }
}

$usados = array_filter($plan);
$restantes = $alumnos->reject(fn (Estudiante $e) => in_array($e->id, $usados, true))->values();

foreach ($plan as $perfilId => $asignado) {
    if ($asignado !== null) {
        continue;
    }
    if ($restantes->isEmpty()) {
        break;
    }
    // Preferir con PIN
    $conPin = $restantes->first(function (Estudiante $e) {
        $pin = $e->configuracionPin;

        return $pin && FigurasModel::esIconoValido($pin->figura_1);
    });
    $elegido = $conPin ?: $restantes->first();
    $plan[$perfilId] = $elegido->id;
    $restantes = $restantes->reject(fn (Estudiante $e) => $e->id === $elegido->id)->values();
}

echo "\n=== 4. Asignar perfiles + asegurar PIN ===\n";
$hoja = [];
$iFigura = 0;

DB::transaction(function () use ($plan, $porId, $figurasPrueba, &$iFigura, &$hoja) {
    foreach ($plan as $perfilId => $estudianteId) {
        if (! $estudianteId || ! $porId->has($estudianteId)) {
            echo "SKIP perfil {$perfilId}: sin estudiante disponible\n";
            continue;
        }

        /** @var Estudiante $est */
        $est = Estudiante::query()->with('configuracionPin')->findOrFail($estudianteId);
        $defs = definicionesPrueba();
        $nombrePerfil = $defs[$perfilId]['nombre'];

        $updates = ['perfil_aprendizaje_id' => $perfilId];
        if ($perfilId !== 1) {
            $updates['requiere_apoyo'] = 'si';
        }
        // Cerrar personalizado activo si hubiera (regla de producto)
        if ($est->perfilAprendizajePersonalizadoActiva) {
            app(\App\Services\EstudiantePerfilAprendizajePersonalizadoService::class)
                ->cerrarAsignacionActivaAlAsignarPerfilAprendizaje($est);
        }
        $est->update($updates);

        $pin = $est->configuracionPin;
        $pinOk = $pin && FigurasModel::esIconoValido($pin->figura_1);
        if (! $pinOk) {
            $figura = $figurasPrueba[$iFigura % count($figurasPrueba)];
            $iFigura++;
            ConfiguracionPin::query()->updateOrCreate(
                ['estudiante_id' => $est->id],
                [
                    'figura_1' => $figura,
                    'figura_2' => $figura,
                    'figura_3' => $figura,
                    'color_figura_1' => '#2563EB',
                    'color_figura_2' => '#2563EB',
                    'color_figura_3' => '#2563EB',
                    'intentos_fallidos' => 0,
                ]
            );
            $est->load('configuracionPin');
            $pin = $est->configuracionPin;
            $creado = true;
        } else {
            $creado = false;
        }

        $f1 = str_replace('fas fa-', '', $pin->figura_1);
        $f2 = str_replace('fas fa-', '', $pin->figura_2);
        $f3 = str_replace('fas fa-', '', $pin->figura_3);
        $pinLabel = ($f1 === $f2 && $f2 === $f3)
            ? "{$f1} × 3"
            : "{$f1} + {$f2} + {$f3}";
        $hoja[] = [
            'estudiante_id' => $est->id,
            'nombre' => trim($est->nombre.' '.$est->apellido),
            'perfil_id' => $perfilId,
            'perfil' => $nombrePerfil,
            'pin' => $pinLabel,
            'figuras' => "{$pin->figura_1} | {$pin->figura_2} | {$pin->figura_3}",
            'pin_creado' => $creado,
        ];

        echo "OK [{$est->id}] {$est->nombre} → {$nombrePerfil} (id {$perfilId})";
        echo $creado ? " | PIN NUEVO {$pinLabel}\n" : " | PIN existente ({$pinLabel})\n";
    }
});

echo "\n=== HOJA DE PRUEBA (login kiosco) ===\n";
echo str_pad('ID', 5).str_pad('Niño', 28).str_pad('Perfil', 26)."PIN\n";
echo str_repeat('-', 78)."\n";
foreach ($hoja as $row) {
    echo str_pad((string) $row['estudiante_id'], 5)
        .str_pad(mb_substr($row['nombre'], 0, 26), 28)
        .str_pad(mb_substr($row['perfil'], 0, 24), 26)
        .$row['pin']
        .($row['pin_creado'] ? ' *nuevo*' : '')
        ."\n";
}

echo "\nNotas:\n";
echo "- login_tipo en JSON quedó en pin_3 (el kiosco lo ignora igual; es noop).\n";
echo "- IDs reales: 9=intelectual, 10=física (mapa_perfiles ya alineado).\n";
echo "- Tras /salir, vuelve a entrar con otro niño para ver el cambio de perfil.\n";
echo "- Script idempotente: puede re-ejecutarse.\n";
