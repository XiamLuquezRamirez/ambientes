<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Quita defaults de icono/color: el CRUD exige elección explícita.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        if (Schema::hasColumn('juegos', 'icono')) {
            DB::statement('ALTER TABLE `juegos` MODIFY `icono` VARCHAR(80) NULL');
        }

        if (Schema::hasColumn('juegos', 'color')) {
            DB::statement('ALTER TABLE `juegos` MODIFY `color` VARCHAR(20) NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('juegos')) {
            return;
        }

        if (Schema::hasColumn('juegos', 'icono')) {
            DB::table('juegos')->where(function ($q) {
                $q->whereNull('icono')->orWhere('icono', '');
            })->update(['icono' => 'fa-gamepad']);
            DB::statement("ALTER TABLE `juegos` MODIFY `icono` VARCHAR(80) NOT NULL DEFAULT 'fa-gamepad'");
        }

        if (Schema::hasColumn('juegos', 'color')) {
            DB::table('juegos')->where(function ($q) {
                $q->whereNull('color')->orWhere('color', '');
            })->update(['color' => '#2563eb']);
            DB::statement("ALTER TABLE `juegos` MODIFY `color` VARCHAR(20) NOT NULL DEFAULT '#2563eb'");
        }
    }
};
