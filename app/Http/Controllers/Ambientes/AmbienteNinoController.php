<?php

namespace App\Http\Controllers\Ambientes;

use App\Http\Controllers\Controller;
use App\Models\BloqueExperiencia;
use App\Models\Experiencia;
use App\Services\ClaseKioscoService;
use App\Services\AdaptacionKioscoService;
use App\Services\RecorridoNinoService;
use App\Services\ResultadoNinoService;
use App\Services\SesionNinoService;
use App\Services\TextoAVozService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AmbienteNinoController extends Controller
{
    public function __construct(
        private SesionNinoService $sesionNino,
        private RecorridoNinoService $recorrido,
        private ClaseKioscoService $claseKiosco,
        private ResultadoNinoService $resultadoNino,
    ) {}

    /**
     * Diagnóstico JSON: resolución de ambiente vía ambiente_institucion.ip (tablet/LAN).
     */
    public function diagnosticoIp(Request $request)
    {
        $diag = $this->sesionNino->diagnosticarResolucionAmbiente($request);
        $ambiente = $diag['ambiente'];

        $pivotIps = DB::table('ambiente_institucion as ai')
            ->join('ambientes as a', 'a.id', '=', 'ai.ambiente_id')
            ->join('instituciones as i', 'i.id', '=', 'ai.institucion_id')
            ->where('ai.activo', true)
            ->where('a.activo', true)
            ->select('a.nombre', 'a.slug', 'ai.ip', 'i.nombre as institucion')
            ->orderBy('a.nombre')
            ->get();

        return response()->json([
            'host_solicitud' => $request->getHost(),
            'nodo_ip_simulada' => $this->sesionNino->ipSimuladaLocal($request),
            'ips_resolucion' => $this->sesionNino->ipsParaResolucionAmbiente($request),
            'ips_candidatas_nodo' => $this->sesionNino->ipsCandidatasNodo($request),
            'server_addr' => $request->server('SERVER_ADDR'),
            'ambiente_resuelto' => $ambiente ? [
                'id' => $ambiente->id,
                'nombre' => $ambiente->nombre,
                'slug' => $ambiente->slug,
            ] : null,
            'ip_match' => $diag['ip'],
            'fuente' => $diag['fuente'],
            'ambiente_institucion' => $pivotIps,
            'fallback_slug' => config('ambiente.slug'),
        ]);
    }

    /**
     * Portada pública del kiosco (primera vista).
     * Iniciar → lista de alumnos.
     */
    public function inicio(Request $request)
    {
        $this->sesionNino->limpiar($request);

        $ambiente = $this->sesionNino->obtenerAmbiente($request);
        $arbol = $this->recorrido->armarArbol($ambiente);
        $tieneContenido = ! empty($arbol['modulos']);

        if (! $tieneContenido) {
            $estudiante = null;

            return view('ambientes.inicio-placeholder', compact('ambiente', 'estudiante'));
        }

        return view('ambientes.kiosco-recorrido', [
            'ambiente' => $ambiente,
            'modo' => 'portada',
            'token' => null,
            'arbol' => $arbol,
            'estudiante' => null,
            'urlExperienciaTemplate' => '',
            'urlTts' => '',
            'urlSalir' => '',
            'urlContinuar' => '/alumnos',
            'portadaImg' => $this->urlPortada($ambiente->slug),
            'fondoImg' => $this->urlFondo($ambiente->slug),
            'pasoInicial' => 'portada',
        ]);
    }

    /**
     * Recorrido autenticado tras /listo (acotado a la clase de sesión).
     */
    public function recorrido(Request $request)
    {
        $ambiente = $this->sesionNino->obtenerAmbiente($request);
        $estudiante = $request->attributes->get('estudiante_nino');
        $clase = $this->claseKiosco->obtenerClaseSesion($this->sesionNino->claseIdEnSesion($request));

        if (! $clase) {
            $clase = $this->claseKiosco->claseActivaHoy($ambiente);
        }

        if (! $clase || ! $this->claseKiosco->claseValidaParaRecorrido($clase)) {
            return redirect()->route('auth.alumnos');
        }

        $arbol = $this->recorrido->armarArbol($ambiente, null, $clase);

        if (! $this->recorrido->arbolEsCaminoUnico($arbol, $clase)) {
            return view('ambientes.inicio-placeholder', [
                'ambiente' => $ambiente,
                'estudiante' => $estudiante,
                'motivoRecorrido' => true,
            ]);
        }

        $camino = $this->recorrido->armarCaminoLineal($arbol, $clase, $estudiante);

        if (! $camino) {
            return view('ambientes.inicio-placeholder', [
                'ambiente' => $ambiente,
                'estudiante' => $estudiante,
                'motivoRecorrido' => true,
            ]);
        }

        return view('ambientes.kiosco-recorrido', [
            'ambiente' => $ambiente,
            'modo' => 'sesion',
            'ui' => 'camino-lineal',
            'token' => null,
            'arbol' => $arbol,
            'camino' => $camino,
            'estudiante' => $estudiante,
            'urlExperienciaTemplate' => '/experiencia/__ID__',
            'urlTts' => '/tts',
            'urlSalir' => '/salir',
            'urlContinuar' => '',
            'portadaImg' => $this->urlPortada($ambiente->slug),
            'fondoImg' => $this->urlFondo($ambiente->slug),
            'pasoInicial' => 'camino',
        ]);
    }

    public function experiencia(Request $request, Experiencia $experiencia)
    {
        $ambiente = $this->sesionNino->obtenerAmbiente($request);
        $clase = $this->claseKiosco->obtenerClaseSesion($this->sesionNino->claseIdEnSesion($request));

        if (! $clase) {
            $clase = $this->claseKiosco->claseActivaHoy($ambiente);
        }

        $sesion = [
            'ambiente_id' => $ambiente->id,
            'clase_id' => $clase?->id,
            'experiencia_id' => $clase?->experiencia_id,
        ];

        if (! $this->recorrido->experienciaPermitidaEnSesion($sesion, $experiencia)) {
            return response()->json([
                'success' => false,
                'message' => 'La experiencia no pertenece a la clase de hoy.',
            ], 403);
        }

        $payload = $this->recorrido->payloadExperiencia($experiencia);
        if (! $payload) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo cargar la experiencia.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $payload,
        ]);
    }

    public function guardarResultadoBloque(Request $request, Experiencia $experiencia, BloqueExperiencia $bloque)
    {
        $datos = $request->validate([
            'correcto' => ['nullable', 'boolean'],
            'payload' => ['required'],
            'archivo' => ['nullable', 'file', 'max:51200'],
        ]);

        $payload = $datos['payload'];
        if (is_string($payload)) {
            $payload = json_decode($payload, true);
        }

        if (! is_array($payload)) {
            return response()->json([
                'success' => false,
                'message' => 'El payload del resultado es inválido.',
            ], 422);
        }

        $resultado = $this->resultadoNino->registrar(
            $request,
            $experiencia,
            $bloque,
            [
                'correcto' => $datos['correcto'] ?? null,
                'payload' => $payload,
            ],
            $request->file('archivo'),
        );

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $resultado->id,
                'correcto' => $resultado->correcto,
                'tipo_registro' => $resultado->tipo_registro,
                'archivo_url' => $resultado->archivo_path
                    ? asset('storage/'.$resultado->archivo_path)
                    : null,
            ],
        ]);
    }

    public function tts(Request $request)
    {
        $datos = $request->validate([
            'texto' => ['required', 'string', 'max:800'],
            'personaje' => ['nullable', 'string', 'in:zoe,zeus'],
        ]);

        $personaje = $datos['personaje'] ?? null;
        if ($personaje === null) {
            $perfil = app(AdaptacionKioscoService::class)->obtenerDeSesion($request);
            $voz = is_array($perfil) ? ($perfil['valores']['voz_narradora'] ?? null) : null;
            $personaje = $voz === 'infantil_masculina' ? 'zeus' : 'zoe';
        }

        try {
            $url = app(TextoAVozService::class)->urlPublica(
                $datos['texto'],
                $personaje
            );
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar la voz.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
        ]);
    }

    private function urlPortada(string $slug): string
    {
        $relativo = 'assets/images/ambientes/'.$slug.'-portada.png';
        $absoluto = public_path($relativo);

        if (File::exists($absoluto)) {
            return '/'.$relativo;
        }

        return '';
    }

    private function urlFondo(string $slug): string
    {
        $relativo = 'assets/images/ambientes/'.$slug.'-fondo.png';
        $absoluto = public_path($relativo);

        if (File::exists($absoluto)) {
            return '/'.$relativo;
        }

        return '';
    }
}
