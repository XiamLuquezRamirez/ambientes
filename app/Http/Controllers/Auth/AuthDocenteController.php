<?php

namespace App\Http\Controllers\Auth;

use App\Enums\SeguridadAccion;
use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use App\Services\SeguridadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthDocenteController extends Controller
{
    public function mostrarLogin()
    {
        return view('auth.login-docente');
    }

    public function iniciarSesion(Request $request)
    {
        $credenciales = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (! Auth::guard('docente')->attempt($credenciales, $request->boolean('recordar'))) {
            return back()->withErrors(['email' => 'Credenciales incorrectas.'])->withInput();
        }

        $usuario = Auth::guard('docente')->user();
        if (! $usuario->activo) {
            Auth::guard('docente')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('docente.login')->with('error', 'La cuenta se encuentra inactiva.');
        }
        if ($usuario->docente && in_array($usuario->docente->estado, ['inactivo', 'eliminado'], true)) {
            Auth::guard('docente')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('docente.login')->with('error', 'La cuenta se encuentra inactiva.');
        }
        LoginLog::create([
            'user_id' => $usuario->id,
            'ip' => $request->ip(),
            'fecha' => now(),
            'ambiente' => config('ambiente.slug'),
        ]);

        SeguridadService::registrar(
            $usuario->id,
            Auth::guard('docente')->id(),
            SeguridadAccion::LOGIN,
            'Inicio de sesión exitoso.',
            $request
        );

        $request->session()->regenerate();

        return $usuario->esAdmin()
            ? redirect()->route('admin.ambientes')
            : redirect()->route('panel.principal');
    }

    public function cerrarSesion(Request $request)
    {
        Auth::guard('docente')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('docente.login');
    }
}
