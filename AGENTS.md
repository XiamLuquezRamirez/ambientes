# PedNia — guía para agentes

Plataforma escolar multi-institución (Colombia) sobre **Laravel 10 / PHP 8.1+ / MySQL**. UI en **Blade + Bootstrap 5 + jQuery** (no es SPA). Producto: **PedNia**. Cada despliegue es **un ambiente de aprendizaje** (`AMBIENTE_SLUG`).

Idioma del código y de la UI: **español**. Conservar nombres de rutas, métodos y tablas existentes.

## Stack y layout

| Capa | Dónde |
|------|--------|
| Rutas | `routes/web.php`, `routes/api.php`, `routes/kiosco.php` |
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

El niño **no** usa guard Laravel: sesión `estudiante_id` + PIN de 3 figuras (`ConfiguracionPin`). Middleware `sesion.nino`. Rutas del kiosco: `routes/kiosco.php` (iguales en los 5 nodos; el ambiente se resuelve en `SesionNinoService::obtenerAmbiente()`).

Login staff: `AuthDocenteController`. Login niño: `SesionNinoController`. Helpers en `User`: `esAdmin()`, `esDocente()`, `esSuperAdmin()`. Institución suspendida bloquea admin/docente.

## Dominio (términos fijos)

- **Ambiente**: uno de 5 nodos fijos — `expresion-artistica` (Expresión Artística), `polimotor`, `multisaberes`, `multisensorial`, `tecnologia` (`config('ambiente.slugs')`). No crear un sexto sin decisión explícita. No hay alias: `AMBIENTE_SLUG`, `SERVIDOR_AMBIENTE` y las claves de `config/red.php` usan el slug de la tabla `ambientes`.
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

## Grafo de conocimiento (graphify)

`graphify-out/` tiene un grafo del código (AST, sin LLM): `graph.json` (~39 000 nodos), `GRAPH_REPORT.md`, `graph.html` (visor) y `memory/` (rastreos ya hechos). Úsalo **antes** de explorar el código a ciegas: para "¿dónde está / quién llama / qué depende de X?" una consulta al grafo cuesta mucho menos que leer archivos.

- Skill del proyecto: `.claude/skills/graphify` (`/graphify query "<pregunta>"`). Requiere una vez `pip install graphifyy` y crear el puntero al intérprete que la skill espera: `python -c "import sys; open('graphify-out/.graphify_python','w').write(sys.executable)"`.
- Consulta directa: `graphify query "<términos>" --budget 1500` (BFS) o `--dfs` para rastrear un camino; `graphify explain "<nodo>"`, `graphify path "<A>" "<B>"`. Usar los nombres tal como están en el código (el buscador no traduce ni hace sinónimos).
- **No leer `GRAPH_REPORT.md` completo** (~500 KB ≈ 125 000 tokens): buscar dentro con grep (p. ej. `God Nodes`, el nombre de una clase o comunidad).
- Antes de rastrear algo, revisar `graphify-out/memory/` por si ya está respondido.
- Limitaciones: aristas `INFERRED` entre archivos pueden ser coincidencias de nombre (verificar con grep); no enlaza llamadas a miembro (`TextoVoz.textoPlano()`); los métodos de traits PHP cuelgan del archivo, no del trait. El grafo es una foto: si el código cambió, confirmar en los archivos.
- Regenerarlo: no usar `graphify update`, `--update` ni `graphify hook install` tal cual, porque aplican la deduplicación difusa (fusiona clases de nombre parecido, p. ej. controladores Admin/Panel). Reconstruir completo con `extract(..., parallel=False)`, `graphify.dedup._ENTROPY_THRESHOLD = inf`, `to_json(..., force=True)` y compactar `graph.json` (con sangría pesa ~58 MB).
