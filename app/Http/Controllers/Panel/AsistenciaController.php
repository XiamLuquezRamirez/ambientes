<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Services\Docente\AsistenciaService;
use App\Services\Docente\GrupoEstudiantesService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsistenciaController extends Controller
{
    public function listar(Request $request)
    {
        $carga = CargaDocente::findOrFail($request->carga);

        $asistenciaService = app(AsistenciaService::class);

        $matriculas = app(GrupoEstudiantesService::class)->obtenerMatriculas($carga);

        $asistencias = $asistenciaService->obtenerDelDia($carga);
        $listaTomada = $asistenciaService
            ->obtenerDelDia($carga)
            ->isNotEmpty();

        $estudiantes = $matriculas->pluck('estudiante')->map(function ($estudiante) use ($asistencias) {
            $registro = $asistencias->get($estudiante->id);
            $estudiante->presente = $registro ? $registro->presente : true;

            return $estudiante;
        });

        return view('panel.asistencia.asistencia', [
            'carga' => $carga,
            'contexto' => $request->contexto,
            'estudiantes' => $estudiantes,
            'listaTomada' => $listaTomada,
        ]);
    }

    public function registrarAsistencia(Request $request)
    {
        $request->validate([
            'carga_docente_id' => ['required', 'exists:carga_docente,id'],
            'asistencias' => ['required', 'array'],
        ]);

        DB::transaction(function () use ($request) {

            foreach ($request->asistencias as $estudianteId => $presente) {

                Asistencia::updateOrCreate(
                    [
                        'carga_docente_id' => $request->carga_docente_id,
                        'estudiante_id' => $estudianteId,
                        'fecha' => today(),
                    ],
                    [
                        'presente' => (bool) $presente,
                    ]
                );

            }

        });

        return response()->json([
            'success' => true,
            'message' => 'La asistencia fue registrada correctamente.',
        ]);
    }

    public function reporteAsistencia(Request $request, CargaDocente $carga)
    {
        $reporte = app(AsistenciaService::class)
            ->reportePeriodoGrupo(
                $carga,
                $request->desde,
                $request->hasta
            );

        return response()->json($reporte);
    }

    public function exportarPdf(Request $request, CargaDocente $carga)
    {
        $pdf = app(AsistenciaService::class)
            ->exportarReporteAsistencia(
                $carga,
                $request->desde,
                $request->hasta
            );

        return $pdf->download(
            'Reporte_Asistencia_'.
            $carga->grado->nombre.'_'.
            $carga->grupo->nombre.'.pdf'
        );
    }
}
