<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Admin\ParametrosPerfilAprendizajeController as AdminParametrosPerfilAprendizajeController;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Services\EstudiantePerfilAprendizajeService;
use Illuminate\Http\JsonResponse;

class ParametrosPerfilAprendizajePanelController extends AdminParametrosPerfilAprendizajeController
{
    public function index()
    {
        $institucionId = $this->institucionId();
        $this->servicio->sembrarInstitucion($institucionId);

        return view('panel.inclusion.parametros-perfil.index', [
            'modo' => 'institucion',
            'tituloPagina' => 'Parámetros de adaptación',
        ]);
    }

    protected function listarPerfilesFormales(): array
    {
        $institucionId = $this->institucionId();
        $docenteId = auth('docente')->user()?->docente?->id;
        $conteos = $docenteId
            ? app(EstudiantePerfilAprendizajeService::class)
                ->conteoActivosPorPerfilAprendizajeDocente($institucionId, $docenteId)
            : [];

        return PerfilAprendizajeInclusion::query()
            ->where('eliminado', 0)
            ->ordenadas()
            ->get()
            ->map(function (PerfilAprendizajeInclusion $p) use ($conteos, $institucionId) {
                $serializado = $this->serializarFormal($p, $institucionId);
                $serializado['estudiantes'] = (int) ($conteos[$p->id]['activos'] ?? 0);
                $serializado['activos'] = $serializado['estudiantes'];

                return $serializado;
            })
            ->values()
            ->all();
    }

    public function guardarPersonalizado(\Illuminate\Http\Request $request, PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        if ($perfilAprendizajePersonalizado->creadaPorDocente()) {
            abort(403, 'No puedes editar parámetros de perfiles creados por otro docente desde este módulo.');
        }

        return parent::guardarPersonalizado($request, $perfilAprendizajePersonalizado);
    }

    public function restablecerPersonalizado(PerfilAprendizajePersonalizado $perfilAprendizajePersonalizado): JsonResponse
    {
        if ($perfilAprendizajePersonalizado->creadaPorDocente()) {
            abort(403, 'No autorizado.');
        }

        return parent::restablecerPersonalizado($perfilAprendizajePersonalizado);
    }
}
