<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('asistencias')) {
            return;
        }

        if (! Schema::hasColumn('asistencias', 'carga_docente_id')) {

            Schema::table('asistencias', function (Blueprint $table) {

                $table->foreignId('carga_docente_id')
                    ->after('id')
                    ->constrained('carga_docente')
                    ->cascadeOnDelete();

            });

        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('asistencias') &&
            Schema::hasColumn('asistencias', 'carga_docente_id')
        ) {

            Schema::table('asistencias', function (Blueprint $table) {

                $table->dropForeign(['carga_docente_id']);
                $table->dropColumn('carga_docente_id');

            });

        }
    }
};
