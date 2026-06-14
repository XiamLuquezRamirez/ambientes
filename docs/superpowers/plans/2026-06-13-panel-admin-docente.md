# Panel Admin + Panel Docente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el sistema de autenticación para docentes/admin y los dos paneles de gestión (Panel Administrativo en `/admin` y Panel Docente en `/panel`) sobre la plataforma Aulas Reggio ya inicializada.

**Architecture:** Auth propio con sesión Laravel (email+password), separado del login del niño (PIN de figuras). El Panel Admin es estructural/supervisión con acceso a todos los ambientes; el Panel Docente es local a su ambiente. Comunicación entre servidores mockeada via `sync_queue` local para desarrollo.

**Tech Stack:** Laravel 10, MariaDB, Blade, Vanilla JS / Alpine.js mínimo (sin npm build), Google Fonts cargadas, CSS inline en vistas.

---

## Mapa de archivos

### Migrations (modificar o crear)
| Archivo | Acción |
|---------|--------|
| `database/migrations/2026_06_12_235300_create_docentes_table.php` | Modificar: `ambiente_id` nullable, `rol` enum |
| `database/migrations/2026_06_12_235302_create_modulos_table.php` | Modificar: añadir `visible_estudiantes boolean default true` |
| `database/migrations/2026_06_13_XXXXXX_create_sync_queue_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_configuraciones_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_login_logs_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_notas_docente_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_asistencias_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_observaciones_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_ajustes_temporales_table.php` | Crear |
| `database/migrations/2026_06_13_XXXXXX_create_solicitudes_cambio_condicion_table.php` | Crear |

### Models
| Archivo | Acción |
|---------|--------|
| `app/Models/Docente.php` | Modificar: fillable, relaciones, guard |
| `app/Models/Modulo.php` | Modificar: añadir `visible_estudiantes` a fillable |
| `app/Models/SyncQueue.php` | Crear |
| `app/Models/Configuracion.php` | Crear |
| `app/Models/LoginLog.php` | Crear |
| `app/Models/NotaDocente.php` | Crear |
| `app/Models/Asistencia.php` | Crear |
| `app/Models/Observacion.php` | Crear |
| `app/Models/AjusteTemporal.php` | Crear |
| `app/Models/SolicitudCambioCondicion.php` | Crear |

### Auth & Middleware
| Archivo | Acción |
|---------|--------|
| `app/Http/Controllers/Auth/AuthDocenteController.php` | Crear |
| `app/Http/Middleware/EsAdmin.php` | Crear |
| `app/Http/Middleware/EsDocente.php` | Crear |
| `app/Http/Kernel.php` | Modificar: registrar alias de middleware |
| `resources/views/auth/login-docente.blade.php` | Crear |

### Layouts
| Archivo | Acción |
|---------|--------|
| `resources/views/layouts/admin.blade.php` | Crear (sidebar negro, accent color por ambiente activo) |
| `resources/views/layouts/panel.blade.php` | Crear (sidebar con --color-ambiente del docente) |

### Panel Admin — Controllers
| Archivo | Responsabilidad |
|---------|----------------|
| `app/Http/Controllers/Admin/AdminDashboardController.php` | Redirect a /admin/ambientes |
| `app/Http/Controllers/Admin/AmbienteAdminController.php` | CRUD ambientes + ping |
| `app/Http/Controllers/Admin/SyncLogController.php` | Lista sync_queue paginada |
| `app/Http/Controllers/Admin/ConflictosController.php` | Lista + resolución de conflictos |
| `app/Http/Controllers/Admin/DocenteAdminController.php` | CRUD docentes + reset pass |
| `app/Http/Controllers/Admin/EstudianteAdminController.php` | Lista todos + transfer + reset PIN |
| `app/Http/Controllers/Admin/CatalogoController.php` | CRUD módulos/temas/actividades |
| `app/Http/Controllers/Admin/ReportesController.php` | Dashboard métricas + export CSV |
| `app/Http/Controllers/Admin/ConfiguracionAdminController.php` | Key-value params + logs |
| `app/Http/Controllers/Admin/SolicitudCondicionController.php` | Lista solicitudes cambio condición |

### Panel Admin — Views
```
resources/views/admin/
├── ambientes/index.blade.php
├── ambientes/edit.blade.php
├── sync-log/index.blade.php
├── conflictos/index.blade.php
├── docentes/index.blade.php
├── docentes/create.blade.php
├── docentes/edit.blade.php
├── estudiantes/index.blade.php
├── estudiantes/edit.blade.php
├── catalogo/index.blade.php
├── catalogo/modulo-form.blade.php
├── catalogo/tema-form.blade.php
├── reportes/index.blade.php
├── configuracion/index.blade.php
└── solicitudes/index.blade.php
```

### Panel Docente — Controllers
| Archivo | Responsabilidad |
|---------|----------------|
| `app/Http/Controllers/Panel/EstudiantePanelController.php` | CRUD estudiantes + configurar PIN |
| `app/Http/Controllers/Panel/PlaneacionController.php` | Ver catálogo + toggle visible + notas |
| `app/Http/Controllers/Panel/SesionController.php` | Monitor sesiones + asistencia + sesión asistida |
| `app/Http/Controllers/Panel/PortafolioController.php` | Ver portafolios + observaciones + export PDF |
| `app/Http/Controllers/Panel/InclusionController.php` | Ajustes temporales + solicitud cambio condición |

### Panel Docente — Views
```
resources/views/panel/
├── estudiantes/index.blade.php
├── estudiantes/pin.blade.php
├── planeacion/index.blade.php
├── sesion/index.blade.php
├── portafolio/index.blade.php
├── portafolio/estudiante.blade.php
├── inclusion/index.blade.php
└── inclusion/ajustes.blade.php
```

### Routes
| Archivo | Acción |
|---------|--------|
| `routes/web.php` | Añadir rutas auth docente + /admin/* + /panel/* |
| `routes/api.php` | Añadir /api/sync/health y /api/sync/recibir |

### Seeders
| Archivo | Acción |
|---------|--------|
| `database/seeders/AdminSeeder.php` | Crear: admin + docente líder Música + sync_queue mock |
| `database/seeders/DatabaseSeeder.php` | Modificar: llamar AdminSeeder |

### API
| Archivo | Acción |
|---------|--------|
| `app/Http/Controllers/Api/SyncController.php` | Crear: health + recibir endpoints |

---

## TASK 1 — Migrations

### 1.1 Modificar migración `docentes`

- [ ] Editar `database/migrations/2026_06_12_235300_create_docentes_table.php`:

```php
Schema::create('docentes', function (Blueprint $table) {
    $table->id();
    $table->string('nombre');
    $table->string('email')->unique();
    $table->string('password');
    $table->foreignId('ambiente_id')->nullable()->constrained('ambientes')->nullOnDelete();
    $table->enum('rol', ['admin', 'docente_lider', 'docente_auxiliar'])->default('docente_lider');
    $table->boolean('activo')->default(true);
    $table->rememberToken();
    $table->timestamps();
});
```

### 1.2 Modificar migración `modulos` — añadir `visible_estudiantes`

- [ ] Editar `database/migrations/2026_06_12_235302_create_modulos_table.php`, añadir después de `activo`:

```php
$table->boolean('visible_estudiantes')->default(true);
```

### 1.3 Crear migración `sync_queue`

- [ ] `php artisan make:migration create_sync_queue_table`
- [ ] Contenido:

```php
Schema::create('sync_queue', function (Blueprint $table) {
    $table->id();
    $table->string('entidad');           // 'Estudiante', 'Modulo', etc.
    $table->unsignedBigInteger('entidad_id');
    $table->enum('accion', ['create', 'update', 'delete', 'transfer']);
    $table->string('servidor_origen')->default(config('ambiente.slug'));
    $table->json('payload');
    $table->enum('estado', ['pendiente', 'enviado', 'confirmado', 'error'])->default('pendiente');
    $table->unsignedTinyInteger('intentos')->default(0);
    $table->timestamp('enviado_en')->nullable();
    $table->timestamps();
});
```

### 1.4 Crear migración `configuraciones`

- [ ] `php artisan make:migration create_configuraciones_table`
- [ ] Contenido:

```php
Schema::create('configuraciones', function (Blueprint $table) {
    $table->id();
    $table->string('clave')->unique();
    $table->text('valor')->nullable();
    $table->string('descripcion')->nullable();
    $table->timestamps();
});
```

### 1.5 Crear migración `login_logs`

- [ ] `php artisan make:migration create_login_logs_table`
- [ ] Contenido:

```php
Schema::create('login_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('docente_id')->constrained('docentes')->cascadeOnDelete();
    $table->string('ip', 45)->nullable();
    $table->string('ambiente')->nullable();
    $table->timestamp('fecha')->useCurrent();
});
```

### 1.6 Crear migración `notas_docente`

- [ ] `php artisan make:migration create_notas_docente_table`
- [ ] Contenido:

```php
Schema::create('notas_docente', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tema_id')->constrained('temas')->cascadeOnDelete();
    $table->foreignId('docente_id')->constrained('docentes')->cascadeOnDelete();
    $table->text('contenido');
    $table->timestamps();
});
```

### 1.7 Crear migración `asistencias`

- [ ] `php artisan make:migration create_asistencias_table`
- [ ] Contenido:

```php
Schema::create('asistencias', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->date('fecha');
    $table->boolean('presente')->default(true);
    $table->unique(['estudiante_id', 'fecha']);
    $table->timestamps();
});
```

### 1.8 Crear migración `observaciones`

- [ ] `php artisan make:migration create_observaciones_table`
- [ ] Contenido:

```php
Schema::create('observaciones', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->foreignId('docente_id')->constrained('docentes')->cascadeOnDelete();
    $table->foreignId('tema_id')->nullable()->constrained('temas')->nullOnDelete();
    $table->text('contenido');
    $table->enum('tipo', ['general', 'logro'])->default('general');
    $table->timestamps();
});
```

### 1.9 Crear migración `ajustes_temporales`

- [ ] `php artisan make:migration create_ajustes_temporales_table`
- [ ] Contenido:

```php
Schema::create('ajustes_temporales', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->string('clave');    // subtitulos_forzados, velocidad_animacion, control_voz, temporizador_visual
    $table->string('valor');
    $table->timestamp('expira_en')->nullable();
    $table->unique(['estudiante_id', 'clave']);
    $table->timestamps();
});
```

### 1.10 Crear migración `solicitudes_cambio_condicion`

- [ ] `php artisan make:migration create_solicitudes_cambio_condicion_table`
- [ ] Contenido:

```php
Schema::create('solicitudes_cambio_condicion', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->foreignId('docente_id')->constrained('docentes')->cascadeOnDelete();
    $table->string('condicion_actual');
    $table->string('condicion_solicitada');
    $table->text('justificacion');
    $table->enum('estado', ['pendiente', 'aprobado', 'rechazado'])->default('pendiente');
    $table->timestamps();
});
```

### 1.11 Ejecutar `migrate:fresh --seed` para verificar migraciones

- [ ] `php artisan migrate:fresh --seed`
- [ ] Esperado: todas las tablas DONE sin errores

---

## TASK 2 — Modelos

### 2.1 Actualizar `Docente`

- [ ] Reemplazar `app/Models/Docente.php`:

```php
<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Docente extends Authenticatable
{
    use Notifiable;
    protected $fillable = ['nombre', 'email', 'password', 'ambiente_id', 'rol', 'activo'];
    protected $hidden = ['password', 'remember_token'];

    public function ambiente() { return $this->belongsTo(Ambiente::class); }
    public function loginLogs() { return $this->hasMany(LoginLog::class); }
    public function notas() { return $this->hasMany(NotaDocente::class); }
    public function observaciones() { return $this->hasMany(Observacion::class); }
    public function solicitudes() { return $this->hasMany(SolicitudCambioCondicion::class); }

    public function esAdmin(): bool { return $this->rol === 'admin'; }
    public function esDocente(): bool { return in_array($this->rol, ['docente_lider', 'docente_auxiliar']); }
}
```

### 2.2 Crear modelos nuevos (en paralelo)

- [ ] `app/Models/SyncQueue.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SyncQueue extends Model {
    protected $table = 'sync_queue';
    protected $fillable = ['entidad','entidad_id','accion','servidor_origen','payload','estado','intentos','enviado_en'];
    protected $casts = ['payload' => 'array'];
}
```

- [ ] `app/Models/Configuracion.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Configuracion extends Model {
    protected $fillable = ['clave','valor','descripcion'];
    public static function get(string $clave, $default = null) {
        return static::where('clave', $clave)->value('valor') ?? $default;
    }
    public static function set(string $clave, $valor): void {
        static::updateOrCreate(['clave' => $clave], ['valor' => $valor]);
    }
}
```

- [ ] `app/Models/LoginLog.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoginLog extends Model {
    public $timestamps = false;
    protected $fillable = ['docente_id','ip','ambiente','fecha'];
    public function docente() { return $this->belongsTo(Docente::class); }
}
```

- [ ] `app/Models/NotaDocente.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class NotaDocente extends Model {
    protected $fillable = ['tema_id','docente_id','contenido'];
    public function tema() { return $this->belongsTo(Tema::class); }
    public function docente() { return $this->belongsTo(Docente::class); }
}
```

- [ ] `app/Models/Asistencia.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Asistencia extends Model {
    protected $fillable = ['estudiante_id','fecha','presente'];
    public function estudiante() { return $this->belongsTo(Estudiante::class); }
}
```

- [ ] `app/Models/Observacion.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Observacion extends Model {
    protected $fillable = ['estudiante_id','docente_id','tema_id','contenido','tipo'];
    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function docente() { return $this->belongsTo(Docente::class); }
    public function tema() { return $this->belongsTo(Tema::class); }
}
```

- [ ] `app/Models/AjusteTemporal.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AjusteTemporal extends Model {
    protected $fillable = ['estudiante_id','clave','valor','expira_en'];
    public function estudiante() { return $this->belongsTo(Estudiante::class); }
}
```

- [ ] `app/Models/SolicitudCambioCondicion.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class SolicitudCambioCondicion extends Model {
    protected $fillable = ['estudiante_id','docente_id','condicion_actual','condicion_solicitada','justificacion','estado'];
    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function docente() { return $this->belongsTo(Docente::class); }
}
```

---

## TASK 3 — Auth de docentes/admin

### 3.1 Configurar guard `docente`

- [ ] Editar `config/auth.php`, añadir dentro de `guards`:
```php
'docente' => [
    'driver' => 'session',
    'provider' => 'docentes',
],
```
Y dentro de `providers`:
```php
'docentes' => [
    'driver' => 'eloquent',
    'model' => App\Models\Docente::class,
],
```

### 3.2 Crear `AuthDocenteController`

- [ ] Crear `app/Http/Controllers/Auth/AuthDocenteController.php`:

```php
<?php
namespace App\Http\Controllers\Auth;
use App\Http\Controllers\Controller;
use App\Models\LoginLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthDocenteController extends Controller
{
    public function showLogin() {
        return view('auth.login-docente');
    }

    public function login(Request $request) {
        $creds = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::guard('docente')->attempt($creds, $request->boolean('recordar'))) {
            return back()->withErrors(['email' => 'Credenciales incorrectas.'])->withInput();
        }

        $docente = Auth::guard('docente')->user();

        LoginLog::create([
            'docente_id' => $docente->id,
            'ip'         => $request->ip(),
            'ambiente'   => config('ambiente.slug'),
        ]);

        $request->session()->regenerate();

        return $docente->esAdmin()
            ? redirect()->route('admin.ambientes')
            : redirect()->route('panel.estudiantes');
    }

    public function logout(Request $request) {
        Auth::guard('docente')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('docente.login');
    }
}
```

### 3.3 Crear middleware `EsAdmin`

- [ ] Crear `app/Http/Middleware/EsAdmin.php`:

```php
<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $docente = Auth::guard('docente')->user();
        if (!$docente || !$docente->esAdmin()) {
            return redirect()->route('docente.login')->with('error', 'Acceso restringido a administradores.');
        }
        return $next($request);
    }
}
```

### 3.4 Crear middleware `EsDocente`

- [ ] Crear `app/Http/Middleware/EsDocente.php`:

```php
<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EsDocente
{
    public function handle(Request $request, Closure $next)
    {
        $docente = Auth::guard('docente')->user();
        if (!$docente) {
            return redirect()->route('docente.login');
        }
        // Admin puede acceder a todo; docente solo a su ambiente
        if (!$docente->esAdmin()) {
            if ($docente->ambiente_id === null || $docente->ambiente?->slug !== config('ambiente.slug')) {
                abort(403, 'No tienes acceso a este ambiente.');
            }
        }
        return $next($request);
    }
}
```

### 3.5 Registrar middleware en `Kernel.php`

- [ ] Añadir en `$middlewareAliases`:
```php
'es.admin'   => \App\Http\Middleware\EsAdmin::class,
'es.docente' => \App\Http\Middleware\EsDocente::class,
```

### 3.6 Vista de login `auth/login-docente.blade.php`

- [ ] Crear vista con diseño limpio (fondo `#060C0A`, verde `#0F6E56`, Fredoka One/Nunito):
  - Logo "Aulas Reggio" + texto "Acceso Docente"
  - Campo email, campo password, checkbox "Recordarme"
  - Botón "Ingresar"
  - Mensaje de error si `$errors->any()`
  - Link discreto `← Volver al inicio`

---

## TASK 4 — Rutas

- [ ] Añadir a `routes/web.php`:

```php
// Auth docente
Route::get('/login',  [AuthDocenteController::class, 'showLogin'])->name('docente.login');
Route::post('/login', [AuthDocenteController::class, 'login'])->name('docente.login.post');
Route::post('/logout',[AuthDocenteController::class, 'logout'])->name('docente.logout');

// Panel Admin
Route::prefix('admin')->middleware(['es.admin'])->group(function () {
    Route::get('/', fn() => redirect()->route('admin.ambientes'));
    Route::resource('ambientes', AmbienteAdminController::class)->only(['index','edit','update']);
    Route::post('ambientes/{ambiente}/ping', [AmbienteAdminController::class, 'ping'])->name('admin.ambientes.ping');
    Route::get('sync-log', [SyncLogController::class, 'index'])->name('admin.sync-log');
    Route::get('conflictos', [ConflictosController::class, 'index'])->name('admin.conflictos');
    Route::post('conflictos/{id}/resolver', [ConflictosController::class, 'resolver'])->name('admin.conflictos.resolver');
    Route::resource('docentes', DocenteAdminController::class)->names('admin.docentes');
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
    // Nombre de ruta para resource ambientes
    Route::get('ambientes', [AmbienteAdminController::class, 'index'])->name('admin.ambientes');
});

// Panel Docente
Route::prefix('panel')->middleware(['es.docente'])->group(function () {
    Route::get('/', fn() => redirect()->route('panel.estudiantes'));
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
    Route::get('sesion/activas', [SesionController::class, 'activas'])->name('panel.sesion.activas'); // JSON polling
    Route::get('portafolio', [PortafolioController::class, 'index'])->name('panel.portafolio');
    Route::get('portafolio/{estudiante}', [PortafolioController::class, 'estudiante'])->name('panel.portafolio.estudiante');
    Route::post('portafolio/{estudiante}/observacion', [PortafolioController::class, 'guardarObservacion'])->name('panel.portafolio.observacion');
    Route::get('portafolio/{estudiante}/exportar', [PortafolioController::class, 'exportar'])->name('panel.portafolio.exportar');
    Route::get('inclusion', [InclusionController::class, 'index'])->name('panel.inclusion');
    Route::get('inclusion/{estudiante}', [InclusionController::class, 'ajustes'])->name('panel.inclusion.ajustes');
    Route::post('inclusion/{estudiante}/ajustes', [InclusionController::class, 'updateAjustes'])->name('panel.inclusion.ajustes.update');
    Route::post('inclusion/{estudiante}/solicitud', [InclusionController::class, 'crearSolicitud'])->name('panel.inclusion.solicitud');
});
```

---

## TASK 5 — Layouts

### 5.1 Layout Admin `layouts/admin.blade.php`

- [ ] Crear con:
  - Sidebar negro (`#111`) ancho 240px, fijo
  - Logo "Aulas Reggio" en verde `#0F6E56`
  - Links de navegación: Ambientes, Docentes, Estudiantes, Catálogo, Sync Log, Reportes, Configuración
  - Badge "ADMIN" en color dorado
  - Header con nombre del admin logueado + botón Cerrar Sesión
  - `@yield('content')` en área principal
  - Google Fonts Fredoka One + Nunito

### 5.2 Layout Panel `layouts/panel.blade.php`

- [ ] Crear con:
  - CSS variable `--color-ambiente` leída de `Auth::guard('docente')->user()->ambiente->color_hex`
  - Sidebar con ese color como accent
  - Links: Estudiantes, Planeación, Monitor Sesión, Portafolios, Inclusión
  - Badge con nombre del ambiente + icono
  - Header con nombre del docente + rol + Cerrar Sesión

---

## TASK 6 — Panel Admin: Controllers

### 6.1 `AmbienteAdminController`
- `index()`: devuelve lista de 5 ambientes + count de estudiantes via pivot
- `edit($id)`: form con todos los campos del ambiente
- `update(Request, $id)`: valida y guarda
- `ping($ambiente)`: GET a `http://{servidor_ip}/api/sync/health` con timeout 3s, retorna JSON `{online: bool, latencia_ms: int}`

### 6.2 `SyncLogController`
- `index()`: pagina `sync_queue` con filtros (servidor_origen, estado, fechas), 20 por página

### 6.3 `ConflictosController`
- `index()`: `sync_queue` donde `estado = 'error'` agrupados por `entidad_id`
- `resolver(Request, $id)`: actualiza `estado = 'confirmado'` y crea nuevo registro de re-sincronización

### 6.4 `DocenteAdminController`
- `index()`: lista paginada con filtros por ambiente y rol
- `create()` / `store()`: valida email único, hash password, asigna ambiente_id si no es admin
- `edit()` / `update()`: mismo, password solo si se proporciona
- `destroy()`: soft delete (usar `activo = false`)
- `resetPassword(Docente)`: genera password de 8 chars, actualiza, retorna JSON `{password_temporal: '...'}` — mostrado solo al admin

### 6.5 `EstudianteAdminController`
- `index()`: todos los estudiantes con sus ambientes via pivot, filtros por ambiente/condicion/activo
- `edit(Estudiante)`: form
- `update(Request, Estudiante)`: actualiza condicion, activo; si cambia condicion → encola sync
- `transferir(Request, Estudiante)`: añade/quita ambiente via pivot + crea registro en `sync_queue`
- `resetPin(Estudiante)`: elimina ConfiguracionPin del estudiante

### 6.6 `CatalogoController`
- `index()`: árbol Ambiente > Módulos > Temas por el ambiente seleccionado (param `?ambiente_id=`)
- `storeModulo` / `updateModulo` / `destroyModulo`: CRUD estándar + encolar sync
- `storeTema` / `updateTema`: CRUD estándar + encolar sync

### 6.7 `ReportesController`
- `index()`: métricas desde tablas locales (estudiantes activos, portafolios por tipo, asistencias últimos 7 días, reporte inclusión)
- `exportar()`: genera CSV de estudiantes + sus portafolios usando `fputcsv` nativo PHP

### 6.8 `ConfiguracionAdminController`
- `index()`: carga tabla `configuraciones` + últimas 50 líneas de `storage/logs/laravel.log`
- `update(Request)`: itera params y llama `Configuracion::set()`

### 6.9 `SolicitudCondicionController`
- `index()`: lista solicitudes pendientes
- `resolver(Request, SolicitudCambioCondicion)`: aprueba/rechaza, si aprueba → actualiza condicion del estudiante + sync

---

## TASK 7 — Panel Docente: Controllers

### 7.1 `EstudiantePanelController`
- Todos los métodos filtran por `Auth::guard('docente')->user()->ambiente_id`
- `index()`: lista estudiantes del ambiente via pivot
- `create()` / `store()`: crea estudiante y adjunta al ambiente via pivot, encola sync
- `edit()` / `update()`: valida y guarda, encola sync
- `editPin(Estudiante)`: muestra formulario visual con 8 figuras
- `updatePin(Request, Estudiante)`: valida 3 figuras, actualiza ConfiguracionPin

### 7.2 `PlaneacionController`
- `index()`: lista módulos del ambiente con sus temas y nota del docente actual
- `toggleVisible(Modulo)`: flip `visible_estudiantes`, encola sync
- `guardarNota(Request, Tema)`: upsert en `notas_docente`

### 7.3 `SesionController`
- `index()`: lista estudiantes con asistencia de hoy y estado sesión
- `registrarAsistencia(Request)`: upsert en `asistencias` para lista de IDs
- `sesionAsistida(Estudiante)`: guarda `estudiante_id` en sesión + redirect a `/listo`
- `activas()`: retorna JSON de sesiones activas (estudiantes con `estudiante_id` en sesión — aproximado vía cache o session store)

### 7.4 `PortafolioController`
- `index()`: lista estudiantes del ambiente
- `estudiante(Estudiante)`: portafolios agrupados por fecha + observaciones
- `guardarObservacion(Request, Estudiante)`: crea Observacion
- `exportar(Estudiante)`: genera HTML simple del portafolio, retorna como response download PDF usando `dompdf` — si no disponible, retorna HTML inline con `@media print` CSS

### 7.5 `InclusionController`
- `index()`: lista estudiantes con su condicion y count de ajustes activos
- `ajustes(Estudiante)`: tabla de referencia estática de adaptaciones + ajustes_temporales actuales
- `updateAjustes(Request, Estudiante)`: upsert en `ajustes_temporales` para los 4 toggles
- `crearSolicitud(Request, Estudiante)`: crea SolicitudCambioCondicion

**Tabla de referencia estática de adaptaciones (array PHP):**
```php
protected array $adaptaciones = [
    'tea'           => ['Instrucciones visuales paso a paso', 'Reducción de estímulos visuales', 'Tiempo extendido'],
    'tdah'          => ['Actividades cortas (<5 min)', 'Recordatorios visuales de pausa', 'Gamificación con recompensa inmediata'],
    'disc_visual'   => ['Alto contraste activado', 'Texto ampliado', 'Audio descripción'],
    'disc_auditiva' => ['Video en LSC activado', 'Subtítulos forzados', 'Instrucciones solo visuales'],
    'disc_motriz'   => ['Botones táctiles ampliados (>100px)', 'Tiempo extendido de respuesta', 'Control por voz habilitado'],
    'down'          => ['Vocabulario pictográfico', 'Pasos muy simplificados', 'Refuerzo positivo frecuente'],
    'estandar'      => [],
];
```

---

## TASK 8 — Vistas (diseño)

### Criterios de diseño para Panel Admin
- Fondo `#0F172A` (gris muy oscuro azulado), sidebar `#111827`
- Texto `#F1F5F9`, accent verde `#0F6E56`, dorado `#F59E0B`
- Tablas: fondo `#1E293B`, filas alternadas `#243447`
- Badges de estado: verde (confirmado), amarillo (pendiente), rojo (error)
- Sin frameworks CSS — todo CSS inline en el layout

### Criterios de diseño para Panel Docente
- Hereda `--color-ambiente` del ambiente del docente
- Mismo fondo oscuro `#060C0A` que el frontend del niño
- Tablas más compactas, con accent del color de ambiente

### Vistas críticas a implementar completamente
Cada vista debe ser funcional (formularios que POSTean a las rutas definidas en Task 4):

1. `admin/ambientes/index.blade.php` — tarjetas de 5 ambientes + CRUD inline
2. `admin/docentes/index.blade.php` + `create.blade.php` + `edit.blade.php`
3. `admin/estudiantes/index.blade.php` + `edit.blade.php` (con modal transferir)
4. `admin/catalogo/index.blade.php` — árbol navegable
5. `admin/sync-log/index.blade.php` — tabla paginada
6. `admin/reportes/index.blade.php` — métricas y export
7. `admin/configuracion/index.blade.php` — formulario key-value
8. `panel/estudiantes/index.blade.php` + `panel/estudiantes/pin.blade.php`
9. `panel/planeacion/index.blade.php`
10. `panel/sesion/index.blade.php` — con polling Alpine.js
11. `panel/portafolio/index.blade.php` + `panel/portafolio/estudiante.blade.php`
12. `panel/inclusion/index.blade.php` + `panel/inclusion/ajustes.blade.php`

---

## TASK 9 — API Sync

- [ ] Crear `app/Http/Controllers/Api/SyncController.php`:

```php
public function health() {
    return response()->json([
        'ok'        => true,
        'ambiente'  => config('ambiente.slug'),
        'timestamp' => now()->toIso8601String(),
    ]);
}

public function recibir(Request $request) {
    // Registra en sync_queue como confirmado
    SyncQueue::create([
        'entidad'         => $request->entidad,
        'entidad_id'      => $request->entidad_id,
        'accion'          => $request->accion,
        'servidor_origen' => $request->servidor_origen,
        'payload'         => $request->payload,
        'estado'          => 'confirmado',
    ]);
    return response()->json(['ok' => true]);
}
```

- [ ] Añadir a `routes/api.php`:
```php
Route::get('/sync/health', [SyncController::class, 'health']);
Route::post('/sync/recibir', [SyncController::class, 'recibir']);
```

---

## TASK 10 — Seeders

### 10.1 `AdminSeeder`

- [ ] Crear `database/seeders/AdminSeeder.php`:

```php
// Crear admin
Docente::firstOrCreate(['email' => 'admin@aulasreggio.test'], [
    'nombre'    => 'Administrador',
    'password'  => Hash::make('password'),
    'rol'       => 'admin',
    'ambiente_id' => null,
    'activo'    => true,
]);

// Docente líder de Música
$musica = Ambiente::where('slug', 'musica')->first();
Docente::firstOrCreate(['email' => 'docente.musica@aulasreggio.test'], [
    'nombre'      => 'Docente Líder Música',
    'password'    => Hash::make('password'),
    'rol'         => 'docente_lider',
    'ambiente_id' => $musica->id,
    'activo'      => true,
]);

// Configuraciones por defecto
Configuracion::set('tiempo_sesion_minutos', '60');
Configuracion::set('intentos_max_pin', '5');
Configuracion::set('idioma', 'es');
Configuracion::set('zona_horaria', 'America/Bogota');

// sync_queue mock (datos de otros 4 servidores para que el UI tenga contenido)
$servidores = ['polimotor', 'logico', 'multisensorial', 'tecnologia'];
foreach ($servidores as $slug) {
    SyncQueue::create([
        'entidad' => 'Estudiante', 'entidad_id' => 1,
        'accion' => 'update', 'servidor_origen' => $slug,
        'payload' => ['nombre' => 'Valentina', 'activo' => true],
        'estado' => 'confirmado',
    ]);
}
```

### 10.2 Actualizar `DatabaseSeeder`

- [ ] Añadir `AdminSeeder::class` al array de `$this->call()`

### 10.3 Ejecutar y verificar

- [ ] `php artisan migrate:fresh --seed`
- [ ] Verificar con `php artisan tinker`:
  - `Docente::all()` → 2 registros
  - `Configuracion::all()` → 4 registros
  - `SyncQueue::all()` → 4 registros mock

---

## TASK 11 — Verificación final del flujo

- [ ] `php artisan serve --port=8000`
- [ ] GET `http://127.0.0.1:8000/login` → muestra login-docente
- [ ] POST con `admin@aulasreggio.test` / `password` → redirect a `/admin/ambientes`
- [ ] `/admin/ambientes` muestra los 5 ambientes con sus colores
- [ ] `/admin/docentes` muestra 2 docentes
- [ ] Logout → redirect a `/login`
- [ ] Login con `docente.musica@aulasreggio.test` / `password` → redirect a `/panel/estudiantes`
- [ ] `/panel/estudiantes` muestra solo estudiantes del ambiente Música
- [ ] `/panel/estudiantes/{id}/pin` → formulario de 8 figuras para configurar PIN
- [ ] POST nuevo PIN para Valentina → el login del niño funciona con el nuevo PIN

---

## Notas de implementación

- **Sin internet**: no usar CDNs para librerías JS. Alpine.js debe incluirse local desde `public/assets/js/alpine.min.js` (copiar manualmente o usar versión inline mínima)
- **Sin npm**: todo CSS inline en los layouts, sin Vite build
- **dompdf**: instalar con `composer require dompdf/dompdf` si disponible. Si falla, el endpoint de exportar retorna HTML con `@media print` CSS como fallback
- **Paginación**: usar `->paginate(20)` de Eloquent + `{{ $items->links() }}` con estilos mínimos inline
- **CSRF**: todos los forms `@csrf`, todos los fetch AJAX incluyen header `X-CSRF-TOKEN`
- **Soft deletes en docentes**: usar campo `activo` en vez de `SoftDeletes` de Laravel para simplicidad
