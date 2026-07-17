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
use Illuminate\Support\Facades\DB;
use App\Models\Ambiente;
use App\Models\Grupo;
use App\Models\Matricula;
use App\Models\EstudianteAmbiente;
use App\Models\FigurasModel;

class EstudianteAdminController extends Controller
{
    public function listar(Request $request)
    {
        $figuras = FigurasModel::getFiguras();
        
        $grados = Grado::where('activo', true)->orderBy('nombre')->get();
        $condiciones = Condicion::where('estado', true)->orderBy('nombre')->get();
        $consulta = Estudiante::with('grado', 'configuracionPin')->where('activo', '<>', 2);
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
            'tipo_guarda' => 'required|in:1,2',
            'ambientes_ids' => 'required_if:tipo_guarda,2|array|min:1',
            'grado_id_nuevo_docente' => 'required_if:tipo_guarda,2',
            'grupo_id_nuevo' => 'required_if:tipo_guarda,2',
        ]);

        if ($request->hasFile('avatar')) {
            $avatar = $request->file('avatar')->store('estudiantes', 'public');
        }else{
            $avatar = null;
        }

        //primera letra del nombre y apellido
        // Primera letra del nombre y apellido de forma segura con UTF-8
        $inicial_nombre = explode(' ', $datos['nombre']);
        $inicial_apellido = explode(' ', $datos['apellido']);

        // mb_substr(texto, inicio, longitud) extrae la letra completa de forma segura
        $primera_letra_nombre = mb_substr($inicial_nombre[0], 0, 1, 'UTF-8');
        $primera_letra_apellido = mb_substr($inicial_apellido[0], 0, 1, 'UTF-8');

        $iniciales = $primera_letra_nombre . $primera_letra_apellido;
        $iniciales = mb_strtoupper($iniciales, 'UTF-8');

        try {
            $estudiante = DB::transaction(function () use ($datos, $avatar, $iniciales) {
                
                if ($datos['tipo_guarda'] == 1) {
                    $grado_id = $datos['grado_id_nuevo'];
                } else {
                    $grado_id = $datos['grado_id_nuevo_docente'];
                }

                $estudiante = Estudiante::create([
                    'nombre' => $datos['nombre'],
                    'apellido' => $datos['apellido'],
                    'tipo_identificacion' => $datos['tipo_identificacion'],
                    'otro_tipo_identificacion' => $datos['otro_tipo_identificacion'] ?? null,
                    'identificacion' => $datos['identificacion'],
                    'grado_id' => $grado_id,
                    'avatar' => $avatar,
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
        
                ConfiguracionPin::create([
                    'estudiante_id' => $estudiante->id,
                    'figura_1' => $datos['configuracion_pin'][0]['icon'],
                    'color_figura_1' => $datos['configuracion_pin'][0]['color'],
                    'figura_2' => $datos['configuracion_pin'][1]['icon'],
                    'color_figura_2' => $datos['configuracion_pin'][1]['color'],
                    'figura_3' => $datos['configuracion_pin'][2]['icon'],
                    'color_figura_3' => $datos['configuracion_pin'][2]['color'],
                ]);


                //SI ES TIPO GUARDA 2, CREAR MATRICULA
                if ($datos['tipo_guarda'] == 2) {
                    Matricula::create([
                        'estudiante_id' => $estudiante->id,
                        'grado_id' => $datos['grado_id_nuevo_docente'],
                        'grupo_id' => $datos['grupo_id_nuevo'],
                        'anio_lectivo' => date('Y'),
                        'estado' => 'activo',
                        'fecha_ingreso' => date('Y-m-d'),
                    ]);

                    foreach ($datos['ambientes_ids'] as $ambiente_id) {
                        EstudianteAmbiente::create([
                            'estudiante_id' => $estudiante->id,
                            'ambiente_id' => $ambiente_id,
                            'anio_lectivo' => date('Y'),
                            'estado' => 'activo',
                            'observacion' => 'Matricula inicial',
                        ]);
                    }
                }

                return $estudiante;
            });
        
            return response()->json([
                'success' => true,
                'message' => 'Estudiante creado exitosamente.',
                'requiere_apoyo' => $datos['requiere_apoyo'] == 'si',
                'id_estudiante_creado' => $estudiante->id,
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el estudiante: ' . $e->getMessage(),
            ]);
        }
    }

    public function ver($estudianteId)
    {
        $estudiante = Estudiante::with('configuracionPin', 'matricula')->where('id', $estudianteId)->first();
        
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

    public function restablecerPin($idEstudiante)
    {
        $configuracionPin = ConfiguracionPin::where('estudiante_id', $idEstudiante)->first();

        if ($configuracionPin) {
            $exitoso = $configuracionPin->delete();
        } else {
            $exitoso = false;
        }

        if ($exitoso) {
            return response()->json([
                'success' => true,
                'message' => 'PIN restablecido exitosamente.',
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Error al restablecer el PIN.',
            ]);
        }
    }
}
