<?php

use App\Http\Controllers\Ambientes\AmbienteNinoController;
use Illuminate\Support\Facades\Route;

Route::get('/recorrido', [AmbienteNinoController::class, 'recorrido'])->name('ambiente.recorrido');
Route::get('/experiencia/{experiencia}', [AmbienteNinoController::class, 'experiencia'])->name('ambiente.experiencia');
Route::post('/experiencia/{experiencia}/bloques/{bloque}/resultado', [AmbienteNinoController::class, 'guardarResultadoBloque'])
    ->name('ambiente.experiencia.resultado');
Route::get('/tts', [AmbienteNinoController::class, 'tts'])->name('ambiente.tts');
