<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $docente = Auth::guard('docente')->user();
        if (!$docente || !$docente->esAdmin()) {
            return redirect()->route('docente.login')
                ->with('error', 'Acceso restringido a administradores.');
        }
        return $next($request);
    }
}
