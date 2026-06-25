<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Grado;
use Illuminate\Http\Request;

class GradoGrupoController extends Controller
{
    public function gestionar(Request $request, Ambiente $ambiente)
    {
        $grados = Grado::activos()->get();

        $gradosConInfo = $grados->map(function (Grado $grado) use ($ambiente) {
            $pivot = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();
            $habilitado = $pivot ? (bool) $pivot->pivot->activo : false;

            return [
                'grado' => $grado,
                'habilitado' => $habilitado,
            ];
        });

        return view('admin.ambientes.grados-grupos', compact('ambiente', 'gradosConInfo'));
    }

    public function activarGrado(Request $request, Ambiente $ambiente, Grado $grado)
    {
        $pivot = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();

        if ($pivot) {
            $nuevoEstado = ! (bool) $pivot->pivot->activo;
            $ambiente->todosGrados()->updateExistingPivot($grado->id, ['activo' => $nuevoEstado]);
        } else {
            $ambiente->todosGrados()->attach($grado->id, ['activo' => true]);
            $nuevoEstado = true;
        }

        return response()->json(['habilitado' => $nuevoEstado]);
    }

    public function grupos(Request $request, Grado $grado)
    {
        $anio = $request->anio_lectivo;

        return response()->json(
            $grado->grupos()
                ->when($anio, function ($query) use ($anio) {
                    $query->where('anio_lectivo', $anio);
                })
                ->select('id', 'nombre')
                ->orderBy('nombre')
                ->get()
        );
    }
}
