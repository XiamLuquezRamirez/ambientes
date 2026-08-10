<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ejes') || Schema::hasColumn('ejes', 'creado_por')) {
            return;
        }

        Schema::table('ejes', function (Blueprint $table) {
            $table->foreignId('creado_por')
                ->nullable()
                ->after('institucion_id')
                ->constrained('docentes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ejes') || ! Schema::hasColumn('ejes', 'creado_por')) {
            return;
        }

        Schema::table('ejes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('creado_por');
        });
    }
};
