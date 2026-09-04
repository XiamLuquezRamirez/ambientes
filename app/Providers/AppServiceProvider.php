<?php

namespace App\Providers;

use App\View\Composers\InfoCondicionesComposer;
use App\View\Composers\ParametrosKioscoComposer;
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
        View::composer('layouts.ambiente', ParametrosKioscoComposer::class);
    }
}
