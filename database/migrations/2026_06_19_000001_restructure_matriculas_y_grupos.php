<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Tabla estudiante_ambiente ────────────────────────────────
        if (!Schema::hasTable('estudiante_ambiente')) {
            Schema::create('estudiante_ambiente', function (Blueprint $table) {
                $table->id();
                $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
                $table->foreignId('ambiente_id')->constrained('ambientes')->cascadeOnDelete();
                $table->unsignedSmallInteger('anio_lectivo');
                $table->enum('estado', ['activo', 'restringido', 'adaptado'])->default('activo');
                $table->text('observacion')->nullable();
                $table->timestamps();
                $table->unique(['estudiante_id', 'ambiente_id', 'anio_lectivo'], 'ea_unique');
            });
        }

        // ── 2. Migrar datos existentes de matriculas → estudiante_ambiente ──
        // Solo si matriculas todavía tiene ambiente_id (migración a medio ejecutar)
        if (Schema::hasColumn('matriculas', 'ambiente_id')) {
            DB::statement("
                INSERT IGNORE INTO estudiante_ambiente
                    (estudiante_id, ambiente_id, anio_lectivo, estado, created_at, updated_at)
                SELECT DISTINCT
                    estudiante_id, ambiente_id, anio_lectivo,
                    'activo', NOW(), NOW()
                FROM matriculas
                WHERE ambiente_id IS NOT NULL
            ");
        }

        // ── 3. Deduplicar grupos (hacerlos institucionales, sin ambiente) ──
        $duplicados = DB::select("
            SELECT MIN(id) AS keep_id,
                   GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS all_ids
            FROM grupos
            GROUP BY grado_id, nombre, anio_lectivo
            HAVING COUNT(*) > 1
        ");

        foreach ($duplicados as $dup) {
            $todosIds  = array_map('intval', explode(',', $dup->all_ids));
            $keepId    = (int) $dup->keep_id;
            $borrarIds = array_values(array_filter($todosIds, fn($id) => $id !== $keepId));

            if (empty($borrarIds)) continue;

            DB::table('matriculas')
                ->whereIn('grupo_id', $borrarIds)
                ->update(['grupo_id' => $keepId]);

            if (Schema::hasTable('carga_docente')) {
                DB::table('carga_docente')
                    ->whereIn('grupo_id', $borrarIds)
                    ->update(['grupo_id' => $keepId]);
            }

            DB::table('grupos')->whereIn('id', $borrarIds)->delete();
        }

        // ── 4. Deduplicar matrículas (una por estudiante por año) ────────
        DB::statement("
            DELETE m1 FROM matriculas m1
            INNER JOIN matriculas m2
              ON  m1.estudiante_id = m2.estudiante_id
              AND m1.anio_lectivo  = m2.anio_lectivo
              AND m1.id > m2.id
        ");

        // ── 5. Quitar ambiente_id de matriculas ──────────────────────────
        if (Schema::hasColumn('matriculas', 'ambiente_id')) {
            // Obtener FKs que dependen de ambiente_id
            $fksMat = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'matriculas'
                  AND COLUMN_NAME  = 'ambiente_id'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            foreach ($fksMat as $fk) {
                try { DB::statement("ALTER TABLE matriculas DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`"); }
                catch (\Throwable) {}
            }

            // Quitar índices que contienen ambiente_id
            $idxMat = DB::select("
                SELECT DISTINCT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'matriculas'
                  AND COLUMN_NAME  = 'ambiente_id'
                  AND INDEX_NAME  != 'PRIMARY'
            ");
            foreach ($idxMat as $idx) {
                try { DB::statement("ALTER TABLE matriculas DROP INDEX `{$idx->INDEX_NAME}`"); }
                catch (\Throwable) {}
            }

            Schema::table('matriculas', fn(Blueprint $t) => $t->dropColumn('ambiente_id'));

            // Restaurar unique (estudiante_id, anio_lectivo)
            try {
                DB::statement('ALTER TABLE matriculas ADD UNIQUE KEY mat_unique (estudiante_id, anio_lectivo)');
            } catch (\Throwable) {}
        }

        // ── 6. Quitar ambiente_id de grupos ──────────────────────────────
        if (Schema::hasColumn('grupos', 'ambiente_id')) {
            $fksGrp = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'grupos'
                  AND COLUMN_NAME  = 'ambiente_id'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            foreach ($fksGrp as $fk) {
                try { DB::statement("ALTER TABLE grupos DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`"); }
                catch (\Throwable) {}
            }

            $idxGrp = DB::select("
                SELECT DISTINCT INDEX_NAME
                FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'grupos'
                  AND COLUMN_NAME  = 'ambiente_id'
                  AND INDEX_NAME  != 'PRIMARY'
            ");
            foreach ($idxGrp as $idx) {
                try { DB::statement("ALTER TABLE grupos DROP INDEX `{$idx->INDEX_NAME}`"); }
                catch (\Throwable) {}
            }

            Schema::table('grupos', fn(Blueprint $t) => $t->dropColumn('ambiente_id'));

            // Restaurar unique institucional (grado_id, nombre, anio_lectivo)
            try {
                DB::statement('ALTER TABLE grupos ADD UNIQUE KEY grp_unique (grado_id, nombre, anio_lectivo)');
            } catch (\Throwable) {}
        }
    }

    public function down(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            $table->foreignId('ambiente_id')->nullable()->constrained('ambientes')->nullOnDelete();
        });
        Schema::table('matriculas', function (Blueprint $table) {
            $table->foreignId('ambiente_id')->nullable()->constrained('ambientes')->nullOnDelete();
        });
        Schema::dropIfExists('estudiante_ambiente');
    }
};
