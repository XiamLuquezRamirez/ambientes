<?php

use App\Models\Docente;
use App\Services\PinAccesibilidadDocenteService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            $table->char('pin_accesibilidad', 4)->nullable();
        });

        $servicio = app(PinAccesibilidadDocenteService::class);

        Docente::query()
            ->with('user:id,institucion_id')
            ->whereNull('pin_accesibilidad')
            ->orderBy('id')
            ->each(function (Docente $docente) use ($servicio) {
                $docente->pin_accesibilidad = $servicio->generar((int) ($docente->user->institucion_id ?? 0));
                $docente->save();
            });
    }

    public function down(): void
    {
        Schema::table('docentes', function (Blueprint $table) {
            $table->dropColumn('pin_accesibilidad');
        });
    }
};
