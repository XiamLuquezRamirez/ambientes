# PROMPT PARA CLAUDE CODE — Panel Administrativo (central) y Panel Docente

## ROL Y CONTEXTO

Actúa como arquitecto de software senior especializado en Laravel. Vamos a construir
los paneles de gestión de la plataforma "Aulas Reggio" sobre el proyecto ya inicializado
(Laravel 10 + MariaDB, estructura por ambientes, login por PIN de figuras funcional).

### Arquitectura de referencia
- 5 servidores independientes, uno por ambiente, en la red local 192.168.1.0/24:
  Música (.20), Polimotor (.21), Lógico (.22), Multisensorial (.23), Tecnología (.24)
- Sincronización entre servidores vía tabla `sync_queue` + Jobs Laravel + HTTP POST
  a `/api/sync/recibir` en cada servidor (ya definida en fase anterior — si no existe
  aún, créala como parte de esta tarea con un Observer básico sobre el modelo Estudiante)

### Los dos paneles a construir

**Panel Administrativo** — consola CENTRAL. Corre sobre uno de los 5 servidores (o uno
adicional) y se comunica con los otros 4 vía HTTP para operaciones consolidadas.
No gestiona contenido pedagógico día a día — su rol es estructural y de supervisión.

**Panel Docente** — LOCAL a cada servidor/ambiente. Cada docente solo administra su
propio ambiente. Es el panel de operación diaria.

---

## TAREA 1 — Roles y autenticación

### 1.1 — Modelo de roles
Extiende el modelo `Docente` (ya existe en `database/migrations`) agregando:
- `rol` enum: `admin`, `docente_lider`, `docente_auxiliar`
- `ambiente_id` (FK, nullable para admin — el admin no pertenece a un solo ambiente)

### 1.2 — Autenticación
Usa Laravel Breeze o Fortify (lo más simple posible) para login de docentes/admin con
email + password. Diferente del login del niño (que usa PIN de figuras y ya existe).

### 1.3 — Middleware de roles
Crea middleware `EsAdmin` y `EsDocente` (con verificación de que el docente solo
acceda a rutas de su propio `ambiente_id`, salvo que sea `admin`).

---

## TAREA 2 — Panel Administrativo (consola central)

Prefijo de rutas: `/admin`. Layout propio `layouts/admin.blade.php` con sidebar de
navegación (usa componentes Blade simples, sin frameworks JS pesados — Alpine.js
está bien si ya está en el proyecto).

### 2.1 — Dashboard de ambientes (`/admin/ambientes`)
- Tarjeta por cada uno de los 5 ambientes mostrando: nombre, color, ícono, estado del
  servidor (en línea / fuera de línea — basado en último ping de `/api/sync/health`),
  hora del último sync exitoso, cantidad de estudiantes activos
- CRUD de ambientes: editar nombre, slug, color_hex, icono, servidor_ip, activo
- Botón "Probar conexión" que hace un GET a `http://{servidor_ip}/api/sync/health`
  desde el servidor donde corre el admin

### 2.2 — Registro de sincronización (`/admin/sync-log`)
- Tabla paginada de `sync_queue` de TODOS los servidores (consulta vía API a cada uno,
  o tabla local replicada si se diseñó así)
- Columnas: entidad, acción, servidor_origen, timestamp, estado (pendiente/enviado/
  confirmado), intentos
- Filtro por servidor, por estado, por rango de fechas
- Vista de detalle del payload (json) de cada evento

### 2.3 — Resolución de conflictos (`/admin/conflictos`)
- Lista de registros donde se detectó un conflicto (mismo modelo_id editado en
  ventana de tiempo cercana desde 2+ servidores)
- Vista comparativa: valores en conflicto lado a lado, con botón para elegir cuál
  versión prevalece (dispara re-sincronización del valor elegido a los 5 servidores)

### 2.4 — Gestión de docentes (`/admin/docentes`)
- CRUD completo: listar, crear, editar, activar/desactivar
- Al crear: asignar ambiente_id (excepto si rol=admin) y rol
- Acción "Restablecer contraseña" (genera password temporal o envía link, según lo
  que sea viable sin internet — considerar generación de password temporal visible
  solo para el admin, ya que no hay correo)
- Tabla de auditoría de accesos (`login_logs`: docente_id, ip, fecha, ambiente)

### 2.5 — Estudiantes (vista consolidada) (`/admin/estudiantes`)
- Listado de TODOS los estudiantes de los 5 ambientes, con filtro por ambiente,
  condición y estado activo/inactivo
- Acción "Transferir de ambiente": modal que permite mover un estudiante a otro
  ambiente — esto debe:
  1. Actualizar `ambiente_id` en el servidor origen
  2. Encolar evento en `sync_queue` para los 5 servidores
  3. Conservar el historial de `portafolios` asociado (no se borra, queda con
     referencia al ambiente original + nuevo)
- Edición de `condicion` (estandar, tea, tdah, disc_visual, disc_auditiva,
  disc_motriz, down) — al guardar, encola sync a los 5 servidores
- Reseteo de PIN de figuras (limpia `configuracion_pins` del estudiante)

### 2.6 — Catálogo pedagógico global (`/admin/catalogo`)
- Árbol navegable: Ambiente > Módulo > Tema > Actividad
- CRUD de Módulos (nombre, descripción, ícono, orden, activo) por ambiente
- CRUD de Temas (nombre, descripción, instrucción_corta, marcador_ra, orden) por módulo
- CRUD de Actividades (tipo: audio/video_lsc/animacion/juego/simulacion,
  contenido_path, configuracion json) por tema
- Subida de archivos: usar `Storage::disk('public')` con carpetas organizadas
  `storage/app/public/contenido-ra/{ambiente}/{modulo}/{tema}/`
- Al crear/editar cualquier elemento del catálogo, encolar sync a los 5 servidores
  (el catálogo pedagógico debe ser igual en todos)

### 2.7 — Reportes y analítica (`/admin/reportes`)
- Dashboard con métricas agregadas (consulta a los 5 servidores o tabla consolidada):
  estudiantes activos por ambiente, actividades completadas (últimos 7/30 días),
  tiempo promedio de sesión
- Reporte de inclusión: tabla cruzada condición x ambiente x actividades completadas
- Exportación a Excel/CSV usando `maatwebsite/excel` o similar (verificar disponible
  sin internet — si no, generar CSV manual con `fputcsv`)
- Exportación de avance individual de un estudiante en PDF (usar `dompdf` o `mpdf`,
  ambos funcionan offline)

### 2.8 — Configuración del sistema (`/admin/configuracion`)
- Formulario de parámetros globales guardados en tabla `configuraciones` (key-value):
  `tiempo_sesion_minutos`, `intentos_max_pin`, `idioma`, `zona_horaria`
- Al guardar, encolar sync a los 5 servidores (estos parámetros deben ser iguales
  en todos)
- Vista de logs del sistema: tail de `storage/logs/laravel.log` de cada servidor
  (vía API simple `/api/sync/logs?lines=100`)
- Estado de backups: última fecha de backup por servidor (asumir un comando
  artisan `backup:run` programado vía cron, este panel solo MUESTRA el estado)

---

## TAREA 3 — Panel Docente (local por ambiente)

Prefijo de rutas: `/panel`. Layout propio `layouts/panel.blade.php` aplicando
`--color-ambiente` del ambiente del docente autenticado (como ya se hace en
`layouts/ambiente.blade.php`). Todas las consultas son LOCALES — sin llamadas a
otros servidores.

### 3.1 — Gestión de estudiantes (`/panel/estudiantes`)
- CRUD de estudiantes de su ambiente (nombre, iniciales, color_avatar, condicion,
  activo)
- Al crear/editar/desactivar: encola evento en `sync_queue` (igual que en el panel
  admin, pero limitado a su propio ambiente como origen)
- Configurar PIN de figuras: interfaz visual con las 8 figuras (mismo set del
  login: ⬤ ★ ♥ ▲ ■ ☽ ◆ ⚡), el docente toca 3 en orden para asignar el PIN
- Docente auxiliar: mismo acceso que líder en este módulo (según matriz de permisos)

### 3.2 — Planeación (`/panel/planeacion`)
- Vista del catálogo de módulos/temas de SU ambiente (lectura — el catálogo se
  edita solo desde el panel admin)
- Toggle "Activo hoy" / "Activo esta semana" por módulo — controla qué módulos
  aparecen en el menú del niño (tabla `modulos_activos`: modulo_id, fecha_desde,
  fecha_hasta, o un simple booleano `visible_estudiantes`)
- Reordenar temas dentro de un módulo (drag and drop simple con Alpine.js o
  botones subir/bajar)
- Campo de notas pedagógicas por tema (tabla `notas_docente`: tema_id, docente_id,
  contenido, fecha) — visible solo para docentes, nunca para el niño
- Vista previa: iframe o link directo a la vista del niño para esa actividad

### 3.3 — Monitor de sesión (`/panel/sesion`)
- Lista en tiempo real (polling cada 10-15s con Alpine.js + fetch, sin websockets)
  de estudiantes con sesión activa: nombre, módulo/tema actual, tiempo en la
  actividad actual
- Registro de asistencia: checklist diario de estudiantes presentes
  (tabla `asistencias`: estudiante_id, fecha, presente boolean)
- "Sesión asistida": botón que permite al docente iniciar sesión EN NOMBRE de un
  estudiante (salta el paso de selección+PIN, va directo a bienvenida-ambiente)
  — pensado para estudiantes con `condicion` que lo requiera
- Alertas visuales: badge si un estudiante lleva > X minutos sin interacción
  (configurable, default 5 min) o tuvo intentos fallidos de PIN recientes

### 3.4 — Portafolio (`/panel/portafolio`)
- Listado de estudiantes de su ambiente → al seleccionar uno, vista de su
  `portafolios`: fotos, audios, emociones, resultados, ordenados por fecha
- Formulario para agregar observación docente (tabla `observaciones`:
  estudiante_id, docente_id, contenido, fecha, tipo: general/logro)
- Marcar logro: checkbox o botón que crea una `observacion` tipo `logro`
  asociada a un tema específico
- Exportar avance individual a PDF (mismo mecanismo del panel admin, pero
  limitado a estudiantes de su ambiente)

### 3.5 — Adaptaciones inclusivas (`/panel/inclusion`)
- Por estudiante: ver la `condicion` actual (solo lectura) y las adaptaciones
  automáticas que implica (tabla de referencia estática: condicion → lista de
  adaptaciones, según el documento de diseño inclusivo del proyecto)
- Ajustes manuales temporales (Capa 3): toggles por estudiante para
  `subtitulos_forzados`, `velocidad_animacion` (normal/lenta), `control_voz`,
  `temporizador_visual` — guardados en tabla `ajustes_temporales`
  (estudiante_id, clave, valor, expira_en — opcional)
- Botón "Solicitar cambio de condición": formulario que crea un registro en
  `solicitudes_cambio_condicion` (estudiante_id, docente_id, condicion_actual,
  condicion_solicitada, justificacion, estado: pendiente/aprobado/rechazado)
  — visible para el admin en su panel (agregar sección simple en `/admin/solicitudes`)

---

## TAREA 4 — Migraciones nuevas necesarias

Crea las migraciones para las tablas nuevas mencionadas arriba que no existan:
- `login_logs`
- `modulos_activos` (o columna `visible_estudiantes` en tabla `modulos` existente —
  preferir esto último si es más simple)
- `notas_docente`
- `asistencias`
- `observaciones`
- `ajustes_temporales`
- `solicitudes_cambio_condicion`
- `configuraciones` (key-value para parámetros globales)

---

## TAREA 5 — Verificación final

1. `php artisan migrate:fresh --seed`
2. Crear un usuario admin de prueba vía seeder (`AdminSeeder`): email
   `admin@aulasreggio.test`, password `password`, rol `admin`
3. Crear un docente líder de prueba para el ambiente Música:
   email `docente.musica@aulasreggio.test`, password `password`,
   rol `docente_lider`, ambiente_id = Música
4. Verificar flujo:
   - Login admin → `/admin/ambientes` muestra los 5 ambientes
   - Login docente Música → `/panel/estudiantes` muestra solo estudiantes de Música
   - Docente configura el PIN de Valentina desde `/panel/estudiantes` y el login
     por PIN sigue funcionando con el nuevo PIN
   - Admin transfiere a Mateo de Música a Polimotor → verificar que el evento
     queda registrado en `sync_queue` con estado `pendiente` (no requiere que los
     otros 4 servidores existan físicamente en este entorno de desarrollo —
     solo que el registro se cree correctamente)

---

## ENTREGABLES ESPERADOS

1. Migraciones nuevas + modelos + relaciones
2. Sistema de autenticación de docentes/admin (diferente al login del niño)
3. Middleware de roles (`EsAdmin`, `EsDocente`)
4. Panel Administrativo completo en `/admin` (8 secciones de la Tarea 2)
5. Panel Docente completo en `/panel` (5 secciones de la Tarea 3)
6. Seeders de usuarios de prueba (admin + docente líder de Música)
7. README actualizado con credenciales de prueba y rutas principales de cada panel

No es necesario implementar la comunicación HTTP real entre los 5 servidores en
este entorno de desarrollo (no existen físicamente) — para las secciones que
requieren consultar otros servidores (estado de ambientes, sync-log consolidado,
reportes), implementa la lógica y la interfaz, pero con datos de los OTROS 4
servidores simulados/mockeados en el seeder (ej. registros de ejemplo en
`sync_queue` con `servidor_origen` distinto al actual, para que la interfaz
tenga contenido que mostrar).
