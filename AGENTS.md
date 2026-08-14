# PedNia — guía para agentes

Plataforma escolar multi-institución (Colombia) sobre **Laravel 10 / PHP 8.1+ / MySQL**. UI en **Blade + Bootstrap 5 + jQuery** (no es SPA). Producto: **PedNia**. Cada despliegue es **un ambiente de aprendizaje** (`AMBIENTE_SLUG`).

Idioma del código y de la UI: **español**. Conservar nombres de rutas, métodos y tablas existentes.

## Stack y layout

| Capa | Dónde |
|------|--------|
| Rutas | `routes/web.php`, `routes/api.php`, `routes/ambientes/{slug}.php` |
| Controladores | `app/Http/Controllers/{Admin,Panel,SuperAdmin,Auth,Ambientes,Api,Docente}` |
| Modelos | `app/Models` (~50). Lógica de negocio extra en `app/Services` |
| Vistas | `resources/views/{admin,panel,superAdmin,auth,ambientes,perfil}` |
| Layouts | `layouts/admin`, `layouts/panel`, `layouts/superAdmin`, `layouts/ambiente` |
| JS/CSS | `public/assets/js` y `public/assets/css` (no Vite para features) |
| Config propia | `config/ambiente.php` (`AMBIENTE_SLUG`), `config/red.php` (IPs y sync) |
| PDF | `barryvdh/laravel-dompdf` |

Vite (`resources/js/app.js`) casi no se usa. **No editar** `public/assets/css/fontawesome`.

## Tres roles de staff + kiosco del niño

Staff usa el guard de sesión **`docente`** sobre el modelo `User` (`users.rol`):

| Rol | Middleware | Prefijo | Layout | Tras login |
|-----|------------|---------|--------|------------|
| `superAdmin` | `es.superAdmin` | `/superadmin` | `layouts/superAdmin` | `superadmin.principal` |
| `admin` | `es.admin` | `/admin` | `layouts/admin` | `admin.ambientes` |
| `docente` | `es.docente` | `/panel` | `layouts/panel` | `panel.principal` |

El niño **no** usa guard Laravel: sesión `estudiante_id` + PIN de 3 figuras (`ConfiguracionPin`). Middleware `sesion.nino`. Rutas del ambiente: `require routes/ambientes/{slug}.php` según `config('ambiente.slug')`.

Login staff: `AuthDocenteController`. Login niño: `SesionNinoController`. Helpers en `User`: `esAdmin()`, `esDocente()`, `esSuperAdmin()`. Institución suspendida bloquea admin/docente.

## Dominio (términos fijos)

- **Ambiente**: uno de 5 nodos fijos — `musica`, `polimotor`, `logico`, `multisensorial`, `tecnologia`. No crear un sexto sin decisión explícita.
- **Institución**: colegio (multi-tenant vía `institucion_id`).
- **Carga docente**: asignación `docente + ambiente + grado + grupo + año lectivo`. Unidad de trabajo del panel.
- **Matrícula**: inscripción anual (`anio_lectivo`, suele filtrarse con `date('Y')`).
- **Estudiante ↔ ambiente**: pivot `estudiante_ambiente` (no confundir con matrícula).
- **Currículo**: Módulo → Eje → Tema → Actividad. Oficiales (sistema) vs propios del colegio (`institucion_id`).
- **DBA**: Derechos Básicos de Aprendizaje (MEN + catálogo del colegio).
- **PIAR**: Plan Individual de Ajustes Razonables (wizard multi-paso, PDF).
- **Perfil de aprendizaje**: condición de inclusión (TEA, TDAH, …) — `PerfilAprendizajeInclusion`.
- **Perfil personalizado**: condición transitoria — `PerfilAprendizajePersonalizado`.
- **PIN**: 3 iconos FontAwesome + color. Bloqueo por `intentos_fallidos`.
- **Sincronización**: trait `App\Traits\Sincronizable` encola cambios en `cola_sincronizacion` si `SERVIDOR_AMBIENTE` está definido. API: `GET /api/sync/health`, `POST /api/sync/recibir`.

## Dónde implementar qué

| Tarea | Entrada |
|-------|---------|
| CRUD colegio (estudiantes, docentes, grupos, matrículas, ambientes) | `Admin\*Controller` + `resources/views/admin` |
| Trabajo de aula (asistencia, planeación, sesión, portafolio, inclusión) | `Panel\*Controller` + `resources/views/panel` |
| Catálogos globales, instituciones, admins | `SuperAdmin\*Controller` + `resources/views/superAdmin` |
| Lógica reutilizable | `app/Services` (no hinchar controladores) |
| Auditoría | `SeguridadService` + `SeguridadAccion` |
| JS de una pantalla | `public/assets/js/{admin,panel,superAdmin,...}` y el script en la Blade |

Rutas con nombre: `admin.*`, `panel.*`, `superadmin.*`, `auth.*`, `docente.login`.

## Convenciones

- Extraer servicios cuando el controlador acumule consultas o PDFs.
- Partials Blade con `_` (`_tabla.blade.php`, `_card.blade.php`).
- AJAX: endpoints que devuelven HTML fragment o JSON; el JS vive en `public/assets/js`.
- Validar con Form Requests cuando ya existan; si no, `$request->validate()` como el resto del archivo.
- No introducir Vue/React/Livewire. No Sanctum para features nuevas salvo sync API.
- Tests PHPUnit en `tests/Unit` (hoy: asignación y estadísticas de grupo). Feature HTTP casi no hay.

## Deuda conocida (no “arreglar” de paso)

- Rutas PIAR (`/piar`, `estudiantes/diligenciar-piar/...`) **sin** middleware de auth.
- `ConflictosController`, `ReportesController` e inclusión por estudiante: stubs / parciales.
- `MonitorSesionService.blade.php` está mal nombrado (es PHP).
- `resources/css/app.css` referenciado por Vite **no existe**.
- `PerfilAprendizaje` y `PerfilAprendizajeInclusion` comparten tabla; usar el de inclusión.
- `ConfiguracionSuperAdminController` no está en rutas.
- Inconsistencias de mayúsculas: `Seguridadlog.php`, `figurasModel.php`, `ambienteService.php`.

## Docs internas

`docs/superpowers/plans/` (paneles y ambientes/grados) y `docs/panel-header-institucion.md`.
