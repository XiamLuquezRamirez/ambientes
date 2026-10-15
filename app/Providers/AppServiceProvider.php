<?php

namespace App\Providers;

use App\View\Composers\InfoCondicionesComposer;
use App\View\Composers\ParametrosKioscoComposer;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        View::composer(
            ['layouts.panel', 'layouts.admin', 'layouts.superAdmin'],
            InfoCondicionesComposer::class
        );
        View::composer('layouts.ambiente', ParametrosKioscoComposer::class);

        $this->validarSlugsDelNodo();
    }

    private function validarSlugsDelNodo(): void
    {
        $validos = config('ambiente.slugs', []);

        foreach (['AMBIENTE_SLUG' => 'ambiente.slug', 'SERVIDOR_AMBIENTE' => 'red.servidor_actual'] as $variable => $clave) {
            $valor = config($clave);

            if ($valor !== null && $valor !== '' && ! in_array($valor, $validos, true)) {
                throw new RuntimeException(
                    "{$variable}='{$valor}' no es un ambiente válido. Valores permitidos: ".implode(', ', $validos).'.'
                );
            }
        }
    }
}
