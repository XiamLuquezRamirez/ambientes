<?php

namespace App\Http\Middleware;

use App\Services\SesionNinoService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Local: persiste ?nodo_ip= en sesión antes de resolver el ambiente del kiosco.
 */
class CapturarNodoIpPrueba
{
    public function __construct(
        private SesionNinoService $sesionNino,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->sesionNino->ipSimuladaLocal($request);

        return $next($request);
    }
}
