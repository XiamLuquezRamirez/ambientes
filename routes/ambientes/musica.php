<?php

use App\Http\Controllers\Ambientes\MusicaController;
use Illuminate\Support\Facades\Route;

Route::get('/inicio', [MusicaController::class, 'index'])->name('ambiente.inicio');
