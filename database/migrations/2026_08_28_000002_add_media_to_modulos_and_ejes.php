<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['modulos', 'ejes'] as $tabla) {
            if (! Schema::hasTable($tabla)) {
                continue;
            }

            Schema::table($tabla, function (Blueprint $table) use ($tabla) {
                if (! Schema::hasColumn($tabla, 'tipo_media')) {
                    $table->enum('tipo_media', ['ninguno', 'imagen', 'video'])
                        ->default('ninguno')
                        ->after('descripcion');
                }
                if (! Schema::hasColumn($tabla, 'media_origen')) {
                    $table->enum('media_origen', ['local', 'url'])
                        ->nullable()
                        ->after('tipo_media');
                }
                if (! Schema::hasColumn($tabla, 'media_archivo')) {
                    $table->string('media_archivo', 255)
                        ->nullable()
                        ->after('media_origen');
                }
                if (! Schema::hasColumn($tabla, 'media_url')) {
                    $table->string('media_url', 500)
                        ->nullable()
                        ->after('media_archivo');
                }
                if (! Schema::hasColumn($tabla, 'media_embed')) {
                    $table->enum('media_embed', ['directo', 'youtube', 'vimeo'])
                        ->nullable()
                        ->after('media_url');
                }
            });
        }
    }

    public function down(): void
    {
        foreach (['modulos', 'ejes'] as $tabla) {
            if (! Schema::hasTable($tabla)) {
                continue;
            }

            Schema::table($tabla, function (Blueprint $table) use ($tabla) {
                foreach (['media_embed', 'media_url', 'media_archivo', 'media_origen', 'tipo_media'] as $col) {
                    if (Schema::hasColumn($tabla, $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
