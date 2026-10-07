<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La identidad visual del juego es la imagen del paquete (`imagen`); el icono Font Awesome ya no se usa.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('juegos') && Schema::hasColumn('juegos', 'icono')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->dropColumn('icono');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('juegos') && ! Schema::hasColumn('juegos', 'icono')) {
            Schema::table('juegos', function (Blueprint $table) {
                $table->string('icono', 80)->nullable()->after('descripcion');
            });
        }
    }
};
