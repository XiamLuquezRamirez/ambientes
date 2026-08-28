<?php

namespace Tests\Unit;

use App\Models\Eje;
use App\Models\Modulo;
use App\Services\CurriculoMediaService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CurriculoMediaServiceTest extends TestCase
{
    private CurriculoMediaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CurriculoMediaService;
    }

    public function test_detecta_youtube_y_vimeo(): void
    {
        $this->assertSame(
            CurriculoMediaService::EMBED_YOUTUBE,
            $this->service->detectarEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        );
        $this->assertSame(
            CurriculoMediaService::EMBED_VIMEO,
            $this->service->detectarEmbed('https://vimeo.com/123456789')
        );
        $this->assertSame(
            CurriculoMediaService::EMBED_DIRECTO,
            $this->service->detectarEmbed('https://cdn.example.com/video.mp4')
        );
    }

    public function test_url_embed_para_youtube(): void
    {
        $this->assertSame(
            'https://www.youtube.com/embed/dQw4w9WgXcQ',
            $this->service->urlEmbed('https://youtu.be/dQw4w9WgXcQ')
        );
    }

    public function test_serializar_para_kiosco_sin_media(): void
    {
        $modulo = new Modulo(['tipo_media' => CurriculoMediaService::TIPO_NINGUNO]);

        $this->assertSame(
            ['tipo_media' => CurriculoMediaService::TIPO_NINGUNO],
            $this->service->serializarParaKiosco($modulo)
        );
    }

    public function test_rechaza_url_youtube_para_imagen(): void
    {
        $request = Request::create('/', 'POST', [
            'tipo_media' => CurriculoMediaService::TIPO_IMAGEN,
            'media_origen' => CurriculoMediaService::ORIGEN_URL,
            'media_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        $this->expectException(ValidationException::class);
        $this->service->validarRequest($request);
    }

    public function test_acepta_video_youtube_por_url(): void
    {
        $request = Request::create('/', 'POST', [
            'tipo_media' => CurriculoMediaService::TIPO_VIDEO,
            'media_origen' => CurriculoMediaService::ORIGEN_URL,
            'media_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        $datos = $this->service->validarRequest($request);

        $this->assertSame(CurriculoMediaService::TIPO_VIDEO, $datos['tipo_media']);
        $this->assertSame(CurriculoMediaService::ORIGEN_URL, $datos['media_origen']);
    }

    public function test_resolver_url_publica_para_eje_local(): void
    {
        $eje = new Eje([
            'tipo_media' => CurriculoMediaService::TIPO_IMAGEN,
            'media_origen' => CurriculoMediaService::ORIGEN_LOCAL,
            'media_archivo' => 'foto.webp',
        ]);
        $eje->id = 5;

        $resuelto = $this->service->resolverUrlPublica($eje);

        $this->assertStringContainsString('curriculo/ejes/5/foto.webp', $resuelto['url'] ?? '');
        $this->assertNull($resuelto['embed_url']);
    }
}
