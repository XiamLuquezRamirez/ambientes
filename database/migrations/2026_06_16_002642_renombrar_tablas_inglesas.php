<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('sync_queue', 'cola_sincronizacion');
        Schema::rename('login_logs', 'registros_acceso');
    }

    public function down(): void
    {
        Schema::rename('cola_sincronizacion', 'sync_queue');
        Schema::rename('registros_acceso',    'login_logs');
    }
};
