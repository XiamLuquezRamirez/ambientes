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
use App\Http\Controllers\Panel\EstudiantePanelController;
use App\Http\Controllers\Panel\PlaneacionController;
use App\Http\Controllers\Panel\SesionController;
use App\Http\Controllers\Panel\PortafolioController;
use App\Http\Controllers\Panel\InclusionController;
use Illuminate\Support\Facades\Route;

// Raiz → bienvenida del ambiente configurado
Route::get('/', fn () => redirect()->route('auth.bienvenida'));

// ── Autenticacion del nino ────────────────────────────────────────────────
Route::get('/bienvenida',                        [SesionNinoController::class, 'mostrarBienvenida'])->name('auth.bienvenida');
Route::get('/alumnos',                           [SesionNinoController::class, 'mostrarSeleccionAlumno'])->name('auth.alumnos');
Route::get('/alumnos/{estudianteId}/pin',        [SesionNinoController::class, 'mostrarPin'])->name('auth.pin');
Route::post('/alumnos/{estudianteId}/verificar', [SesionNinoController::class, 'verificarPin'])->name('auth.verificar-pin');
Route::get('/listo',                             [SesionNinoController::class, 'mostrarBienvenidaAmbiente'])->name('auth.bienvenida-ambiente');

// ── Auth Docente ──────────────────────────────────────────────────────────
Route::get('/login',   [AuthDocenteController::class, 'mostrarLogin'])->name('docente.login');
Route::post('/login',  [AuthDocenteController::class, 'iniciarSesion'])->name('docente.login.post');
Route::post('/logout', [AuthDocenteController::class, 'cerrarSesion'])->name('docente.logout');

// ── Panel Admin ───────────────────────────────────────────────────────────
Route::prefix('admin')->middleware(['es.admin'])->group(function () {
    Route::get('/', fn () => redirect()->route('admin.ambientes'));

    // Ambientes
    Route::get('ambientes',                    [AmbienteAdminController::class, 'listar'])->name('admin.ambientes');
    Route::get('ambientes/{ambiente}/edit',    [AmbienteAdminController::class, 'formularioEditar'])->name('admin.ambientes.edit');
    Route::put('ambientes/{ambiente}',         [AmbienteAdminController::class, 'actualizar'])->name('admin.ambientes.update');
    Route::post('ambientes/{ambiente}/ping',   [AmbienteAdminController::class, 'verificarConexion'])->name('admin.ambientes.ping');

    // Sincronizacion y conflictos
    Route::get('sync-log',                     [SyncLogController::class, 'listar'])->name('admin.sync-log');
    Route::get('conflictos',                   [ConflictosController::class, 'listar'])->name('admin.conflictos');
    Route::post('conflictos/{id}/resolver',    [ConflictosController::class, 'resolver'])->name('admin.conflictos.resolver');

    // Docentes
    Route::get('docentes',                           [DocenteAdminController::class, 'listar'])->name('admin.docentes');
    Route::get('docentes/create',                    [DocenteAdminController::class, 'formularioCrear'])->name('admin.docentes.create');
    Route::post('docentes',                          [DocenteAdminController::class, 'guardar'])->name('admin.docentes.store');
    Route::get('docentes/{docente}/edit',            [DocenteAdminController::class, 'formularioEditar'])->name('admin.docentes.edit');
    Route::put('docentes/{docente}',                 [DocenteAdminController::class, 'actualizar'])->name('admin.docentes.update');
    Route::delete('docentes/{docente}',              [DocenteAdminController::class, 'eliminar'])->name('admin.docentes.destroy');
    Route::post('docentes/{docente}/reset-password', [DocenteAdminController::class, 'restablecerContrasena'])->name('admin.docentes.reset-password');

    // Estudiantes (admin)
    Route::get('estudiantes',                        [EstudianteAdminController::class, 'listar'])->name('admin.estudiantes');
    Route::get('estudiantes/{estudiante}/edit',      [EstudianteAdminController::class, 'formularioEditar'])->name('admin.estudiantes.edit');
    Route::put('estudiantes/{estudiante}',           [EstudianteAdminController::class, 'actualizar'])->name('admin.estudiantes.update');
    Route::post('estudiantes/{estudiante}/transferir',[EstudianteAdminController::class, 'transferir'])->name('admin.estudiantes.transferir');
    Route::post('estudiantes/{estudiante}/reset-pin',[EstudianteAdminController::class, 'restablecerPin'])->name('admin.estudiantes.reset-pin');

    // Catalogo
    Route::get('catalogo',                     [CatalogoController::class, 'listar'])->name('admin.catalogo');
    Route::post('catalogo/modulos',            [CatalogoController::class, 'guardarModulo'])->name('admin.catalogo.modulo.store');
    Route::put('catalogo/modulos/{modulo}',    [CatalogoController::class, 'actualizarModulo'])->name('admin.catalogo.modulo.update');
    Route::delete('catalogo/modulos/{modulo}', [CatalogoController::class, 'eliminarModulo'])->name('admin.catalogo.modulo.destroy');
    Route::post('catalogo/temas',              [CatalogoController::class, 'guardarTema'])->name('admin.catalogo.tema.store');
    Route::put('catalogo/temas/{tema}',        [CatalogoController::class, 'actualizarTema'])->name('admin.catalogo.tema.update');

    // Reportes
    Route::get('reportes',          [ReportesController::class, 'listar'])->name('admin.reportes');
    Route::get('reportes/exportar', [ReportesController::class, 'exportar'])->name('admin.reportes.exportar');

    // Configuracion
    Route::get('configuracion',  [ConfiguracionAdminController::class, 'listar'])->name('admin.configuracion');
    Route::post('configuracion', [ConfiguracionAdminController::class, 'actualizar'])->name('admin.configuracion.update');
});

// ── Panel Docente ─────────────────────────────────────────────────────────
Route::prefix('panel')->middleware(['es.docente'])->group(function () {
    Route::get('/', fn () => redirect()->route('panel.estudiantes'));

    // Estudiantes
    Route::get('estudiantes',                        [EstudiantePanelController::class, 'listar'])->name('panel.estudiantes');
    Route::get('estudiantes/create',                 [EstudiantePanelController::class, 'formularioCrear'])->name('panel.estudiantes.create');
    Route::post('estudiantes',                       [EstudiantePanelController::class, 'guardar'])->name('panel.estudiantes.store');
    Route::get('estudiantes/{estudiante}/edit',      [EstudiantePanelController::class, 'formularioEditar'])->name('panel.estudiantes.edit');
    Route::put('estudiantes/{estudiante}',           [EstudiantePanelController::class, 'actualizar'])->name('panel.estudiantes.update');
    Route::get('estudiantes/{estudiante}/pin',       [EstudiantePanelController::class, 'formularioPin'])->name('panel.estudiantes.pin');
    Route::post('estudiantes/{estudiante}/pin',      [EstudiantePanelController::class, 'actualizarPin'])->name('panel.estudiantes.pin.update');

    // Planeacion
    Route::get('planeacion',                              [PlaneacionController::class, 'listar'])->name('panel.planeacion');
    Route::post('planeacion/modulos/{modulo}/toggle',     [PlaneacionController::class, 'alternarVisibilidad'])->name('panel.planeacion.toggle');
    Route::post('planeacion/temas/{tema}/nota',           [PlaneacionController::class, 'guardarNota'])->name('panel.planeacion.nota');

    // Sesion
    Route::get('sesion',                               [SesionController::class, 'listar'])->name('panel.sesion');
    Route::post('sesion/asistencia',                   [SesionController::class, 'registrarAsistencia'])->name('panel.sesion.asistencia');
    Route::post('sesion/asistida/{estudiante}',        [SesionController::class, 'registrarSesionAsistida'])->name('panel.sesion.asistida');
    Route::get('sesion/activas',                       [SesionController::class, 'sesionesActivas'])->name('panel.sesion.activas');

    // Portafolio
    Route::get('portafolio',                           [PortafolioController::class, 'listar'])->name('panel.portafolio');
    Route::get('portafolio/{estudiante}',              [PortafolioController::class, 'verEstudiante'])->name('panel.portafolio.estudiante');
    Route::post('portafolio/{estudiante}/observacion', [PortafolioController::class, 'guardarObservacion'])->name('panel.portafolio.observacion');
    Route::get('portafolio/{estudiante}/exportar',     [PortafolioController::class, 'exportar'])->name('panel.portafolio.exportar');

    // Inclusion
    Route::get('inclusion',                            [InclusionController::class, 'listar'])->name('panel.inclusion');
    Route::get('inclusion/{estudiante}',               [InclusionController::class, 'verAjustes'])->name('panel.inclusion.ajustes');
    Route::post('inclusion/{estudiante}/ajustes',      [InclusionController::class, 'actualizarAjustes'])->name('panel.inclusion.ajustes.update');
});

// ── Contenido del ambiente (protegido por sesion del nino) ────────────────
Route::middleware('sesion.nino')->group(function () {
    require __DIR__ . '/ambientes/' . config('ambiente.slug') . '.php';
});
