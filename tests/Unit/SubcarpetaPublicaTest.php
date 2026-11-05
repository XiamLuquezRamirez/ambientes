<?php

namespace Tests\Unit;

use App\Support\SubcarpetaPublica;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class SubcarpetaPublicaTest extends TestCase
{
    private function servidor(string $scriptName, string $uri): array
    {
        return [
            'SCRIPT_NAME' => $scriptName,
            'PHP_SELF' => $scriptName,
            'SCRIPT_FILENAME' => '/var/www/vhosts/ingeer.co/httpdocs/ambientes/public/index.php',
            'REQUEST_URI' => $uri,
            'HTTP_HOST' => 'ingeer.co',
            'HTTPS' => 'on',
            'SERVER_PORT' => 443,
        ];
    }

    private function request(array $server): Request
    {
        return new Request([], [], [], [], [], $server);
    }

    public function test_sin_ajuste_symfony_no_detecta_la_subcarpeta(): void
    {
        $req = $this->request($this->servidor('/ambientes/public/index.php', '/ambientes/login'));

        $this->assertSame('', $req->getBaseUrl());
        $this->assertSame('/ambientes/login', $req->getPathInfo());
    }

    public function test_reescritura_desde_subcarpeta_detecta_base_y_ruta(): void
    {
        $server = $this->servidor('/ambientes/public/index.php', '/ambientes/panel/principal?x=1');
        SubcarpetaPublica::ajustar($server);
        $req = $this->request($server);

        $this->assertSame('/ambientes', $req->getBaseUrl());
        $this->assertSame('/panel/principal', $req->getPathInfo());
        $this->assertSame('https://ingeer.co/ambientes', $req->root());
    }

    public function test_raiz_de_la_subcarpeta(): void
    {
        $server = $this->servidor('/ambientes/public/index.php', '/ambientes/');
        SubcarpetaPublica::ajustar($server);
        $req = $this->request($server);

        $this->assertSame('/ambientes', $req->getBaseUrl());
        $this->assertSame('/', $req->getPathInfo());
    }

    public function test_docroot_en_public_no_cambia_nada(): void
    {
        $server = $this->servidor('/index.php', '/panel/principal');
        $original = $server;
        SubcarpetaPublica::ajustar($server);

        $this->assertSame($original, $server);
        $req = $this->request($server);
        $this->assertSame('', $req->getBaseUrl());
        $this->assertSame('/panel/principal', $req->getPathInfo());
    }

    public function test_url_sin_peticion_queda_en_la_raiz(): void
    {
        \Illuminate\Container\Container::setInstance(new \Illuminate\Container\Container);

        $this->assertSame('/storage/tts/a.mp3', SubcarpetaPublica::url('storage/tts/a.mp3'));
    }

    public function test_url_con_peticion_en_subcarpeta_lleva_la_base(): void
    {
        $server = $this->servidor('/ambientes/public/index.php', '/ambientes/juegos');
        SubcarpetaPublica::ajustar($server);
        $contenedor = new \Illuminate\Container\Container;
        $contenedor->instance('request', $this->request($server));
        \Illuminate\Container\Container::setInstance($contenedor);

        try {
            $this->assertSame('/ambientes/storage/tts/a.mp3', SubcarpetaPublica::url('/storage/tts/a.mp3'));
        } finally {
            \Illuminate\Container\Container::setInstance(new \Illuminate\Container\Container);
        }
    }

    public function test_acceso_directo_a_public_no_se_toca(): void
    {
        $server = $this->servidor('/ambientes/public/index.php', '/ambientes/public/index.php/login');
        $original = $server;
        SubcarpetaPublica::ajustar($server);

        $this->assertSame($original, $server);
    }
}
