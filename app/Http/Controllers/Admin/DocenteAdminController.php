<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Docente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DocenteAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = Docente::with('ambiente');
        if ($request->filled('ambiente_id')) {
            $query->where('ambiente_id', $request->ambiente_id);
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
            'email'       => 'required|email|unique:docentes,email',
            'password'    => 'required|min:8',
            'rol'         => 'required|in:admin,docente_lider,docente_auxiliar',
            'ambiente_id' => 'nullable|exists:ambientes,id',
        ]);
        Docente::create([
            ...$data,
            'password' => Hash::make($data['password']),
            'activo'   => true,
        ]);
        return redirect()->route('admin.docentes')->with('success', 'Docente creado.');
    }

    public function edit($docente) {}
    public function update(Request $request, $docente) {}

    public function destroy($docente) {}

    public function resetPassword($docente) {}
}
