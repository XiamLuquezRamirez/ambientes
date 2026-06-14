<?php

use App\Http\Controllers\Ambientes\TecnologiaController;
use Illuminate\Support\Facades\Route;

Route::get('/inicio', [TecnologiaController::class, 'index'])->name('ambiente.inicio');
