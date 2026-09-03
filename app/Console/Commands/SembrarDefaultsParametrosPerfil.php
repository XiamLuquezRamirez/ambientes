<?php

namespace App\Console\Commands;

use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SembrarDefaultsParametrosPerfil extends Command
{
    protected $signature = 'parametros-perfil:sembrar-defaults {--force : Sobrescribe JSON existentes}';

    protected $description = 'Genera los JSON de valores por defecto (SuperAdmin) con los 50 parámetros completos';

    public function handle(ParametrosPerfilAprendizajeService $servicio): int
    {
        $force = (bool) $this->option('force');
        $creados = 0;

        $inclusiones = PerfilAprendizajeInclusion::query()->where('eliminado', 0)->pluck('id');

        foreach ($inclusiones as $id) {
            if ($this->escribirDefaultInclusion((int) $id, $servicio, $force)) {
                $creados++;
            }
        }

        $personalizados = PerfilAprendizajePersonalizado::query()
            ->whereNull('institucion_id')
            ->where('eliminado', 0)
            ->get();

        foreach ($personalizados as $perfil) {
            if ($this->escribirDefaultPersonalizado($perfil, $servicio, $force)) {
                $creados++;
            }
        }

        $this->info("Defaults generados/actualizados: {$creados}");

        return self::SUCCESS;
    }

    private function escribirDefaultInclusion(int $id, ParametrosPerfilAprendizajeService $servicio, bool $force): bool
    {
        $ruta = storage_path('parametros-perfil/defaults/inclusion/'.$id.'.json');

        if (File::exists($ruta) && ! $force) {
            return false;
        }

        $valores = $servicio->valoresSistemaInclusion($id);
        $servicio->guardarDefaults('inclusion', $id, $valores);

        return true;
    }

    private function escribirDefaultPersonalizado(
        PerfilAprendizajePersonalizado $perfil,
        ParametrosPerfilAprendizajeService $servicio,
        bool $force
    ): bool {
        $id = (int) $perfil->id;
        $ruta = storage_path('parametros-perfil/defaults/personalizado/'.$id.'.json');

        if (File::exists($ruta) && ! $force) {
            return false;
        }

        $baseId = (int) ($perfil->perfil_aprendizaje_id ?? 0);
        $valores = $baseId > 0
            ? $servicio->valoresDefaults('inclusion', $baseId)
            : $servicio->valoresEstandar();

        $servicio->guardarDefaults('personalizado', $id, $valores, $perfil);

        return true;
    }
}
