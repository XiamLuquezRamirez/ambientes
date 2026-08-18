<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tematicas')) {
            return;
        }

        Schema::table('tematicas', function (Blueprint $table) {
            if (! Schema::hasColumn('tematicas', 'referente_alternativo')) {
                $table->text('referente_alternativo')->nullable()->after('competencia');
            }
            if (! Schema::hasColumn('tematicas', 'estado')) {
                $table->enum('estado', ['borrador', 'activa', 'archivada'])
                    ->default('borrador')
                    ->after('institucion_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('tematicas')) {
            return;
        }

        Schema::table('tematicas', function (Blueprint $table) {
            if (Schema::hasColumn('tematicas', 'referente_alternativo')) {
                $table->dropColumn('referente_alternativo');
            }
            if (Schema::hasColumn('tematicas', 'estado')) {
                $table->dropColumn('estado');
            }
        });
    }
};
