<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $docente = Auth::guard('docente')->user();
        if (! $docente || ! $docente->esSuperAdmin()) {
            return redirect()->route('docente.login')
                ->with('error', 'Acceso restringido a super administradores.');
        }

        return $next($request);
    }
}
