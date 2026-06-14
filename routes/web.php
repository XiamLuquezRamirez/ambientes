<?php

use App\Http\Controllers\Auth\SesionNinoController;
use App\Http\Controllers\Auth\AuthDocenteController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AmbienteAdminController;
use App\Http\Controllers\Admin\SyncLogController;
use App\Http\Controllers\Admin\ConflictosController;
use App\Http\Controllers\Admin\DocenteAdminController;
use App\Http\Controllers\Admin\EstudianteAdminController;
use App\Http\Controllers\Admin\CatalogoController;
use App\Http\Controllers\Admin\ReportesController;
use App\Http\Controllers\Admin\ConfiguracionAdminController;
use App\Http\Controllers\Admin\SolicitudCondicionController;
use App\Http\Controllers\Panel\EstudiantePanelController;
use App\Http\Controllers\Panel\PlaneacionController;
use App\Http\Controllers\Panel\SesionController;
use App\Http\Controllers\Panel\PortafolioController;
use App\Http\Controllers\Panel\InclusionController;
use Illuminate\Support\Facades\Route;

// Raíz → bienvenida del ambiente configurado
Route::get('/', fn () => redirect()->route('auth.bienvenida'));

// --- Autenticación del niño (rutas planas, sin slug en URL) ---
Route::get('/bienvenida',                        [SesionNinoController::class, 'bienvenida'])->name('auth.bienvenida');
Route::get('/alumnos',                           [SesionNinoController::class, 'seleccionarAlumno'])->name('auth.alumnos');
Route::get('/alumnos/{estudianteId}/pin',        [SesionNinoController::class, 'mostrarPin'])->name('auth.pin');
Route::post('/alumnos/{estudianteId}/verificar', [SesionNinoController::class, 'verificarPin'])->name('auth.verificar-pin');
Route::get('/listo',                             [SesionNinoController::class, 'bienvenidaAmbiente'])->name('auth.bienvenida-ambiente');

// ── Auth Docente ──────────────────────────────────────────────────────────
Route::get('/login',  [AuthDocenteController::class, 'showLogin'])->name('docente.login');
Route::post('/login', [AuthDocenteController::class, 'login'])->name('docente.login.post');
Route::post('/logout', [AuthDocenteController::class, 'logout'])->name('docente.logout');

// ── Panel Admin ───────────────────────────────────────────────────────────
Route::prefix('admin')->middleware(['es.admin'])->group(function () {
    Route::get('/', fn () => redirect()->route('admin.ambientes'));
    Route::get('ambientes', [AmbienteAdminController::class, 'index'])->name('admin.ambientes');
    Route::get('ambientes/{ambiente}/edit', [AmbienteAdminController::class, 'edit'])->name('admin.ambientes.edit');
    Route::put('ambientes/{ambiente}', [AmbienteAdminController::class, 'update'])->name('admin.ambientes.update');
    Route::post('ambientes/{ambiente}/ping', [AmbienteAdminController::class, 'ping'])->name('admin.ambientes.ping');
    Route::get('sync-log', [SyncLogController::class, 'index'])->name('admin.sync-log');
    Route::get('conflictos', [ConflictosController::class, 'index'])->name('admin.conflictos');
    Route::post('conflictos/{id}/resolver', [ConflictosController::class, 'resolver'])->name('admin.conflictos.resolver');
    Route::get('docentes', [DocenteAdminController::class, 'index'])->name('admin.docentes');
    Route::get('docentes/create', [DocenteAdminController::class, 'create'])->name('admin.docentes.create');
    Route::post('docentes', [DocenteAdminController::class, 'store'])->name('admin.docentes.store');
    Route::get('docentes/{docente}/edit', [DocenteAdminController::class, 'edit'])->name('admin.docentes.edit');
    Route::put('docentes/{docente}', [DocenteAdminController::class, 'update'])->name('admin.docentes.update');
    Route::delete('docentes/{docente}', [DocenteAdminController::class, 'destroy'])->name('admin.docentes.destroy');
    Route::post('docentes/{docente}/reset-password', [DocenteAdminController::class, 'resetPassword'])->name('admin.docentes.reset-password');
    Route::get('estudiantes', [EstudianteAdminController::class, 'index'])->name('admin.estudiantes');
    Route::get('estudiantes/{estudiante}/edit', [EstudianteAdminController::class, 'edit'])->name('admin.estudiantes.edit');
    Route::put('estudiantes/{estudiante}', [EstudianteAdminController::class, 'update'])->name('admin.estudiantes.update');
    Route::post('estudiantes/{estudiante}/transferir', [EstudianteAdminController::class, 'transferir'])->name('admin.estudiantes.transferir');
    Route::post('estudiantes/{estudiante}/reset-pin', [EstudianteAdminController::class, 'resetPin'])->name('admin.estudiantes.reset-pin');
    Route::get('catalogo', [CatalogoController::class, 'index'])->name('admin.catalogo');
    Route::post('catalogo/modulos', [CatalogoController::class, 'storeModulo'])->name('admin.catalogo.modulo.store');
    Route::put('catalogo/modulos/{modulo}', [CatalogoController::class, 'updateModulo'])->name('admin.catalogo.modulo.update');
    Route::delete('catalogo/modulos/{modulo}', [CatalogoController::class, 'destroyModulo'])->name('admin.catalogo.modulo.destroy');
    Route::post('catalogo/temas', [CatalogoController::class, 'storeTema'])->name('admin.catalogo.tema.store');
    Route::put('catalogo/temas/{tema}', [CatalogoController::class, 'updateTema'])->name('admin.catalogo.tema.update');
    Route::get('reportes', [ReportesController::class, 'index'])->name('admin.reportes');
    Route::get('reportes/exportar', [ReportesController::class, 'exportar'])->name('admin.reportes.exportar');
    Route::get('configuracion', [ConfiguracionAdminController::class, 'index'])->name('admin.configuracion');
    Route::post('configuracion', [ConfiguracionAdminController::class, 'update'])->name('admin.configuracion.update');
    Route::get('solicitudes', [SolicitudCondicionController::class, 'index'])->name('admin.solicitudes');
    Route::post('solicitudes/{solicitud}/resolver', [SolicitudCondicionController::class, 'resolver'])->name('admin.solicitudes.resolver');
});

// ── Panel Docente ─────────────────────────────────────────────────────────
Route::prefix('panel')->middleware(['es.docente'])->group(function () {
    Route::get('/', fn () => redirect()->route('panel.estudiantes'));
    Route::get('estudiantes', [EstudiantePanelController::class, 'index'])->name('panel.estudiantes');
    Route::get('estudiantes/create', [EstudiantePanelController::class, 'create'])->name('panel.estudiantes.create');
    Route::post('estudiantes', [EstudiantePanelController::class, 'store'])->name('panel.estudiantes.store');
    Route::get('estudiantes/{estudiante}/edit', [EstudiantePanelController::class, 'edit'])->name('panel.estudiantes.edit');
    Route::put('estudiantes/{estudiante}', [EstudiantePanelController::class, 'update'])->name('panel.estudiantes.update');
    Route::get('estudiantes/{estudiante}/pin', [EstudiantePanelController::class, 'editPin'])->name('panel.estudiantes.pin');
    Route::post('estudiantes/{estudiante}/pin', [EstudiantePanelController::class, 'updatePin'])->name('panel.estudiantes.pin.update');
    Route::get('planeacion', [PlaneacionController::class, 'index'])->name('panel.planeacion');
    Route::post('planeacion/modulos/{modulo}/toggle', [PlaneacionController::class, 'toggleVisible'])->name('panel.planeacion.toggle');
    Route::post('planeacion/temas/{tema}/nota', [PlaneacionController::class, 'guardarNota'])->name('panel.planeacion.nota');
    Route::get('sesion', [SesionController::class, 'index'])->name('panel.sesion');
    Route::post('sesion/asistencia', [SesionController::class, 'registrarAsistencia'])->name('panel.sesion.asistencia');
    Route::post('sesion/asistida/{estudiante}', [SesionController::class, 'sesionAsistida'])->name('panel.sesion.asistida');
    Route::get('sesion/activas', [SesionController::class, 'activas'])->name('panel.sesion.activas');
    Route::get('portafolio', [PortafolioController::class, 'index'])->name('panel.portafolio');
    Route::get('portafolio/{estudiante}', [PortafolioController::class, 'estudiante'])->name('panel.portafolio.estudiante');
    Route::post('portafolio/{estudiante}/observacion', [PortafolioController::class, 'guardarObservacion'])->name('panel.portafolio.observacion');
    Route::get('portafolio/{estudiante}/exportar', [PortafolioController::class, 'exportar'])->name('panel.portafolio.exportar');
    Route::get('inclusion', [InclusionController::class, 'index'])->name('panel.inclusion');
    Route::get('inclusion/{estudiante}', [InclusionController::class, 'ajustes'])->name('panel.inclusion.ajustes');
    Route::post('inclusion/{estudiante}/ajustes', [InclusionController::class, 'updateAjustes'])->name('panel.inclusion.ajustes.update');
    Route::post('inclusion/{estudiante}/solicitud', [InclusionController::class, 'crearSolicitud'])->name('panel.inclusion.solicitud');
});

// --- Contenido del ambiente configurado (protegido por sesión del niño) ---
Route::middleware('sesion.nino')->group(function () {
    require __DIR__ . '/ambientes/' . config('ambiente.slug') . '.php';
});
