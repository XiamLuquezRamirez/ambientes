<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\CargaDocente;
use App\Models\Clase;
use App\Models\Estudiante;
use App\Services\ResultadoNinoPanelService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ResultadosNinoPanelController extends Controller
{
    public function __construct(
        private ResultadoNinoPanelService $resultados,
    ) {}

    public function verClase(Request $request, Clase $clase)
    {
        $carga = $this->resolverCargaContexto();
        if (! $carga) {
            return redirect()
                ->route('panel.principal')
                ->with('warning', 'Primero selecciona un ambiente, grado y grupo desde el inicio.');
        }

        if (! $this->resultados->claseAccesible($clase, $carga)) {
            abort(403, 'No tienes acceso a los resultados de esta clase.');
        }

        $experienciaId = $request->integer('experiencia') ?: null;
        $datos = $this->resultados->datosClase($clase, $experienciaId);
        $vista = $request->query('vista', 'estudiantes') === 'tabla' ? 'tabla' : 'estudiantes';

        return view('panel.clases.resultados', [
            'clase' => $clase->loadMissing('cargaDocente.grado', 'cargaDocente.grupo'),
            'carga' => $carga,
            'experienciaId' => $experienciaId,
            'vista' => $vista,
            'estudiantes' => $datos['estudiantes'],
            'experiencias' => $datos['experiencias'],
            'resultados' => $datos['resultados'],
            'resumenes' => $datos['resumenes'],
            'estadisticas' => $datos['estadisticas'],
            'porEstudiante' => $datos['porEstudiante'],
            'panelService' => $this->resultados,
        ]);
    }

    public function verEstudiante(Request $request, Clase $clase, Estudiante $estudiante)
    {
        $carga = $this->resolverCargaContexto();
        if (! $carga) {
            return redirect()
                ->route('panel.principal')
                ->with('warning', 'Primero selecciona un ambiente, grado y grupo desde el inicio.');
        }

        if (! $this->resultados->claseAccesible($clase, $carga)) {
            abort(403, 'No tienes acceso a los resultados de esta clase.');
        }

        $experienciaId = $request->integer('experiencia') ?: null;
        $datos = $this->resultados->datosEstudianteEnClase($clase, $estudiante, $experienciaId);

        return view('panel.clases.resultados-estudiante', [
            'clase' => $clase->loadMissing('cargaDocente.grado', 'cargaDocente.grupo'),
            'carga' => $carga,
            'experienciaId' => $experienciaId,
            'estudiante' => $estudiante,
            'estudianteLista' => $datos['estudiante'],
            'resultados' => $datos['resultados'],
            'resumenes' => $datos['resumenes'],
            'experiencias' => $datos['experiencias'],
            'estadisticas' => $datos['estadisticas'],
            'panelService' => $this->resultados,
        ]);
    }

    public function exportarPdf(Request $request, Clase $clase)
    {
        $carga = $this->resolverCargaContexto();
        if (! $carga) {
            return redirect()
                ->route('panel.principal')
                ->with('warning', 'Primero selecciona un ambiente, grado y grupo desde el inicio.');
        }

        if (! $this->resultados->claseAccesible($clase, $carga)) {
            abort(403, 'No tienes acceso a los resultados de esta clase.');
        }

        $experienciaId = $request->integer('experiencia') ?: null;
        $pdf = $this->resultados->exportarPdfClase($clase, $carga, $experienciaId);

        $nombre = Str::slug($clase->nombre ?: 'clase-'.$clase->id);
        $fecha = $clase->fecha?->format('Y-m-d') ?? date('Y-m-d');

        return $pdf->download("resultados-clase_{$nombre}_{$fecha}.pdf");
    }

    private function resolverCargaContexto(): ?CargaDocente
    {
        $docente = Auth::guard('docente')->user()?->docente;

        if (! $docente) {
            return null;
        }

        $anio = (int) date('Y');
        $base = CargaDocente::query()
            ->with(['ambiente', 'grado', 'grupo'])
            ->where('docente_id', $docente->id)
            ->where('activo', true)
            ->where('anio_lectivo', $anio);

        if (session()->has('carga_docente_id')) {
            $carga = (clone $base)
                ->where('id', session('carga_docente_id'))
                ->first();

            if ($carga) {
                return $carga;
            }
        }

        if (session('ambiente_id') && session('grado_id') && session('grupo_id')) {
            return (clone $base)
                ->where('ambiente_id', session('ambiente_id'))
                ->where('grado_id', session('grado_id'))
                ->where('grupo_id', session('grupo_id'))
                ->first();
        }

        return null;
    }
}
