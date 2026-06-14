<?php

use App\Http\Controllers\Ambientes\MultisensorialController;
use Illuminate\Support\Facades\Route;

Route::get('/inicio', [MultisensorialController::class, 'index'])->name('ambiente.inicio');
