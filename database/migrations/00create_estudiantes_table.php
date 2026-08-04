<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiantes', function (Blueprint $table) {
            $table->id();

            $table->string('nombre');
            $table->string('apellido')->nullable();
            $table->text('avatar')->nullable();

            $table->string('tipo_identificacion', 10)->nullable();
            $table->integer('identificacion');

            $table->string('iniciales', 3);

            $table->text('grado_id')->nullable();

            $table->string('color_avatar', 9)->default('#0F6E56');

            $table->integer('id_condicion')->nullable()->default(1);

            $table->boolean('activo')->default(true);

            $table->text('fecha_nacimiento')->nullable();

            $table->text('acudiente')->nullable();
            $table->text('telefono_acudiente')->nullable();

            $table->timestamps();

            $table->string('requiere_apoyo', 15)->default('no');

            $table->text('sexo')->nullable();

            $table->integer('estado_piar')->nullable()->default(0);

            $table->string('otro_tipo_identificacion')->nullable();

            $table->text('lugar_nacimiento')->nullable();

            $table->integer('departamento_id')->nullable();
            $table->integer('municipio_id')->nullable();

            $table->text('barrio_vereda')->nullable();
            $table->text('direccion')->nullable();
            $table->text('telefono')->nullable();
            $table->text('email')->nullable();

            $table->unique('identificacion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiantes');
    }
};