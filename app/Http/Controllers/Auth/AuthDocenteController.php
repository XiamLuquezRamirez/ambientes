<?php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthDocenteController extends Controller
{
    public function showLogin()
    {
        return view('auth.login-docente');
    }

    public function login(Request $request)
    {
        $creds = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::guard('docente')->attempt($creds, $request->boolean('recordar'))) {
            return back()->withErrors(['email' => 'Credenciales incorrectas.'])->withInput();
        }

        $docente = Auth::guard('docente')->user();

        LoginLog::create([
            'docente_id' => $docente->id,
            'ip'         => $request->ip(),
            'ambiente'   => config('ambiente.slug'),
        ]);

        $request->session()->regenerate();

        return $docente->esAdmin()
            ? redirect()->route('admin.ambientes')
            : redirect()->route('panel.estudiantes');
    }

    public function logout(Request $request)
    {
        Auth::guard('docente')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('docente.login');
    }
}
