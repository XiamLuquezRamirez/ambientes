<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('docente_grupo');
    }

    public function down(): void
    {
        // Reemplazada por carga_docente — no se recrea
    }
};
