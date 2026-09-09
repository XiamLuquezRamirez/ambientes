<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La tabla juegos queda solo para el catálogo SuperAdmin (paquetes).
     * Los motores del constructor de experiencias (rompecabezas/memoria/colorear/secuencia)
     * son fijos en frontend y no viven en esta tabla.
     */
    public function up(): void
    {
        if (Schema::hasColumn('juegos', 'canal')) {
            DB::table('juegos')->where('canal', 'experiencia')->delete();
        }

        DB::table('juegos')
            ->whereIn('tipo', ['rompecabezas', 'memoria', 'colorear', 'secuencia'])
            ->where(function ($q) {
                $q->whereNull('ruta')->orWhere('ruta', '');
            })
            ->delete();

        if (Schema::hasColumn('juegos', 'canal')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->dropIndex(['canal', 'activo', 'orden']);
                $table->dropColumn('canal');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('juegos', 'canal')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->string('canal', 20)->default('banco')->after('tipo');
                $table->index(['canal', 'activo', 'orden']);
            });
        }

        DB::table('juegos')->whereNotNull('ruta')->where('ruta', '!=', '')->update(['canal' => 'banco']);
    }
};
