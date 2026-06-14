<?php

use App\Http\Controllers\Ambientes\PolimotorController;
use Illuminate\Support\Facades\Route;

Route::get('/inicio', [PolimotorController::class, 'index'])->name('ambiente.inicio');
