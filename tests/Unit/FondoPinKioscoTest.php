<?php

namespace Tests\Unit;

use App\Models\Ambiente;
use App\Services\AccesoAmbienteService;
use App\Services\SesionNinoService;
use Tests\TestCase;

class FondoPinKioscoTest extends TestCase
{
    public function test_el_pin_usa_fondo_juegos_del_ambiente(): void
    {
        $ambiente = new Ambiente(['slug' => 'multisensorial', 'nombre' => 'Multisensorial']);
        $url = $this->servicio()->urlFondoPin($ambiente);

        $this->assertNotNull($url);
        $this->assertStringContainsString('catalogo_juegos/Multisensorial/img/fondo_juegos.png', $url);
    }

    public function test_expresion_artistica_usa_su_carpeta(): void
    {
        $ambiente = new Ambiente(['slug' => 'expresion-artistica', 'nombre' => 'Expresión Artística']);
        $url = $this->servicio()->urlFondoPin($ambiente);

        $this->assertNotNull($url);
        $this->assertStringContainsString('catalogo_juegos/ExpresionArtistica/img/fondo_juegos.png', $url);
    }

    public function test_sin_archivo_propio_usa_polimotor(): void
    {
        $ambiente = new Ambiente(['slug' => 'tecnologia', 'nombre' => 'Tecnología']);
        $url = $this->servicio()->urlFondoPin($ambiente);

        $this->assertNotNull($url);
        $this->assertStringContainsString('catalogo_juegos/Polimotor/img/fondo_juegos.png', $url);
    }

    public function test_la_bienvenida_sigue_usando_su_imagen(): void
    {
        $ambiente = new Ambiente(['slug' => 'polimotor', 'nombre' => 'Polimotor']);
        $url = $this->servicio()->urlFondoBienvenida($ambiente);

        $this->assertNotNull($url);
        $this->assertStringContainsString('catalogo_juegos/Polimotor/img/bienvenida_nino.png', $url);
    }

    private function servicio(): SesionNinoService
    {
        return new SesionNinoService($this->createMock(AccesoAmbienteService::class));
    }
}
