<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Docente;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DocenteAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('docente.ambiente');
        if ($request->filled('ambiente_id')) {
            $query->whereHas('docente', fn($q) => $q->where('ambiente_id', $request->ambiente_id));
        }
        if ($request->filled('rol')) {
            $query->where('rol', $request->rol);
        }
        $docentes  = $query->paginate(20)->withQueryString();
        $ambientes = Ambiente::orderBy('nombre')->get();
        return view('admin.docentes.index', compact('docentes', 'ambientes'));
    }

    public function create()
    {
        $ambientes = Ambiente::orderBy('nombre')->get();
        return view('admin.docentes.create', compact('ambientes'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre'      => 'required|string|max:100',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|min:8',
            'rol'         => 'required|in:admin,docente_lider,docente_auxiliar',
            'ambiente_id' => 'nullable|exists:ambientes,id',
        ]);

        $user = User::create([
            'nombre'   => $data['nombre'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'rol'      => $data['rol'],
            'activo'   => true,
        ]);

        if (!empty($data['ambiente_id'])) {
            Docente::create([
                'user_id'     => $user->id,
                'ambiente_id' => $data['ambiente_id'],
            ]);
        }

        return redirect()->route('admin.docentes')->with('success', 'Docente creado.');
    }

    public function edit($docente) {}
    public function update(Request $request, $docente) {}
    public function destroy($docente) {}
    public function resetPassword($docente) {}
}
