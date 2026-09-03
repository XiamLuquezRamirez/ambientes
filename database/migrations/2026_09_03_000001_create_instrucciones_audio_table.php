<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instrucciones_audio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bloque_experiencia_id')
                ->constrained('bloques_experiencia')
                ->cascadeOnDelete();
            $table->text('instruccion');
            $table->string('personaje', 16);
            $table->unsignedTinyInteger('orden');
            $table->timestamps();

            $table->index(['bloque_experiencia_id', 'orden'], 'instrucciones_audio_bloque_orden_idx');
        });

        $this->migrarInstruccionesLegacy();
    }

    public function down(): void
    {
        Schema::dropIfExists('instrucciones_audio');
    }

    private function migrarInstruccionesLegacy(): void
    {
        DB::table('bloques_experiencia')
            ->orderBy('id')
            ->chunkById(100, function ($bloques): void {
                $ahora = now();
                $filas = [];

                foreach ($bloques as $bloque) {
                    $datos = json_decode((string) $bloque->datos, true);
                    if (! is_array($datos)) {
                        continue;
                    }
                    $texto = trim((string) ($datos['instruccion'] ?? ''));
                    if ($texto === '') {
                        continue;
                    }

                    $filas[] = [
                        'bloque_experiencia_id' => $bloque->id,
                        'instruccion' => $texto,
                        'personaje' => 'zoe',
                        'orden' => 1,
                        'created_at' => $ahora,
                        'updated_at' => $ahora,
                    ];
                }

                if ($filas !== []) {
                    DB::table('instrucciones_audio')->insert($filas);
                }
            });
    }
};
