<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use App\Models\Grado;
use App\Models\Atencion;
use App\Models\Condicion;
use App\Models\ConfiguracionPin;
use App\Models\Departamento;
use App\Models\Municipio;

class EstudianteAdminController extends Controller
{
    public function listar(Request $request)
    {
        $figuras = [
            [
                'icon' => 'fas fa-circle',
                'color' => '#f933e9',
            ],
            [
                'icon' => 'fas fa-star',
                'color' => '#ff9019',
            ],
            [
                'icon' => 'fas fa-heart',
                'color' => '#ff0606',
            ],
            [
                'icon' => 'fas fa-fish',
                'color' => '#0f54ff',
            ],
            [
                'icon' => 'fas fa-square',
                'color' => '#437124',
            ],
            [
                'icon' => 'fas fa-moon',
                'color' => '#3f51b5',
            ],
            [
                'icon' => 'fas fa-diamond',
                'color' => '#9c27b0',
            ],
            [
                'icon' => 'fas fa-apple-whole',
                'color' => '#fd0a5d',
            ]
        ];

        $grados = Grado::where('activo', true)->orderBy('nombre')->get();
        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get();
        $consulta = Estudiante::with('grado')->where('activo', '<>', 2);
        $departamentos = Departamento::orderBy('descripcion')->get();
        /* ── Filtros ────────────────────────────────────── */
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

        return view('admin.estudiantes.index', compact('grados', 'condiciones', 'estudiantes', 'figuras', 'departamentos'));
    }

    public function cargarMunicipios($departamento)
    {
        $municipios = Municipio::where('coddep', $departamento)->orderBy('descripcion')->get();
        
        if ($municipios) {
            return response()->json($municipios);
        } else {
            return response()->json(null);
        }
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:100',
            'apellido'    => 'required|string|max:100',
            'tipo_identificacion' => 'required|string|max:100',
            'otro_tipo_identificacion' => 'nullable|string|max:100',
            'identificacion' => 'required|string|max:100|unique:estudiantes,identificacion',
            'color_avatar' => 'required|string|max:100',
            'requiere_apoyo' => 'required',
            'avatar' => 'nullable',
            'acudiente' => 'required',
            'telefono_acudiente' => 'required|string|max:100',
            'fecha_nacimiento' => 'required|date',
            'sexo' => 'required|in:masculino,femenino',
            'grado_id_nuevo' => 'nullable',
            'configuracion_pin' => 'required|array|min:3',
            'lugar_nacimiento' => 'required|string|max:100',
            'departamento_id' => 'required|string|max:100',
            'municipio_id' => 'required|string|max:100',
            'barrio_vereda' => 'required|string|max:100',
            'direccion' => 'required|string|max:100',
            'telefono' => 'nullable',
            'email' => 'nullable',
        ]);


        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar')->store('estudiantes', 'public');
        }

        //primera letra del nombre y apellido
        $inicial_nombre = explode(' ', $datos['nombre']);
        $inicial_apellido = explode(' ', $datos['apellido']);
        $iniciales = $inicial_nombre[0][0] . $inicial_apellido[0][0];
        $iniciales = strtoupper($iniciales);

        $estudiante = Estudiante::create([
            'nombre'   => $datos['nombre'],
            'apellido' => $datos['apellido'],
            'tipo_identificacion' => $datos['tipo_identificacion'],
            'otro_tipo_identificacion' => $datos['otro_tipo_identificacion'] ?? null,
            'identificacion' => $datos['identificacion'],
            'grado_id' => $datos['grado_id_nuevo'] ?? null,
            'avatar' => $avatar ?? null,
            'requiere_apoyo' => $datos['requiere_apoyo'],
            'acudiente' => $datos['acudiente'],
            'telefono_acudiente' => $datos['telefono_acudiente'],
            'fecha_nacimiento' => $datos['fecha_nacimiento'],
            'iniciales' => $iniciales,
            'color_avatar' => $datos['color_avatar'],
            'sexo' => $datos['sexo'],
            'lugar_nacimiento' => $datos['lugar_nacimiento'],
            'departamento_id' => $datos['departamento_id'],
            'municipio_id' => $datos['municipio_id'],
            'barrio_vereda' => $datos['barrio_vereda'],
            'direccion' => $datos['direccion'],
            'telefono' => $datos['telefono'],
            'email' => $datos['email'],
        ]);


        if ($estudiante) {

            ConfiguracionPin::create([
                'estudiante_id' => $estudiante->id,
                'figura_1' => $datos['configuracion_pin'][0]['icon'],
                'color_figura_1' => $datos['configuracion_pin'][0]['color'],
                'figura_2' => $datos['configuracion_pin'][1]['icon'],
                'color_figura_2' => $datos['configuracion_pin'][1]['color'],
                'figura_3' => $datos['configuracion_pin'][2]['icon'],
                'color_figura_3' => $datos['configuracion_pin'][2]['color'],
            ]);

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

    public function ver($estudianteId)
    {
        $estudiante = Estudiante::with('configuracionPin')->where('id', $estudianteId)->first();
        if ($estudiante) {
            return response()->json([
                'success' => true,
                'data'    => $estudiante
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Estudiante no encontrado.',
            ]);
        }
    }

    public function actualizar(Request $request, $idEstudiante)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:100',
            'apellido'    => 'required|string|max:100',
            'tipo_identificacion' => 'required|string|max:100',
            'otro_tipo_identificacion' => 'nullable|string|max:100',
            'identificacion' => 'required|string|max:100',
            'color_avatar' => 'required|string|max:100',
            'requiere_apoyo' => 'required',
            'avatar' => 'nullable',
            'acudiente' => 'required',
            'telefono_acudiente' => 'required|string|max:100',
            'fecha_nacimiento' => 'required|date',
            'sexo' => 'required|in:masculino,femenino',
            'grado_id_nuevo' => 'nullable',
            'configuracion_pin' => 'required|array|min:3',
            'lugar_nacimiento' => 'required|string|max:100',
            'departamento_id' => 'required|string|max:100',
            'municipio_id' => 'required|string|max:100',
            'barrio_vereda' => 'required|string|max:100',
            'direccion' => 'required|string|max:100',
            'telefono' => 'nullable',
            'email' => 'nullable',
        ]);

        $inicial_nombre = explode(' ', $datos['nombre']);
        $inicial_apellido = explode(' ', $datos['apellido']);
        $iniciales = $inicial_nombre[0][0] . $inicial_apellido[0][0];
        $iniciales = strtoupper($iniciales);
        
        $datosActualizar = [
            'nombre'   => $datos['nombre'],
            'apellido' => $datos['apellido'],
            'tipo_identificacion' => $datos['tipo_identificacion'],
            'otro_tipo_identificacion' => $datos['otro_tipo_identificacion'] ?? null,
            'identificacion' => $datos['identificacion'],
            'grado_id' => $datos['grado_id_nuevo'] ?? null,
            'requiere_apoyo' => $datos['requiere_apoyo'],
            'acudiente' => $datos['acudiente'],
            'telefono_acudiente' => $datos['telefono_acudiente'],
            'fecha_nacimiento' => $datos['fecha_nacimiento'],
            'iniciales' => $iniciales,
            'color_avatar' => $datos['color_avatar'],
            'sexo' => $datos['sexo'],
            'lugar_nacimiento' => $datos['lugar_nacimiento'],
            'departamento_id' => $datos['departamento_id'],
            'municipio_id' => $datos['municipio_id'],
            'barrio_vereda' => $datos['barrio_vereda'],
            'direccion' => $datos['direccion'],
            'telefono' => $datos['telefono'],
            'email' => $datos['email'],
        ];
        
        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar')->store('estudiantes', 'public');
            $datosActualizar['avatar'] = $avatar;
        }

        $exitoso = Estudiante::where('id', $idEstudiante)->update($datosActualizar);

        if ($exitoso) {
            ConfiguracionPin::updateOrCreate([
                'estudiante_id' => $idEstudiante
            ], [
                'figura_1' => $datos['configuracion_pin'][0]['icon'],
                'color_figura_1' => $datos['configuracion_pin'][0]['color'],
                'figura_2' => $datos['configuracion_pin'][1]['icon'],
                'color_figura_2' => $datos['configuracion_pin'][1]['color'],
                'figura_3' => $datos['configuracion_pin'][2]['icon'],
                'color_figura_3' => $datos['configuracion_pin'][2]['color'],
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Estudiante actualizado exitosamente.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Error al actualizar el estudiante.',
        ]);
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

    public function eliminar($estudiante, $estado)
    {
        $exitoso = Estudiante::where('id', $estudiante)
        ->update(['activo' => $estado]);

        if ($exitoso) {
            return response()->json([
                'success' => true,
                'message' => 'Estudiante eliminado exitosamente.',
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el estudiante.',
            ]);
        }
    }

    public function cambiarEstado(Request $request, $idEstudiante)
    {
        $exitoso = Estudiante::where('id', $idEstudiante)
        ->update(['activo' => $request->estado]);

        if ($exitoso) {
            if ($request->estado == 1) {
                $message = 'Estado cambiado a activo exitosamente.';
            } else {
                $message = 'Estado cambiado a inactivo exitosamente.';
            }
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Error al cambiar el estado del estudiante.',
            ]);
        }
    }
}
