<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            if (Schema::hasColumn('docentes', 'ambiente_id')) {
                try {
                    $table->dropForeign(['ambiente_id']);
                } catch (\Throwable $e) {
                    // FK ya no existia
                }
                $table->dropColumn('ambiente_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            $table->foreignId('ambiente_id')
                  ->nullable()
                  ->after('user_id')
                  ->constrained('ambientes')
                  ->onDelete('set null');
        });
    }
};
