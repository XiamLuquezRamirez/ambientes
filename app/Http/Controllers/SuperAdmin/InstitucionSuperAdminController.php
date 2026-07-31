<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\CondicionInclusion;
use App\Models\CondicionTransitoria;
use App\Models\Institucion;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InstitucionSuperAdminController extends Controller
{
    public function __construct(
        private readonly CondicionOrdenController $condicionOrdenController,
        private readonly CondicionTransitoriaOrdenController $condicionTransitoriaOrdenController,
    ) {}

    public function index()
    {
        $instituciones = Institucion::with('ambientes')->get();
        $ambientes = Ambiente::all();
        $condiciones = CondicionInclusion::query()->ordenadas()->get();

        // solo las del sistemas y adicionales creadas por el super admin
        $condicionesTransitorias = CondicionTransitoria::query()
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

    public function ver($id)
    {
        $institucion = Institucion::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $institucion,
            'condiciones_orden' => $this->condicionOrdenController->listarPorInstitucion((int) $id),
            'condiciones_transitorias_orden' => $this->condicionTransitoriaOrdenController->listarPorInstitucion((int) $id),
        ]);
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20|unique:instituciones,codigo_dane',
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'correo_contacto' => 'required|email',

            'ambientes.*.ip' => [
                function ($attribute, $value, $fail) use ($request) {
                    preg_match('/ambientes\.(\d+)\./', $attribute, $match);
                    $ambienteId = $match[1] ?? null;

                    if (
                        isset($request->ambientes[$ambienteId]['activo']) &&
                        empty($value)
                    ) {
                        $fail('La IP es obligatoria para un ambiente activo.');
                    }
                },
            ],

            'ambientes.*.puerto' => 'nullable|integer|min:1|max:65535',
            'condiciones_orden' => 'nullable|array',
            'condiciones_transitorias_orden' => 'nullable|array',
        ]);

        $resultado = DB::transaction(function () use ($datos, $request) {
            $logo = null;

            if ($request->hasFile('logo_url')) {
                $logo = $request->file('logo_url')->store('instituciones', 'public');
            }

            $institucion = Institucion::create([
                'nombre' => $datos['nombre'],
                'codigo_dane' => $datos['codigo_dane'],
                'municipio' => $datos['municipio'],
                'departamento' => $datos['departamento'],
                'correo_contacto' => $datos['correo_contacto'],
                'logo' => $logo,
                'activo' => true,
            ]);

            $passwordTemporal = Str::password(8);
            session([
                'password_temporal' => $passwordTemporal,
            ]);
            $identificacion = Str::random(10);
            $nombre = 'Admin '.$institucion->nombre;
            $email = 'admin@'.Str::slug($institucion->nombre).'.local';

            $usuario = User::create([
                'institucion_id' => $institucion->id,
                'identificacion' => $identificacion,
                'nombre' => $nombre,
                'email' => $email,
                'password' => Hash::make($passwordTemporal),
                'rol' => 'admin',
                'estado' => 'activo',
                'creado_por' => auth()->id(),
            ]);

            $relaciones = [];

            foreach ($request->input('ambientes', []) as $ambienteId => $config) {
                if (! isset($config['activo'])) {
                    continue;
                }

                $relaciones[$ambienteId] = [
                    'ip' => $config['ip'],
                    'puerto' => $config['puerto'] ?: null,
                    'activo' => true,
                ];
            }

            $institucion->ambientes()->sync($relaciones);

            $this->condicionOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_orden', [])
            );

            $this->condicionTransitoriaOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_transitorias_orden', [])
            );

            return [
                'institucion' => $institucion,
                'usuario' => $usuario,
                'password' => $passwordTemporal,
                'email' => $email,
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

    public function actualizar(Request $request, $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20|unique:instituciones,codigo_dane,'.$id,
            'municipio' => 'required|string|max:100',
            'departamento' => 'required|string|max:100',
            'correo_contacto' => 'required|email',
            'condiciones_orden' => 'nullable|array',
            'condiciones_transitorias_orden' => 'nullable|array',
        ]);

        $institucion = Institucion::findOrFail($id);

        DB::transaction(function () use ($institucion, $datos, $request) {
            $institucion->update([
                'nombre' => $datos['nombre'],
                'codigo_dane' => $datos['codigo_dane'],
                'municipio' => $datos['municipio'],
                'departamento' => $datos['departamento'],
                'correo_contacto' => $datos['correo_contacto'],
            ]);

            $this->condicionOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_orden', [])
            );

            $this->condicionTransitoriaOrdenController->sincronizarParaInstitucion(
                (int) $institucion->id,
                $request->input('condiciones_transitorias_orden', [])
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Institución actualizada correctamente.',
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
        $nombreArchivo = 'Admin_'.
        Str::slug(
            $usuario->nombre,
            ' '
        ).
        '.pdf';

        return $pdf->download($nombreArchivo);
    }

    public function store(Request $request)
    {
        //
    }

    public function show(string $id)
    {
        //
    }

    public function edit(string $id)
    {
        //
    }

    public function update(Request $request, string $id)
    {
        //
    }

    public function destroy(string $id)
    {
        //
    }
}
