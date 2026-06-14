<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsDocente
{
    public function handle(Request $request, Closure $next)
    {
        $docente = Auth::guard('docente')->user();
        if (!$docente) {
            return redirect()->route('docente.login');
        }
        if (!$docente->esAdmin()) {
            if ($docente->ambiente_id === null || $docente->ambiente?->slug !== config('ambiente.slug')) {
                abort(403, 'No tienes acceso a este ambiente.');
            }
        }
        return $next($request);
    }
}
