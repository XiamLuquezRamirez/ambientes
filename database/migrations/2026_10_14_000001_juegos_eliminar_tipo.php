<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * El catálogo de juegos ya no clasifica por tipo. Cubre los dos esquemas en uso:
 * el de ambientes.sql (`tipo_juego_id` + `tipos_juegos`) y el de las migraciones (`tipo`).
 * El down() recrea la estructura, no la clasificación.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('juegos', 'tipo_juego_id')) {
            if ($this->existeRestriccion('juegos', 'juegos_tipo_juego_id_foreign')) {
                Schema::table('juegos', function (Blueprint $table) {
                    $table->dropForeign('juegos_tipo_juego_id_foreign');
                });
            }

            if ($this->existeIndice('juegos', 'juegos_tipo_juego_id_activo_orden_index')) {
                Schema::table('juegos', function (Blueprint $table) {
                    $table->dropIndex('juegos_tipo_juego_id_activo_orden_index');
                });
            }

            Schema::table('juegos', function (Blueprint $table) {
                $table->dropColumn('tipo_juego_id');
            });
        }

        if (Schema::hasColumn('juegos', 'tipo')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->dropColumn('tipo');
            });
        }

        Schema::dropIfExists('tipos_juegos');
    }

    public function down(): void
    {
        if (! Schema::hasTable('tipos_juegos')) {
            Schema::create('tipos_juegos', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 80)->unique();
                $table->string('nombre', 100);
                $table->text('descripcion')->nullable();
                $table->boolean('activo')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasColumn('juegos', 'tipo_juego_id')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->foreignId('tipo_juego_id')->nullable()->after('modulo_id')
                    ->constrained('tipos_juegos')->nullOnDelete();
                $table->index(['tipo_juego_id', 'activo', 'orden']);
            });
        }
    }

    private function existeRestriccion(string $tabla, string $nombre): bool
    {
        return DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $tabla)
            ->where('CONSTRAINT_NAME', $nombre)
            ->exists();
    }

    private function existeIndice(string $tabla, string $nombre): bool
    {
        return DB::table('information_schema.STATISTICS')
            ->where('TABLE_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $tabla)
            ->where('INDEX_NAME', $nombre)
            ->exists();
    }
};
