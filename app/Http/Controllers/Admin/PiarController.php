<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Illuminate\Http\Request;
use App\Models\Condicion;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use App\Models\Municipio;
use App\Models\Departamento;
use App\Models\Piar;
use App\Models\PiarDatosGenerales;
use App\Models\PiarEntornoSalud;
use App\Models\PiarAtencionMedica;
use App\Models\PiarTratamiento;
use App\Models\PiarMedicamento;
use App\Models\PiarEntornoHogar;
use App\Models\PiarEntornoEducativo;
use App\Models\PiarValoracionPedagogica;

class PiarController extends Controller
{
    public function diligenciarPiar($idEstudiante)
    {
        $estudiante = Estudiante::with('grado', 'departamento', 'municipio')->where('id', $idEstudiante)->first();
        $condiciones = Condicion::all();

        //municipios
        $municipios = Municipio::all();
        $departamentos = Departamento::all();

        //usuario logueado
        $user =Auth::guard('docente')->user();
        $docente_diligencia = User::where('id', $user->id)->first();

        return view('admin.estudiantes.diligenciarPiar', compact('estudiante', 'condiciones', 'docente_diligencia', 'municipios', 'departamentos'));
    }

    public function guardarPiar(Request $request, $paso)
    {
        switch ($paso) {
            case 1:
                return $this->guardarPaso1($request);
            case 2:
                return $this->guardarPaso2($request);
            case 3:
                return $this->guardarPaso3($request);
            case 4:
                return $this->guardarPaso4($request);
            case 5:
                return $this->guardarPaso5($request);
        }
    }

    public function guardarPaso1(Request $request){
        $datos = $request->validate([
            'id_estudiante' => 'required|integer',
            'id_docente' => 'required|integer',
            'vinculado' => 'nullable|string|max:255',
            'victima' => 'nullable|string',
            'registro_victima' => 'nullable|string|max:255',
            'centro_proteccion' => 'nullable|string',
            'cual_centro_proteccion' => 'nullable|string|max:255',
            'grupo_etnico' => 'nullable|string',
            'cual_etnico' => 'nullable|string|max:255',
            'capacidades' => 'nullable|string',
            'gustos' => 'nullable|string',
            'expectativas_estudiante' => 'nullable|string',
            'expectativas_familia' => 'nullable|string',
            'redes_apoyo' => 'nullable|string',
            'otras' => 'nullable|string',
            'fecha_diligenciamiento' => 'nullable|date',
        ]);


        // verificcar que el estudiante no tenga piar registrado
        $piar = Piar::where('estudiante_id', $datos['id_estudiante'])->first();

        if ($piar) {
            $id_piar = $piar->id;
        } else {
            $piar = Piar::create([
                'estudiante_id' => $datos['id_estudiante'],
                'docente_id' => $datos['id_docente'],
                'estado' => 'borrador',
                'paso' => 1,
                'fecha_diligenciamiento' => $datos['fecha_diligenciamiento'],
            ]);

            $id_piar = $piar->id;
        }

        
        $registro = PiarDatosGenerales::updateOrCreate(
            ['id_piar' => $id_piar],
            $datos
        );

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar los datos generales.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos generales guardados correctamente.',
            'data' => $registro
        ]);
    }

    public function guardarPaso2(Request $request){
        $datos = $request->validate([
            "id_estudiante" => "required|integer",
            "id_docente" => "required|integer",
            "afiliado_salud" => "required|string",
            "regimen" => "required|string",
            "eps" => "required|string",
            "lugar_emergencia" => "required|string",
            "diagnostico_medico" => "required|string",
            "cual_diagnostico" => "required|string",
            "atencion_medica" => "required|string",
            "atencion" => "required|array",
            "tratamiento_integral" => "nullable|string",
            "tratamiento" => "nullable|array",
            "consume_medicamentos" => "nullable|string",
            "medicamento" => "nullable|array",
            "ayudas_tecnicas" => "required|string",
            "cuales_ayudas" => "required|string",
        ]);
        // verificcar que el estudiante no tenga piar registrado
        $piar = Piar::where('estudiante_id', $datos['id_estudiante'])->first();

        if ($piar) {
            $id_piar = $piar->id;
        } else {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene piar registrado.',
            ]);
        } 

        $registro = PiarEntornoSalud::updateOrCreate(
            ['id_piar' => $id_piar],
            [
                'afiliado_salud' => $datos['afiliado_salud'],
                'regimen' => $datos['regimen'],
                'eps' => $datos['eps'],
                'lugar_emergencia' => $datos['lugar_emergencia'],
                'diagnostico_medico' => $datos['diagnostico_medico'],
                'cual_diagnostico' => $datos['cual_diagnostico'],
                'atencion_medica' => $datos['atencion_medica'],
                'tratamiento_integral' => $datos['tratamiento_integral'],
                'consume_medicamentos' => $datos['consume_medicamentos'],
                'ayudas_tecnicas' => $datos['ayudas_tecnicas'],
                'cuales_ayudas' => $datos['atencion_medica'] == 'Si' ? $datos['cuales_ayudas'] : null,
            ]
        );

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar los datos entorno salud.',
            ]);
        }

        $id_entorno_salud = $registro->id;

        // guardar los datos de las atenciones medicas
        // eliminar las atenciones medicas anteriores
        PiarAtencionMedica::where('id_entorno_salud', $id_entorno_salud)->delete();
        if ($datos['atencion_medica'] == 'Si') {
            foreach ($datos['atencion'] as $atencion) {
                PiarAtencionMedica::create([
                    'id_entorno_salud' => $id_entorno_salud,
                    'cual' => $atencion['cual'],
                    'frecuencia' => $atencion['frecuencia'],
                ]);
            }
        }

        // guardar los datos de los tratamientos
        PiarTratamiento::where('id_entorno_salud', $id_entorno_salud)->delete();
        if ($datos['tratamiento_integral'] == 'Si') {
            foreach ($datos['tratamiento'] as $tratamiento) {
                PiarTratamiento::create([
                    'id_entorno_salud' => $id_entorno_salud,
                    'cual' => $tratamiento['cual'],
                    'frecuencia' => $tratamiento['frecuencia'],
                ]);
            }
        }

        // guardar los datos de los medicamentos
        PiarMedicamento::where('id_entorno_salud', $id_entorno_salud)->delete();
        if ($datos['consume_medicamentos'] == 'Si') {
            foreach ($datos['medicamento'] as $medicamento) {
                PiarMedicamento::create([
                    'id_entorno_salud' => $id_entorno_salud,
                    'cual' => $medicamento['cual'],
                    'frecuencia' => $medicamento['frecuencia'],
                    'horario' => $medicamento['horario'],
                ]);
            }
        }


        return response()->json([
            'success' => true,
            'message' => 'Datos entorno salud guardados correctamente.',
            'data' => $registro
        ]);
    }

    public function guardarPaso3(Request $request){
        $datos = $request->validate([
            "id_estudiante" => "required|integer",
            "id_docente" => "required|integer",
            "nombre_madre" => "required|string",
            "ocupacion_madre" => "required|string",
            "nivel_madre" => "required|string",
            "nombre_padre" => "required|string",
            "ocupacion_padre" => "required|string",
            "nivel_padre" => "required|string",
            "nombre_cuidador" => "required|string",
            "nivel_cuidador" => "required|string",
            "telefono_cuidador" => "required|integer",
            "parentesco_cuidador" => "required|string",
            "correo_cuidador" => "nullable|email",
            "numero_hermanos" => "required|integer",
            "lugar_ocupa" => "required|string",
            "apoyo_crianza" => "required|string",
            "personas_con_quien_vive" => "required|string",
        ]);

        // verificcar que el estudiante no tenga piar registrado
        $piar = Piar::where('estudiante_id', $datos['id_estudiante'])->first();

        if ($piar) {
            $id_piar = $piar->id;
        } else {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene piar registrado.',
            ]);
        }

        $registro = PiarEntornoHogar::updateOrCreate(
            ['id_piar' => $id_piar],
            $datos
        );

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar los datos entorno hogar.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos entorno hogar guardados correctamente.',
            'data' => $registro
        ]);
    }

    public function guardarPaso4(Request $request){
        $datos = $request->validate([
            "id_estudiante" => "required|integer",
            "id_docente" => "required|integer",
            "vinculado_otra_institucion" => "required|string",
            "instituciones_anteriores" => "nullable|string",
            "motivo_no_vinculado" => "nullable|string",
            "ultimo_grado" => "required|string",
            "estado_ultimo_grado" => "required|string",
            "observaciones_estado" => "required|string",
            "recibe_informe_pedagogico" => "required|string",
            "institucion_informe" => "required|string",
            "programas_complementarios" => "required|string",
            "cuales_programas" => "required|string",
        ]);

        // verificcar que el estudiante no tenga piar registrado
        $piar = Piar::where('estudiante_id', $datos['id_estudiante'])->first();

        if ($piar) {
            $id_piar = $piar->id;
        } else {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene piar registrado.',
            ]);
        }

        $registro = PiarEntornoEducativo::updateOrCreate(
            ['id_piar' => $id_piar],
            $datos
        );

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar los datos entorno educativo.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos entorno educativo guardados correctamente.',
            'data' => $registro
        ]);
    }

    public function guardarPaso5(Request $request){
        $datos = $request->validate([
            "id_estudiante" => "required|integer",
            "id_docente" => "required|integer",

            "vp_mov_apoyo_sistema" => "required|string",
            "vp_mov_apoyo_sistema_obs" => "nullable|string",
            "vp_mov_ajustes_espacio" => "required|string",
            "vp_mov_ajustes_espacio_obs" => "nullable|string",
            "vp_mov_ajustes_movilidad" => "required|string",
            "vp_mov_ajustes_movilidad_obs" => "nullable|string",
            "vp_mov_motricidad_fina" => "required|string",
            "vp_mov_motricidad_fina_obs" => "nullable|string",
            "vp_mov_adaptacion_agarrar" => "required|string",
            "vp_mov_adaptacion_agarrar_obs" => "nullable|string",
            "vp_mov_intensidad" => "required|string",

            "vp_com_apoyo_sistema" => "required|string",
            "vp_com_apoyo_sistema_obs" => "nullable|string",
            "vp_com_aditamentos" => "required|string",
            "vp_com_aditamentos_obs" => "nullable|string",
            "vp_com_ajustes" => "required|string",
            "vp_com_ajustes_obs" => "nullable|string",
            "vp_com_intensidad" => "required|string",

            "vp_info_apoyo_sistema" => "required|string",
            "vp_info_apoyo_sistema_obs" => "nullable|string",
            "vp_info_ajustes" => "required|string",
            "vp_info_ajustes_obs" => "nullable|string",
            "vp_info_intensidad" => "required|string",

            "vp_soc_apoyo_regulacion" => "required|string",
            "vp_soc_apoyo_regulacion_obs" => "nullable|string",
            "vp_soc_ajustes_interaccion" => "required|string",
            "vp_soc_ajustes_interaccion_obs" => "nullable|string",
            "vp_soc_intensidad" => "required|string",

            "vp_acad_ajustes_permanencia" => "required|string",
            "vp_acad_ajustes_permanencia_obs" => "nullable|string",
            "vp_acad_ajustes_tiempos" => "required|string",
            "vp_acad_ajustes_tiempos_obs" => "nullable|string",
            "vp_acad_intensidad" => "required|string",
            "vp_observaciones" => "required|string",

            "cle_1" => "required|string",
            "cle_1_obs" => "nullable|string",
            "cle_2" => "required|string",
            "cle_2_obs" => "nullable|string",
            "cle_3" => "required|string",
            "cle_3_obs" => "nullable|string",
            "cle_4" => "required|string",
            "cle_4_obs" => "nullable|string",
            "cle_5" => "required|string",
            "cle_5_obs" => "nullable|string",
            "cle_6" => "required|string",
            "cle_6_obs" => "nullable|string",
            "cle_7" => "required|string",
            "cle_7_obs" => "nullable|string",
            "cle_8" => "required|string",
            "cle_8_obs" => "nullable|string",
            "cle_9" => "required|string",
            "cle_9_obs" => "nullable|string",
            "cle_10" => "required|string",
            "cle_10_obs" => "nullable|string",
            "cle_11" => "required|string",
            "cle_11_obs" => "nullable|string",
            "cle_12" => "required|string",  
            "cle_12_obs" => "nullable|string",
            "cle_13" => "required|string",
            "cle_13_obs" => "nullable|string",
            "cle_14" => "required|string",
            "cle_14_obs" => "nullable|string",
            "cle_15" => "required|string",
            "cle_15_obs" => "nullable|string",
            "cle_16" => "required|string",
            "cle_16_obs" => "nullable|string",
            "cle_17" => "required|string",
            "cle_17_obs" => "nullable|string",
            "cle_18" => "required|string",
            "cle_18_obs" => "nullable|string",
            "cle_observaciones" => "required|string",

            "clm_1" => "required|string",
            "clm_1_obs" => "nullable|string",
            "clm_2" => "required|string",
            "clm_2_obs" => "nullable|string",
            "clm_3" => "required|string",
            "clm_3_obs" => "nullable|string",
            "clm_4" => "required|string",
            "clm_4_obs" => "nullable|string",
            "clm_5" => "required|string",
            "clm_5_desde" => "required|integer",
            "clm_5_hasta" => "required|integer",
            "clm_5_obs" => "nullable|string",
            "clm_6" => "required|string",
            "clm_6_obs" => "nullable|string",
            "clm_7" => "required|string",
            "clm_7_obs" => "nullable|string",
            "clm_8" => "required|string",
            "clm_8_obs" => "nullable|string",
            "clm_9" => "required|string",
            "clm_9_obs" => "nullable|string",
            "clm_10" => "required|string",
            "clm_10_obs" => "nullable|string",
            "clm_11" => "required|string",
            "clm_11_obs" => "nullable|string",
            "clm_12" => "required|string",
            "clm_12_obs" => "nullable|string",
            "clm_13" => "required|string",
            "clm_13_obs" => "nullable|string",
            "clm_14" => "required|string",
            "clm_14_obs" => "nullable|string",
            "clm_15" => "required|string",
            "clm_15_obs" => "nullable|string",
            "clm_16" => "required|string",
            "clm_16_obs" => "nullable|string",
            "clm_17" => "required|string",
            "clm_17_obs" => "nullable|string",
            "clm_18" => "required|string",
            "clm_18_obs" => "nullable|string",
            "clm_19" => "required|string",
            "clm_19_obs" => "nullable|string",
            "clm_observaciones" => "required|string",  

            "dba_mem_1" => "required|string",
            "dba_mem_1_obs" => "nullable|string",
            "dba_mem_2" => "required|string",
            "dba_mem_2_obs" => "nullable|string",
            "dba_mem_3" => "required|string",
            "dba_mem_3_obs" => "nullable|string",
            "dba_mem_4" => "required|string",
            "dba_mem_4_obs" => "nullable|string",
            "dba_mem_5" => "required|string",
            "dba_mem_5_obs" => "nullable|string",
            "dba_mem_6" => "required|string",
            "dba_mem_6_obs" => "nullable|string",
            "dba_mem_7" => "required|string",
            "dba_mem_7_obs" => "nullable|string",

            "dba_ate_1" => "required|string",
            "dba_ate_1_obs" => "nullable|string",
            "dba_ate_2" => "required|string",
            "dba_ate_2_obs" => "nullable|string",
            "dba_ate_3" => "required|string",
            "dba_ate_3_obs" => "nullable|string",
            "dba_ate_4" => "required|string",
            "dba_ate_4_obs" => "nullable|string",

            "dba_per_1" => "required|string",
            "dba_per_1_obs" => "nullable|string",
            "dba_per_2" => "required|string",
            "dba_per_2_obs" => "nullable|string",
            "dba_per_3" => "required|string",
            "dba_per_3_obs" => "nullable|string",
            "dba_per_4" => "required|string",
            "dba_per_4_obs" => "nullable|string",
            "dba_per_5" => "required|string",
            "dba_per_5_obs" => "nullable|string",

            "dba_fe_1" => "required|string",
            "dba_fe_1_obs" => "nullable|string",
            "dba_fe_2" => "required|string",
            "dba_fe_2_obs" => "nullable|string",
            "dba_fe_3" => "required|string",
            "dba_fe_3_obs" => "nullable|string",
            "dba_fe_4" => "required|string",
            "dba_fe_4_obs" => "nullable|string",
            "dba_fe_5" => "required|string",
            "dba_fe_5_obs" => "nullable|string",
            "dba_fe_6" => "required|string",
            "dba_fe_6_obs" => "nullable|string",

            "dba_lc_1" => "required|string",
            "dba_lc_1_obs" => "nullable|string",
            "dba_lc_2" => "required|string",
            "dba_lc_2_obs" => "nullable|string",
            "dba_lc_3" => "required|string",
            "dba_lc_3_obs" => "nullable|string",
            "dba_lc_4" => "required|string",
            "dba_lc_4_obs" => "nullable|string",
            "dba_lc_5" => "required|string",
            "dba_lc_5_obs" => "nullable|string",
            "dba_lc_6" => "required|string",
            "dba_lc_6_obs" => "nullable|string",
            "dba_lc_7" => "required|string",        
            "dba_lc_7_obs" => "nullable|string",
            "dba_lc_8" => "required|string",
            "dba_lc_8_obs" => "nullable|string",
            "dba_lc_9" => "required|string",
            "dba_lc_9_obs" => "nullable|string",
            "dba_lc_10" => "required|string",
            "dba_lc_10_obs" => "nullable|string",

            "habilidades_destrezas" => "required|string",
            "estrategias_acciones" => "required|string",
        ]);

        // verificcar que el estudiante no tenga piar registrado
        $piar = Piar::where('estudiante_id', $datos['id_estudiante'])->first();

        if ($piar) {
            $id_piar = $piar->id;
        } else {
            return response()->json([
                'success' => false,
                'message' => 'El estudiante no tiene piar registrado.',
            ]);
        }

        $registro = PiarValoracionPedagogica::updateOrCreate(
            ['id_piar' => $id_piar],
            $datos
        );

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar los datos valoración pedagógica.',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos valoración pedagógica guardados correctamente.',
            'data' => $registro
        ]);
    }
}