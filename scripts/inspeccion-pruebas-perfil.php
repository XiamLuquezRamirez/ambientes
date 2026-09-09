<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ambiente;
use App\Models\Clase;
use App\Models\Estudiante;
use App\Models\FigurasModel;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajeOrden;
use App\Services\ClaseKioscoService;
use Illuminate\Support\Facades\DB;

$hoy = now()->toDateString();
echo "Hoy: {$hoy}\n";
echo "mapa: ".json_encode(config('parametros_perfil.mapa_perfiles'))."\n\n";

$perfiles = PerfilAprendizajeInclusion::query()->orderBy('id')->get(['id', 'codigo', 'nombre', 'estado', 'eliminado']);
echo "=== Perfiles ===\n";
foreach ($perfiles as $p) {
    echo "{$p->id} | {$p->codigo} | {$p->nombre} | estado={$p->estado} elim={$p->eliminado}\n";
}

$orden = PerfilAprendizajeOrden::query()->where('institucion_id', 1)->orderBy('orden')->get();
echo "\n=== Orden institución 1 ===\n";
foreach ($orden as $o) {
    echo "perfil={$o->perfil_aprendizaje_id} orden={$o->orden} activa=".($o->activa ? '1' : '0')."\n";
}

$clase = Clase::query()
    ->whereDate('fecha', $hoy)
    ->where('estado', Clase::ESTADO_ACTIVA)
    ->with(['cargaDocente'])
    ->get();

echo "\n=== Clases activas hoy ===\n";
foreach ($clase as $c) {
    echo "clase={$c->id} ambiente={$c->cargaDocente?->ambiente_id} exp={$c->experiencia_id} carga={$c->carga_docente_id}\n";
}

$servicio = app(ClaseKioscoService::class);
$ambientes = Ambiente::query()->where('activo', true)->get();
foreach ($ambientes as $amb) {
    $activa = $servicio->claseActivaHoy($amb);
    if (! $activa) {
        continue;
    }
    echo "\n=== Alumnos ambiente {$amb->slug} clase {$activa->id} ===\n";
    $alumnos = $servicio->estudiantesDeClase($activa);
    foreach ($alumnos as $e) {
        $pin = $e->configuracionPin;
        $pinOk = $pin && FigurasModel::esIconoValido($pin->figura_1);
        echo "[{$e->id}] {$e->nombre} {$e->apellido} | inst={$e->institucion_id} | perfil={$e->perfil_aprendizaje_id} | apoyo={$e->requiere_apoyo} | pin=".($pinOk ? 'OK' : 'NO')."\n";
        if ($pinOk) {
            echo "    PIN: {$pin->figura_1} | {$pin->figura_2} | {$pin->figura_3}\n";
        }
    }
}

$base = storage_path('parametros-perfil/1');
echo "\n=== JSON institución 1 ===\n";
foreach (['inclusion', 'personalizado'] as $t) {
    $dir = $base.'/'.$t;
    if (! is_dir($dir)) {
        echo "{$t}: NO DIR\n";
        continue;
    }
    foreach (scandir($dir) as $f) {
        if (! str_ends_with($f, '.json')) {
            continue;
        }
        $path = $dir.'/'.$f;
        $data = json_decode(file_get_contents($path), true);
        $vals = $data['valores'] ?? [];
        echo "{$t}/{$f} keys=".count($vals)." actualizado=".($data['actualizado_en'] ?? '-')."\n";
        if (isset($vals['btn_size'])) {
            echo "  btn={$vals['btn_size']} fondo={$vals['fondo_pantalla']} contraste={$vals['contraste']} audio={$vals['audio_instruc']} opts={$vals['opciones_max']}\n";
        }
    }
}

$defaults = storage_path('parametros-perfil/defaults/inclusion');
echo "\n=== Defaults inclusion ===\n";
if (is_dir($defaults)) {
    foreach (scandir($defaults) as $f) {
        if (str_ends_with($f, '.json')) {
            echo "defaults/inclusion/{$f}\n";
        }
    }
}
