<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clase_experiencias', function (Blueprint $table) {
            $table->id();

            $table->foreignId('clase_id')
                ->constrained('clases')
                ->cascadeOnDelete();

            $table->foreignId('experiencia_id')
                ->constrained('experiencias')
                ->cascadeOnDelete();

            $table->foreignId('modulo_id')
                ->constrained('modulos')
                ->cascadeOnDelete();

            $table->foreignId('eje_id')
                ->constrained('ejes')
                ->cascadeOnDelete();

            $table->foreignId('tematica_id')
                ->constrained('tematicas')
                ->cascadeOnDelete();

            $table->unsignedSmallInteger('orden')->default(0);

            $table->timestamps();

            $table->unique(['clase_id', 'experiencia_id'], 'clase_experiencias_clase_exp_unique');
            $table->index(['clase_id', 'orden']);
        });

        if (Schema::hasColumn('clases', 'experiencia_id')) {
            $filas = DB::table('clases')
                ->whereNotNull('experiencia_id')
                ->orderBy('id')
                ->get(['id', 'modulo_id', 'eje_id', 'tematica_id', 'experiencia_id']);

            foreach ($filas as $fila) {
                if (! $fila->modulo_id || ! $fila->eje_id || ! $fila->tematica_id) {
                    continue;
                }

                DB::table('clase_experiencias')->insert([
                    'clase_id' => $fila->id,
                    'experiencia_id' => $fila->experiencia_id,
                    'modulo_id' => $fila->modulo_id,
                    'eje_id' => $fila->eje_id,
                    'tematica_id' => $fila->tematica_id,
                    'orden' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Schema::table('clases', function (Blueprint $table) {
                $table->dropForeign(['modulo_id']);
                $table->dropForeign(['eje_id']);
                $table->dropForeign(['tematica_id']);
                $table->dropForeign(['experiencia_id']);
                $table->dropColumn(['modulo_id', 'eje_id', 'tematica_id', 'experiencia_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('clases', function (Blueprint $table) {
            $table->foreignId('modulo_id')->nullable()->constrained('modulos')->nullOnDelete();
            $table->foreignId('eje_id')->nullable()->constrained('ejes')->nullOnDelete();
            $table->foreignId('tematica_id')->nullable()->constrained('tematicas')->nullOnDelete();
            $table->foreignId('experiencia_id')->nullable()->constrained('experiencias')->nullOnDelete();
        });

        $pivotes = DB::table('clase_experiencias')->orderBy('clase_id')->orderBy('orden')->get();

        foreach ($pivotes->groupBy('clase_id') as $claseId => $items) {
            $primera = $items->first();
            DB::table('clases')->where('id', $claseId)->update([
                'modulo_id' => $primera->modulo_id,
                'eje_id' => $primera->eje_id,
                'tematica_id' => $primera->tematica_id,
                'experiencia_id' => $primera->experiencia_id,
            ]);
        }

        Schema::dropIfExists('clase_experiencias');
    }
};
