<?php

namespace App\Providers;

use App\View\Composers\InfoCondicionesComposer;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

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

        // @assetv('assets/js/x.js') → asset('assets/js/x.js')?v=<filemtime>
        // Cache-busting uniforme: la URL cambia cuando cambia el archivo, así la
        // tablet nunca sirve una versión obsoleta tras un deploy. Si el archivo
        // no existe, cae en `time()` (nunca cachea) para no romper el render.
        Blade::directive('assetv', function ($expresion) {
            return "<?php echo App\\Support\\AssetVersion::url({$expresion}); ?>";
        });
    }
}
