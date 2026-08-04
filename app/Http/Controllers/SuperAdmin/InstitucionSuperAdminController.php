<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\PerfilAprendizajeInclusion;
use App\Models\PerfilAprendizajePersonalizado;
use App\Models\Institucion;
use App\Models\User;
use App\Services\InstitucionLogoService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class InstitucionSuperAdminController extends Controller
{
    public function __construct(
        private InstitucionLogoService $logoService,
        private readonly PerfilAprendizajeOrdenController $perfilAprendizajeOrdenController,
        private readonly PerfilAprendizajePersonalizadoOrdenController $perfilAprendizajePersonalizadoOrdenController,
    ) {}

    /**
     * Listado de instituciones con ambientes (pivot IP/puerto/activo).
     */
    public function index(Request $request)
    {
        $instituciones = Institucion::with('ambientes')->get();
        $ambientes = Ambiente::all();
        $condiciones = PerfilAprendizajeInclusion::query()->ordenadas()->get();

        $consulta = Institucion::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->select(
                'instituciones.*',
            );

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $consulta->where(fn ($q) => $q
                ->where('nombre', 'like', "%{$termino}%")
            );
        }

        if ($request->filled('estado')) {
            $consulta->where('activo', $request->estado === 'true');
        }

        $instituciones = $consulta->orderBy('nombre')->paginate(10);

        // solo las del sistemas y adicionales creadas por el super admin
        $condicionesTransitorias = PerfilAprendizajePersonalizado::query()
            ->with('condicionBase')
            ->where('id_institucion', null)
            ->ordenadas()
            ->get();

        return view('superAdmin.instituciones.index', compact(
            'instituciones',
            'ambientes',
            'condiciones',
            'condicionesTransitorias'
        ));
    }

    /**
     * Datos de una institución para el modal de edición (incluye ambientes y logo público).
     */
    public function ver($id)
    {
        $institucion = Institucion::with('ambientes')->findOrFail($id);

        $ambientes = $institucion->ambientes->map(function ($ambiente) {
            return [
                'id' => $ambiente->id,
                'nombre' => $ambiente->nombre,
                'ip' => $ambiente->pivot->ip,
                'puerto' => $ambiente->pivot->puerto,
                'activo' => (bool) $ambiente->pivot->activo,
            ];
        })->values();

        $condicionesTransitoriasDisponibles = PerfilAprendizajePersonalizado::query()
            ->with('condicionBase:id,codigo,nombre,color_hex')
            ->where(function ($q) use ($id) {
                $q->whereNull('id_institucion')
                    ->orWhere('id_institucion', (int) $id);
            })
            ->ordenadas()
            ->get(['id', 'codigo', 'etiqueta', 'condicion_base_id', 'id_institucion', 'es_sistema'])
            ->map(function (PerfilAprendizajePersonalizado $t) {
                $color = $t->condicionBase?->color_hex ?: '#64748B';

                return [
                    'id' => $t->id,
                    'codigo' => $t->codigo,
                    'etiqueta' => $t->etiqueta,
                    'id_institucion' => $t->id_institucion,
                    'es_sistema' => (bool) $t->es_sistema,
                    'color' => $color,
                    'condicion_base' => $t->condicionBase ? [
                        'codigo' => $t->condicionBase->codigo,
                        'nombre' => $t->condicionBase->nombre,
                    ] : null,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $institucion->id,
                'nombre' => $institucion->nombre,
                'codigo_dane' => $institucion->codigo_dane,
                'municipio' => $institucion->municipio,
                'departamento' => $institucion->departamento,
                'correo_contacto' => $institucion->correo_contacto,
                'activo' => (bool) $institucion->activo,
                'logo' => $institucion->logo,
                'logo_url_publica' => $this->logoService->urlPublica($institucion->logo),
                'iniciales' => $this->logoService->iniciales($institucion),
                'ambientes' => $ambientes,
            ],
            'condiciones_orden' => $this->perfilAprendizajeOrdenController->listarPorInstitucion((int) $id),
            'condiciones_transitorias_orden' => $this->perfilAprendizajePersonalizadoOrdenController->listarPorInstitucion((int) $id),
            'condiciones_transitorias_disponibles' => $condicionesTransitoriasDisponibles,
        ]);
    }

    /**
     * Crea institución + admin temporal + ambientes activos (opcionales).
     * El logo es obligatorio; los ambientes son opcionales salvo la IP si se activan.
     */
    public function guardar(Request $request)
    {
        $datos = $this->validarDatosInstitucion($request, logoObligatorio: true);
        $this->validarAmbientes($request);

        $resultado = DB::transaction(function () use ($datos, $request) {
            $institucion = Institucion::create([
                'nombre' => $datos['nombre'],
                'codigo_dane' => $datos['codigo_dane'],
                'municipio' => $datos['municipio'],
                'departamento' => $datos['departamento'],
                'correo_contacto' => $datos['correo_contacto'],
                'logo' => null,
                'activo' => true,
            ]);

            $this->logoService->guardar($institucion, $request->file('logo'));
            $institucion->refresh();

            $passwordTemporal = Str::password(8);

            $usuario = User::create([
                'institucion_id' => $institucion->id,
                'identificacion' => Str::random(10),
                'nombre' => 'Admin '.$institucion->nombre,
                'email' => 'admin@'.Str::slug($institucion->nombre).'.local',
                'password' => Hash::make($passwordTemporal),
                'rol' => 'admin',
                'estado' => 'activo',
                'creado_por' => Auth::guard('docente')->id(),
            ]);

            $institucion->ambientes()->sync(
                $this->relacionesAmbientes($request)
            );
            session(['password_temporal' => $passwordTemporal]);

            $this->perfilAprendizajeOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_orden', [])
            );

            $this->perfilAprendizajePersonalizadoOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_transitorias_orden', [])
            );

            return [
                'institucion' => $institucion,
                'usuario' => $usuario,
                'password' => $passwordTemporal,
                'email' => $usuario->email,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Institución creada correctamente.',
            'credenciales' => [
                'correo' => $resultado['email'],
                'password' => $resultado['password'],
            ],
            'usuario' => [
                'id' => $resultado['usuario']->id,
                'nombre' => $resultado['usuario']->nombre,
            ],
        ]);
    }

    /**
     * Actualiza datos de la institución y sincroniza IPs/puertos/ambientes activos.
     * El logo debe existir (se gestiona con subirLogo; no se puede eliminar).
     * Ambientes opcionales; IP obligatoria solo en los que se activen.
     */
    public function actualizar(Request $request, $id)
    {
        $institucion = Institucion::findOrFail($id);

        $datos = $this->validarDatosInstitucion($request, $institucion->id);
        $this->validarLogoExistente($institucion);
        $this->validarAmbientes($request);

        $relaciones = $this->relacionesAmbientes($request);

        $this->validarIpsDuplicadas($institucion->id, $relaciones);

        DB::transaction(function () use ($institucion, $datos, $relaciones, $request) {
            $institucion->update([
                'nombre' => $datos['nombre'],
                'codigo_dane' => $datos['codigo_dane'],
                'municipio' => $datos['municipio'],
                'departamento' => $datos['departamento'],
                'correo_contacto' => $datos['correo_contacto'],
            ]);

            $institucion->ambientes()->sync($relaciones);

            $this->perfilAprendizajeOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_orden', [])
            );

            $this->perfilAprendizajePersonalizadoOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_transitorias_orden', [])
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Institución actualizada correctamente.',
        ]);
    }

    /**
     * Sube o reemplaza el logo (misma idea que panel/perfil/foto).
     */
    public function subirLogo(Request $request, $id)
    {
        $institucion = Institucion::findOrFail($id);

        $request->validate([
            'logo' => 'required|file|mimes:jpeg,jpg,png|max:'.InstitucionLogoService::MAX_KILOBYTES,
        ]);

        try {
            $resultado = $this->logoService->guardar($institucion, $request->file('logo'));
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Logo actualizado correctamente.',
            'logo_url_publica' => $resultado['logo_url_publica'],
            'iniciales' => $resultado['iniciales'],
        ]);
    }

    /**
     * El logo es obligatorio: no se permite eliminarlo, solo reemplazarlo con subirLogo.
     */
    public function eliminarLogo($id)
    {
        Institucion::findOrFail($id);

        return response()->json([
            'success' => false,
            'message' => 'El logo es obligatorio. Puede reemplazarlo, pero no eliminarlo.',
        ], 422);
    }

    /**
     * Alterna activo / suspendido. Suspendida: los usuarios del colegio no pueden iniciar sesión.
     */
    public function toggleActivo($id)
    {
        $institucion = Institucion::findOrFail($id);
        $institucion->activo = ! $institucion->activo;
        $institucion->save();

        return response()->json([
            'success' => true,
            'activo' => (bool) $institucion->activo,
            'message' => $institucion->activo
                ? 'Institución activada correctamente.'
                : 'Institución suspendida. Sus usuarios no podrán iniciar sesión.',
        ]);
    }

    public function generarPdf($id)
    {
        $usuario = User::findOrFail($id);
        $password = session()->pull('password_temporal');
        $pdf = Pdf::loadView(
            'superAdmin.pdf.admin',
            compact('usuario', 'password')
        );
        $nombreArchivo = 'Admin_'.Str::slug($usuario->nombre, ' ').'.pdf';

        return $pdf->download($nombreArchivo);
    }

    /** Validación compartida create/update de campos básicos. */
    private function validarDatosInstitucion(
        Request $request,
        ?int $ignoreId = null,
        bool $logoObligatorio = false,
    ): array {
        $uniqueDane = 'unique:instituciones,codigo_dane';
        if ($ignoreId) {
            $uniqueDane .= ','.$ignoreId;
        }

        return $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20|'.$uniqueDane,
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'correo_contacto' => 'required|email|max:255',
            'logo' => ($logoObligatorio ? 'required' : 'nullable')
                .'|file|mimes:jpeg,jpg,png|max:'.InstitucionLogoService::MAX_KILOBYTES,
            'condiciones_orden' => 'nullable|array',
            'condiciones_transitorias_orden' => 'nullable|array',
        ], [
            'logo.required' => 'El logo de la institución es obligatorio.',
        ]);
    }

    /** En edición el logo no viaja en el form: debe existir ya en la institución. */
    private function validarLogoExistente(Institucion $institucion): void
    {
        if (filled($institucion->logo)) {
            return;
        }

        throw ValidationException::withMessages([
            'logo' => ['El logo de la institución es obligatorio. Suba uno antes de guardar.'],
        ]);
    }

    private function validarIpsDuplicadas(int $institucionId, array $relaciones): void
    {
        $ips = collect($relaciones)
            ->pluck('ip')
            ->filter();

        if ($ips->isEmpty()) {
            return;
        }

        $ambientesActuales = array_keys($relaciones);

        $ipsDuplicadas = DB::table('ambiente_institucion')
            ->where('institucion_id', $institucionId)
            ->whereIn('ip', $ips)
            ->whereNotIn('ambiente_id', $ambientesActuales)
            ->pluck('ip')
            ->unique();

        if ($ipsDuplicadas->isNotEmpty()) {
            throw ValidationException::withMessages([
                'ambientes' => [
                    'Las siguientes IP ya están asignadas a otro ambiente de la institución: '
                    .$ipsDuplicadas->implode(', '),
                ],
            ]);
        }
    }

    /**
     * Ambientes opcionales: IP, puerto y activo pueden omitirse.
     * Solo si un ambiente se marca activo, su IP es obligatoria (y válida IPv4).
     *
     * Nota: no se puede poner la regla "IP requerida si activo" después de `nullable`,
     * porque Laravel omite el resto de reglas cuando el valor está vacío.
     */
    private function validarAmbientes(Request $request): void
    {
        $request->validate([
            'ambientes' => 'nullable|array',
            'ambientes.*.activo' => 'nullable|boolean',
            'ambientes.*.puerto' => 'nullable|integer|min:1|max:65535',
            'ambientes.*.ip' => 'nullable|ipv4',
        ], [
            'ambientes.*.ip.ipv4' => 'La IP del ambiente no es válida.',
            'ambientes.*.puerto.integer' => 'El puerto debe ser un número entre 1 y 65535.',
            'ambientes.*.puerto.min' => 'El puerto debe ser un número entre 1 y 65535.',
            'ambientes.*.puerto.max' => 'El puerto debe ser un número entre 1 y 65535.',
        ]);

        $errores = [];
        $ipsActivas = [];

        foreach ($request->input('ambientes', []) as $id => $config) {
            $activo = filter_var($config['activo'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if (! $activo) {
                continue;
            }

            $ip = $config['ip'] ?? null;

            if (blank($ip)) {
                $errores["ambientes.{$id}.ip"] = ['La IP es obligatoria para un ambiente activo.'];

                continue;
            }

            if (isset($ipsActivas[$ip])) {
                $errores["ambientes.{$id}.ip"] = ["La IP {$ip} está repetida."];

                continue;
            }

            $ipsActivas[$ip] = $id;
        }

        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }
    }

    /**
     * Construye el array para sync() del pivot ambiente_institucion.
     * Solo incluye ambientes con checkbox activo.
     *
     * @return array<int, array{ip: mixed, puerto: mixed, activo: bool}>
     */
    private function relacionesAmbientes(Request $request): array
    {
        $relaciones = [];

        foreach ($request->input('ambientes', []) as $ambienteId => $config) {
            if (empty($config['activo'])) {
                continue;
            }

            $relaciones[(int) $ambienteId] = [
                'ip' => $config['ip'],
                'puerto' => $config['puerto'] ?: null,
                'activo' => true,
            ];
        }

        return $relaciones;
    }
}
