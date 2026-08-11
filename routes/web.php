<?php

use App\Http\Controllers\Admin\AmbienteAdminController;
use App\Http\Controllers\Admin\AsignacionAmbienteController;
use App\Http\Controllers\Admin\CatalogoController;
use App\Http\Controllers\Admin\CatalogoDBAAdminController;
use App\Http\Controllers\Admin\CierreAnioController;
use App\Http\Controllers\Admin\ConfiguracionAdminController;
use App\Http\Controllers\Admin\ConflictosController;
use App\Http\Controllers\Admin\DocenteAdminController;
use App\Http\Controllers\Admin\EjesConfiguracionAdminController;
use App\Http\Controllers\Admin\EstudianteAdminController;
use App\Http\Controllers\Admin\GradoGrupoController;
use App\Http\Controllers\Admin\GruposController;
use App\Http\Controllers\Admin\MatriculaAdminController;
use App\Http\Controllers\Admin\ModulosConfiguracionAdminController;
use App\Http\Controllers\Admin\PerfilAprendizajeConfiguracionController;
use App\Http\Controllers\Admin\PerfilAprendizajePersonalizadoConfiguracionController;
use App\Http\Controllers\Admin\PiarController;
use App\Http\Controllers\Admin\ReportesController;
use App\Http\Controllers\Admin\SyncLogController;
use App\Http\Controllers\Admin\UsuarioAdminController;
use App\Http\Controllers\Auth\AuthDocenteController;
use App\Http\Controllers\Auth\SesionNinoController;
use App\Http\Controllers\Docente\DocenteDashboardController;
use App\Http\Controllers\Panel\AsistenciaController;
use App\Http\Controllers\Panel\EjesConfiguracionPanelController;
use App\Http\Controllers\Panel\EstudiantePanelController;
use App\Http\Controllers\Panel\InclusionController;
use App\Http\Controllers\Panel\PerfilAprendizajePanelController;
use App\Http\Controllers\Panel\PerfilAprendizajePersonalizadoPanelController;
use App\Http\Controllers\Panel\PlaneacionController;
use App\Http\Controllers\Panel\PortafolioController;
use App\Http\Controllers\Panel\SesionController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\SuperAdmin\AdminsSuperAdminController;
use App\Http\Controllers\SuperAdmin\CatalogoDBASuperAdminController;
use App\Http\Controllers\SuperAdmin\EjesConfiguracionSuperAdminController;
use App\Http\Controllers\SuperAdmin\InstitucionSuperAdminController;
use App\Http\Controllers\SuperAdmin\ModulosConfiguracionSuperAdminController;
use App\Http\Controllers\SuperAdmin\PerfilAprendizajeInclusionController;
use App\Http\Controllers\SuperAdmin\PerfilAprendizajePersonalizadoController;
use App\Http\Controllers\SuperAdmin\SuperAdminController;
use Illuminate\Support\Facades\Route;

// Raiz → bienvenida del ambiente configurado
Route::get('/', fn () => redirect()->route('auth.bienvenida'));

// ── Autenticacion del nino ────────────────────────────────────────────────
Route::get('/bienvenida', [SesionNinoController::class, 'mostrarBienvenida'])->name('auth.bienvenida');
Route::get('/alumnos', [SesionNinoController::class, 'mostrarSeleccionAlumno'])->name('auth.alumnos');
Route::get('/alumnos/{estudianteId}/pin', [SesionNinoController::class, 'mostrarPin'])->name('auth.pin');
Route::post('/alumnos/{estudianteId}/verificar', [SesionNinoController::class, 'verificarPin'])->name('auth.verificar-pin');
Route::get('/listo', [SesionNinoController::class, 'mostrarBienvenidaAmbiente'])->name('auth.bienvenida-ambiente');

// ── Auth Docente ──────────────────────────────────────────────────────────
Route::get('/login', [AuthDocenteController::class, 'mostrarLogin'])->name('docente.login');
Route::post('/login', [AuthDocenteController::class, 'iniciarSesion'])->name('docente.login.post');
Route::post('/logout', [AuthDocenteController::class, 'cerrarSesion'])->name('docente.logout');

// Endpoint para guardar los datos generales del Piar
// Piar
Route::get('estudiantes/diligenciar-piar/{idEstudiante}/{tipo}', [PiarController::class, 'diligenciarPiar'])->name('admin.estudiantes.diligenciar-piar');
Route::get('piar', [PiarController::class, 'listado'])->name('admin.piar');
Route::get('piar/{idEstudiante}', [PiarController::class, 'verPiar'])->name('admin.piar.ver');
Route::post('piar/guardar-paso/{paso}', [PiarController::class, 'guardarPiar'])->name('admin.piar.guardar-piar');
Route::get('piar/buscar-docente/{texto}', [PiarController::class, 'buscarDocente'])->name('admin.piar.buscar-docente');
Route::get('piar/verificar-si-comenzo/{idEstudiante}', [PiarController::class, 'verificarSiComenzo'])->name('admin.piar.verificar-si-comenzo');
Route::get('piar/exportar/{idEstudiante}', [PiarController::class, 'exportar'])->name('admin.piar.exportar');

// ── Panel Admin ───────────────────────────────────────────────────────────
Route::prefix('admin')->middleware(['es.admin'])->group(function () {
    Route::get('/', fn () => redirect()->route('admin.ambientes'));

    // Ambientes (los 5 ambientes son fijos — solo configuración)
    Route::get('ambientes', [AmbienteAdminController::class, 'listar'])->name('admin.ambientes');
    Route::patch('ambientes/{ambiente}/ip', [AmbienteAdminController::class, 'actualizarIp'])->name('admin.ambientes.ip');
    Route::patch('ambientes/{ambiente}/cupo', [AmbienteAdminController::class, 'actualizarCupo'])->name('admin.ambientes.cupo');
    Route::post('ambientes/{ambiente}/ping', [AmbienteAdminController::class, 'verificarConexion'])->name('admin.ambientes.ping');
    Route::get('ambientes/{ambiente}/docentes', [AmbienteAdminController::class, 'docentesDelPeriodo'])->name('admin.ambientes.docentes');
    Route::get('ambientes/{ambiente}/modulos', [AmbienteAdminController::class, 'modulos'])->name('admin.ambientes.modulos');
    Route::patch('ambientes/{ambiente}/modulos/{modulo}/toggle', [AmbienteAdminController::class, 'activarModulo'])->name('admin.ambientes.modulos.toggle');
    Route::get('ambientes/listado', [AmbienteAdminController::class, 'listado'])->name('admin.ambientes.listado');
    Route::get('ambientes/{ambiente}/gradoslistado', [AmbienteAdminController::class, 'gradoslistado'])->name('admin.ambientes.gradoslistado');

    // Grados habilitados por ambiente (solo toggles)
    Route::get('ambientes/{ambiente}/grados', [GradoGrupoController::class, 'gestionar'])->name('admin.ambientes.grados');
    Route::patch('ambientes/{ambiente}/grados/{grado}/activar', [GradoGrupoController::class, 'activarGrado'])->name('admin.ambientes.grados.activar');
    Route::get('grados/{grado}/grupos', [GradoGrupoController::class, 'grupos'])->name('admin.grados.grupos');
    Route::get('grados/{grado}/anios', [GradoGrupoController::class, 'aniosLectivos'])->name('admin.grados.anios');

    // Asignaciones de estudiantes a un ambiente
    Route::get('ambientes/{ambiente}/asignaciones', [AsignacionAmbienteController::class, 'index'])->name('admin.ambientes.asignaciones');
    Route::get('ambientes/{ambiente}/asignaciones/tabla', [AsignacionAmbienteController::class, 'tabla'])->name('admin.ambientes.asignaciones.tabla');
    Route::get('ambientes/{ambiente}/asignaciones/buscar', [AsignacionAmbienteController::class, 'buscar'])->name('admin.ambientes.asignaciones.buscar');
    Route::post('ambientes/{ambiente}/asignaciones', [AsignacionAmbienteController::class, 'asignar'])->name('admin.ambientes.asignaciones.asignar');
    Route::patch('ambientes/{ambiente}/asignaciones/{ea}', [AsignacionAmbienteController::class, 'actualizar'])->name('admin.ambientes.asignaciones.actualizar');
    Route::delete('ambientes/{ambiente}/asignaciones/{ea}', [AsignacionAmbienteController::class, 'quitar'])->name('admin.ambientes.asignaciones.quitar');

    // Grupos institucionales
    Route::get('grupos', [GruposController::class, 'index'])->name('admin.grupos');
    Route::post('grupos', [GruposController::class, 'guardar'])->name('admin.grupos.guardar');
    Route::post('grupos/{grupo}/asignar-docente', [GruposController::class, 'asignarDocente'])->name('admin.grupos.asignar-docente');
    Route::put('grupos/{grupo}', [GruposController::class, 'actualizar'])->name('admin.grupos.actualizar');
    Route::delete('grupos/{grupo}', [GruposController::class, 'eliminar'])->name('admin.grupos.eliminar');

    // Cierre de año lectivo
    Route::prefix('cierre')->name('admin.cierre.')->group(function () {
        Route::get('/', [CierreAnioController::class, 'index'])->name('index');
        Route::get('/grupos', [CierreAnioController::class, 'grupos'])->name('grupos');
        Route::get('/estudiantes', [CierreAnioController::class, 'estudiantes'])->name('estudiantes');
        Route::post('/aplicar', [CierreAnioController::class, 'aplicar'])->name('aplicar');
    });

    // Matrículas
    Route::prefix('matriculas')->name('admin.matriculas.')->group(function () {
        Route::get('/', [MatriculaAdminController::class, 'index'])->name('index');
        Route::get('/tabla', [MatriculaAdminController::class, 'tabla'])->name('tabla');
        Route::get('/buscar-estudiante', [MatriculaAdminController::class, 'buscarEstudiante'])->name('buscar');
        Route::get('/grupos-disponibles', [MatriculaAdminController::class, 'gruposDisponibles'])->name('grupos');
        Route::get('/grupos-estado', [MatriculaAdminController::class, 'gruposEstado'])->name('grupos-estado');
        Route::patch('/estado-grupo', [MatriculaAdminController::class, 'cambiarEstadoPorGrupo'])->name('estado-grupo');
        Route::post('/', [MatriculaAdminController::class, 'matricular'])->name('store');
        Route::get('/{matricula}/datos', [MatriculaAdminController::class, 'datosEditar'])->name('datos');
        Route::put('/{matricula}', [MatriculaAdminController::class, 'actualizar'])->name('update');
        Route::patch('/{matricula}/estado', [MatriculaAdminController::class, 'cambiarEstado'])->name('estado');
        Route::delete('/{matricula}', [MatriculaAdminController::class, 'eliminar'])->name('destroy');
    });

    // Sincronizacion y conflictos
    Route::get('sync-log', [SyncLogController::class, 'listar'])->name('admin.sync-log');
    Route::get('conflictos', [ConflictosController::class, 'listar'])->name('admin.conflictos');
    Route::post('conflictos/{id}/resolver', [ConflictosController::class, 'resolver'])->name('admin.conflictos.resolver');

    // Docentes
    Route::get('docentes', [DocenteAdminController::class, 'listar'])->name('admin.docentes');
    Route::get('docentes/validar-datos', [DocenteAdminController::class, 'validarDatos'])->name('admin.docentes.validarDatos');
    Route::get('docentes/grupos-asignados', [DocenteAdminController::class, 'listarGruposAsignados'])->name('admin.docentes.grupos-asignados');
    // Debe declararse antes de docentes/{docente}; si no, Laravel interpreta "accesos" como parte del detalle genérico.
    Route::get('docentes/{docente}/accesos', [DocenteAdminController::class, 'verAccesos'])->name('admin.docentes.accesos');
    Route::get('docentes/{docente}/asignaciones', [DocenteAdminController::class, 'asignacionesActuales'])->name('admin.docentes.asignaciones');
    Route::post('docentes/{docente}/asignar-grupo', [DocenteAdminController::class, 'asignarGrupo'])->name('admin.docentes.asignar-grupo');
    Route::delete('docentes/{docente}/asignaciones/{carga}', [DocenteAdminController::class, 'quitarAsignacion'])->name('admin.docentes.quitar-asignacion');
    Route::post('docentes', [DocenteAdminController::class, 'guardar'])->name('admin.docentes.store');
    Route::get('docentes/{docente}', [DocenteAdminController::class, 'ver'])->name('admin.docentes.show');
    Route::get('docentes/datos/{docente_id}', [DocenteAdminController::class, 'verDatosDocente'])->name('admin.docentes.datos');
    Route::patch('docentes/{docente}/toggle-activo', [DocenteAdminController::class, 'toggleActivo'])->name('admin.docentes.toggleActivo');
    Route::put('docentes/{docente}', [DocenteAdminController::class, 'actualizar'])->name('admin.docentes.update');
    Route::put('docentes/{docente}/asignar-info', [DocenteAdminController::class, 'asignarInfo'])->name('admin.docentes.asignar-info');
    Route::delete('docentes/{docente}', [DocenteAdminController::class, 'eliminar'])->name('admin.docentes.destroy');
    Route::post('docentes/{docente}/reset-password', [DocenteAdminController::class, 'restablecerContrasena'])->name('admin.docentes.reset-password');
    Route::get('docentes/{docente}/generar-pdf', [DocenteAdminController::class, 'generarPdf'])->name('admin.docentes.generar-pdf');
    Route::get('docentes/panel', [DocenteAdminController::class, 'panel'])->name('admin.docentes.panel');

    // Estudiantes (admin)
    Route::get('estudiantes', [EstudianteAdminController::class, 'listar'])->name('admin.estudiantes');
    Route::get('estudiantes/{estudiante}', [EstudianteAdminController::class, 'ver'])->name('admin.estudiantes.show');
    Route::post('estudiantes', [EstudianteAdminController::class, 'guardar'])->name('admin.estudiantes.store');
    Route::post('estudiantes/editar/{idEstudiante}', [EstudianteAdminController::class, 'actualizar'])->name('admin.estudiantes.update');
    Route::post('estudiantes/{estudiante}/transferir', [EstudianteAdminController::class, 'transferir'])->name('admin.estudiantes.transferir');
    Route::post('estudiantes/{estudiante}/reset-pin', [EstudianteAdminController::class, 'restablecerPin'])->name('admin.estudiantes.reset-pin');
    Route::get('estudiantes/grupos', [EstudianteAdminController::class, 'listarGrupos'])->name('admin.estudiantes.grupos');
    Route::get('estudiantes/eliminar/{estudiante}', [EstudianteAdminController::class, 'eliminar'])->name('admin.estudiantes.eliminar');
    Route::get('estudiantes/cambiar-estado/{idEstudiante}/{estado}', [EstudianteAdminController::class, 'cambiarEstado'])->name('admin.estudiantes.cambiar-estado');
    Route::get('estudiantes/cargar-municipios/{departamento}', [EstudianteAdminController::class, 'cargarMunicipios'])->name('admin.estudiantes.cargar-municipios');
    Route::get('estudiantes/restablecer-pin/{idEstudiante}', [EstudianteAdminController::class, 'restablecerPin'])->name('admin.estudiantes.restablecer-pin');

    // Catalogo (vista unificada DBA MEN + colegio)
    Route::get('catalogo', [CatalogoDBAAdminController::class, 'listarUnificado'])->name('admin.catalogo');
    Route::post('catalogo/modulos', [CatalogoController::class, 'guardarModulo'])->name('admin.catalogo.modulo.store');
    Route::put('catalogo/modulos/{modulo}', [CatalogoController::class, 'actualizarModulo'])->name('admin.catalogo.modulo.update');
    Route::delete('catalogo/modulos/{modulo}', [CatalogoController::class, 'eliminarModulo'])->name('admin.catalogo.modulo.destroy');
    Route::post('catalogo/temas', [CatalogoController::class, 'guardarTema'])->name('admin.catalogo.tema.store');
    Route::put('catalogo/temas/{tema}', [CatalogoController::class, 'actualizarTema'])->name('admin.catalogo.tema.update');

    // Reportes
    Route::get('reportes', [ReportesController::class, 'listar'])->name('admin.reportes');
    Route::get('reportes/exportar', [ReportesController::class, 'exportar'])->name('admin.reportes.exportar');

    // Configuracion
    Route::get('configuracion', [ConfiguracionAdminController::class, 'listar'])->name('admin.configuracion');
    Route::post('configuracion', [ConfiguracionAdminController::class, 'actualizar'])->name('admin.configuracion.update');
    Route::post('configuracion/logo', [ConfiguracionAdminController::class, 'subirLogo'])->name('admin.configuracion.logo');
    Route::get('configuracion/datos/{id}', [ConfiguracionAdminController::class, 'verDatosInstitucion'])->name('admin.configuracion.datos');
    Route::get('configuracion/cargar-municipios/{departamento}', [ConfiguracionAdminController::class, 'cargarMunicipios'])->name('admin.configuracion.cargar-municipios');

    // Módulos / ejes del colegio (adicionales + ejes propios)
    Route::post('configuracion/ambientes/{ambiente}/modulos', [ModulosConfiguracionAdminController::class, 'guardar'])->name('admin.modulos.guardar');
    Route::get('configuracion/modulos/{modulo}', [ModulosConfiguracionAdminController::class, 'mostrar'])->name('admin.modulos.mostrar');
    Route::put('configuracion/modulos/{modulo}', [ModulosConfiguracionAdminController::class, 'actualizar'])->name('admin.modulos.actualizar');
    Route::patch('configuracion/modulos/{modulo}/estado', [ModulosConfiguracionAdminController::class, 'actualizarEstado'])->name('admin.modulos.estado');
    Route::patch('configuracion/modulos/{modulo}/mover', [ModulosConfiguracionAdminController::class, 'mover'])->name('admin.modulos.mover');
    Route::delete('configuracion/modulos/{modulo}', [ModulosConfiguracionAdminController::class, 'eliminar'])->name('admin.modulos.eliminar');
    Route::get('configuracion/modulos/{modulo}/ejes', [EjesConfiguracionAdminController::class, 'listarPorModulo'])->name('admin.modulos.ejes');
    Route::post('configuracion/modulos/{modulo}/ejes', [EjesConfiguracionAdminController::class, 'guardar'])->name('admin.ejes.guardar');
    Route::get('configuracion/ejes/{eje}', [EjesConfiguracionAdminController::class, 'mostrar'])->name('admin.ejes.mostrar');
    Route::put('configuracion/ejes/{eje}', [EjesConfiguracionAdminController::class, 'actualizar'])->name('admin.ejes.actualizar');
    Route::patch('configuracion/ejes/{eje}/estado', [EjesConfiguracionAdminController::class, 'actualizarEstado'])->name('admin.ejes.estado');
    Route::patch('configuracion/ejes/{eje}/mover', [EjesConfiguracionAdminController::class, 'mover'])->name('admin.ejes.mover');
    Route::delete('configuracion/ejes/{eje}', [EjesConfiguracionAdminController::class, 'eliminar'])->name('admin.ejes.eliminar');

    Route::get('configuracion/perfil-aprendizaje', [PerfilAprendizajeConfiguracionController::class, 'index'])->name('admin.configuracion.perfil-aprendizaje.index');
    Route::patch('configuracion/perfil-aprendizaje/orden', [PerfilAprendizajeConfiguracionController::class, 'actualizarOrden'])->name('admin.configuracion.perfil-aprendizaje.orden');
    Route::patch('configuracion/perfil-aprendizaje/{perfilAprendizajeOrden}/estado', [PerfilAprendizajeConfiguracionController::class, 'actualizarEstado'])->name('admin.configuracion.perfil-aprendizaje.estado');
    Route::get('configuracion/perfil-aprendizaje/{perfilAprendizajeInclusion}/estudiantes', [PerfilAprendizajeConfiguracionController::class, 'estudiantesAsociados'])->name('admin.configuracion.perfil-aprendizaje.estudiantes');

    Route::get('configuracion/perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'index'])->name('admin.configuracion.perfil-aprendizaje-personalizado.index');
    Route::post('configuracion/perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'guardar'])->name('admin.configuracion.perfil-aprendizaje-personalizado.guardar');
    Route::patch('configuracion/perfil-aprendizaje-personalizado/orden', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'actualizarOrden'])->name('admin.configuracion.perfil-aprendizaje-personalizado.orden');
    Route::get('configuracion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'mostrar'])->name('admin.configuracion.perfil-aprendizaje-personalizado.mostrar');
    Route::put('configuracion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'actualizar'])->name('admin.configuracion.perfil-aprendizaje-personalizado.actualizar');
    Route::delete('configuracion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'eliminar'])->name('admin.configuracion.perfil-aprendizaje-personalizado.eliminar');
    Route::patch('configuracion/perfil-aprendizaje-personalizado/{personalizadoOrden}/estado', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'actualizarEstado'])->name('admin.configuracion.perfil-aprendizaje-personalizado.estado');
    Route::get('configuracion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}/estudiantes', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'estudiantesAsociados'])->name('admin.configuracion.perfil-aprendizaje-personalizado.estudiantes');
    Route::post('configuracion/perfil-aprendizaje-personalizado/asignaciones/{asignacion}/desasociar', [PerfilAprendizajePersonalizadoConfiguracionController::class, 'desasociarEstudiante'])->name('admin.configuracion.perfil-aprendizaje-personalizado.desasociar');

    // Catalogo DBA
    Route::get('configuracion/catalogo-dba', [CatalogoDBAAdminController::class, 'listar'])->name('admin.configuracion.catalogo-dba.listar');
    Route::post('configuracion/catalogo-dba', [CatalogoDBAAdminController::class, 'guardar'])->name('admin.configuracion.catalogo-dba.guardar');
    Route::get('configuracion/catalogo-dba/datos/{id}', [CatalogoDBAAdminController::class, 'ver'])->name('admin.configuracion.catalogo-dba.ver');
    Route::get('configuracion/catalogo-dba/detalle/{id}', [CatalogoDBAAdminController::class, 'detalle'])->name('admin.configuracion.catalogo-dba.detalle');
    Route::put('configuracion/catalogo-dba/{id}', [CatalogoDBAAdminController::class, 'actualizar'])->name('admin.configuracion.catalogo-dba.actualizar');
    Route::patch('configuracion/catalogo-dba/{id}/toggle-activo', [CatalogoDBAAdminController::class, 'toggleActivo'])->name('admin.configuracion.catalogo-dba.toggleActivo');

    // Usuario
    Route::get('perfil', [PerfilController::class, 'mostrar'])->name('admin.perfil');
    Route::get('perfil/accesos', [PerfilController::class, 'historialAccesos'])->name('admin.perfil.accesos');
    Route::get('perfil/validar-datos', [PerfilController::class, 'validarDatos'])->name('admin.perfil.validarDatos');
    Route::put('perfil/contrasena', [PerfilController::class, 'cambiarContrasena'])->name('admin.perfil.contrasena');
    Route::get('usuarios', [UsuarioAdminController::class, 'listar'])->name('admin.usuarios');
    Route::get('usuarios/validar-datos', [UsuarioAdminController::class, 'validarDatos'])->name('admin.usuarios.validarDatos');
    Route::post('usuarios', [UsuarioAdminController::class, 'guardar'])->name('admin.usuarios.store');
    Route::get('usuarios/{usuario}/generar-pdf', [UsuarioAdminController::class, 'generarPdf'])->name('admin.usuarios.generar-pdf');
    Route::get('usuarios/{usuario}/resumen', [UsuarioAdminController::class, 'resumenActividad'])->name('admin.usuarios.resumen');
    Route::get('usuarios/{usuario}', [UsuarioAdminController::class, 'ver'])->name('admin.usuarios.show');
    Route::get('usuarios/datos/{usuario_id}', [UsuarioAdminController::class, 'verDatosUsuario'])->name('admin.usuarios.datos');
    Route::put('usuarios/{usuario}/perfil', [PerfilController::class, 'actualizar'])->name('admin.usuarios.perfil.update');
    Route::put('usuarios/{usuario}', [UsuarioAdminController::class, 'actualizar'])->name('admin.usuarios.update');
    Route::patch('usuarios/{usuario}/toggle-activo', [UsuarioAdminController::class, 'toggleActivo'])->name('admin.usuarios.toggleActivo');
    Route::delete('usuarios/{usuario}', [UsuarioAdminController::class, 'eliminar'])->name('admin.usuarios.destroy');
});

// ── Panel Docente ─────────────────────────────────────────────────────────
Route::prefix('panel')->middleware(['es.docente'])->group(function () {
    Route::get('principal', [DocenteDashboardController::class, 'listar'])->name('panel.principal');
    Route::get('principal/{ambiente}/grados', [DocenteDashboardController::class, 'obtenerGradosYGrupos'])->name('panel.principal.grados');
    Route::get('principal/{carga}/estadisticas', [DocenteDashboardController::class, 'obtenerEstadisticasGrupo'])->name('panel.principal.estadisticas');
    Route::get('principal/{carga}/estudiantes', [DocenteDashboardController::class, 'obtenerEstudiantesGrupo'])->name('panel.principal.estudiantes');

    // Perfil docente
    Route::get('perfil', [PerfilController::class, 'mostrar'])->name('panel.perfil');
    Route::get('perfil/accesos', [PerfilController::class, 'historialAccesos'])->name('panel.perfil.accesos');
    Route::get('perfil/validar-datos', [PerfilController::class, 'validarDatos'])->name('panel.perfil.validarDatos');
    Route::put('perfil/contrasena', [PerfilController::class, 'cambiarContrasena'])->name('panel.perfil.contrasena');
    Route::put('perfil', [PerfilController::class, 'actualizar'])->name('panel.perfil.update');
    Route::put('perfil/informacion-personal', [PerfilController::class, 'actualizarInformacionPersonal'])->name('panel.perfil.informacion-personal');
    Route::post('perfil/foto', [PerfilController::class, 'subirFoto'])->name('panel.perfil.foto');
    Route::delete('perfil/foto', [PerfilController::class, 'eliminarFoto'])->name('panel.perfil.foto.eliminar');

    // Estudiantes (panel docente)
    // Listado → card → ficha: panel.estudiantes → _card (ojo) → panel.estudiantes.show (verFicha)

    Route::get('estudiantes/lista', [EstudiantePanelController::class, 'listar'])->name('panel.estudiantes');
    Route::post('estudiantes', [EstudianteAdminController::class, 'guardar'])->name('panel.estudiantes.guardar');
    Route::get('/panel/ambientes/{ambiente}/estudiantes/{grado}/{grupo}', [EstudiantePanelController::class, 'obtenerEstudiantes'])->name('panel.estudiantes.obtenerEstudiantes');
    Route::post('estudiantes/agregar/{ambiente}', [EstudiantePanelController::class, 'agregarEstudiantes'])->name('panel.estudiantes.agregar');

    // Rutas estáticas antes de {estudiante}
    Route::get('estudiantes/create', [EstudiantePanelController::class, 'formularioCrear'])->name('panel.estudiantes.create');
    Route::get('estudiantes/buscar', [EstudiantePanelController::class, 'buscarEstudiantes'])->name('panel.estudiantes.buscar');

    // Ficha completa HU seguimiento: verFicha → show.blade.php
    Route::get('estudiantes/cargar-municipios/{departamento}', [EstudianteAdminController::class, 'cargarMunicipios'])->name('panel.estudiantes.cargar-municipios');
    Route::post('estudiantes/editar/{idEstudiante}', [EstudianteAdminController::class, 'actualizar'])->name('panel.estudiantes.editar');
    Route::get('estudiantes/filtrar', [EstudiantePanelController::class, 'filtrar'])->name('panel.estudiantes.filtrar');

    // Ficha completa: verFicha → show.blade.php
    Route::get('estudiantes/ficha/{estudiante}', [EstudiantePanelController::class, 'verFicha'])->name('panel.estudiantes.show');
    Route::get('estudiantes/ficha/{estudiante}/perfiles-aprendizaje/fragmentos', [EstudiantePanelController::class, 'fragmentosPerfilesAprendizaje'])->name('panel.estudiantes.perfiles-aprendizaje.fragmentos');
    Route::get('estudiantes/ficha/{estudiante}/perfil-aprendizaje-personalizado/fragmentos', [EstudiantePanelController::class, 'fragmentosPerfilAprendizajePersonalizado'])->name('panel.estudiantes.perfil-aprendizaje-personalizado.fragmentos');

    // Datos JSON para modal de edición (compartido con index.js)
    Route::get('estudiantes/{estudiante}', [EstudianteAdminController::class, 'ver'])->name('panel.estudiantes.datos');
    Route::post('estudiantes/{estudiante}/asistencia-puntual', [EstudiantePanelController::class, 'registrarAsistenciaPuntual'])->name('panel.estudiantes.asistencia');
    Route::get('estudiantes/{estudiante}/piar', [EstudiantePanelController::class, 'verPiar'])->name('panel.estudiantes.piar');
    Route::get('estudiantes/{estudiante}/edit', [EstudiantePanelController::class, 'formularioEditar'])->name('panel.estudiantes.edit');
    Route::put('estudiantes/{estudiante}', [EstudiantePanelController::class, 'actualizar'])->name('panel.estudiantes.update');
    Route::get('estudiantes/{estudiante}/pin', [EstudiantePanelController::class, 'formularioPin'])->name('panel.estudiantes.pin');
    Route::post('estudiantes/{estudiante}/pin', [EstudiantePanelController::class, 'actualizarPin'])->name('panel.estudiantes.pin.update');
    Route::post('estudiantes/configurar-pin', [EstudiantePanelController::class, 'configurarPin'])->name('panel.estudiantes.configurar-pin');
    Route::post('estudiantes/cambiar-estado-ambiente-estudiante', [EstudiantePanelController::class, 'cambiarEstadoAmbienteEstudiante'])->name('panel.estudiantes.cambiar-estado-ambiente-estudiante');
    // Planeacion
    Route::get('planeacion', [PlaneacionController::class, 'listar'])->name('panel.planeacion');
    Route::post('planeacion/modulos/{modulo}/toggle', [PlaneacionController::class, 'alternarVisibilidad'])->name('panel.planeacion.toggle');
    Route::post('planeacion/temas/{tema}/nota', [PlaneacionController::class, 'guardarNota'])->name('panel.planeacion.nota');

    // Sesion
    Route::get('sesion', [SesionController::class, 'listar'])->name('panel.sesion');
    Route::get('sesion/estudiantes', [SesionController::class, 'estudiantes'])->name('panel.sesion.estudiantes');
    Route::post('sesion/seleccionar-grado-grupo', [SesionController::class, 'obtenerGradoGrupoSeleccionado'])->name('panel.sesion.seleccionar-grado-grupo');
    // Portafolio (gestión de ejes en ambientes asignados)
    Route::get('portafolio', [PortafolioController::class, 'listar'])->name('panel.portafolio');
    Route::get('portafolio/modulos/{modulo}/ejes', [EjesConfiguracionPanelController::class, 'listarPorModulo'])->name('panel.modulos.ejes');
    Route::post('portafolio/modulos/{modulo}/ejes', [EjesConfiguracionPanelController::class, 'guardar'])->name('panel.ejes.guardar');
    Route::get('portafolio/ejes/{eje}', [EjesConfiguracionPanelController::class, 'mostrar'])->name('panel.ejes.mostrar');
    Route::put('portafolio/ejes/{eje}', [EjesConfiguracionPanelController::class, 'actualizar'])->name('panel.ejes.actualizar');
    Route::patch('portafolio/ejes/{eje}/estado', [EjesConfiguracionPanelController::class, 'actualizarEstado'])->name('panel.ejes.estado');
    Route::patch('portafolio/ejes/{eje}/mover', [EjesConfiguracionPanelController::class, 'mover'])->name('panel.ejes.mover');
    Route::delete('portafolio/ejes/{eje}', [EjesConfiguracionPanelController::class, 'eliminar'])->name('panel.ejes.eliminar');
    Route::get('portafolio/{estudiante}', [PortafolioController::class, 'verEstudiante'])->name('panel.portafolio.estudiante');
    Route::post('portafolio/{estudiante}/observacion', [PortafolioController::class, 'guardarObservacion'])->name('panel.portafolio.observacion');
    Route::get('portafolio/{estudiante}/exportar', [PortafolioController::class, 'exportar'])->name('panel.portafolio.exportar');

    // Inclusion
    Route::get('inclusion', [InclusionController::class, 'listar'])->name('panel.inclusion');
    Route::get('inclusion/perfil-aprendizaje', [PerfilAprendizajePanelController::class, 'index'])->name('panel.inclusion.perfil-aprendizaje');
    Route::get('inclusion/perfil-aprendizaje/{perfilAprendizajeInclusion}/estudiantes', [PerfilAprendizajePanelController::class, 'estudiantesAsociados'])->name('panel.inclusion.perfil-aprendizaje.estudiantes');
    Route::post('inclusion/perfil-aprendizaje/estudiantes/{estudiante}/asignar', [PerfilAprendizajePanelController::class, 'asignarEstudiante'])->name('panel.inclusion.perfil-aprendizaje.asignar-estudiante');
    Route::post('inclusion/perfil-aprendizaje/estudiantes/{estudiante}/desactivar', [PerfilAprendizajePanelController::class, 'desactivarEstudiante'])->name('panel.inclusion.perfil-aprendizaje.desactivar-estudiante');
    Route::get('inclusion/perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoPanelController::class, 'index'])->name('panel.inclusion.perfil-aprendizaje-personalizado');
    Route::post('inclusion/perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoPanelController::class, 'guardar'])->name('panel.inclusion.perfil-aprendizaje-personalizado.guardar');
    Route::get('inclusion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoPanelController::class, 'mostrar'])->name('panel.inclusion.perfil-aprendizaje-personalizado.mostrar');
    Route::put('inclusion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoPanelController::class, 'actualizar'])->name('panel.inclusion.perfil-aprendizaje-personalizado.actualizar');
    Route::delete('inclusion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoPanelController::class, 'eliminar'])->name('panel.inclusion.perfil-aprendizaje-personalizado.eliminar');
    Route::patch('inclusion/perfil-aprendizaje-personalizado/{personalizadoOrden}/estado', [PerfilAprendizajePersonalizadoPanelController::class, 'actualizarEstado'])->name('panel.inclusion.perfil-aprendizaje-personalizado.estado');
    Route::get('inclusion/perfil-aprendizaje-personalizado/opcion/{perfilAprendizajePersonalizado}/estudiantes', [PerfilAprendizajePersonalizadoPanelController::class, 'estudiantesAsociados'])->name('panel.inclusion.perfil-aprendizaje-personalizado.estudiantes');
    Route::post('inclusion/perfil-aprendizaje-personalizado/estudiantes/{estudiante}/asignar', [PerfilAprendizajePersonalizadoPanelController::class, 'asignarEstudiante'])->name('panel.inclusion.perfil-aprendizaje-personalizado.asignar-estudiante');
    Route::post('inclusion/perfil-aprendizaje-personalizado/asignaciones/{asignacion}/desactivar', [PerfilAprendizajePersonalizadoPanelController::class, 'desactivarEstudiante'])->name('panel.inclusion.perfil-aprendizaje-personalizado.desactivar-estudiante');
    Route::get('inclusion/{estudiante}', [InclusionController::class, 'verAjustes'])->name('panel.inclusion.ajustes');
    Route::post('inclusion/{estudiante}/ajustes', [InclusionController::class, 'actualizarAjustes'])->name('panel.inclusion.ajustes.update');

    // Asistencia
    Route::get('asistencia', [AsistenciaController::class, 'listar'])->name('panel.asistencia');
    Route::post('asistencia/registrar-asistencia', [AsistenciaController::class, 'registrarAsistencia'])->name('panel.asistencia.registrar-asistencia');
    Route::get('asistencia/reporte/{carga}', [AsistenciaController::class, 'reporteAsistencia'])->name('panel.asistencia.reporte');
    Route::get('asistencia/reporte/{carga}/pdf', [AsistenciaController::class, 'exportarPdf'])->name('panel.asistencia.pdf');

    // Grados por ambiente
    Route::get('grupos/grados/docente/{idGrado}', [EstudiantePanelController::class, 'obtenerGruposPorGrado'])->name('panel.grupos.grados.docente');
    Route::get('grupos/ambientes-disponibles/{grado}/{grupo}', [EstudiantePanelController::class, 'obtenerAmbientesDisponibles'])->name('panel.estudiantes.ambientes-disponibles');

    // Ambientes
    // guardar el ambiente seleccionado en la sesion
    Route::post('ambientes/seleccionar', [SesionController::class, 'seleccionarAmbiente'])->name('panel.ambientes.seleccionar');
    Route::get('ambientes/eliminar', [SesionController::class, 'eliminarAmbienteSeleccionado'])->name('panel.ambientes.eliminar');
    Route::get('ambientes/obtener', [SesionController::class, 'obtenerAmbienteSeleccionado'])->name('panel.ambientes.obtener');

});

// ── Super Admin ─────────────────────────────────────────────────────────
Route::prefix('superadmin')->middleware(['es.superAdmin'])->group(function () {
    Route::get('principal', [SuperAdminController::class, 'index'])->name('superadmin.principal');

    // Instituciones
    Route::get('instituciones', [InstitucionSuperAdminController::class, 'index'])->name('superadmin.instituciones.index');
    Route::get('instituciones/cargar-municipios/{departamento}', [InstitucionSuperAdminController::class, 'cargarMunicipios'])->name('superadmin.instituciones.cargar-municipios');
    Route::get('instituciones/datos/{id}', [InstitucionSuperAdminController::class, 'ver'])->name('superadmin.instituciones.ver');
    Route::post('instituciones', [InstitucionSuperAdminController::class, 'guardar'])->name('superadmin.instituciones.guardar');
    Route::put('instituciones/{id}', [InstitucionSuperAdminController::class, 'actualizar'])->name('superadmin.instituciones.actualizar');
    Route::patch('instituciones/{id}/toggle-activo', [InstitucionSuperAdminController::class, 'toggleActivo'])->name('superadmin.instituciones.toggleActivo');
    Route::post('instituciones/{id}/logo', [InstitucionSuperAdminController::class, 'subirLogo'])->name('superadmin.instituciones.logo');
    Route::delete('instituciones/{id}/logo', [InstitucionSuperAdminController::class, 'eliminarLogo'])->name('superadmin.instituciones.logo.eliminar');
    Route::get('instituciones/{usuario_id}/generar-pdf', [InstitucionSuperAdminController::class, 'generarPdf'])->name('superadmin.instituciones.generar-pdf');

    // Administradores
    Route::get('administradores', [AdminsSuperAdminController::class, 'listar'])->name('superadmin.administradores.listar');
    Route::post('administradores', [AdminsSuperAdminController::class, 'guardar'])->name('superadmin.administradores.guardar');
    Route::get('administradores/datos/{id}', [AdminsSuperAdminController::class, 'ver'])->name('superadmin.administradores.ver');
    Route::put('administradores/{id}', [AdminsSuperAdminController::class, 'actualizar'])->name('superadmin.administradores.actualizar');
    Route::get('administradores/{id}/generar-pdf', [AdminsSuperAdminController::class, 'generarPdf'])->name('superadmin.administradores.generar-pdf');
    Route::patch('administradores/{id}/toggle-activo', [AdminsSuperAdminController::class, 'toggleActivo'])->name('superadmin.administradores.toggleActivo');
    Route::get('administradores/{id}/accesos', [AdminsSuperAdminController::class, 'verAccesos'])->name('superadmin.administradores.accesos');
    Route::delete('administradores/{id}', [AdminsSuperAdminController::class, 'eliminar'])->name('superadmin.administradores.eliminar');

    // Perfiles de Aprendizaje
    Route::get('perfil-aprendizaje', [PerfilAprendizajeInclusionController::class, 'index'])->name('superadmin.perfil-aprendizaje.index');
    Route::post('perfil-aprendizaje', [PerfilAprendizajeInclusionController::class, 'guardar'])->name('superadmin.perfil-aprendizaje.guardar');
    Route::get('perfil-aprendizaje/{perfilAprendizajeInclusion}', [PerfilAprendizajeInclusionController::class, 'mostrar'])->name('superadmin.perfil-aprendizaje.mostrar');
    Route::put('perfil-aprendizaje/{perfilAprendizajeInclusion}', [PerfilAprendizajeInclusionController::class, 'actualizar'])->name('superadmin.perfil-aprendizaje.actualizar');
    Route::patch('perfil-aprendizaje/{perfilAprendizajeInclusion}/estado', [PerfilAprendizajeInclusionController::class, 'cambiarEstado'])->name('superadmin.perfil-aprendizaje.estado');
    Route::patch('perfil-aprendizaje/{perfilAprendizajeInclusion}/vista-info', [PerfilAprendizajeInclusionController::class, 'actualizarVistaInfo'])->name('superadmin.perfil-aprendizaje.vista-info.actualizar');
    Route::get('perfil-aprendizaje/{perfilAprendizajeInclusion}/vista-info', [PerfilAprendizajeInclusionController::class, 'verVistaInfo'])->name('superadmin.perfil-aprendizaje.vista-info.ver');
    Route::delete('perfil-aprendizaje/{perfilAprendizajeInclusion}', [PerfilAprendizajeInclusionController::class, 'eliminar'])->name('superadmin.perfil-aprendizaje.eliminar');

    // Perfiles de Aprendizaje Personalizados
    Route::get('perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoController::class, 'index'])->name('superadmin.perfil-aprendizaje-personalizado.index');
    Route::post('perfil-aprendizaje-personalizado', [PerfilAprendizajePersonalizadoController::class, 'guardar'])->name('superadmin.perfil-aprendizaje-personalizado.guardar');
    Route::get('perfil-aprendizaje-personalizado/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoController::class, 'mostrar'])->name('superadmin.perfil-aprendizaje-personalizado.mostrar');
    Route::put('perfil-aprendizaje-personalizado/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoController::class, 'actualizar'])->name('superadmin.perfil-aprendizaje-personalizado.actualizar');
    Route::patch('perfil-aprendizaje-personalizado/{perfilAprendizajePersonalizado}/estado', [PerfilAprendizajePersonalizadoController::class, 'cambiarEstado'])->name('superadmin.perfil-aprendizaje-personalizado.estado');
    Route::delete('perfil-aprendizaje-personalizado/{perfilAprendizajePersonalizado}', [PerfilAprendizajePersonalizadoController::class, 'eliminar'])->name('superadmin.perfil-aprendizaje-personalizado.eliminar');

    // Configuracion
    Route::get('configuracion', [ModulosConfiguracionSuperAdminController::class, 'listar'])->name('superadmin.modulos.listar');
    Route::post('configuracion/ambientes/{ambiente}/modulos', [ModulosConfiguracionSuperAdminController::class, 'guardar'])->name('superadmin.modulos.guardar');
    Route::get('configuracion/modulos/{modulo}', [ModulosConfiguracionSuperAdminController::class, 'mostrar'])->name('superadmin.modulos.mostrar');
    Route::put('configuracion/modulos/{modulo}', [ModulosConfiguracionSuperAdminController::class, 'actualizar'])->name('superadmin.modulos.actualizar');
    Route::patch('configuracion/modulos/{modulo}/estado', [ModulosConfiguracionSuperAdminController::class, 'actualizarEstado'])->name('superadmin.modulos.estado');
    Route::patch('configuracion/modulos/{modulo}/mover', [ModulosConfiguracionSuperAdminController::class, 'mover'])->name('superadmin.modulos.mover');

    // Ejes (por módulo oficial)
    Route::get('configuracion/modulos/{modulo}/ejes', [EjesConfiguracionSuperAdminController::class, 'listarPorModulo'])->name('superadmin.modulos.ejes');
    Route::get('configuracion/ejes', [EjesConfiguracionSuperAdminController::class, 'listar'])->name('superadmin.ejes.listar');
    Route::post('configuracion/modulos/{modulo}/ejes', [EjesConfiguracionSuperAdminController::class, 'guardar'])->name('superadmin.ejes.guardar');
    Route::get('configuracion/ejes/{eje}', [EjesConfiguracionSuperAdminController::class, 'mostrar'])->name('superadmin.ejes.mostrar');
    Route::put('configuracion/ejes/{eje}', [EjesConfiguracionSuperAdminController::class, 'actualizar'])->name('superadmin.ejes.actualizar');
    Route::patch('configuracion/ejes/{eje}/estado', [EjesConfiguracionSuperAdminController::class, 'actualizarEstado'])->name('superadmin.ejes.estado');
    Route::patch('configuracion/ejes/{eje}/mover', [EjesConfiguracionSuperAdminController::class, 'mover'])->name('superadmin.ejes.mover');

    // Catalogos DBA
    Route::get('configuracion/catalogo-dba', [CatalogoDBASuperAdminController::class, 'listar'])->name('superadmin.catalogo-dba.listar');
    Route::post('configuracion/catalogo-dba', [CatalogoDBASuperAdminController::class, 'guardar'])->name('superadmin.catalogo-dba.guardar');
    Route::get('configuracion/catalogo-dba/datos/{id}', [CatalogoDBASuperAdminController::class, 'ver'])->name('superadmin.catalogo-dba.ver');
    Route::put('configuracion/catalogo-dba/{id}', [CatalogoDBASuperAdminController::class, 'actualizar'])->name('superadmin.catalogo-dba.actualizar');
    Route::patch('configuracion/catalogo-dba/{id}/toggle-activo', [CatalogoDBASuperAdminController::class, 'toggleActivo'])->name('superadmin.catalogo-dba.toggleActivo');
});

// ── Contenido del ambiente (protegido por sesion del nino) ────────────────
Route::middleware('sesion.nino')->group(function () {
    require __DIR__.'/ambientes/'.config('ambiente.slug').'.php';
});
