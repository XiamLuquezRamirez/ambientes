<?php

use App\Http\Controllers\Admin\AmbienteAdminController;
use App\Http\Controllers\Admin\AsignacionAmbienteController;
use App\Http\Controllers\Admin\CatalogoController;
use App\Http\Controllers\Admin\CierreAnioController;
use App\Http\Controllers\Admin\CondicionConfiguracionController;
use App\Http\Controllers\Admin\CondicionTransitoriaConfiguracionController;
use App\Http\Controllers\Admin\ConfiguracionAdminController;
use App\Http\Controllers\Admin\ConflictosController;
use App\Http\Controllers\Admin\DocenteAdminController;
use App\Http\Controllers\Admin\EstudianteAdminController;
use App\Http\Controllers\Admin\GradoGrupoController;
use App\Http\Controllers\Admin\GruposController;
use App\Http\Controllers\Admin\MatriculaAdminController;
use App\Http\Controllers\Admin\PiarController;
use App\Http\Controllers\Admin\ReportesController;
use App\Http\Controllers\Admin\SyncLogController;
use App\Http\Controllers\Admin\UsuarioAdminController;
use App\Http\Controllers\Auth\AuthDocenteController;
use App\Http\Controllers\Auth\SesionNinoController;
use App\Http\Controllers\Docente\DocenteDashboardController;
use App\Http\Controllers\Panel\AsistenciaController;
use App\Http\Controllers\Panel\EstudiantePanelController;
use App\Http\Controllers\Panel\InclusionController;
use App\Http\Controllers\Panel\PlaneacionController;
use App\Http\Controllers\Panel\PortafolioController;
use App\Http\Controllers\Panel\SesionController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\SuperAdmin\AdminsSuperAdminController;
use App\Http\Controllers\SuperAdmin\CondicionInclusionController;
use App\Http\Controllers\SuperAdmin\CondicionTransitoriaController;
use App\Http\Controllers\SuperAdmin\InstitucionSuperAdminController;
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

    // Catalogo
    Route::get('catalogo', [CatalogoController::class, 'listar'])->name('admin.catalogo');
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

    Route::get('configuracion/condiciones', [CondicionConfiguracionController::class, 'index'])->name('admin.configuracion.condiciones.index');
    Route::patch('configuracion/condiciones/orden', [CondicionConfiguracionController::class, 'actualizarOrden'])->name('admin.configuracion.condiciones.orden');
    Route::patch('configuracion/condiciones/{condicionOrden}/estado', [CondicionConfiguracionController::class, 'actualizarEstado'])->name('admin.configuracion.condiciones.estado');

    Route::get('configuracion/condiciones-transitorias', [CondicionTransitoriaConfiguracionController::class, 'index'])->name('admin.configuracion.condiciones-transitorias.index');
    Route::post('configuracion/condiciones-transitorias', [CondicionTransitoriaConfiguracionController::class, 'guardar'])->name('admin.configuracion.condiciones-transitorias.guardar');
    Route::patch('configuracion/condiciones-transitorias/orden', [CondicionTransitoriaConfiguracionController::class, 'actualizarOrden'])->name('admin.configuracion.condiciones-transitorias.orden');
    Route::get('configuracion/condiciones-transitorias/opcion/{condicionTransitoria}', [CondicionTransitoriaConfiguracionController::class, 'mostrar'])->name('admin.configuracion.condiciones-transitorias.mostrar');
    Route::put('configuracion/condiciones-transitorias/opcion/{condicionTransitoria}', [CondicionTransitoriaConfiguracionController::class, 'actualizar'])->name('admin.configuracion.condiciones-transitorias.actualizar');
    Route::delete('configuracion/condiciones-transitorias/opcion/{condicionTransitoria}', [CondicionTransitoriaConfiguracionController::class, 'eliminar'])->name('admin.configuracion.condiciones-transitorias.eliminar');
    Route::patch('configuracion/condiciones-transitorias/{condicionTransitoriaOrden}/estado', [CondicionTransitoriaConfiguracionController::class, 'actualizarEstado'])->name('admin.configuracion.condiciones-transitorias.estado');

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
    // Portafolio
    Route::get('portafolio', [PortafolioController::class, 'listar'])->name('panel.portafolio');
    Route::get('portafolio/{estudiante}', [PortafolioController::class, 'verEstudiante'])->name('panel.portafolio.estudiante');
    Route::post('portafolio/{estudiante}/observacion', [PortafolioController::class, 'guardarObservacion'])->name('panel.portafolio.observacion');
    Route::get('portafolio/{estudiante}/exportar', [PortafolioController::class, 'exportar'])->name('panel.portafolio.exportar');

    // Inclusion
    Route::get('inclusion', [InclusionController::class, 'listar'])->name('panel.inclusion');
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

    // Condiciones
    Route::get('condiciones', [CondicionInclusionController::class, 'index'])->name('superadmin.condiciones.index');
    Route::post('condiciones', [CondicionInclusionController::class, 'guardar'])->name('superadmin.condiciones.guardar');
    Route::get('condiciones/{condicionInclusion}', [CondicionInclusionController::class, 'mostrar'])->name('superadmin.condiciones.mostrar');
    Route::put('condiciones/{condicionInclusion}', [CondicionInclusionController::class, 'actualizar'])->name('superadmin.condiciones.actualizar');
    Route::patch('condiciones/{condicionInclusion}/estado', [CondicionInclusionController::class, 'cambiarEstado'])->name('superadmin.condiciones.estado');
    Route::patch('condiciones/{condicionInclusion}/vista-info', [CondicionInclusionController::class, 'actualizarVistaInfo'])->name('superadmin.condiciones.vista-info.actualizar');
    Route::get('condiciones/{condicionInclusion}/vista-info', [CondicionInclusionController::class, 'verVistaInfo'])->name('superadmin.condiciones.vista-info.ver');
    Route::delete('condiciones/{condicionInclusion}', [CondicionInclusionController::class, 'eliminar'])->name('superadmin.condiciones.eliminar');

    Route::get('condiciones-transitorias', [CondicionTransitoriaController::class, 'index'])->name('superadmin.condiciones-transitorias.index');
    Route::post('condiciones-transitorias', [CondicionTransitoriaController::class, 'guardar'])->name('superadmin.condiciones-transitorias.guardar');
    Route::get('condiciones-transitorias/{condicionTransitoria}', [CondicionTransitoriaController::class, 'mostrar'])->name('superadmin.condiciones-transitorias.mostrar');
    Route::put('condiciones-transitorias/{condicionTransitoria}', [CondicionTransitoriaController::class, 'actualizar'])->name('superadmin.condiciones-transitorias.actualizar');
    Route::patch('condiciones-transitorias/{condicionTransitoria}/estado', [CondicionTransitoriaController::class, 'cambiarEstado'])->name('superadmin.condiciones-transitorias.estado');
    Route::delete('condiciones-transitorias/{condicionTransitoria}', [CondicionTransitoriaController::class, 'eliminar'])->name('superadmin.condiciones-transitorias.eliminar');
});

// ── Contenido del ambiente (protegido por sesion del nino) ────────────────
Route::middleware('sesion.nino')->group(function () {
    require __DIR__.'/ambientes/'.config('ambiente.slug').'.php';
});
