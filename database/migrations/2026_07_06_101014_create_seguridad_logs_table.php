<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Idempotente: la tabla pudo crearse manualmente sin esta migración registrada.
        if (Schema::hasTable('seguridad_logs')) {
            if (! Schema::hasColumn('seguridad_logs', 'registro_afectado')) {
                Schema::table('seguridad_logs', function (Blueprint $table) {
                    $table->string('registro_afectado')->nullable()->after('descripcion');
                });
            }

            return;
        }

        Schema::create('seguridad_logs', function (Blueprint $table) {

            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('accion', 50);

            $table->string('descripcion');

            $table->string('registro_afectado')->nullable();

            $table->ipAddress('ip')->nullable();

            $table->text('user_agent')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seguridad_logs');
    }
};
