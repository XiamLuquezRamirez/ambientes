<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsDocente
{
    public function handle(Request $request, Closure $next)
    {
        $usuario = Auth::guard('docente')->user();

        if (!$usuario) {
            return redirect()->route('docente.login');
        }

        if ($usuario->rol !== 'docente') {
            abort(403, 'Acceso denegado');
        }

        $cargasActivas = $usuario->docente
            ->cargasActivas()
            ->with(['ambiente', 'grado', 'grupo'])
            ->get();

        view()->share('cargasActivas', $cargasActivas);

        return $next($request);
    }
}
