<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Eje;
use App\Models\Modulo;
use App\Services\CurriculoMediaService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait ManejaMediaCurriculo
{
    protected function servicioMediaCurriculo(): CurriculoMediaService
    {
        return app(CurriculoMediaService::class);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validarMediaCurriculo(Request $request, ?Model $existente = null, bool $permiteMedia = true): array
    {
        if (! $permiteMedia) {
            return [
                'tipo_media' => CurriculoMediaService::TIPO_NINGUNO,
                'quitar_media' => false,
            ];
        }

        return $this->servicioMediaCurriculo()->validarRequest($request, $existente);
    }

    /**
     * @param  array<string, mixed>  $mediaDatos
     */
    protected function aplicarMediaModulo(Modulo $modulo, array $mediaDatos, Request $request, bool $permiteMedia = true): void
    {
        if (! $permiteMedia) {
            return;
        }

        $this->servicioMediaCurriculo()->aplicar(
            $modulo,
            'modulos',
            $mediaDatos,
            $request->file('archivo')
        );
    }

    /**
     * @param  array<string, mixed>  $mediaDatos
     */
    protected function aplicarMediaEje(Eje $eje, array $mediaDatos, Request $request, bool $permiteMedia = true): void
    {
        if (! $permiteMedia) {
            return;
        }

        $this->servicioMediaCurriculo()->aplicar(
            $eje,
            'ejes',
            $mediaDatos,
            $request->file('archivo')
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializarMediaModulo(Modulo $modulo): array
    {
        return $this->servicioMediaCurriculo()->serializarParaForm($modulo);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serializarMediaEje(Eje $eje): array
    {
        return $this->servicioMediaCurriculo()->serializarParaForm($eje);
    }
}
