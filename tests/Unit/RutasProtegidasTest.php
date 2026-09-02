<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Verifica que las rutas sensibles estén registradas con el middleware de rol
 * correcto. Es una prueba de "contrato de rutas": si alguien mueve una ruta
 * PIAR fuera del grupo es.admin, o expone la preview en producción, este test
 * falla. No toca la base de datos.
 */
class RutasProtegidasTest extends TestCase
{
    /** Devuelve el middleware asignado a una ruta por su nombre. */
    private function middlewareDeRuta(string $nombre): array
    {
        $ruta = Route::getRoutes()->getByName($nombre);
        $this->assertNotNull($ruta, "La ruta '{$nombre}' no está registrada.");

        return $ruta->gatherMiddleware();
    }

    /** @dataProvider rutasPiar */
    public function test_rutas_piar_exigen_es_admin(string $nombreRuta): void
    {
        $middleware = $this->middlewareDeRuta($nombreRuta);

        $this->assertContains(
            'es.admin',
            $middleware,
            "La ruta '{$nombreRuta}' (datos de menores) debe estar protegida por es.admin."
        );
    }

    public static function rutasPiar(): array
    {
        return [
            'listado'         => ['admin.piar'],
            'ver'             => ['admin.piar.ver'],
            'guardar'         => ['admin.piar.guardar-piar'],
            'buscar-docente'  => ['admin.piar.buscar-docente'],
            'verificar'       => ['admin.piar.verificar-si-comenzo'],
            'exportar'        => ['admin.piar.exportar'],
            'diligenciar'     => ['admin.estudiantes.diligenciar-piar'],
        ];
    }

    public function test_preview_camino_esta_gobernada_por_app_debug(): void
    {
        // La ruta /__preview-camino está envuelta en `if (config('app.debug'))`.
        // Su existencia DEBE coincidir con el flag: presente solo en desarrollo,
        // ausente en producción (APP_DEBUG=false). No asumimos el entorno; solo
        // exigimos que la ruta y el flag estén sincronizados.
        $existe = collect(Route::getRoutes())->contains(
            fn ($r) => $r->uri() === '__preview-camino'
        );

        $this->assertSame(
            (bool) config('app.debug'),
            $existe,
            'La ruta /__preview-camino debe existir solo cuando APP_DEBUG=true; '
            .'en producción (APP_DEBUG=false) no debe estar registrada.'
        );
    }
}
