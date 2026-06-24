<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (!Schema::hasColumn('docentes', 'direccion')) {
                $table->string('direccion', 150)->nullable()->after('telefono');
            }
            if (!Schema::hasColumn('docentes', 'estado')) {
                $table->enum('estado', ['activo', 'inactivo', 'eliminado'])->nullable()->after('descripcion');
            }
        });
    }

    public function down(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (Schema::hasColumn('docentes', 'direccion')) {
                $table->dropColumn('direccion');
            }
            if (Schema::hasColumn('docentes', 'estado')) {
                $table->dropColumn('estado');
            }
        });
    }
};
