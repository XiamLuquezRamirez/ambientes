<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('juegos', function (Blueprint $table) {
            $table->dropForeign(['modulo_id']);
        });

        Schema::table('juegos', function (Blueprint $table) {
            $table->foreignId('ambiente_id')->nullable()->after('id')->constrained('ambientes')->nullOnDelete();
            $table->foreignId('eje_id')->nullable()->after('ambiente_id')->constrained('ejes')->nullOnDelete();
            $table->foreignId('tematica_id')->nullable()->after('eje_id')->constrained('tematicas')->nullOnDelete();
            $table->unsignedBigInteger('modulo_id')->nullable()->change();
            $table->foreign('modulo_id')->references('id')->on('modulos')->nullOnDelete();
        });

        DB::table('juegos')
            ->whereNotNull('modulo_id')
            ->orderBy('id')
            ->chunkById(100, function ($filas) {
                foreach ($filas as $fila) {
                    $modulo = DB::table('modulos')->where('id', $fila->modulo_id)->first(['ambiente_id']);
                    if (! $modulo) {
                        continue;
                    }
                    DB::table('juegos')->where('id', $fila->id)->update([
                        'ambiente_id' => $modulo->ambiente_id,
                    ]);
                }
            });

        Schema::table('juegos', function (Blueprint $table) {
            $table->index(['ambiente_id', 'activo', 'orden']);
            $table->index(['eje_id', 'activo', 'orden']);
            $table->index(['tematica_id', 'activo', 'orden']);
        });
    }

    public function down(): void
    {
        Schema::table('juegos', function (Blueprint $table) {
            $table->dropForeign(['ambiente_id']);
            $table->dropForeign(['eje_id']);
            $table->dropForeign(['tematica_id']);
            $table->dropForeign(['modulo_id']);
            $table->dropIndex(['ambiente_id', 'activo', 'orden']);
            $table->dropIndex(['eje_id', 'activo', 'orden']);
            $table->dropIndex(['tematica_id', 'activo', 'orden']);
            $table->dropColumn(['ambiente_id', 'eje_id', 'tematica_id']);
        });

        DB::table('juegos')->whereNull('modulo_id')->delete();

        Schema::table('juegos', function (Blueprint $table) {
            $table->unsignedBigInteger('modulo_id')->nullable(false)->change();
            $table->foreign('modulo_id')->references('id')->on('modulos')->cascadeOnDelete();
        });
    }
};
