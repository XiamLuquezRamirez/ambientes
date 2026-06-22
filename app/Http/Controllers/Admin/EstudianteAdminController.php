<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use App\Models\Grado;
use App\Models\Atencion;
use App\Models\Condicion;

class EstudianteAdminController extends Controller
{
    public function listar(Request $request)
    {
        // que filtros se aplican
        
        $grados = Grado::where('activo', true)->orderBy('nombre')->get();
        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get();

        $consulta = Estudiante::with('grado');

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where(fn($q) => $q
                ->where('nombre', 'like', "%{$termino}%")
            );
        }

        if ($request->filled('grado_id')) {
            if ($request->grado_id == 'sin_grado') {
                $consulta->whereNull('grado_id');
            } else {
                $consulta->where('grado_id', $request->grado_id);
            }
        }

        if ($request->filled('condicion_id')) {
            $consulta->where('condicion_id', $request->condicion_id);
        }

        if ($request->filled('estado')) {
            $consulta->where('activo', $request->estado);
        }

        $estudiantes  = $consulta->orderBy('nombre')->paginate(10)->withQueryString();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html'    => view('admin.estudiantes._tabla', compact('estudiantes'))->render()
            ]);
        }

        return view('admin.estudiantes.index', compact('grados', 'condiciones', 'estudiantes'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:100',
            'identificacion' => 'required|string|max:100',
            'color_avatar' => 'required|string|max:100',
            'requiere_apoyo' => 'required',
            'avatar' => 'nullable',
            'acudiente' => 'required',
            'telefono_acudiente' => 'required|string|max:100',
            'fecha_nacimiento' => 'required|date',
            'sexo' => 'required|in:masculino,femenino',
        ]);

        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar')->store('estudiantes', 'public');
        }

        $iniciales = explode(' ', $datos['nombre']);
        if (count($iniciales) > 1) {
            $iniciales = $iniciales[0][0] . $iniciales[1][0];
            $iniciales = strtoupper($iniciales);
        } else {
            $iniciales =str_split($datos['nombre']);
            $iniciales = $iniciales[0][0] . $iniciales[1][0];
            $iniciales = strtoupper($iniciales);
        }

        $estudiante = Estudiante::create([
            'nombre'   => $datos['nombre'],
            'identificacion' => $datos['identificacion'],
            'grado_id' => $datos['grado_id_nuevo'] ?? null,
            'grupo_id' => $datos['grupo_id_nuevo'] ?? null,
            'avatar' => $avatar ?? null,
            'requiere_apoyo' => $datos['requiere_apoyo'],
            'acudiente' => $datos['acudiente'],
            'telefono_acudiente' => $datos['telefono_acudiente'],
            'fecha_nacimiento' => $datos['fecha_nacimiento'],
            'iniciales' => $iniciales,
            'color_avatar' => $datos['color_avatar'],
        ]);

        if ($estudiante) {
            if ($datos['requiere_apoyo'] =="si") {
                return response()->json([
                    'success' => true,
                    'message' => 'Estudiante creado exitosamente.',
                    'requiere_apoyo' => true,
                    'id_estudiante_creado' => $estudiante->id,
                ]);
            } else {
                return response()->json([
                    'success' => true,
                    'message' => 'Estudiante creado exitosamente.',
                    'requiere_apoyo' => false,
                    'id_estudiante_creado' => $estudiante->id,
                ]);
            }
        }
    }

    public function formularioEditar($estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        return view('admin.estudiantes.edit', compact('estudiante'));
    }

    public function actualizar(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function transferir(Request $request, $estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function restablecerPin($estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    public function listarGrupos(Request $request)
    {
        $grupos = Grupo::where('grado_id', $request->grado_id)->where('activo', true)->get();
        return response()->json([
            'success' => true,
            'data'    => $grupos
        ]);
    }
}
