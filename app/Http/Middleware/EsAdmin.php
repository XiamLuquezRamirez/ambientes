<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $usuario = Auth::guard('docente')->user();
        if (! $usuario || ! $usuario->esAdmin()) {
            return redirect()->route('docente.login')
                ->with('error', 'Acceso restringido a administradores.');
        }

        if ($usuario->institucionSuspendida()) {
            Auth::guard('docente')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('docente.login')->with(
                'error',
                'La institución se encuentra suspendida. No es posible iniciar sesión.'
            );
        }

        return $next($request);
    }
}
