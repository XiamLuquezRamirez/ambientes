# Aulas Reggio — Setup del Proyecto Laravel + MariaDB

Guía completa para inicializar el proyecto y prompt listo para Claude Code.

## 5. Prompt para Claude Code

Una vez verificada la conexión, usar el siguiente prompt completo dentro del proyecto
(`cd aulas-reggio` y ejecutar Claude Code ahí) para generar la estructura completa
por ambientes y el flujo de login por PIN de figuras.

```markdown
# PROMPT PARA CLAUDE CODE — Inicialización del proyecto Aulas Reggio

## ROL Y CONTEXTO

Actúa como arquitecto de software senior especializado en Laravel. Vamos a inicializar
desde cero la plataforma educativa "Aulas Reggio" para primera infancia (niños de 3 a 6 años),
desarrollada para el Municipio de Becerril, Cesar, Colombia.

### Stack tecnológico
- Laravel 10
- MariaDB (driver mysql)
- Blade (vistas) + JS vanilla (sin frameworks frontend pesados)
- Despliegue final: WebView Android (APK) por cada ambiente
- Arquitectura: 5 servidores independientes en red local (P2P), uno por ambiente,
  sin internet, sincronización vía HTTP POST

### Los 5 ambientes del proyecto
Cada ambiente es un módulo independiente de la plataforma, con su propio servidor en
la red local (subred 192.168.1.0/24):

1. **Música** (servidor .20) — exploración sonora, ritmo, paisajes sonoros
2. **Polimotor** (servidor .21) — juegos motrices, expresión corporal
3. **Lógico** (servidor .22) — patrones, figuras, lab matemático
4. **Multisensorial** (servidor .23) — texturas, luces, exploración sensorial
5. **Tecnología** (servidor .24) — robótica, programación básica, creatividad digital

Cada ambiente tiene 5 módulos pedagógicos, y cada módulo tiene varios temas/actividades.

### Modelo de inicio de sesión del niño (CRÍTICO — niños de 3-6 años no leen)
1. Pantalla de bienvenida → botón grande "¡Vamos a jugar!"
2. Selector de alumno → grid de avatares con foto/iniciales, el niño toca el suyo
3. **PIN de figuras geométricas** → el niño toca 3 figuras en orden (de un set de 8:
   círculo ⬤, estrella ★, corazón ♥, triángulo ▲, cuadrado ■, luna ☽, diamante ◆, rayo ⚡)
4. Si el PIN coincide → pantalla de bienvenida personalizada → entra al ambiente
5. Si falla → indicadores se sacuden, mensaje de error, reintento

Cada niño tiene su PIN configurado por el docente (3 figuras del set de 8, en orden,
pueden repetirse o no según se decida).

### Adaptaciones inclusivas (diseño universal — base para todos, capas por perfil)
El modelo `Estudiante` debe tener un campo `condicion` con valores posibles:
`estandar`, `tea`, `tdah`, `disc_visual`, `disc_auditiva`, `disc_motriz`, `down`.
Esto se usará después para activar contenido RA diferenciado — por ahora solo
necesitamos el campo en el modelo y la migración, no la lógica de adaptación completa.

---

## TAREA 1 — Inicialización del proyecto

El proyecto ya está creado y conectado a MariaDB (base de datos `aulas_reggio`,
charset utf8mb4 / collation utf8mb4_unicode_ci). Verifica lo siguiente:

1. Confirmar `.env` apunta correctamente a MariaDB
2. Configurar timezone en `config/app.php` → `America/Bogota`
3. Configurar idioma en `config/app.php` → `es`

---

## TAREA 2 — Estructura de carpetas por ambiente

Crea esta estructura de carpetas dentro de `app/`, `resources/views/`, `routes/` y
`database/`. Cada ambiente debe estar completamente separado para facilitar el
empaquetado posterior como APK independiente por ambiente.

```
app/
├── Models/
│   ├── Estudiante.php
│   ├── Docente.php
│   ├── Ambiente.php
│   ├── Modulo.php
│   ├── Tema.php
│   ├── Actividad.php
│   ├── Portafolio.php
│   └── ConfiguracionPin.php
│
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   │   └── SesionNinoController.php
│   │   └── Ambientes/
│   │       ├── MusicaController.php
│   │       ├── PolimotorController.php
│   │       ├── LogicoController.php
│   │       ├── MultisensorialController.php
│   │       └── TecnologiaController.php
│   │
│   └── Middleware/
│       └── VerificarSesionNino.php
│
resources/
├── views/
│   ├── auth/
│   │   ├── bienvenida.blade.php
│   │   ├── seleccionar-alumno.blade.php
│   │   ├── pin-figuras.blade.php
│   │   └── bienvenida-ambiente.blade.php
│   │
│   ├── ambientes/
│   │   ├── musica/
│   │   │   ├── inicio.blade.php
│   │   │   ├── modulo.blade.php
│   │   │   └── tema.blade.php
│   │   ├── polimotor/
│   │   ├── logico/
│   │   ├── multisensorial/
│   │   └── tecnologia/
│   │
│   ├── layouts/
│   │   ├── app.blade.php          (layout base general)
│   │   └── ambiente.blade.php     (layout específico de ambiente, recibe color/logo)
│   │
│   └── components/
│       ├── figura-pin.blade.php
│       ├── avatar-alumno.blade.php
│       └── modulo-card.blade.php
│
routes/
├── web.php                 (rutas generales + auth niño)
└── ambientes/
    ├── musica.php
    ├── polimotor.php
    ├── logico.php
    ├── multisensorial.php
    └── tecnologia.php

public/
└── assets/
    └── ambientes/
        ├── musica/         (CSS, JS, imágenes específicas)
        ├── polimotor/
        ├── logico/
        ├── multisensorial/
        └── tecnologia/
```

En `routes/web.php`, incluye los archivos de rutas de cada ambiente con `require`,
agrupados bajo prefijos: `/musica`, `/polimotor`, `/logico`, `/multisensorial`, `/tecnologia`.

---

## TAREA 3 — Modelos, migraciones y seeders

Crea las migraciones, modelos y relaciones Eloquent para:

### `ambientes`
- id, nombre, slug, color_hex, icono (string para emoji/clase), servidor_ip, activo

### `docentes`
- id, nombre, email, password, ambiente_id (FK), rol

### `estudiantes`
- id, nombre, iniciales (para avatar), color_avatar, condicion (enum según lista arriba),
  ambiente_id (FK), activo

### `configuracion_pins`
- id, estudiante_id (FK), figura_1, figura_2, figura_3 (cada una: enum con las 8 figuras),
  intentos_fallidos (default 0)

### `modulos`
- id, ambiente_id (FK), nombre, slug, descripcion, icono, orden, activo

### `temas`
- id, modulo_id (FK), nombre, slug, descripcion, icono, instruccion_corta, orden,
  marcador_ra (string, nombre del archivo del marcador MindAR), activo

### `actividades`
- id, tema_id (FK), tipo (enum: audio, video_lsc, animacion, juego, simulacion),
  contenido_path (string), configuracion (json, para parámetros específicos del tipo)

### `portafolios`
- id, estudiante_id (FK), tema_id (FK), tipo_registro (enum: foto, audio, emocion, resultado),
  contenido (json o text), emocion_seleccionada (nullable), creado_en (timestamp)

Crea un **seeder** `AmbientesSeeder` que inserte los 5 ambientes con sus colores reales:
- Música: #0F6E56, 🎵
- Polimotor: #534AB7, 🤸
- Lógico: #854F0B, 🧠
- Multisensorial: #185FA5, 🌿
- Tecnología: #993C1D, 💡

Crea también un seeder `EstudiantesDemoSeeder` con 6 estudiantes de ejemplo en el
ambiente Música (Valentina, Mateo, Sofía, Juan, Camila, Luna), cada uno con su
ConfiguracionPin. Usa el PIN ⬤ ★ ♥ (circulo, estrella, corazon) para Valentina como
caso de prueba principal, y PINs diferentes para los demás.

---

## TAREA 4 — Flujo de inicio de sesión por PIN de figuras (ENTREGABLE PRINCIPAL)

Este es el flujo que debe quedar **completamente funcional** al terminar:

### 4.1 — Ruta y controlador
`SesionNinoController` con métodos:
- `bienvenida($ambienteSlug)` → muestra pantalla 1
- `seleccionarAlumno($ambienteSlug)` → lista estudiantes del ambiente (pantalla 2)
- `mostrarPin($ambienteSlug, $estudianteId)` → pantalla 3
- `verificarPin(Request, $ambienteSlug, $estudianteId)` → valida las 3 figuras
  recibidas contra `configuracion_pins`. Si coincide, guarda el `estudiante_id`
  en sesión y redirige a `bienvenidaAmbiente`. Si falla, incrementa
  `intentos_fallidos` y retorna error (vía JSON para AJAX o redirect con error)
- `bienvenidaAmbiente($ambienteSlug)` → pantalla 4, lee de sesión el estudiante
  y muestra su nombre/avatar

### 4.2 — Middleware
`VerificarSesionNino` — protege las rutas de `/ambientes/*` verificando que exista
`estudiante_id` en sesión. Si no existe, redirige a `bienvenida`.

### 4.3 — Vistas Blade (landscape, para tablet)
Implementa las 4 vistas siguiendo este criterio de diseño:

- **Paleta**: fondo oscuro `#060C0A`, verde principal `#0F6E56`, acento dorado `#F59E0B`,
  texto claro `#F0FAF4`
- **Tipografía**: Google Fonts "Fredoka One" para títulos, "Nunito" para textos
- **Layout**: todas las pantallas en formato horizontal (tablet), mínimo 800px de ancho
- **Sin texto largo** — todo pictogramas y palabras sueltas, máximo 4-5 palabras por instrucción
- **Botones táctiles mínimo 72x72px**

`bienvenida.blade.php`:
- Logo del ambiente (usa `$ambiente->icono` y `$ambiente->color_hex`)
- Botón grande "¡Vamos a jugar!" con animación de pulso (CSS @keyframes)
- Link discreto a "Acceso docente"

`seleccionar-alumno.blade.php`:
- Grid de avatares (componente `<x-avatar-alumno>`) — circulo con iniciales,
  color de fondo único por estudiante
- Al hacer click, JS navega a `mostrarPin`

`pin-figuras.blade.php`:
- Muestra avatar y nombre del estudiante seleccionado
- 3 indicadores circulares vacíos (se llenan conforme el niño toca figuras)
- Grid de 8 botones con las figuras geométricas (usa caracteres unicode: ⬤ ★ ♥ ▲ ■ ☽ ◆ ⚡)
- JS: acumula hasta 3 figuras, al llegar a 3 hace POST AJAX a `verificarPin`
- Si correcto: animación de éxito + redirect a `bienvenidaAmbiente`
- Si incorrecto: animación de shake en los indicadores (CSS), mensaje de error,
  reset del estado para reintentar
- Botón "Borrar última" para corregir antes de completar las 3

`bienvenida-ambiente.blade.php`:
- Avatar del estudiante con borde dorado
- "¡Hola, {nombre}!"
- "Ambiente {nombre_ambiente} te espera {icono}"
- 3 estrellas animadas (aparición escalonada)
- Botón "¡Entrar!" → redirige a `/{ambienteSlug}` (inicio del ambiente, aún no
  implementado en esta fase — puede ser una ruta placeholder que muestre
  "Próximamente: Inicio del Ambiente")

### 4.4 — JavaScript del PIN
Implementa la lógica en `public/assets/js/pin-figuras.js`:
- Array de figuras seleccionadas (máx 3)
- Función `seleccionarFigura(figura)` — agrega a array, actualiza indicador visual
- Función `borrarUltima()` — quita la última figura
- Al llegar a 3 figuras: fetch POST a la ruta de verificación con
  `{ figura_1, figura_2, figura_3 }` en JSON
- Maneja la respuesta: success → redirect, error → shake + reset

---

## TAREA 5 — Layout base y componentes

`layouts/ambiente.blade.php`:
- Recibe variables `$ambiente` (objeto) para aplicar dinámicamente
  `--color-ambiente: {{ $ambiente->color_hex }}` como CSS variable
- Incluye Google Fonts (Fredoka One, Nunito)
- `@yield('content')`

Componentes Blade reutilizables:
- `<x-figura-pin :figura="..." :seleccionada="..." />`
- `<x-avatar-alumno :estudiante="..." />`
- `<x-modulo-card :modulo="..." :estado="..." />` (estado: completado, en_progreso, bloqueado)

---

## TAREA 6 — Verificación final

Al terminar, ejecuta:
```bash
php artisan migrate:fresh --seed
php artisan serve
```

Y confirma que el siguiente flujo funciona de extremo a extremo en el navegador:

1. `http://127.0.0.1:8000/musica` → pantalla de bienvenida del Ambiente Música
2. Click en "¡Vamos a jugar!" → selector de alumnos (6 avatares)
3. Click en Valentina → pantalla de PIN
4. Tocar círculo ⬤, estrella ★, corazón ♥ en ese orden → debe validar correcto
   → pantalla de bienvenida personalizada "¡Hola, Valentina!"
5. Probar también un PIN incorrecto para verificar la animación de error

---

## ENTREGABLES ESPERADOS

1. Proyecto Laravel inicializado con estructura de carpetas por ambiente
2. Migraciones + modelos + relaciones Eloquent completas
3. Seeders con los 5 ambientes y 6 estudiantes demo
4. Flujo de login por PIN de figuras 100% funcional (las 4 pantallas)
5. Middleware de sesión del niño
6. Layout base reutilizable por ambiente
7. README.md corto explicando cómo levantar el proyecto y probar el flujo de login

No implementes aún el contenido interno de los módulos/temas de cada ambiente
(eso será en una siguiente fase) — solo deja las rutas, controladores vacíos
(con un método `index` que retorne una vista placeholder) y la estructura de
carpetas lista para recibirlos.
```

---

## Notas

- El campo `condicion` en `estudiantes` está incluido desde la migración inicial
  aunque no se use todavía — esto evita una migración adicional después y mantiene
  la arquitectura alineada con el documento de inclusión del proyecto.
- La estructura de carpetas por ambiente en `routes/`, `views/` y `public/assets/`
  está pensada para que el empaquetado de cada ambiente como APK independiente sea
  un proceso de extracción limpio sin reorganizar código.
- El PIN de prueba ⬤ ★ ♥ (Valentina) es el caso principal para validar el flujo
  completo de login.
