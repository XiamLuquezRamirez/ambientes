<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Realinea slug/nombre/ruta de juegos partidos con títulos narrativos del doc.
 * Generado desde scripts/renombres-desde-doc.json
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        $mapaPath = base_path('scripts/renombres-desde-doc.json');
        if (! is_file($mapaPath)) {
            return;
        }

        $renombres = json_decode((string) file_get_contents($mapaPath), true);
        if (! is_array($renombres) || $renombres === []) {
            return;
        }

        $ahora = now();
        $tieneSesiones = Schema::hasTable('sesiones_juego');

        foreach ($renombres as $r) {
            $oldSlug = (string) ($r['oldSlug'] ?? '');
            $newSlug = (string) ($r['newSlug'] ?? '');
            $newNombre = (string) ($r['newNombre'] ?? '');
            $newRuta = (string) ($r['newRuta'] ?? '');
            if ($oldSlug === '' || $newSlug === '' || $newRuta === '') {
                continue;
            }

            $row = DB::table('juegos')->where('slug', $oldSlug)->first();
            if (! $row) {
                // Idempotencia: ya migrado
                if (DB::table('juegos')->where('slug', $newSlug)->exists()) {
                    DB::table('juegos')->where('slug', $newSlug)->update([
                        'nombre' => $newNombre,
                        'ruta' => $newRuta,
                        'updated_at' => $ahora,
                    ]);
                }
                continue;
            }

            if ($oldSlug === $newSlug) {
                DB::table('juegos')->where('slug', $oldSlug)->update([
                    'nombre' => $newNombre,
                    'ruta' => $newRuta,
                    'updated_at' => $ahora,
                ]);
                continue;
            }

            $payload = (array) $row;
            unset($payload['slug']);
            $payload['nombre'] = $newNombre;
            $payload['ruta'] = $newRuta;
            $payload['updated_at'] = $ahora;

            if (DB::table('juegos')->where('slug', $newSlug)->exists()) {
                DB::table('juegos')->where('slug', $newSlug)->update($payload);
            } else {
                DB::table('juegos')->insert(array_merge($payload, [
                    'slug' => $newSlug,
                    'created_at' => $row->created_at ?? $ahora,
                ]));
            }

            if ($tieneSesiones) {
                DB::table('sesiones_juego')->where('juego_id', $oldSlug)->update([
                    'juego_id' => $newSlug,
                ]);
            }

            DB::table('juegos')->where('slug', $oldSlug)->delete();
        }
    }

    public function down(): void
    {
        // Irreversible de forma segura sin el mapa inverso en FS.
    }
};
