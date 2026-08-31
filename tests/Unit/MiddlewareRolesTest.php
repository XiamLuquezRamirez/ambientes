<?php

namespace Tests\Unit;

use App\Http\Middleware\EsAdmin;
use App\Http\Middleware\EsDocente;
use App\Http\Middleware\EsSuperAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

/**
 * Verifica que los middleware de rol (la principal línea de defensa de la
 * plataforma) autoricen y rechacen correctamente, sin depender de la base de
 * datos: se construye un User en memoria y se inyecta en el guard 'docente'.
 *
 * `esAdmin/esDocente/esSuperAdmin` solo leen `$this->rol`, e
 * `institucionSuspendida()` devuelve false cuando no hay `institucion_id`,
 * así que un modelo no persistido es suficiente para ejercitar la lógica.
 */
class MiddlewareRolesTest extends TestCase
{
    /** Crea un User en memoria (no persistido) con rol y estado dados. */
    private function usuario(string $rol, string $estado = 'activo'): User
    {
        $u = new User;
        $u->rol = $rol;
        $u->estado = $estado;
        $u->institucion_id = null; // evita tocar la relación institución

        return $u;
    }

    /** Autentica (o limpia) el guard 'docente' con el usuario dado. */
    private function autenticar(?User $user): void
    {
        if ($user) {
            Auth::guard('docente')->setUser($user);
        } else {
            Auth::guard('docente')->forgetUser();
        }
    }

    private function siguiente(): \Closure
    {
        return fn () => response('OK', 200);
    }

    // ───────────────────────── EsAdmin ─────────────────────────

    public function test_admin_middleware_deja_pasar_a_admin_activo(): void
    {
        $this->autenticar($this->usuario('admin'));
        $res = (new EsAdmin)->handle(Request::create('/piar'), $this->siguiente());

        $this->assertSame(200, $res->getStatusCode());
        $this->assertSame('OK', $res->getContent());
    }

    public function test_admin_middleware_rechaza_a_anonimo(): void
    {
        $this->autenticar(null);
        $res = (new EsAdmin)->handle(Request::create('/piar'), $this->siguiente());

        // redirect()->route('docente.login') → 302
        $this->assertSame(302, $res->getStatusCode());
    }

    public function test_admin_middleware_rechaza_a_docente(): void
    {
        $this->autenticar($this->usuario('docente'));
        $res = (new EsAdmin)->handle(Request::create('/piar'), $this->siguiente());

        $this->assertSame(302, $res->getStatusCode());
    }

    public function test_admin_middleware_rechaza_a_superadmin(): void
    {
        // esAdmin() es estricto: superAdmin NO es admin.
        $this->autenticar($this->usuario('superAdmin'));
        $res = (new EsAdmin)->handle(Request::create('/piar'), $this->siguiente());

        $this->assertSame(302, $res->getStatusCode());
    }

    // ───────────────────────── EsSuperAdmin ─────────────────────────

    public function test_superadmin_middleware_deja_pasar_a_superadmin(): void
    {
        $this->autenticar($this->usuario('superAdmin'));
        $res = (new EsSuperAdmin)->handle(Request::create('/superadmin'), $this->siguiente());

        $this->assertSame(200, $res->getStatusCode());
    }

    public function test_superadmin_middleware_rechaza_a_admin(): void
    {
        $this->autenticar($this->usuario('admin'));
        $res = (new EsSuperAdmin)->handle(Request::create('/superadmin'), $this->siguiente());

        $this->assertSame(302, $res->getStatusCode());
    }

    public function test_superadmin_middleware_rechaza_a_anonimo(): void
    {
        $this->autenticar(null);
        $res = (new EsSuperAdmin)->handle(Request::create('/superadmin'), $this->siguiente());

        $this->assertSame(302, $res->getStatusCode());
    }

    // ───────────────────────── EsDocente ─────────────────────────

    public function test_docente_middleware_rechaza_a_anonimo(): void
    {
        $this->autenticar(null);
        $res = (new EsDocente)->handle(Request::create('/panel'), $this->siguiente());

        $this->assertSame(302, $res->getStatusCode());
    }

    public function test_docente_middleware_aborta_403_para_no_docente(): void
    {
        // Un admin autenticado pero con rol != docente → abort(403).
        $this->autenticar($this->usuario('admin'));

        try {
            (new EsDocente)->handle(Request::create('/panel'), $this->siguiente());
            $this->fail('Se esperaba un HttpException 403 y no se lanzó.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            // abort(403) usa el status HTTP, no el "code" de la excepción.
            $this->assertSame(403, $e->getStatusCode());
        }
    }
}
