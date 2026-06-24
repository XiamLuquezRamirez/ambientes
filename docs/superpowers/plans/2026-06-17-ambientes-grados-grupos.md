# Ambientes, Grados y Grupos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo completo de gestión de Ambientes, Grados y Grupos en `/admin/ambientes`, incluyendo UI con tarjetas, modales Bootstrap 5, dropdowns vanilla JS y panel interior de grados/grupos por ambiente.

**Architecture:** El controlador `AmbienteAdminController` maneja CRUD de ambientes con respuestas AJAX/JSON; un nuevo `GradoGrupoController` gestiona la relación `ambiente_grado` (pivot) y los grupos por ambiente. Las vistas usan el layout `layouts/admin.blade.php` existente con Bootstrap 5 y SweetAlert2 ya incluidos. JS vanilla en `public/assets/js/admin/ambientes.js`.

**Tech Stack:** Laravel 10 · MariaDB · Blade · Bootstrap 5 · JS vanilla · SweetAlert2 · Trait Sincronizable (ya existe en modelos)

---

## Estado inicial detectado

| Componente | Estado |
|---|---|
| `AmbienteAdminController` | Existe — métodos incompletos/pendientes |
| `Ambiente`, `Grado`, `Grupo` models | Existen — faltan relaciones de `ambiente_grado` |
| `resources/views/admin/ambientes/index.blade.php` | Existe — solo placeholder |
| `resources/views/admin/ambientes/edit.blade.php` | Existe — solo placeholder |
| `public/assets/js/admin/` | NO existe |
| Migración `ambiente_grado` | NO existe — hay que crear |
| Columna `ambiente_id` en `grupos` | NO existe — `grupos` solo tiene `grado_id` |
| `GradoGrupoController` | NO existe |
| `AmbientesSeeder` — grados/grupos demo | Solo inserta los 5 ambientes, sin grados ni grupos |

---

## Archivos que se crean o modifican

| Acción | Archivo |
|---|---|
| CREAR migración | `database/migrations/2026_06_17_XXXX_create_ambiente_grado_table.php` |
| CREAR migración | `database/migrations/2026_06_17_XXXX_add_ambiente_id_to_grupos_table.php` |
| MODIFICAR | `app/Models/Ambiente.php` |
| MODIFICAR | `app/Models/Grado.php` |
| MODIFICAR | `app/Models/Grupo.php` |
| MODIFICAR | `app/Http/Controllers/Admin/AmbienteAdminController.php` |
| CREAR | `app/Http/Controllers/Admin/GradoGrupoController.php` |
| MODIFICAR | `routes/web.php` |
| MODIFICAR | `resources/views/admin/ambientes/index.blade.php` |
| CREAR | `resources/views/admin/ambientes/grados-grupos.blade.php` |
| CREAR | `public/assets/js/admin/ambientes.js` |
| MODIFICAR | `database/seeders/AmbientesSeeder.php` |

---

## Task 1 — Migraciones de base de datos

**Archivos:**
- Crear: `database/migrations/2026_06_17_200000_create_ambiente_grado_table.php`
- Crear: `database/migrations/2026_06_17_200001_add_ambiente_id_to_grupos_table.php`

- [ ] **Paso 1: Crear migración de tabla pivot `ambiente_grado`**

```bash
php artisan make:migration create_ambiente_grado_table
```

Contenido del archivo generado:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ambiente_grado', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ambiente_id')->constrained('ambientes')->cascadeOnDelete();
            $table->foreignId('grado_id')->constrained('grados')->cascadeOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['ambiente_id', 'grado_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ambiente_grado');
    }
};
```

- [ ] **Paso 2: Crear migración para agregar `ambiente_id` a `grupos`**

```bash
php artisan make:migration add_ambiente_id_to_grupos_table
```

Contenido:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            $table->foreignId('ambiente_id')
                  ->nullable()
                  ->after('id')
                  ->constrained('ambientes')
                  ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('grupos', function (Blueprint $table) {
            $table->dropForeign(['ambiente_id']);
            $table->dropColumn('ambiente_id');
        });
    }
};
```

- [ ] **Paso 3: Ejecutar migraciones**

```bash
php artisan migrate
```

Resultado esperado: `Running migrations... ambiente_grado ... DONE` y `grupos ... DONE`

- [ ] **Paso 4: Commit**

```bash
git add database/migrations/
git commit -m "feat: agregar tabla ambiente_grado y ambiente_id en grupos"
```

---

## Task 2 — Actualizar Modelos

**Archivos:**
- Modificar: `app/Models/Ambiente.php`
- Modificar: `app/Models/Grado.php`
- Modificar: `app/Models/Grupo.php`

- [ ] **Paso 1: Actualizar `Ambiente.php` con relaciones de grados y grupos**

Reemplazar el contenido completo del modelo:

```php
<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Ambiente extends Model
{
    use Sincronizable;

    protected $fillable = ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function docentes()
    {
        return $this->belongsToMany(Docente::class, 'carga_docente')
            ->where('carga_docente.activo', true)
            ->where('carga_docente.anio_lectivo', date('Y'))
            ->distinct();
    }

    public function modulos()
    {
        return $this->hasMany(Modulo::class)->orderBy('orden');
    }

    public function gradosHabilitados()
    {
        return $this->belongsToMany(Grado::class, 'ambiente_grado')
            ->withPivot('activo')
            ->wherePivot('activo', 1)
            ->orderBy('orden');
    }

    public function todosGrados()
    {
        return $this->belongsToMany(Grado::class, 'ambiente_grado')
            ->withPivot('activo')
            ->orderBy('orden');
    }

    public function grupos()
    {
        return $this->hasMany(Grupo::class);
    }
}
```

- [ ] **Paso 2: Actualizar `Grado.php` con método `gruposEnAmbiente`**

```php
<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Grado extends Model
{
    use Sincronizable;

    protected $table = 'grados';

    protected $fillable = ['nombre', 'edad_anos', 'descripcion', 'orden', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function grupos()
    {
        return $this->hasMany(Grupo::class);
    }

    public function gruposEnAmbiente(int $ambienteId)
    {
        return $this->grupos()->where('ambiente_id', $ambienteId);
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true)->orderBy('orden');
    }
}
```

- [ ] **Paso 3: Actualizar `Grupo.php` — agregar `ambiente_id` a fillable y `totalMatriculas`**

```php
<?php

namespace App\Models;

use App\Traits\Sincronizable;
use Illuminate\Database\Eloquent\Model;

class Grupo extends Model
{
    use Sincronizable;

    protected $table = 'grupos';

    protected $fillable = ['ambiente_id', 'grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function ambiente()
    {
        return $this->belongsTo(Ambiente::class);
    }

    public function grado()
    {
        return $this->belongsTo(Grado::class);
    }

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function cargasDocente()
    {
        return $this->hasMany(CargaDocente::class);
    }

    public function getNombreCompletoAttribute(): string
    {
        return $this->grado->nombre . ' ' . $this->nombre;
    }

    public function totalMatriculas(): int
    {
        return $this->matriculas()
            ->where('estado', 'activo')
            ->where('anio_lectivo', date('Y'))
            ->count();
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeDelAnio($query, $anio = null)
    {
        return $query->where('anio_lectivo', $anio ?? date('Y'));
    }
}
```

- [ ] **Paso 4: Commit**

```bash
git add app/Models/
git commit -m "feat: agregar relaciones ambiente_grado y ambiente_id a modelos"
```

---

## Task 3 — AmbienteAdminController

**Archivos:**
- Modificar: `app/Http/Controllers/Admin/AmbienteAdminController.php`

- [ ] **Paso 1: Reemplazar el controlador completo**

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AmbienteAdminController extends Controller
{
    public function listar()
    {
        $ambientes = Ambiente::withCount([
            'gradosHabilitados',
            'grupos' => fn($q) => $q->where('activo', true)->where('anio_lectivo', date('Y')),
        ])
        ->with('gradosHabilitados')
        ->orderBy('nombre')
        ->get();

        return view('admin.ambientes.index', compact('ambientes'));
    }

    public function guardar(Request $request)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:255',
            'slug'        => 'required|string|max:255|unique:ambientes,slug',
            'color_hex'   => 'required|string|max:9',
            'icono'       => 'required|string|max:255',
            'servidor_ip' => 'nullable|ip',
        ]);

        $datos['activo'] = true;
        Ambiente::create($datos);

        if ($request->ajax()) {
            return response()->json(['ok' => true, 'mensaje' => 'Ambiente creado exitosamente.']);
        }

        return redirect()->route('admin.ambientes')->with('success', 'Ambiente creado exitosamente.');
    }

    public function actualizar(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:255',
            'slug'        => 'required|string|max:255|unique:ambientes,slug,' . $ambiente->id,
            'color_hex'   => 'required|string|max:9',
            'icono'       => 'required|string|max:255',
            'servidor_ip' => 'nullable|ip',
        ]);

        $ambiente->update($datos);

        if ($request->ajax()) {
            return response()->json(['ok' => true, 'mensaje' => 'Ambiente actualizado exitosamente.']);
        }

        return redirect()->route('admin.ambientes')->with('success', 'Ambiente actualizado exitosamente.');
    }

    public function toggleActivo(Ambiente $ambiente)
    {
        $ambiente->update(['activo' => !$ambiente->activo]);

        return response()->json([
            'activo'  => $ambiente->activo,
            'mensaje' => $ambiente->activo ? 'Ambiente activado.' : 'Ambiente desactivado.',
        ]);
    }

    public function verificarConexion(Ambiente $ambiente)
    {
        return response()->json(['ok' => false, 'mensaje' => 'Pendiente de implementación.'], 501);
    }
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/Http/Controllers/Admin/AmbienteAdminController.php
git commit -m "feat: implementar AmbienteAdminController con CRUD y toggle"
```

---

## Task 4 — GradoGrupoController

**Archivos:**
- Crear: `app/Http/Controllers/Admin/GradoGrupoController.php`

- [ ] **Paso 1: Crear el controlador**

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Http\Request;

class GradoGrupoController extends Controller
{
    public function gestionar(Ambiente $ambiente)
    {
        $grados = Grado::activos()->get();

        // Para cada grado: ¿está habilitado en este ambiente? + sus grupos
        $gradosConInfo = $grados->map(function (Grado $grado) use ($ambiente) {
            $pivot     = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();
            $habilitado = $pivot ? (bool) $pivot->pivot->activo : false;
            $grupos    = $grado->gruposEnAmbiente($ambiente->id)
                               ->orderBy('nombre')
                               ->get();

            return [
                'grado'      => $grado,
                'habilitado' => $habilitado,
                'grupos'     => $grupos,
            ];
        });

        return view('admin.ambientes.grados-grupos', compact('ambiente', 'gradosConInfo'));
    }

    public function toggleGrado(Request $request, Ambiente $ambiente, Grado $grado)
    {
        $pivot = $ambiente->todosGrados()->where('grado_id', $grado->id)->first();

        if ($pivot) {
            $nuevoEstado = !(bool) $pivot->pivot->activo;
            $ambiente->todosGrados()->updateExistingPivot($grado->id, ['activo' => $nuevoEstado]);
        } else {
            $ambiente->todosGrados()->attach($grado->id, ['activo' => true]);
            $nuevoEstado = true;
        }

        return response()->json(['habilitado' => $nuevoEstado]);
    }

    public function guardarGrupo(Request $request, Ambiente $ambiente)
    {
        $datos = $request->validate([
            'grado_id'     => 'required|exists:grados,id',
            'nombre'       => 'required|string|max:10',
            'anio_lectivo' => 'required|integer|min:2024|max:2030',
            'cupo_maximo'  => 'required|integer|min:1|max:60',
        ]);

        $existe = Grupo::where('ambiente_id', $ambiente->id)
                       ->where('grado_id', $datos['grado_id'])
                       ->where('nombre', $datos['nombre'])
                       ->where('anio_lectivo', $datos['anio_lectivo'])
                       ->exists();

        if ($existe) {
            return response()->json([
                'ok'      => false,
                'mensaje' => 'Ya existe un grupo con ese nombre en este grado y año lectivo.',
            ], 422);
        }

        $grupo = Grupo::create([
            'ambiente_id'  => $ambiente->id,
            'grado_id'     => $datos['grado_id'],
            'nombre'       => strtoupper($datos['nombre']),
            'anio_lectivo' => $datos['anio_lectivo'],
            'cupo_maximo'  => $datos['cupo_maximo'],
            'activo'       => true,
        ]);

        $grupo->load('grado');

        return response()->json(['ok' => true, 'grupo' => $grupo]);
    }

    public function actualizarGrupo(Request $request, Ambiente $ambiente, Grupo $grupo)
    {
        $datos = $request->validate([
            'nombre'      => 'required|string|max:10',
            'cupo_maximo' => 'required|integer|min:1|max:60',
        ]);

        $grupo->update([
            'nombre'      => strtoupper($datos['nombre']),
            'cupo_maximo' => $datos['cupo_maximo'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function eliminarGrupo(Ambiente $ambiente, Grupo $grupo)
    {
        $activos = $grupo->totalMatriculas();

        if ($activos > 0) {
            return response()->json([
                'ok'      => false,
                'mensaje' => "El grupo tiene {$activos} estudiante(s) activo(s).",
            ], 422);
        }

        $grupo->delete();

        return response()->json(['ok' => true]);
    }
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/Http/Controllers/Admin/GradoGrupoController.php
git commit -m "feat: crear GradoGrupoController con gestión de grados y grupos"
```

---

## Task 5 — Actualizar Rutas

**Archivos:**
- Modificar: `routes/web.php`

- [ ] **Paso 1: Agregar imports y nuevas rutas al grupo `admin`**

Agregar al inicio del archivo junto a los otros imports:

```php
use App\Http\Controllers\Admin\GradoGrupoController;
```

Dentro del grupo `Route::prefix('admin')->middleware(['es.admin'])->group(...)`, reemplazar el bloque de Ambientes completo:

```php
// Ambientes
Route::get('ambientes',                         [AmbienteAdminController::class, 'listar'])->name('admin.ambientes');
Route::post('ambientes',                        [AmbienteAdminController::class, 'guardar'])->name('admin.ambientes.store');
Route::put('ambientes/{ambiente}',              [AmbienteAdminController::class, 'actualizar'])->name('admin.ambientes.update');
Route::patch('ambientes/{ambiente}/toggle',     [AmbienteAdminController::class, 'toggleActivo'])->name('admin.ambientes.toggle');
Route::post('ambientes/{ambiente}/ping',        [AmbienteAdminController::class, 'verificarConexion'])->name('admin.ambientes.ping');

// Grados y grupos dentro de un ambiente
Route::get('ambientes/{ambiente}/grados-grupos',              [GradoGrupoController::class, 'gestionar'])->name('admin.ambientes.grados-grupos');
Route::patch('ambientes/{ambiente}/grados/{grado}/toggle',   [GradoGrupoController::class, 'toggleGrado'])->name('admin.ambientes.grados.toggle');
Route::post('ambientes/{ambiente}/grupos',                    [GradoGrupoController::class, 'guardarGrupo'])->name('admin.ambientes.grupos.store');
Route::put('ambientes/{ambiente}/grupos/{grupo}',             [GradoGrupoController::class, 'actualizarGrupo'])->name('admin.ambientes.grupos.update');
Route::delete('ambientes/{ambiente}/grupos/{grupo}',          [GradoGrupoController::class, 'eliminarGrupo'])->name('admin.ambientes.grupos.destroy');
```

- [ ] **Paso 2: Verificar que las rutas registran correctamente**

```bash
php artisan route:list --path=admin/ambientes
```

Esperado: ver las 10 rutas listadas arriba con sus nombres y métodos HTTP.

- [ ] **Paso 3: Commit**

```bash
git add routes/web.php
git commit -m "feat: agregar rutas de grados-grupos y CRUD completo de ambientes"
```

---

## Task 6 — Vista index de ambientes

**Archivos:**
- Modificar: `resources/views/admin/ambientes/index.blade.php`

- [ ] **Paso 1: Reemplazar con la vista completa**

```blade
@extends('layouts.admin')
@section('title', 'Ambientes')

@push('styles')
<style>
/* ── Grid de tarjetas ────────────────────────────────────────── */
.ambientes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 24px;
}
.ambiente-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    transition: box-shadow .2s;
    position: relative;
}
.ambiente-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.10); }

/* Franja de color superior */
.card-franja {
    height: 6px;
}

/* Cabecera de tarjeta */
.card-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 20px 20px 0;
}
.card-icono {
    width: 48px; height: 48px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; flex-shrink: 0;
}
.card-info { flex: 1; }
.card-nombre { font-weight: 700; font-size: 1rem; color: #1E293B; }
.card-ip { font-family: monospace; font-size: 0.78rem; color: #64748B; margin-top: 2px; }

/* Botón de tres puntos */
.btn-menu {
    background: none; border: none;
    color: #94A3B8; font-size: 1.2rem;
    cursor: pointer; padding: 4px 8px;
    border-radius: 6px; transition: background .15s;
    line-height: 1;
}
.btn-menu:hover { background: #F1F5F9; color: #475569; }

/* Dropdown */
.dropdown-menu-card {
    position: absolute; top: 54px; right: 12px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,.12);
    z-index: 50;
    min-width: 200px;
    display: none;
    overflow: hidden;
}
.dropdown-menu-card.abierto { display: block; }
.dropdown-menu-card a,
.dropdown-menu-card button {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 16px;
    font-size: 0.86rem; color: #1E293B;
    background: none; border: none;
    text-decoration: none; text-align: left;
    cursor: pointer; transition: background .12s;
    font-family: 'Nunito', sans-serif;
}
.dropdown-menu-card a:hover,
.dropdown-menu-card button:hover { background: #F8FAFC; }
.dropdown-item-danger { color: #DC2626 !important; }

/* Cuerpo de tarjeta */
.card-body-amb { padding: 16px 20px; }

/* Badges */
.badge-estado {
    display: inline-block; padding: 3px 10px;
    border-radius: 99px; font-size: 0.74rem; font-weight: 600;
}
.badge-activo   { background: #ECFDF5; color: #065F46; }
.badge-inactivo { background: #FEF2F2; color: #991B1B; }
.badge-grados   { background: #EFF6FF; color: #1D4ED8; font-size: 0.74rem; padding: 3px 10px; border-radius: 99px; }

/* Footer de tarjeta */
.card-footer-amb {
    padding: 12px 20px;
    border-top: 1px solid #F1F5F9;
    background: #F8FAFC;
    font-size: 0.8rem;
    color: #64748B;
}
.grados-lista { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.grado-chip {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 6px; padding: 2px 8px;
    font-size: 0.75rem; color: #475569;
}

/* ── Estilos del Modal ───────────────────────────────────────── */
#modalAmbiente .modal-content {
    border: none; border-radius: 16px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(37,99,235,.2);
}
#modalAmbiente .modal-header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    border-bottom: none; padding: 20px 24px;
}
#modalAmbiente .modal-title { font-family: 'Fredoka One', cursive; color: #fff; font-size: 1.15rem; }
#modalAmbiente .btn-close { filter: brightness(0) invert(1); opacity: .75; }
#modalAmbiente .modal-body { padding: 24px; }
#modalAmbiente .modal-footer { border-top: 1px solid #E2E8F0; padding: 16px 24px 20px; gap: 10px; }
.preview-color {
    width: 36px; height: 36px; border-radius: 8px;
    border: 2px solid #E2E8F0; flex-shrink: 0;
}
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Ambientes</h1>
        <p>5 ambientes de aprendizaje en la red local</p>
    </div>
    <button class="btn btn-primary" onclick="abrirModalAmbiente('crear')">
        <i class="fas fa-plus"></i> Nuevo Ambiente
    </button>
</div>

{{-- ── Grid de tarjetas ─────────────────────────────────────── --}}
<div class="ambientes-grid" id="gridAmbientes">
    @foreach($ambientes as $amb)
    <div class="ambiente-card" id="card-{{ $amb->id }}">
        <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

        <div class="card-head">
            <div class="card-icono" style="background:{{ $amb->color_hex }}22">
                {{ $amb->icono }}
            </div>
            <div class="card-info">
                <div class="card-nombre">{{ $amb->nombre }}</div>
                <div class="card-ip">{{ $amb->servidor_ip ?? 'Sin IP' }}</div>
            </div>
            <button class="btn-menu" onclick="abrirMenu({{ $amb->id }})" title="Opciones">⋯</button>
        </div>

        {{-- Dropdown ─────────────────────────────────────────── --}}
        <div class="dropdown-menu-card" id="menu-{{ $amb->id }}">
            <a href="#" onclick="abrirModalAmbiente('editar', {{ $amb->id }}); return false;">
                <i class="fas fa-edit"></i> Editar ambiente
            </a>
            <a href="{{ route('admin.ambientes.grados-grupos', $amb) }}">
                <i class="fas fa-layer-group"></i> Gestionar grados y grupos
            </a>
            <button
                onclick="toggleActivo({{ $amb->id }}, '{{ addslashes($amb->nombre) }}', {{ $amb->activo ? 'true' : 'false' }})"
                class="{{ !$amb->activo ? 'dropdown-item-danger' : '' }}">
                <i class="fas fa-{{ $amb->activo ? 'ban' : 'check-circle' }}"></i>
                {{ $amb->activo ? 'Desactivar' : 'Activar' }}
            </button>
        </div>

        {{-- Cuerpo ───────────────────────────────────────────── --}}
        <div class="card-body-amb" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge-estado {{ $amb->activo ? 'badge-activo' : 'badge-inactivo' }}" id="badge-estado-{{ $amb->id }}">
                {{ $amb->activo ? 'Activo' : 'Inactivo' }}
            </span>
            <span class="badge-grados">
                {{ $amb->grados_habilitados_count }} grado(s) habilitado(s)
            </span>
        </div>

        {{-- Footer ───────────────────────────────────────────── --}}
        <div class="card-footer-amb">
            <div>{{ $amb->grupos_count }} grupo(s) activos este año</div>
            <div class="grados-lista">
                @foreach($amb->gradosHabilitados as $g)
                    <span class="grado-chip">{{ $g->nombre }}</span>
                @endforeach
                @if($amb->gradosHabilitados->isEmpty())
                    <span style="color:#94A3B8;font-size:0.75rem">Sin grados habilitados</span>
                @endif
            </div>
        </div>

        {{-- Data para JS ─────────────────────────────────────── --}}
        <script>
        window._ambientes = window._ambientes || {};
        window._ambientes[{{ $amb->id }}] = {
            id: {{ $amb->id }},
            nombre: @json($amb->nombre),
            slug: @json($amb->slug),
            color_hex: @json($amb->color_hex),
            icono: @json($amb->icono),
            servidor_ip: @json($amb->servidor_ip),
            activo: {{ $amb->activo ? 'true' : 'false' }},
        };
        </script>
    </div>
    @endforeach
</div>

{{-- ── Modal Crear/Editar Ambiente (Bootstrap 5) ──────────────── --}}
<div class="modal fade" id="modalAmbiente" tabindex="-1"
     data-bs-backdrop="static" data-bs-keyboard="false"
     aria-labelledby="modalAmbienteTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAmbienteTitulo">Nuevo Ambiente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <form id="formAmbiente">
                    @csrf
                    <input type="hidden" id="ambienteId" name="_ambiente_id" value="">
                    <div class="mb-3">
                        <label class="form-label">Nombre</label>
                        <input type="text" id="ambNombre" name="nombre" class="form-control"
                               oninput="autoSlug()" autocomplete="off">
                        <div class="campo-error" id="err-nombre"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Slug <span style="color:#94A3B8;font-size:.78rem">(auto-generado)</span></label>
                        <input type="text" id="ambSlug" name="slug" class="form-control" autocomplete="off">
                        <div class="campo-error" id="err-slug"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Color</label>
                        <div style="display:flex;gap:10px;align-items:center">
                            <input type="text" id="ambColor" name="color_hex" class="form-control"
                                   placeholder="#0F6E56" maxlength="9"
                                   oninput="actualizarPreviewColor()" autocomplete="off">
                            <div class="preview-color" id="previewColor"></div>
                        </div>
                        <div class="campo-error" id="err-color_hex"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ícono <span style="color:#94A3B8;font-size:.78rem">(emoji)</span></label>
                        <input type="text" id="ambIcono" name="icono" class="form-control"
                               placeholder="🎵" autocomplete="off">
                        <div class="campo-error" id="err-icono"></div>
                    </div>
                    <div class="mb-0">
                        <label class="form-label">IP del servidor <span style="color:#94A3B8;font-size:.78rem">(opcional)</span></label>
                        <input type="text" id="ambIp" name="servidor_ip" class="form-control"
                               placeholder="192.168.1.20" autocomplete="off">
                        <div class="campo-error" id="err-servidor_ip"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btnGuardarAmbiente" class="btn btn-primary"
                        onclick="guardarAmbiente()">Crear Ambiente</button>
            </div>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
```

- [ ] **Paso 2: Commit**

```bash
git add resources/views/admin/ambientes/index.blade.php
git commit -m "feat: vista index de ambientes con tarjetas, dropdown y modal Bootstrap"
```

---

## Task 7 — Vista grados-grupos

**Archivos:**
- Crear: `resources/views/admin/ambientes/grados-grupos.blade.php`

- [ ] **Paso 1: Crear la vista**

```blade
@extends('layouts.admin')
@section('title', 'Grados y Grupos — ' . $ambiente->nombre)

@push('styles')
<style>
/* ── Header de sección ───────────────────────────────────────── */
.seccion-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px;
}
.amb-badge-header {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 99px;
    font-size: 0.88rem; font-weight: 600;
}

/* ── Bloques de grado ────────────────────────────────────────── */
.grado-bloque {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 14px; margin-bottom: 16px; overflow: hidden;
}
.grado-bloque-header {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
    border-bottom: 1px solid #F1F5F9;
}
.grado-nombre { font-weight: 700; font-size: 0.95rem; color: #1E293B; }
.grado-edad   { font-size: 0.78rem; color: #64748B; margin-left: 4px; }
.grado-bloque-body { padding: 16px 20px; }
.grado-bloque-body.oculto { display: none; }

/* ── Toggle switch ───────────────────────────────────────────── */
.toggle-sw {
    position: relative; width: 44px; height: 24px;
    margin-left: auto;
}
.toggle-sw input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
    position: absolute; cursor: pointer; inset: 0;
    background: #CBD5E1; border-radius: 99px;
    transition: background .2s;
}
.toggle-slider::before {
    content: ''; position: absolute;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; left: 3px; top: 3px;
    transition: transform .2s;
}
.toggle-sw input:checked + .toggle-slider { background: #2563EB; }
.toggle-sw input:checked + .toggle-slider::before { transform: translateX(20px); }

/* ── Fila de grupo ───────────────────────────────────────────── */
.grupo-fila {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid #F8FAFC;
}
.grupo-fila:last-of-type { border-bottom: none; }
.grupo-nombre-txt { font-weight: 600; font-size: 0.9rem; color: #1E293B; }
.grupo-chip {
    background: #EFF6FF; color: #1D4ED8; border-radius: 6px;
    padding: 2px 8px; font-size: 0.75rem;
}
.grupo-acciones { margin-left: auto; display: flex; gap: 6px; }
.btn-grupo {
    border: 1px solid transparent; border-radius: 6px; padding: 4px 10px;
    font-size: 0.76rem; cursor: pointer; transition: all .15s;
    font-family: 'Nunito', sans-serif;
}
.btn-editar-grupo  { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
.btn-editar-grupo:hover  { background: #2563EB; color: #fff; }
.btn-eliminar-grupo { background: #FEF2F2; border-color: #FECACA; color: #DC2626; }
.btn-eliminar-grupo:hover { background: #DC2626; color: #fff; }

/* ── Link agregar grupo en grado ─────────────────────────────── */
.link-agregar-grupo {
    display: inline-block; margin-top: 12px;
    font-size: 0.82rem; color: #2563EB; cursor: pointer;
    text-decoration: none;
}
.link-agregar-grupo:hover { text-decoration: underline; }

/* ── Modal ───────────────────────────────────────────────────── */
#modalGrupo .modal-content {
    border: none; border-radius: 16px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(37,99,235,.2);
}
#modalGrupo .modal-header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    border-bottom: none; padding: 20px 24px;
}
#modalGrupo .modal-title { font-family: 'Fredoka One', cursive; color: #fff; font-size: 1.15rem; }
#modalGrupo .btn-close { filter: brightness(0) invert(1); opacity: .75; }
#modalGrupo .modal-body { padding: 24px; }
#modalGrupo .modal-footer { border-top: 1px solid #E2E8F0; padding: 16px 24px 20px; gap: 10px; }

.campo-error { color: #DC2626; font-size: 0.78rem; margin-top: 4px; }
</style>
@endpush

@section('content')
{{-- ── Header ───────────────────────────────────────────────── --}}
<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap">
    <a href="{{ route('admin.ambientes') }}" class="btn btn-sm"
       style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0">
        <i class="fas fa-arrow-left"></i> Volver
    </a>
    <span class="amb-badge-header"
          style="background:{{ $ambiente->color_hex }}22;color:{{ $ambiente->color_hex }}">
        {{ $ambiente->icono }} {{ $ambiente->nombre }}
    </span>
    <span style="font-family:monospace;font-size:0.8rem;color:#64748B">
        {{ $ambiente->servidor_ip ?? 'Sin IP' }}
    </span>
    <button class="btn btn-primary btn-sm ms-auto" onclick="abrirModalGrupo()">
        <i class="fas fa-plus"></i> Agregar grupo
    </button>
</div>

<h2 style="font-size:1.1rem;font-weight:700;color:#1E293B;margin-bottom:16px">
    Grados habilitados y grupos
</h2>

{{-- ── Bloques por grado ────────────────────────────────────── --}}
@foreach($gradosConInfo as $item)
@php
    $grado      = $item['grado'];
    $habilitado = $item['habilitado'];
    $grupos     = $item['grupos'];
@endphp
<div class="grado-bloque" id="bloque-grado-{{ $grado->id }}">
    <div class="grado-bloque-header">
        <div>
            <span class="grado-nombre">{{ $grado->nombre }}</span>
            <span class="grado-edad">({{ $grado->edad_anos }} años)</span>
        </div>
        <label class="toggle-sw" title="{{ $habilitado ? 'Deshabilitar' : 'Habilitar' }} grado">
            <input type="checkbox"
                   id="toggle-grado-{{ $grado->id }}"
                   {{ $habilitado ? 'checked' : '' }}
                   onchange="toggleGrado({{ $ambiente->id }}, {{ $grado->id }}, '{{ addslashes($grado->nombre) }}', this)">
            <span class="toggle-slider"></span>
        </label>
    </div>

    <div class="grado-bloque-body {{ $habilitado ? '' : 'oculto' }}" id="body-grado-{{ $grado->id }}">
        @if($grupos->isEmpty())
            <p style="color:#94A3B8;font-size:0.85rem;margin:0" id="sin-grupos-{{ $grado->id }}">
                Sin grupos creados aún.
            </p>
        @else
            @foreach($grupos as $grupo)
            <div class="grupo-fila" id="fila-grupo-{{ $grupo->id }}">
                <span class="grupo-nombre-txt">{{ $grado->nombre }} {{ $grupo->nombre }}</span>
                <span class="grupo-chip">Grupo {{ $grupo->nombre }}</span>
                <span style="font-size:0.78rem;color:#64748B">
                    Cupo: {{ $grupo->cupo_maximo }} · {{ $grupo->anio_lectivo }}
                </span>
                <div class="grupo-acciones">
                    <button class="btn-grupo btn-editar-grupo"
                            onclick="abrirModalGrupo({{ $grado->id }}, {{ $grupo->id }}, '{{ addslashes($grupo->nombre) }}', {{ $grupo->cupo_maximo }})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-grupo btn-eliminar-grupo"
                            onclick="eliminarGrupo({{ $ambiente->id }}, {{ $grupo->id }}, '{{ addslashes($grado->nombre . ' ' . $grupo->nombre) }}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
            @endforeach
        @endif

        <a class="link-agregar-grupo"
           onclick="abrirModalGrupo({{ $grado->id }}); return false;">
            + Agregar grupo en {{ $grado->nombre }}
        </a>
    </div>
</div>
@endforeach

{{-- ── Modal Nuevo/Editar Grupo ────────────────────────────── --}}
<div class="modal fade" id="modalGrupo" tabindex="-1"
     data-bs-backdrop="static" data-bs-keyboard="false"
     aria-labelledby="modalGrupoTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalGrupoTitulo">Nuevo Grupo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formGrupo">
                    @csrf
                    <input type="hidden" id="grupoId" value="">
                    <div class="mb-3">
                        <label class="form-label">Grado</label>
                        <select id="grupoGradoId" name="grado_id" class="form-control">
                            @foreach($gradosConInfo as $item)
                                @if($item['habilitado'])
                                    <option value="{{ $item['grado']->id }}">{{ $item['grado']->nombre }}</option>
                                @endif
                            @endforeach
                        </select>
                        <div class="campo-error" id="err-grado_id"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Letra del grupo</label>
                        <select id="grupoNombre" name="nombre" class="form-control">
                            @foreach(['A','B','C','D','E'] as $letra)
                                <option value="{{ $letra }}">{{ $letra }}</option>
                            @endforeach
                        </select>
                        <div class="campo-error" id="err-nombre"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Año lectivo</label>
                        <input type="number" id="grupoAnio" name="anio_lectivo"
                               class="form-control" value="{{ date('Y') }}"
                               min="2024" max="2030">
                        <div class="campo-error" id="err-anio_lectivo"></div>
                    </div>
                    <div class="mb-0">
                        <label class="form-label">Cupo máximo</label>
                        <input type="number" id="grupoCupo" name="cupo_maximo"
                               class="form-control" value="25" min="1" max="60">
                        <div class="campo-error" id="err-cupo_maximo"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btnGuardarGrupo" class="btn btn-primary"
                        onclick="guardarGrupo()">Crear Grupo</button>
            </div>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script>
const AMBIENTE_ID = {{ $ambiente->id }};
const AMBIENTE_COLOR = @json($ambiente->color_hex);
</script>
<script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
```

- [ ] **Paso 2: Commit**

```bash
git add resources/views/admin/ambientes/grados-grupos.blade.php
git commit -m "feat: vista grados-grupos con toggles, lista de grupos y modal"
```

---

## Task 8 — JavaScript

**Archivos:**
- Crear: `public/assets/js/admin/ambientes.js`

- [ ] **Paso 1: Crear directorio y archivo JS**

```bash
mkdir -p public/assets/js/admin
```

Contenido completo de `public/assets/js/admin/ambientes.js`:

```javascript
/* ═══════════════════════════════════════════════════════════════
   ambientes.js — Admin panel · Aulas Reggio
   Cargado en: admin/ambientes/index y admin/ambientes/grados-grupos
   ═══════════════════════════════════════════════════════════════ */

const CSRF = () => document.querySelector('meta[name="csrf-token"]').content;

/* ── Fetch helper ────────────────────────────────────────────── */
async function apiFetch(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'X-CSRF-TOKEN': CSRF(),
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
        },
    };
    if (body !== null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    return { status: res.status, data: await res.json() };
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN: ÍNDICE DE AMBIENTES
   ══════════════════════════════════════════════════════════════ */

/* ── Dropdown de tres puntos ─────────────────────────────────── */
function abrirMenu(ambienteId) {
    const yaAbierto = document.getElementById(`menu-${ambienteId}`)?.classList.contains('abierto');
    cerrarTodosMenus();
    if (!yaAbierto) {
        document.getElementById(`menu-${ambienteId}`)?.classList.add('abierto');
    }
}

function cerrarTodosMenus() {
    document.querySelectorAll('.dropdown-menu-card.abierto').forEach(m => m.classList.remove('abierto'));
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.btn-menu') && !e.target.closest('.dropdown-menu-card')) {
        cerrarTodosMenus();
    }
});

/* ── Toggle activo del ambiente ──────────────────────────────── */
async function toggleActivo(ambienteId, nombre, estadoActual) {
    cerrarTodosMenus();

    const accion = estadoActual ? 'desactivar' : 'activar';
    const { isConfirmed } = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${nombre}"?`,
        text: estadoActual
            ? 'El ambiente quedará inactivo pero sus datos se conservan.'
            : 'El ambiente volverá a estar disponible.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: estadoActual ? '#DC2626' : '#2563EB',
        cancelButtonColor: '#94A3B8',
    });

    if (!isConfirmed) return;

    const { status, data } = await apiFetch(`/admin/ambientes/${ambienteId}/toggle`, 'PATCH');

    if (status === 200) {
        const badge = document.getElementById(`badge-estado-${ambienteId}`);
        if (badge) {
            badge.textContent = data.activo ? 'Activo' : 'Inactivo';
            badge.className = `badge-estado ${data.activo ? 'badge-activo' : 'badge-inactivo'}`;
        }
        mostrarToast('success', data.mensaje);
        // Actualizar cache local
        if (window._ambientes?.[ambienteId]) {
            window._ambientes[ambienteId].activo = data.activo;
        }
    } else {
        mostrarToast('error', 'Error al cambiar el estado.');
    }
}

/* ── Modal crear/editar ambiente ─────────────────────────────── */
let _modalAmbienteBS = null;

function _getModalAmbiente() {
    if (!_modalAmbienteBS) {
        _modalAmbienteBS = new bootstrap.Modal(document.getElementById('modalAmbiente'));
    }
    return _modalAmbienteBS;
}

function abrirModalAmbiente(modo, ambienteId = null) {
    cerrarTodosMenus();
    limpiarErroresAmbiente();
    document.getElementById('formAmbiente').reset();

    const titulo = document.getElementById('modalAmbienteTitulo');
    const btnGuardar = document.getElementById('btnGuardarAmbiente');
    const idInput = document.getElementById('ambienteId');

    if (modo === 'crear') {
        titulo.textContent = 'Nuevo Ambiente';
        btnGuardar.textContent = 'Crear Ambiente';
        idInput.value = '';
        actualizarPreviewColor();
    } else {
        const amb = window._ambientes?.[ambienteId];
        if (!amb) return;
        titulo.textContent = 'Editar Ambiente';
        btnGuardar.textContent = 'Guardar Cambios';
        idInput.value = ambienteId;
        document.getElementById('ambNombre').value = amb.nombre;
        document.getElementById('ambSlug').value = amb.slug;
        document.getElementById('ambColor').value = amb.color_hex;
        document.getElementById('ambIcono').value = amb.icono;
        document.getElementById('ambIp').value = amb.servidor_ip ?? '';
        actualizarPreviewColor();
    }

    _getModalAmbiente().show();
}

document.getElementById('modalAmbiente')?.addEventListener('hidden.bs.modal', function () {
    limpiarErroresAmbiente();
    document.getElementById('formAmbiente').reset();
});

function limpiarErroresAmbiente() {
    ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip'].forEach(campo => {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = '';
    });
}

function mostrarErroresAmbiente(errors) {
    limpiarErroresAmbiente();
    for (const [campo, mensajes] of Object.entries(errors)) {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = mensajes[0];
    }
}

/* Auto-generar slug desde nombre */
function autoSlug() {
    const nombre = document.getElementById('ambNombre').value;
    document.getElementById('ambSlug').value = generarSlug(nombre);
}

function generarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/* Preview de color en tiempo real */
function actualizarPreviewColor() {
    const val = document.getElementById('ambColor')?.value ?? '';
    const preview = document.getElementById('previewColor');
    if (preview) {
        preview.style.background = val || '#E2E8F0';
    }
}

/* Guardar ambiente vía AJAX */
async function guardarAmbiente() {
    const btn = document.getElementById('btnGuardarAmbiente');
    const ambienteId = document.getElementById('ambienteId').value;
    const esEdicion = !!ambienteId;

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
        nombre:      document.getElementById('ambNombre').value,
        slug:        document.getElementById('ambSlug').value,
        color_hex:   document.getElementById('ambColor').value,
        icono:       document.getElementById('ambIcono').value,
        servidor_ip: document.getElementById('ambIp').value || null,
    };

    const url    = esEdicion ? `/admin/ambientes/${ambienteId}` : '/admin/ambientes';
    const method = esEdicion ? 'PUT' : 'POST';

    const { status, data } = await apiFetch(url, method, body);

    btn.disabled = false;
    btn.textContent = esEdicion ? 'Guardar Cambios' : 'Crear Ambiente';

    if (status === 200 || status === 201) {
        _getModalAmbiente().hide();
        mostrarToast('success', data.mensaje);
        setTimeout(() => location.reload(), 800);
    } else if (status === 422 && data.errors) {
        mostrarErroresAmbiente(data.errors);
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al guardar.');
    }
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN: GRADOS Y GRUPOS (vista interior del ambiente)
   ══════════════════════════════════════════════════════════════ */

/* ── Toggle grado habilitado ─────────────────────────────────── */
async function toggleGrado(ambienteId, gradoId, nombreGrado, checkbox) {
    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/grados/${gradoId}/toggle`,
        'PATCH'
    );

    if (status === 200) {
        const body = document.getElementById(`body-grado-${gradoId}`);
        if (body) {
            body.classList.toggle('oculto', !data.habilitado);
        }
        checkbox.checked = data.habilitado;
    } else {
        checkbox.checked = !checkbox.checked; // revertir
        mostrarToast('error', 'Error al cambiar el estado del grado.');
    }
}

/* ── Modal nuevo/editar grupo ────────────────────────────────── */
let _modalGrupoBS = null;

function _getModalGrupo() {
    if (!_modalGrupoBS) {
        _modalGrupoBS = new bootstrap.Modal(document.getElementById('modalGrupo'));
    }
    return _modalGrupoBS;
}

function abrirModalGrupo(gradoId = null, grupoId = null, grupoNombre = null, cupMaximo = 25) {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();

    const titulo     = document.getElementById('modalGrupoTitulo');
    const btnGuardar = document.getElementById('btnGuardarGrupo');
    const idInput    = document.getElementById('grupoId');

    idInput.value = grupoId ?? '';

    if (grupoId) {
        titulo.textContent = 'Editar Grupo';
        btnGuardar.textContent = 'Guardar Cambios';
        if (gradoId)   document.getElementById('grupoGradoId').value = gradoId;
        if (grupoNombre) document.getElementById('grupoNombre').value = grupoNombre;
        document.getElementById('grupoCupo').value = cupMaximo;
        document.getElementById('grupoGradoId').disabled = true;
        document.getElementById('grupoAnio').disabled = true;
    } else {
        titulo.textContent = 'Nuevo Grupo';
        btnGuardar.textContent = 'Crear Grupo';
        if (gradoId) document.getElementById('grupoGradoId').value = gradoId;
        document.getElementById('grupoGradoId').disabled = false;
        document.getElementById('grupoAnio').disabled = false;
    }

    _getModalGrupo().show();
}

document.getElementById('modalGrupo')?.addEventListener('hidden.bs.modal', function () {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();
    document.getElementById('grupoGradoId').disabled = false;
    document.getElementById('grupoAnio').disabled = false;
});

function limpiarErroresGrupo() {
    ['grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo'].forEach(campo => {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = '';
    });
}

function mostrarErroresGrupo(errors) {
    limpiarErroresGrupo();
    for (const [campo, mensajes] of Object.entries(errors)) {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = mensajes[0];
    }
}

async function guardarGrupo() {
    const ambienteId = typeof AMBIENTE_ID !== 'undefined' ? AMBIENTE_ID : null;
    if (!ambienteId) return;

    const btn     = document.getElementById('btnGuardarGrupo');
    const grupoId = document.getElementById('grupoId').value;
    const esEdicion = !!grupoId;

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
        grado_id:     document.getElementById('grupoGradoId').value,
        nombre:       document.getElementById('grupoNombre').value,
        anio_lectivo: document.getElementById('grupoAnio').value,
        cupo_maximo:  document.getElementById('grupoCupo').value,
    };

    const url    = esEdicion
        ? `/admin/ambientes/${ambienteId}/grupos/${grupoId}`
        : `/admin/ambientes/${ambienteId}/grupos`;
    const method = esEdicion ? 'PUT' : 'POST';

    const { status, data } = await apiFetch(url, method, body);

    btn.disabled = false;
    btn.textContent = esEdicion ? 'Guardar Cambios' : 'Crear Grupo';

    if (status === 200 || status === 201) {
        _getModalGrupo().hide();
        mostrarToast('success', esEdicion ? 'Grupo actualizado.' : 'Grupo creado.');
        setTimeout(() => location.reload(), 600);
    } else if (status === 422 && data.errors) {
        mostrarErroresGrupo(data.errors);
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al guardar el grupo.');
    }
}

/* ── Eliminar grupo ──────────────────────────────────────────── */
async function eliminarGrupo(ambienteId, grupoId, nombreGrupo) {
    const { isConfirmed } = await Swal.fire({
        title: `¿Eliminar "${nombreGrupo}"?`,
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
    });

    if (!isConfirmed) return;

    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/grupos/${grupoId}`,
        'DELETE'
    );

    if (data.ok) {
        const fila = document.getElementById(`fila-grupo-${grupoId}`);
        if (fila) {
            fila.style.transition = 'opacity .25s, max-height .25s';
            fila.style.opacity = '0';
            setTimeout(() => fila.remove(), 250);
        }
        mostrarToast('success', 'Grupo eliminado.');
    } else {
        Swal.fire({
            title: 'No se puede eliminar',
            text: data.mensaje,
            icon: 'error',
            confirmButtonColor: '#2563EB',
        });
    }
}
```

- [ ] **Paso 2: Verificar que el archivo existe**

```bash
ls public/assets/js/admin/ambientes.js
```

- [ ] **Paso 3: Commit**

```bash
git add public/assets/js/admin/ambientes.js
git commit -m "feat: crear ambientes.js con dropdown, toggle, modal y CRUD AJAX"
```

---

## Task 9 — Actualizar Seeder

**Archivos:**
- Modificar: `database/seeders/AmbientesSeeder.php`

- [ ] **Paso 1: Reemplazar el seeder con datos de grados y grupos demo**

```php
<?php

namespace Database\Seeders;

use App\Models\Ambiente;
use App\Models\Grado;
use App\Models\Grupo;
use Illuminate\Database\Seeder;

class AmbientesSeeder extends Seeder
{
    public function run(): void
    {
        $ambientes = [
            ['nombre' => 'Música',         'slug' => 'musica',         'color_hex' => '#0F6E56', 'icono' => '🎵', 'servidor_ip' => '192.168.1.20'],
            ['nombre' => 'Polimotor',      'slug' => 'polimotor',      'color_hex' => '#534AB7', 'icono' => '🤸', 'servidor_ip' => '192.168.1.21'],
            ['nombre' => 'Lógico',         'slug' => 'logico',         'color_hex' => '#854F0B', 'icono' => '🧠', 'servidor_ip' => '192.168.1.22'],
            ['nombre' => 'Multisensorial', 'slug' => 'multisensorial', 'color_hex' => '#185FA5', 'icono' => '🌿', 'servidor_ip' => '192.168.1.23'],
            ['nombre' => 'Tecnología',     'slug' => 'tecnologia',     'color_hex' => '#993C1D', 'icono' => '💡', 'servidor_ip' => '192.168.1.24'],
        ];

        foreach ($ambientes as $data) {
            Ambiente::firstOrCreate(['slug' => $data['slug']], array_merge($data, ['activo' => true]));
        }

        $grados = Grado::orderBy('orden')->get()->keyBy('nombre');
        $anio   = date('Y');

        $config = [
            'musica'         => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'polimotor'      => ['grados' => ['Prejardin', 'Jardin'],               'letras' => ['A', 'B']],
            'logico'         => ['grados' => ['Jardin', 'Transicion'],              'letras' => ['A', 'B']],
            'multisensorial' => ['grados' => ['Prejardin', 'Jardin', 'Transicion'], 'letras' => ['A', 'B']],
            'tecnologia'     => ['grados' => ['Transicion'],                        'letras' => ['A']],
        ];

        foreach ($config as $slug => $setup) {
            $ambiente = Ambiente::where('slug', $slug)->first();
            if (!$ambiente) continue;

            foreach ($setup['grados'] as $nombreGrado) {
                $grado = $grados[$nombreGrado] ?? null;
                if (!$grado) continue;

                // Habilitar grado en el ambiente
                $ambiente->todosGrados()->syncWithoutDetaching([
                    $grado->id => ['activo' => true],
                ]);

                // Crear grupos demo
                foreach ($setup['letras'] as $letra) {
                    Grupo::firstOrCreate(
                        [
                            'ambiente_id'  => $ambiente->id,
                            'grado_id'     => $grado->id,
                            'nombre'       => $letra,
                            'anio_lectivo' => $anio,
                        ],
                        ['cupo_maximo' => 25, 'activo' => true]
                    );
                }
            }
        }
    }
}
```

- [ ] **Paso 2: Ejecutar el seeder**

```bash
php artisan db:seed --class=AmbientesSeeder
```

Resultado esperado: sin errores; verificar con:

```bash
php artisan tinker --execute="echo App\Models\Grupo::count() . ' grupos creados';"
```

Esperado: `15 grupos creados` (5+4+4+6+1 según la config).

- [ ] **Paso 3: Commit**

```bash
git add database/seeders/AmbientesSeeder.php
git commit -m "feat: seeder con grados habilitados y grupos demo por ambiente"
```

---

## Task 10 — Verificación final

- [ ] **Paso 1: Iniciar el servidor**

```bash
php artisan serve
```

- [ ] **Paso 2: Verificar flujo 1 — Listado**

Navegar a `http://localhost:8000/admin/ambientes`.
Esperado: grid de 5 tarjetas con color, ícono, badges de grados y grupos.

- [ ] **Paso 3: Verificar flujo 2 — Crear ambiente**

Clic en "Nuevo Ambiente" → modal se abre con animación.
Ingresar datos → "Crear Ambiente" → toast success → tarjeta aparece.

- [ ] **Paso 4: Verificar flujo 3 — Editar ambiente**

Dropdown (⋯) → "Editar ambiente" → modal con datos prellenados.
Modificar color → "Guardar Cambios" → toast success.

- [ ] **Paso 5: Verificar flujo 4 — Toggle activo**

Dropdown → "Desactivar" → SweetAlert warning → confirmar → badge cambia a "Inactivo".

- [ ] **Paso 6: Verificar flujo 5 — Panel interior**

Dropdown → "Gestionar grados y grupos" → navega a `/admin/ambientes/1/grados-grupos`.
Esperado: 3 bloques de grado con toggles y filas de grupos.

- [ ] **Paso 7: Verificar flujo 6 — Toggle grado**

Toggle de un grado habilitado → body del bloque se oculta con animación.
Toggle nuevamente → vuelve a aparecer.

- [ ] **Paso 8: Verificar flujo 7 — Crear grupo**

"Agregar grupo" → modal → seleccionar grado y letra → "Crear Grupo" → nueva fila aparece.

- [ ] **Paso 9: Verificar flujo 8 — Eliminar grupo vacío**

Clic "Eliminar" en un grupo sin matrículas → SweetAlert warning → confirmar → fila desaparece con fade.

- [ ] **Paso 10: Commit final**

```bash
git add -A
git commit -m "feat: módulo completo de ambientes, grados y grupos"
```
