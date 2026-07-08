<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade tipo de registro a registros_acceso (inicio_sesion, cambio_contrasena).
     */
    public function up(): void
    {
        Schema::table('registros_acceso', function (Blueprint $table) {
            $table->string('tipo', 30)->default('inicio_sesion')->after('ambiente');
        });
    }

    public function down(): void
    {
        Schema::table('registros_acceso', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }
};
