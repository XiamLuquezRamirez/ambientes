<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsDocente
{
    public function handle(Request $request, Closure $next)
    {
        $user = Auth::guard('docente')->user();
        if (!$user) {
            return redirect()->route('docente.login');
        }
        if (!$user->esAdmin()) {
            $ambienteSlug = $user->docente?->ambiente?->slug;
            if (!$ambienteSlug || $ambienteSlug !== config('ambiente.slug')) {
                abort(403, 'No tienes acceso a este ambiente.');
            }
        }
        return $next($request);
    }
}
