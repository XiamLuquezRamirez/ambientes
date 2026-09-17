<?php

namespace App\Services;

use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Juego;
use App\Models\Modulo;
use App\Models\Tematica;
use App\Models\TiposJuego;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class JuegoCatalogoService
{
    /**
     * @return array<string, mixed>
     */
    public function opcionesFiltro(): array
    {
        return [
            'ambientes' => Ambiente::query()->orderBy('nombre')->get(['id', 'nombre', 'slug']),
            'modulos' => Modulo::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'ambiente_id']),
            'ejes' => Eje::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'modulo_id']),
            'tematicas' => Tematica::query()->oficiales()->orderBy('nombre')->get(['id', 'nombre', 'eje_id']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function listarDesdeRequest(Request $request, bool $soloActivos = false): array
    {
        $consulta = $this->consultaFiltrada($request, $soloActivos);
        $paraStats = (clone $consulta)->get();

        $total = $paraStats->count();
        $activos = $paraStats->where('activo', true)->count();

        $estadisticas = [
            'total' => $total,
            'activos' => $activos,
            'activos_pct' => $total > 0 ? round(($activos / $total) * 100, 1) : 0,
            'inactivos' => $total - $activos,
            'modulos' => $paraStats
                ->map(fn (Juego $j) => $j->cadenaCurricularResuelta()['modulo_id'])
                ->filter()
                ->unique()
                ->count(),
        ];

        $perPage = max(1, min(48, (int) $request->input('per_page', 12)));

        /** @var LengthAwarePaginator $juegos */
        $juegos = $consulta
            ->orderBy('orden')
            ->orderBy('slug')
            ->paginate($perPage)
            ->withQueryString();

        $filtros = $request->only(['q', 'ambiente_id', 'modulo_id', 'eje_id', 'tematica_id', 'estado']);

        return array_merge($this->opcionesFiltro(), [
            'juegos' => $juegos,
            'estadisticas' => $estadisticas,
            'filtros' => $filtros,
            'vista' => $request->get('vista', 'grid'),
            'texto_busqueda' => $request->get('q', ''),
        ]);
    }

    /**
     * Paquetes activos del ambiente (catálogo kiosco / recorrido niño).
     *
     * @return list<array<string, mixed>>
     */
    public function listarActivosPorAmbiente(int $ambienteId): array
    {
        $consulta = Juego::query()
            ->activos()
            ->whereNotNull('ruta')
            ->where('ruta', '!=', '');

        $this->aplicarFiltroAmbiente($consulta, $ambienteId);

        $juegos = $consulta
            ->orderBy('orden')
            ->orderBy('slug')
            ->get();

        return $this->serializarColeccionJson($juegos);
    }

    /**
     * @param  iterable<int, string>  $slugs
     * @return array<string, array{url:?string, nombre:?string, icono:?string, color:?string}>
     */
    public function mapaPaquetesPorSlugs(iterable $slugs): array
    {
        $slugs = collect($slugs)
            ->map(fn ($slug) => trim((string) $slug))
            ->filter(fn (string $slug) => $slug !== '')
            ->unique()
            ->values();

        if ($slugs->isEmpty()) {
            return [];
        }

        return Juego::query()
            ->whereIn('slug', $slugs)
            ->get(['slug', 'nombre', 'ruta', 'icono', 'color', 'activo'])
            ->mapWithKeys(function (Juego $juego) {
                return [
                    (string) $juego->slug => [
                        'url' => $juego->activo ? $juego->urlPaquete() : null,
                        'nombre' => $juego->nombre,
                        'icono' => $juego->icono ?: 'fa-gamepad',
                        'color' => $juego->color ?: '#2563eb',
                    ],
                ];
            })
            ->all();
    }

    /**
     * @deprecated Usar mapaPaquetesPorSlugs.
     * @param  iterable<int, int|string>  $ids
     * @return array<string, array{url:?string, nombre:?string, icono:?string, color:?string}>
     */
    public function mapaPaquetesPorIds(iterable $ids): array
    {
        return $this->mapaPaquetesPorSlugs($ids);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializarColeccionJson(Collection $juegos): array
    {
        return $juegos
            ->map(fn (Juego $juego) => $this->serializarTarjeta($juego))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializarTarjeta(Juego $juego): array
    {
        $cadena = $juego->cadenaCurricularResuelta();
        $juego->loadMissing('tipoJuego');

        return [
            'slug' => $juego->slug,
            'tipo' => $juego->tipo,
            'tipo_label' => $juego->tipoLabel(),
            'ruta' => $juego->ruta,
            'url_paquete' => $juego->urlPaquete(),
            'nombre' => $juego->nombre,
            'descripcion' => $juego->descripcion ?? '',
            'icono' => $juego->icono ?: 'fa-gamepad',
            'color' => $juego->color ?: '#2563eb',
            'orden' => $juego->orden,
            'activo' => (bool) $juego->activo,
            'cadena' => $cadena,
        ];
    }

    public function consultaFiltrada(Request $request, bool $soloActivos = false): Builder
    {
        $consulta = Juego::query()->with([
            'tipoJuego:id,slug,nombre,activo',
            'ambiente:id,nombre',
            'modulo:id,nombre,ambiente_id',
            'modulo.ambiente:id,nombre',
            'eje:id,nombre,modulo_id',
            'eje.modulo:id,nombre,ambiente_id',
            'eje.modulo.ambiente:id,nombre',
            'tematica:id,nombre,eje_id',
            'tematica.eje:id,nombre,modulo_id',
            'tematica.eje.modulo:id,nombre,ambiente_id',
            'tematica.eje.modulo.ambiente:id,nombre',
        ]);

        if ($soloActivos) {
            $consulta->activos();
        }

        if ($request->filled('q')) {
            $texto = '%'.trim((string) $request->q).'%';
            $consulta->where(function ($q) use ($texto) {
                $q->where('nombre', 'like', $texto)
                    ->orWhere('descripcion', 'like', $texto);
            });
        }

        if ($request->has('estado') && $request->input('estado') !== null && $request->input('estado') !== '') {
            $consulta->where('activo', (int) $request->input('estado') === 1);
        }

        if ($request->filled('ambiente_id')) {
            $this->aplicarFiltroAmbiente($consulta, (int) $request->ambiente_id);
        }

        if ($request->filled('modulo_id')) {
            $this->aplicarFiltroModulo($consulta, (int) $request->modulo_id);
        }

        if ($request->filled('eje_id')) {
            $this->aplicarFiltroEje($consulta, (int) $request->eje_id);
        }

        if ($request->filled('tematica_id')) {
            $this->aplicarFiltroTematica($consulta, (int) $request->tematica_id);
        }

        return $consulta;
    }

    private function aplicarFiltroAmbiente(Builder $consulta, int $ambienteId): void
    {
        $consulta->where(function ($q) use ($ambienteId) {
            $q->where('ambiente_id', $ambienteId)
                ->orWhereHas('modulo', fn ($m) => $m->where('ambiente_id', $ambienteId))
                ->orWhereHas('eje.modulo', fn ($m) => $m->where('ambiente_id', $ambienteId))
                ->orWhereHas('tematica.eje.modulo', fn ($m) => $m->where('ambiente_id', $ambienteId));
        });
    }

    private function aplicarFiltroModulo(Builder $consulta, int $moduloId): void
    {
        $consulta->where(function ($q) use ($moduloId) {
            $q->where('modulo_id', $moduloId)
                ->orWhereHas('eje', fn ($e) => $e->where('modulo_id', $moduloId))
                ->orWhereHas('tematica.eje', fn ($e) => $e->where('modulo_id', $moduloId));
        });
    }

    private function aplicarFiltroEje(Builder $consulta, int $ejeId): void
    {
        $consulta->where(function ($q) use ($ejeId) {
            $q->where('eje_id', $ejeId)
                ->orWhereHas('tematica', fn ($t) => $t->where('eje_id', $ejeId));
        });
    }

    private function aplicarFiltroTematica(Builder $consulta, int $tematicaId): void
    {
        $consulta->where('tematica_id', $tematicaId);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Juego
    {
        $cadena = $this->resolverCadenaCurricular($datos);
        $ambiente = Ambiente::query()->findOrFail($cadena['ambiente_id']);
        $nombre = trim((string) $datos['nombre']);
        $ruta = $this->construirRutaPaquete($ambiente, $nombre);
        $slug = $this->generarSlugUnico($nombre);

        $this->assertRutaUnica($ruta);
        $this->assertCarpetaPaqueteLibre($ruta);
        $this->crearStubPaquete($ruta, $nombre);

        $payload = $this->payloadMetadatos($datos, $cadena, $ruta);
        $payload['slug'] = $slug;
        $payload['orden'] = ((int) Juego::query()->max('orden')) + 1;
        $payload['activo'] = array_key_exists('activo', $datos)
            ? (bool) $datos['activo']
            : true;

        try {
            return Juego::query()->create($payload);
        } catch (\Throwable $e) {
            $this->eliminarCarpetaPaqueteSiStub($ruta);
            throw $e;
        }
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(Juego $juego, array $datos): Juego
    {
        $cadena = $this->resolverCadenaCurricular($datos);
        $ambiente = Ambiente::query()->findOrFail($cadena['ambiente_id']);
        $nombre = trim((string) $datos['nombre']);
        $rutaAnterior = $this->normalizarRuta((string) ($juego->ruta ?? ''));

        $mismaIdentidad = (int) $juego->ambiente_id === (int) $cadena['ambiente_id']
            && trim((string) $juego->nombre) === $nombre;

        $rutaNueva = $mismaIdentidad
            ? $rutaAnterior
            : $this->construirRutaPaquete($ambiente, $nombre);

        if ($rutaNueva !== $rutaAnterior) {
            $this->assertRutaUnica($rutaNueva, $juego->slug);
            $this->moverOCrearPaquete($rutaAnterior, $rutaNueva, $nombre);
        }

        $payload = $this->payloadMetadatos($datos, $cadena, $rutaNueva);

        if (array_key_exists('activo', $datos)) {
            $payload['activo'] = (bool) $datos['activo'];
        }

        $juego->update($payload);

        return $juego->fresh([
            'ambiente:id,nombre',
            'modulo:id,nombre,ambiente_id',
            'eje:id,nombre,modulo_id',
            'tematica:id,nombre,eje_id',
        ]) ?? $juego;
    }

    public function alternarActivo(Juego $juego): Juego
    {
        $juego->update(['activo' => ! $juego->activo]);

        return $juego->fresh() ?? $juego;
    }

    /**
     * catalogo_juegos/{AmbienteStudly}/{NombreStudly}
     */
    public function construirRutaPaquete(Ambiente $ambiente, string $nombreJuego): string
    {
        $ambienteSeg = $this->segmentoCarpeta((string) ($ambiente->slug ?: $ambiente->nombre));
        $juegoSeg = $this->segmentoCarpeta($nombreJuego);

        return 'catalogo_juegos/'.$ambienteSeg.'/'.$juegoSeg;
    }

    /**
     * Segmento de carpeta: cada palabra con inicial mayúscula (StudlyCase), sin acentos.
     * Ej. "rompecabezas del cuerpo" → "RompecabezasDelCuerpo"; "polimotor" → "Polimotor".
     *
     * @throws ValidationException
     */
    public function segmentoCarpeta(string $texto): string
    {
        $segmento = Str::of($texto)
            ->ascii()
            ->replaceMatches('/[^A-Za-z0-9]+/', ' ')
            ->trim()
            ->studly()
            ->toString();

        if ($segmento === '' || ! preg_match('/^[A-Za-z0-9]+$/', $segmento)) {
            throw ValidationException::withMessages([
                'nombre' => 'No se pudo generar un nombre de carpeta válido. Usa letras o números.',
            ]);
        }

        return $segmento;
    }

    /**
     * @throws ValidationException
     */
    public function assertCarpetaPaqueteLibre(string $ruta): void
    {
        $absoluta = public_path($ruta);
        if (is_dir($absoluta) || is_file($absoluta)) {
            throw ValidationException::withMessages([
                'ruta' => 'Ya existe la carpeta o archivo public/'.$ruta.'. Elige otro nombre o ambiente.',
            ]);
        }
    }

    /**
     * Crea stub mínimo: index.html, script.js, style.css, config.json.
     *
     * @throws ValidationException
     */
    public function crearStubPaquete(string $ruta, string $nombreJuego): void
    {
        $ruta = $this->normalizarRuta($ruta);
        $this->assertCarpetaPaqueteLibre($ruta);

        $absoluta = public_path($ruta);
        if (! File::makeDirectory($absoluta, 0755, true, true) && ! is_dir($absoluta)) {
            throw ValidationException::withMessages([
                'ruta' => 'No se pudo crear la carpeta public/'.$ruta.'.',
            ]);
        }

        $nombreSeguro = e($nombreJuego);
        $config = [
            'nombre' => $nombreJuego,
            'stub' => true,
            'creado_en' => now()->toIso8601String(),
        ];

        $archivos = [
            'index.html' => $this->contenidoStubIndex($nombreSeguro),
            'script.js' => $this->contenidoStubScript(),
            'style.css' => $this->contenidoStubStyle(),
            'config.json' => json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n",
        ];

        try {
            foreach ($archivos as $nombre => $contenido) {
                File::put($absoluta.DIRECTORY_SEPARATOR.$nombre, $contenido);
            }
        } catch (\Throwable $e) {
            File::deleteDirectory($absoluta);
            throw ValidationException::withMessages([
                'ruta' => 'No se pudieron escribir los archivos base del paquete.',
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    public function moverOCrearPaquete(string $rutaAnterior, string $rutaNueva, string $nombreJuego): void
    {
        $rutaAnterior = $this->normalizarRuta($rutaAnterior);
        $rutaNueva = $this->normalizarRuta($rutaNueva);

        if ($rutaAnterior === $rutaNueva) {
            return;
        }

        $this->assertCarpetaPaqueteLibre($rutaNueva);

        $origen = public_path($rutaAnterior);
        $destino = public_path($rutaNueva);
        $padreDestino = dirname($destino);

        if (! is_dir($padreDestino) && ! File::makeDirectory($padreDestino, 0755, true, true)) {
            throw ValidationException::withMessages([
                'ruta' => 'No se pudo preparar la carpeta destino public/'.dirname($rutaNueva).'.',
            ]);
        }

        if (is_dir($origen)) {
            if (! @rename($origen, $destino)) {
                // Fallback por límites de rename entre volúmenes.
                File::copyDirectory($origen, $destino);
                File::deleteDirectory($origen);
            }

            return;
        }

        // Paquete ausente en disco: crea stub en la nueva ruta.
        $this->crearStubPaquete($rutaNueva, $nombreJuego);
    }

    /**
     * Normaliza ruta relativa bajo public/ y exige index.html + unicidad.
     *
     * @throws ValidationException
     */
    public function normalizarYValidarRuta(string $ruta, ?string $ignorarJuegoSlug = null): string
    {
        $ruta = $this->normalizarRuta($ruta);
        $this->assertPaqueteIndexExiste($ruta);
        $this->assertRutaUnica($ruta, $ignorarJuegoSlug);

        return $ruta;
    }

    /**
     * @throws ValidationException
     */
    public function normalizarRuta(string $ruta): string
    {
        $ruta = str_replace('\\', '/', trim($ruta));
        $ruta = trim($ruta, '/');

        if (
            $ruta === ''
            || str_contains($ruta, '..')
            || str_starts_with($ruta, '/')
            || preg_match('#^[a-zA-Z]:#', $ruta) === 1
        ) {
            throw ValidationException::withMessages([
                'ruta' => 'La ruta debe ser relativa a public/ (ej. catalogo_juegos/Polimotor/Rompecabezas).',
            ]);
        }

        return $ruta;
    }

    /**
     * @throws ValidationException
     */
    public function assertPaqueteIndexExiste(string $ruta): void
    {
        $index = public_path($ruta.DIRECTORY_SEPARATOR.'index.html');
        if (! is_file($index)) {
            throw ValidationException::withMessages([
                'ruta' => 'No se encontró index.html en public/'.$ruta.'.',
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    public function assertRutaUnica(string $ruta, ?string $ignorarJuegoSlug = null): void
    {
        $existeOtra = Juego::query()
            ->where('ruta', $ruta)
            ->when($ignorarJuegoSlug, fn (Builder $q) => $q->where('slug', '!=', $ignorarJuegoSlug))
            ->exists();

        if ($existeOtra) {
            throw ValidationException::withMessages([
                'ruta' => 'Ya existe un juego registrado con esta ruta.',
            ]);
        }
    }

    /**
     * Genera slug kebab-case único a partir del nombre (estable como PK).
     */
    public function generarSlugUnico(string $nombre, ?string $ignorarSlug = null): string
    {
        $base = Str::slug($nombre) ?: 'juego';
        if (! Juego::slugEsValido($base)) {
            $base = 'juego';
        }

        $slug = $base;
        $i = 2;

        while (
            Juego::query()
                ->where('slug', $slug)
                ->when($ignorarSlug, fn (Builder $q) => $q->where('slug', '!=', $ignorarSlug))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @param  array{ambiente_id:int, modulo_id:?int, eje_id:?int, tematica_id:?int}  $cadena
     * @return array<string, mixed>
     */
    private function payloadMetadatos(array $datos, array $cadena, string $ruta): array
    {
        return [
            'ambiente_id' => $cadena['ambiente_id'],
            'modulo_id' => $cadena['modulo_id'],
            'eje_id' => $cadena['eje_id'],
            'tematica_id' => $cadena['tematica_id'],
            'tipo_juego_id' => $this->resolverTipoJuegoId((string) $datos['tipo']),
            'ruta' => $ruta,
            'nombre' => trim((string) $datos['nombre']),
            'descripcion' => filled($datos['descripcion'] ?? null)
                ? trim((string) $datos['descripcion'])
                : null,
            'icono' => filled($datos['icono'] ?? null)
                ? trim((string) $datos['icono'])
                : null,
            'color' => filled($datos['color'] ?? null)
                ? trim((string) $datos['color'])
                : null,
        ];
    }

    private function resolverTipoJuegoId(string $slug): int
    {
        $slug = trim($slug);

        if ($slug === '' || ! Juego::tipoEsValido($slug)) {
            throw ValidationException::withMessages([
                'tipo' => 'El tipo debe estar en snake_case (ej. memoria_visual).',
            ]);
        }

        $tipo = TiposJuego::query()->where('slug', $slug)->first();

        if ($tipo) {
            return (int) $tipo->id;
        }

        $tipo = TiposJuego::query()->create([
            'slug' => $slug,
            'nombre' => Str::of($slug)->replace('_', ' ')->title(),
            'activo' => true,
        ]);

        return (int) $tipo->id;
    }

    private function eliminarCarpetaPaqueteSiStub(string $ruta): void
    {
        $absoluta = public_path($ruta);
        if (! is_dir($absoluta)) {
            return;
        }

        $config = $absoluta.DIRECTORY_SEPARATOR.'config.json';
        if (! is_file($config)) {
            return;
        }

        $json = json_decode((string) file_get_contents($config), true);
        if (! is_array($json) || empty($json['stub'])) {
            return;
        }

        File::deleteDirectory($absoluta);
    }

    private function contenidoStubIndex(string $nombreHtml): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>{$nombreHtml}</title>
	<link rel="stylesheet" href="/assets/css/bootstrap/css/bootstrap.min.css">
	<link rel="stylesheet" href="/assets/css/fontawesome/css/all.min.css">
	<link rel="stylesheet" href="/assets/css/fonts.css">
	<link rel="stylesheet" href="style.css">
</head>
<body>
	<main class="stub-wrap">
		<p class="stub-kicker">Paquete en construcción</p>
		<h1 class="stub-titulo">{$nombreHtml}</h1>
		<p class="stub-ayuda">Edita <code>index.html</code>, <code>script.js</code> y <code>style.css</code> en esta carpeta.</p>
	</main>
	<script src="script.js"></script>
</body>
</html>
HTML;
    }

    private function contenidoStubScript(): string
    {
        return <<<'JS'
(function () {
	'use strict';
	// Stub PedNia: implementa aquí la lógica del juego.
	console.info('[PedNia] Stub de catálogo listo.');
})();
JS;
    }

    private function contenidoStubStyle(): string
    {
        return <<<'CSS'
html, body {
	margin: 0;
	min-height: 100%;
	font-family: "Nunito", system-ui, sans-serif;
	background: #0f172a;
	color: #e2e8f0;
}

.stub-wrap {
	min-height: 100vh;
	display: grid;
	place-content: center;
	gap: 0.5rem;
	padding: 2rem;
	text-align: center;
}

.stub-kicker {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	font-size: 0.75rem;
	color: #94a3b8;
}

.stub-titulo {
	margin: 0;
	font-size: 1.75rem;
}

.stub-ayuda {
	margin: 0;
	color: #cbd5e1;
}

.stub-ayuda code {
	color: #93c5fd;
}
CSS;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array{ambiente_id:int, modulo_id:?int, eje_id:?int, tematica_id:?int}
     *
     * @throws ValidationException
     */
    public function resolverCadenaCurricular(array $datos): array
    {
        $ambienteId = (int) ($datos['ambiente_id'] ?? 0);
        if ($ambienteId < 1 || ! Ambiente::query()->whereKey($ambienteId)->exists()) {
            throw ValidationException::withMessages([
                'ambiente_id' => 'El ambiente es obligatorio y debe existir.',
            ]);
        }

        $moduloId = filled($datos['modulo_id'] ?? null) ? (int) $datos['modulo_id'] : null;
        $ejeId = filled($datos['eje_id'] ?? null) ? (int) $datos['eje_id'] : null;
        $tematicaId = filled($datos['tematica_id'] ?? null) ? (int) $datos['tematica_id'] : null;

        if ($tematicaId && ! $ejeId) {
            throw ValidationException::withMessages([
                'eje_id' => 'Selecciona el eje cuando indiques una temática.',
            ]);
        }

        if ($ejeId && ! $moduloId) {
            throw ValidationException::withMessages([
                'modulo_id' => 'Selecciona el módulo cuando indiques un eje.',
            ]);
        }

        if ($moduloId) {
            $modulo = Modulo::query()->find($moduloId);
            if (! $modulo || (int) $modulo->ambiente_id !== $ambienteId) {
                throw ValidationException::withMessages([
                    'modulo_id' => 'El módulo no pertenece al ambiente seleccionado.',
                ]);
            }
        }

        if ($ejeId) {
            $eje = Eje::query()->find($ejeId);
            if (! $eje || (int) $eje->modulo_id !== $moduloId) {
                throw ValidationException::withMessages([
                    'eje_id' => 'El eje no pertenece al módulo seleccionado.',
                ]);
            }
        }

        if ($tematicaId) {
            $tematica = Tematica::query()->find($tematicaId);
            if (! $tematica || (int) $tematica->eje_id !== $ejeId) {
                throw ValidationException::withMessages([
                    'tematica_id' => 'La temática no pertenece al eje seleccionado.',
                ]);
            }
        }

        return [
            'ambiente_id' => $ambienteId,
            'modulo_id' => $moduloId,
            'eje_id' => $ejeId,
            'tematica_id' => $tematicaId,
        ];
    }
}
