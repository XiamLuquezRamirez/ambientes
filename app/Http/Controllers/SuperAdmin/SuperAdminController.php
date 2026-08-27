<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Institucion;
use App\Models\Modulo;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;

class SuperAdminController extends Controller
{
    /**
     * Dashboard principal del superadministrador.
     */
    public function index()
    {
        $stats = [
            'instituciones_total' => Institucion::query()->count(),
            'instituciones_activas' => Institucion::query()->where('activo', true)->count(),
            'instituciones_suspendidas' => Institucion::query()->where('activo', false)->count(),
            'modulos_oficiales' => Modulo::query()->oficiales()->count(),
            'modulos_oficiales_activos' => Modulo::query()->oficiales()->where('activo', true)->count(),
            'ejes_oficiales' => Eje::query()->oficiales()->count(),
            'ejes_oficiales_activos' => Eje::query()->oficiales()->where('activo', true)->count(),
            'perfiles_globales' => PerfilAprendizajeInclusion::query()->where('eliminado', 0)->count(),
            'perfiles_globales_activos' => PerfilAprendizajeInclusion::query()
                ->where('eliminado', 0)
                ->where('estado', 1)
                ->count(),
            'perfiles_personalizados' => PerfilAprendizajePersonalizado::query()
                ->whereNull('institucion_id')
                ->where('eliminado', 0)
                ->count(),
            'perfiles_personalizados_activos' => PerfilAprendizajePersonalizado::query()
                ->whereNull('institucion_id')
                ->where('eliminado', 0)
                ->where('estado', 1)
                ->count(),
        ];

        $ambientes = Ambiente::query()
            ->withCount([
                'modulosOficiales',
                'modulosOficiales as modulos_oficiales_activos_count' => fn ($q) => $q->where('activo', true),
            ])
            ->orderBy('nombre')
            ->get();

        return view('superAdmin.principal', compact('stats', 'ambientes'));
    }
}
