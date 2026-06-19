<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ambientes', function (Blueprint $table) {
            $table->unsignedSmallInteger('cupo_defecto')->default(25)->after('activo');
        });
    }

    public function down(): void
    {
        Schema::table('ambientes', function (Blueprint $table) {
            $table->dropColumn('cupo_defecto');
        });
    }
};
