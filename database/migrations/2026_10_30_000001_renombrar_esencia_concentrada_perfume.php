<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('juegos')
            ->where('slug', 'la-esencia-concentrada')
            ->update([
                'nombre' => 'El Frasco de Perfume',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('juegos')
            ->where('slug', 'la-esencia-concentrada')
            ->update([
                'nombre' => 'La Esencia Concentrada',
                'updated_at' => now(),
            ]);
    }
};
