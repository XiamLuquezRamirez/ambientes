<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ejes')) {
            Schema::create('ejes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('modulo_id')->constrained('modulos')->cascadeOnDelete();
                $table->foreignId('institucion_id')
                    ->nullable()
                    ->constrained('instituciones')
                    ->nullOnDelete();
                $table->string('nombre');
                $table->string('slug');
                $table->text('descripcion')->nullable();
                $table->unsignedTinyInteger('orden')->default(0);
                $table->boolean('activo')->default(true);
                $table->boolean('es_oficial')->default(true);
                $table->timestamps();

                $table->unique(['modulo_id', 'slug']);
            });
        }

        if (Schema::hasTable('temas') && ! Schema::hasColumn('temas', 'eje_id')) {
            Schema::table('temas', function (Blueprint $table) {
                $table->foreignId('eje_id')
                    ->nullable()
                    ->after('modulo_id')
                    ->constrained('ejes')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('temas') && ! Schema::hasColumn('temas', 'es_oficial')) {
            Schema::table('temas', function (Blueprint $table) {
                $table->boolean('es_oficial')
                    ->default(true)
                    ->after('activo');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('temas') && Schema::hasColumn('temas', 'es_oficial')) {
            Schema::table('temas', function (Blueprint $table) {
                $table->dropColumn('es_oficial');
            });
        }

        if (Schema::hasTable('temas') && Schema::hasColumn('temas', 'eje_id')) {
            Schema::table('temas', function (Blueprint $table) {
                $table->dropConstrainedForeignId('eje_id');
            });
        }

        Schema::dropIfExists('ejes');
    }
};
