<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (! Schema::hasColumn('docentes', 'foto_url')) {
                $table->string('foto_url')->nullable()->after('firma_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (Schema::hasColumn('docentes', 'foto_url')) {
                $table->dropColumn('foto_url');
            }
        });
    }
};
