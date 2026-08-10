<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('modulos', 'institucion_id')) {
            Schema::table('modulos', function (Blueprint $table) {
                $table->foreignId('institucion_id')
                    ->nullable()
                    ->after('ambiente_id')
                    ->constrained('instituciones')
                    ->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('modulos', 'es_oficial')) {
            Schema::table('modulos', function (Blueprint $table) {
                $table->boolean('es_oficial')
                    ->default(true)
                    ->after('visible_estudiantes');
            });
        }

        DB::table('modulos')
            ->whereNull('institucion_id')
            ->update(['es_oficial' => true]);

        if (! Schema::hasTable('modulo_institucion')) {
            Schema::create('modulo_institucion', function (Blueprint $table) {
                $table->id();
                $table->foreignId('modulo_id')->constrained('modulos')->cascadeOnDelete();
                $table->foreignId('institucion_id')->constrained('instituciones')->cascadeOnDelete();
                $table->boolean('activo')->default(true);
                $table->timestamps();

                $table->unique(['modulo_id', 'institucion_id']);
            });
        }

        $ahora = now();
        $modulosOficiales = DB::table('modulos')
            ->where('es_oficial', true)
            ->whereNull('institucion_id')
            ->get(['id', 'ambiente_id']);

        $ambientesPorInstitucion = DB::table('ambiente_institucion')
            ->where('activo', true)
            ->get(['ambiente_id', 'institucion_id'])
            ->groupBy('ambiente_id');

        $filas = [];
        foreach ($modulosOficiales as $modulo) {
            foreach ($ambientesPorInstitucion->get($modulo->ambiente_id, collect()) as $vinculo) {
                $filas[] = [
                    'modulo_id' => $modulo->id,
                    'institucion_id' => $vinculo->institucion_id,
                    'activo' => true,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ];
            }
        }

        foreach (array_chunk($filas, 100) as $chunk) {
            DB::table('modulo_institucion')->insertOrIgnore($chunk);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('modulo_institucion');
    }
};
