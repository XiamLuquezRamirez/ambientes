<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La tabla seguridad_logs existía sin registro_afectado (versión anterior del esquema).
     * Esta migración alinea la BD con SeguridadService y el modelo SeguridadLog.
     */
    public function up(): void
    {
        if (! Schema::hasTable('seguridad_logs')) {
            return;
        }

        if (! Schema::hasColumn('seguridad_logs', 'registro_afectado')) {
            Schema::table('seguridad_logs', function (Blueprint $table) {
                $table->string('registro_afectado')->nullable()->after('descripcion');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('seguridad_logs') && Schema::hasColumn('seguridad_logs', 'registro_afectado')) {
            Schema::table('seguridad_logs', function (Blueprint $table) {
                $table->dropColumn('registro_afectado');
            });
        }
    }
};
