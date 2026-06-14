<?php

use App\Http\Controllers\Ambientes\LogicoController;
use Illuminate\Support\Facades\Route;

Route::get('/inicio', [LogicoController::class, 'index'])->name('ambiente.inicio');
