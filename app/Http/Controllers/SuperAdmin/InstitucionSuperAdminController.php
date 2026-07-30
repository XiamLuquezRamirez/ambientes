<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Institucion;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class InstitucionSuperAdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {

        $instituciones = Institucion::with('ambientes')->get();
        $ambientes = Ambiente::all();

        return view('superAdmin.instituciones.index', compact('instituciones', 'ambientes'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo_dane' => 'required|string|max:20',
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
        ]);

        $institucion = DB::transaction(function () use ($datos, $request) {

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
            ]);

            $passwordTemporal = Str::password(8);
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
                'correo' => $institucion['email'],
                'password' => $institucion['password'],
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
