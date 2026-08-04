<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estudiantes', function (Blueprint $table) {
            if (Schema::hasColumn('estudiantes', 'condicion')) {
                $table->dropColumn('condicion');
            }
            if (!Schema::hasColumn('estudiantes', 'condicion_id')) {
                $table->integer('condicion_id')->default(1)->after('color_avatar');
            }
            if (!Schema::hasColumn('estudiantes', 'avatar')) {
                $table->text('avatar')->nullable()->after('nombre');
            }
            if (!Schema::hasColumn('estudiantes', 'identificacion')) {
                $table->integer('identificacion')->nullable()->after('avatar');
            }
            if (!Schema::hasColumn('estudiantes', 'grado_id')) {
                $table->text('grado_id')->nullable()->after('iniciales');
            }
            if (!Schema::hasColumn('estudiantes', 'fecha_nacimiento')) {
                $table->text('fecha_nacimiento')->nullable()->after('activo');
            }
            if (!Schema::hasColumn('estudiantes', 'acudiente')) {
                $table->text('acudiente')->nullable()->after('fecha_nacimiento');
            }
            if (!Schema::hasColumn('estudiantes', 'telefono_acudiente')) {
                $table->text('telefono_acudiente')->nullable()->after('acudiente');
            }
            if (!Schema::hasColumn('estudiantes', 'requiere_apoyo')) {
                $table->string('requiere_apoyo', 15)->default('no')->after('telefono_acudiente');
            }
            if (!Schema::hasColumn('estudiantes', 'sexo')) {
                $table->text('sexo')->nullable()->after('requiere_apoyo');
            }
        });
    }

    public function down(): void
    {
        Schema::table('estudiantes', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                Schema::hasColumn('estudiantes', 'condicion_id') ? 'condicion_id' : null,
                Schema::hasColumn('estudiantes', 'avatar') ? 'avatar' : null,
                Schema::hasColumn('estudiantes', 'identificacion') ? 'identificacion' : null,
                Schema::hasColumn('estudiantes', 'grado_id') ? 'grado_id' : null,
                Schema::hasColumn('estudiantes', 'fecha_nacimiento') ? 'fecha_nacimiento' : null,
                Schema::hasColumn('estudiantes', 'acudiente') ? 'acudiente' : null,
                Schema::hasColumn('estudiantes', 'telefono_acudiente') ? 'telefono_acudiente' : null,
                Schema::hasColumn('estudiantes', 'requiere_apoyo') ? 'requiere_apoyo' : null,
                Schema::hasColumn('estudiantes', 'sexo') ? 'sexo' : null,
            ]));
            if (!Schema::hasColumn('estudiantes', 'condicion')) {
                $table->enum('condicion', ['estandar', 'tea', 'tdah', 'disc_visual', 'disc_auditiva', 'disc_motriz', 'down'])
                    ->default('estandar')
                    ->after('color_avatar');
            }
        });
    }
};
