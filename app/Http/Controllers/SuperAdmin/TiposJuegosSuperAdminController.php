<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\TiposJuego;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TiposJuegosSuperAdminController extends Controller
{
    public function listar(Request $request)
    {
        $consulta = TiposJuego::query()
            ->withCount('juegos')
            ->orderBy('nombre');

        if ($request->filled('buscar')) {
            $termino = trim($request->buscar);

            $consulta->where(function ($q) use ($termino) {
                $q->where('nombre', 'like', "%{$termino}%")
                    ->orWhere('slug', 'like', "%{$termino}%")
                    ->orWhere('descripcion', 'like', "%{$termino}%");
            });
        }

        if ($request->has('activo') && $request->input('activo') !== '') {
            $consulta->where('activo', $request->boolean('activo'));
        }

        $tiposJuego = $consulta
            ->paginate(10)
            ->withQueryString();

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view(
                    'superAdmin.catalogo_juegos.tipos_juegos._tabla',
                    compact('tiposJuego')
                )->render(),
            ]);
        }

        return view(
            'superAdmin.catalogo_juegos.tipos_juegos.index',
            compact('tiposJuego')
        );
    }

    public function guardar(Request $request)
    {
        $datos = $this->validarEscritura($request);
        $datos['slug'] = $this->generarSlugUnico($datos['nombre']);
        $datos['activo'] = true;

        $tipoJuego = TiposJuego::create($datos);

        return response()->json([
            'success' => true,
            'message' => 'Tipo de juego creado correctamente.',
            'data' => $this->serializar($tipoJuego),
        ], 201);
    }

    public function mostrar(TiposJuego $tipoJuego)
    {
        $tipoJuego->loadCount('juegos');

        return response()->json([
            'success' => true,
            'data' => $this->serializar($tipoJuego),
        ]);
    }

    public function actualizar(Request $request, TiposJuego $tipoJuego)
    {
        $datos = $this->validarEscritura($request, $tipoJuego);

        $tipoJuego->update([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tipo de juego actualizado correctamente.',
            'data' => $this->serializar($tipoJuego->fresh()->loadCount('juegos')),
        ]);
    }

    public function actualizarEstado(TiposJuego $tipoJuego)
    {
        $tipoJuego->loadCount('juegos');
        $tipoJuego->activo = ! $tipoJuego->activo;
        $tipoJuego->save();

        return response()->json([
            'success' => true,
            'activo' => (bool) $tipoJuego->activo,
            'juegos_count' => (int) $tipoJuego->juegos_count,
            'message' => $tipoJuego->activo
                ? 'Tipo de juego activado correctamente.'
                : 'Tipo de juego desactivado correctamente.',
        ]);
    }

    /**
     * @return array{nombre: string, descripcion:?string}
     */
    private function validarEscritura(Request $request, ?TiposJuego $tipoJuego = null): array
    {
        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('tipos_juegos', 'nombre')->ignore($tipoJuego?->id),
            ],
            'descripcion' => ['nullable', 'string', 'max:500'],
        ], [
            'nombre.required' => 'Este campo es requerido.',
            'nombre.max' => 'El nombre no puede superar 100 caracteres.',
            'nombre.unique' => 'Este nombre ya está registrado.',
            'descripcion.max' => 'La descripción no puede superar 500 caracteres.',
        ]);

        $datos['nombre'] = trim($datos['nombre']);
        $datos['descripcion'] = isset($datos['descripcion'])
            ? (trim($datos['descripcion']) ?: null)
            : null;

        return $datos;
    }

    private function generarSlugUnico(string $nombre): string
    {
        $base = Str::slug($nombre, '_');

        if ($base === '' || ! preg_match('/^[a-z][a-z0-9_]*$/', $base)) {
            throw ValidationException::withMessages([
                'nombre' => 'El nombre no produce un identificador válido. Usa letras y números.',
            ]);
        }

        $base = substr($base, 0, 80);
        $slug = $base;
        $i = 2;

        while (TiposJuego::query()->where('slug', $slug)->exists()) {
            $suffix = '_'.$i;
            $slug = substr($base, 0, 80 - strlen($suffix)).$suffix;
            $i++;
        }

        return $slug;
    }

    /**
     * @return array{id:int, slug:string, nombre:string, descripcion:string, activo:bool, juegos_count:int}
     */
    private function serializar(TiposJuego $tipoJuego): array
    {
        return [
            'id' => $tipoJuego->id,
            'slug' => $tipoJuego->slug,
            'nombre' => $tipoJuego->nombre,
            'descripcion' => $tipoJuego->descripcion ?? '',
            'activo' => (bool) $tipoJuego->activo,
            'juegos_count' => (int) ($tipoJuego->juegos_count ?? 0),
        ];
    }
}
