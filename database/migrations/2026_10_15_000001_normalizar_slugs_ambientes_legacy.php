<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Normaliza a los slugs canónicos los datos guardados con los alias legacy `musica` y `logico`.
 * No se revierte: tras el up no es posible distinguir un registro migrado de uno nuevo.
 */
return new class extends Migration
{
    private const MAPA = [
        'musica' => 'expresion-artistica',
        'logico' => 'multisaberes',
    ];

    public function up(): void
    {
        DB::transaction(function () {
            $this->normalizarColaSincronizacion();
            $this->normalizarRegistrosAcceso();
            $this->normalizarUsuarioDemo();
            $this->normalizarSlugsModulos();
        });

        if (Schema::hasTable('cola_sincronizacion')) {
            DB::statement('ALTER TABLE `cola_sincronizacion` ALTER COLUMN `servidor_origen` DROP DEFAULT');
        }
    }

    public function down(): void
    {
        //
    }

    private function normalizarColaSincronizacion(): void
    {
        if (! Schema::hasTable('cola_sincronizacion')) {
            return;
        }

        foreach (self::MAPA as $legacy => $canonico) {
            DB::table('cola_sincronizacion')
                ->where('servidor_origen', $legacy)
                ->update(['servidor_origen' => $canonico]);
        }

        DB::table('cola_sincronizacion')
            ->where('payload', 'like', '%servidor_destino%')
            ->where(fn ($q) => $q->where('payload', 'like', '%musica%')->orWhere('payload', 'like', '%logico%'))
            ->select(['id', 'payload'])
            ->chunkById(200, function ($filas) {
                foreach ($filas as $fila) {
                    $payload = json_decode((string) $fila->payload, true);
                    $destino = is_array($payload) ? ($payload['servidor_destino'] ?? null) : null;

                    if (! is_string($destino) || ! isset(self::MAPA[$destino])) {
                        continue;
                    }

                    $payload['servidor_destino'] = self::MAPA[$destino];

                    DB::table('cola_sincronizacion')
                        ->where('id', $fila->id)
                        ->update(['payload' => json_encode($payload)]);
                }
            });
    }

    private function normalizarRegistrosAcceso(): void
    {
        if (! Schema::hasTable('registros_acceso')) {
            return;
        }

        foreach (self::MAPA as $legacy => $canonico) {
            DB::table('registros_acceso')
                ->where('ambiente', $legacy)
                ->update(['ambiente' => $canonico]);
        }
    }

    private function normalizarUsuarioDemo(): void
    {
        $emailLegacy = 'docente.musica@aulasreggio.test';
        $emailNuevo = 'docente.expresion-artistica@aulasreggio.test';

        if (DB::table('users')->where('email', $emailNuevo)->exists()) {
            return;
        }

        $usuario = DB::table('users')->where('email', $emailLegacy)->first();
        if (! $usuario) {
            return;
        }

        $cambios = ['email' => $emailNuevo];
        if ($usuario->nombre === 'Docente Música') {
            $cambios['nombre'] = 'Docente';
        }
        if ($usuario->apellido === 'Música') {
            $cambios['apellido'] = 'Expresión Artística';
        }

        DB::table('users')->where('id', $usuario->id)->update($cambios);
    }

    private function normalizarSlugsModulos(): void
    {
        if (! Schema::hasTable('modulos')) {
            return;
        }

        $modulos = DB::table('modulos')
            ->whereIn('slug', array_keys(self::MAPA))
            ->get(['id', 'ambiente_id', 'nombre']);

        foreach ($modulos as $modulo) {
            $slug = Str::slug($modulo->nombre) ?: 'modulo-'.$modulo->id;

            $ocupado = DB::table('modulos')
                ->where('ambiente_id', $modulo->ambiente_id)
                ->where('slug', $slug)
                ->where('id', '!=', $modulo->id)
                ->exists();

            DB::table('modulos')
                ->where('id', $modulo->id)
                ->update(['slug' => $ocupado ? $slug.'-'.$modulo->id : $slug]);
        }
    }
};
