<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_pins', function (Blueprint $table) {
            // Cambiar figura_1/2/3 de enum a varchar para soportar clases FontAwesome
            if (Schema::hasColumn('configuracion_pins', 'figura_1')) {
                $table->string('figura_1', 20)->change();
            }
            if (Schema::hasColumn('configuracion_pins', 'figura_2')) {
                $table->string('figura_2', 20)->change();
            }
            if (Schema::hasColumn('configuracion_pins', 'figura_3')) {
                $table->string('figura_3', 20)->change();
            }

            if (!Schema::hasColumn('configuracion_pins', 'color_figura_1')) {
                $table->string('color_figura_1', 20)->nullable()->after('figura_1');
            }
            if (!Schema::hasColumn('configuracion_pins', 'color_figura_2')) {
                $table->string('color_figura_2', 20)->nullable()->after('figura_2');
            }
            if (!Schema::hasColumn('configuracion_pins', 'color_figura_3')) {
                $table->string('color_figura_3', 20)->nullable()->after('figura_3');
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_pins', function (Blueprint $table) {
            if (Schema::hasColumn('configuracion_pins', 'color_figura_1')) {
                $table->dropColumn('color_figura_1');
            }
            if (Schema::hasColumn('configuracion_pins', 'color_figura_2')) {
                $table->dropColumn('color_figura_2');
            }
            if (Schema::hasColumn('configuracion_pins', 'color_figura_3')) {
                $table->dropColumn('color_figura_3');
            }
        });
    }
};
