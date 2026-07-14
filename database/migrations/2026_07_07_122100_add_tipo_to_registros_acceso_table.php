<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('registros_acceso')) {
            return;
        }

        if (! Schema::hasColumn('registros_acceso', 'tipo')) {
            Schema::table('registros_acceso', function (Blueprint $table) {
                if (Schema::hasColumn('registros_acceso', 'ambiente')) {
                    $table->string('tipo', 30)->default('inicio_sesion')->after('ambiente');
                } else {
                    $table->string('tipo', 30)->default('inicio_sesion');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('registros_acceso') && Schema::hasColumn('registros_acceso', 'tipo')) {
            Schema::table('registros_acceso', function (Blueprint $table) {
                $table->dropColumn('tipo');
            });
        }
    }
};
