<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_raiz_redirige_al_inicio_del_kiosco_conservando_query(): void
    {
        $this->get('/')->assertRedirect(route('ambiente.inicio'));

        $this->get('/?ip=192.168.1.21')->assertRedirect(route('ambiente.inicio', ['ip' => '192.168.1.21']));
    }
}
