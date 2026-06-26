<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Grado;
use Illuminate\Http\Request;

class GradoGrupoController extends Controller
{
    /**
     * Muestra los grados disponibles para un ambiente y si están habilitados.
     *
     * Permite alternar la habilitación de cada grado para ese ambiente.
     */
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

    /**
     * Activa o desactiva un grado en el ambiente seleccionado.
     *
     * Si no existe el registro pivot lo crea como activo.
     */
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

    /**
     * Devuelve grupos activos de un grado para un año lectivo,
     * excluyendo aquellos ya ocupados en un ambiente específico.
     */
    public function grupos(Request $request, Grado $grado)
    {
        $anio = $request->anio_lectivo ?? date('Y');
        $ambienteId = $request->ambiente_id;

        return response()->json(
            $grado->grupos()
                ->where('anio_lectivo', $anio)
                ->where('activo', true)
                ->when($ambienteId, function ($query) use ($anio, $ambienteId) {
                    $query->whereDoesntHave('cargasDocente', function ($sub) use ($anio, $ambienteId) {
                        $sub->where('anio_lectivo', $anio)
                            ->where('ambiente_id', $ambienteId)
                            ->where('activo', true);
                    });
                })
                ->select('id', 'nombre')
                ->orderBy('nombre')
                ->get()
        );
    }
}
