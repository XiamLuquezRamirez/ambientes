<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Asistencia;
use App\Models\CargaDocente;
use App\Models\Matricula;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SesionController extends Controller
{
    public function listar(Request $request)
    {
        $carga = CargaDocente::findOrFail($request->carga);

        $matriculas = Matricula::query()
            ->join('estudiante_ambiente', function ($join) use ($carga) {
                $join->on('estudiante_ambiente.estudiante_id', '=', 'matriculas.estudiante_id')
                    ->where('estudiante_ambiente.ambiente_id', $carga->ambiente_id)
                    ->where('estudiante_ambiente.anio_lectivo', $carga->anio_lectivo)
                    ->where('estudiante_ambiente.estado', 'activo');
            })
            ->where('matriculas.grado_id', $carga->grado_id)
            ->where('matriculas.grupo_id', $carga->grupo_id)
            ->where('matriculas.anio_lectivo', $carga->anio_lectivo)
            ->where('matriculas.estado', 'activo')
            ->with([
                'estudiante.piar',
                'estudiante.configuracionPin',
                'estudiante.condicion',
            ])
            ->select('matriculas.*')
            ->get();

        $estudiantes = $matriculas->pluck('estudiante');

        return view('panel.asistencia.asistencia', [
            'carga' => $carga,
            'contexto' => $request->contexto,
            'estudiantes' => $estudiantes,
        ]);
    }

    public function registrarAsistencia(Request $request)
    {
        DB::transaction(function () use ($request) {

            foreach ($request->asistencia as $estudianteId => $presente) {

                Asistencia::updateOrCreate(
                    [
                        'carga_docente_id' => $request->carga,
                        'estudiante_id' => $estudianteId,
                        'fecha' => today(),
                    ],
                    [
                        'estado' => $presente ? 'presente' : 'ausente',
                    ]
                );
            }

        });

        return response()->json([
            'success' => true,
            'message' => 'Asistencia registrada correctamente.',
        ]);
    }

    public function registrarSesionAsistida(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function sesionesActivas()
    {
        return response()->json([]);
    }
}
