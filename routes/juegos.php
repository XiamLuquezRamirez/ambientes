<?php

use App\Http\Controllers\Juegos\JuegoTtsController;
use Illuminate\Support\Facades\Route;

Route::get('/juegos/tts', [JuegoTtsController::class, 'tts'])
    ->middleware('throttle:60,1')
    ->name('juegos.tts');
