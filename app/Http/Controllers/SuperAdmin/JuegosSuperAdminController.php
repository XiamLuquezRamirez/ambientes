<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\RespondeCatalogoJuegos;
use App\Http\Controllers\Controller;
use App\Models\Juego;
use App\Services\JuegoCatalogoService;
use App\Services\ParametrosPerfilAprendizajeService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class JuegosSuperAdminController extends Controller
{
    use RespondeCatalogoJuegos;

    public function __construct(
        private JuegoCatalogoService $catalogo,
        private ParametrosPerfilAprendizajeService $parametrosPerfil,
    ) {}

    public function listar(Request $request)
    {
        $datos = $this->catalogo->listarDesdeRequest($request);

        if ($request->boolean('json')) {
            return $this->respuestaCatalogoJuegosJson($datos, $this->catalogo);
        }

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'html' => view('superAdmin.catalogo.juegos.partials._grid', $datos)->render(),
            ]);
        }

        return view('superAdmin.catalogo.juegos.index', array_merge($datos, [
            'tiposJuego' => Juego::tiposCatalogo(),
            'perfilPayload' => [
                'perfil_id' => 1,
                'perfil_clave' => 'estandar',
                'fuente' => 'preview_superadmin',
                'valores' => $this->parametrosPerfil->valoresEstandar(),
            ],
        ]));
    }

    public function mostrar(Juego $juego)
    {
        $juego->loadMissing([
            'ambiente:id,nombre',
            'modulo:id,nombre,ambiente_id',
            'eje:id,nombre,modulo_id',
            'tematica:id,nombre,eje_id',
        ]);

        $cadena = $juego->cadenaCurricularResuelta();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $juego->id,
                'tipo' => $juego->tipo,
                'ruta' => $juego->ruta,
                'nombre' => $juego->nombre,
                'descripcion' => $juego->descripcion ?? '',
                'icono' => $juego->icono ?? '',
                'color' => $juego->color ?: '#2563eb',
                'activo' => (bool) $juego->activo,
                'ambiente_id' => $juego->ambiente_id,
                'cadena' => $cadena,
            ],
        ]);
    }

    public function guardar(Request $request)
    {
        $datos = $this->validarEscritura($request);
        $juego = $this->catalogo->crear($datos);

        return response()->json([
            'success' => true,
            'message' => 'Juego creado correctamente. Se generó el stub del paquete en disco.',
            'data' => $this->catalogo->serializarTarjeta($juego->fresh() ?? $juego),
        ], 201);
    }

    public function actualizar(Request $request, Juego $juego)
    {
        $datos = $this->validarEscritura($request, $juego);
        $juego = $this->catalogo->actualizar($juego, $datos);

        return response()->json([
            'success' => true,
            'message' => 'Juego actualizado correctamente.',
            'data' => $this->catalogo->serializarTarjeta($juego),
        ]);
    }

    public function actualizarEstado(Juego $juego)
    {
        $juego = $this->catalogo->alternarActivo($juego);

        return response()->json([
            'success' => true,
            'activo' => (bool) $juego->activo,
            'message' => $juego->activo
                ? 'Juego activado correctamente.'
                : 'Juego desactivado correctamente.',
        ]);
    }

    public function preview(Juego $juego)
    {
        if (! $juego->urlPaquete()) {
            abort(404, 'Este juego no tiene paquete para vista previa.');
        }

        $rutaAbsoluta = public_path(trim((string) $juego->ruta, '/').'/index.html');
        if (! is_file($rutaAbsoluta)) {
            abort(404, 'No se encontró el index.html del paquete.');
        }

        $valores = $this->parametrosPerfil->valoresEstandar();

        return view('superAdmin.catalogo.juegos.preview', [
            'juego' => $juego,
            'urlPaquete' => $juego->urlPaquete(),
            'perfilPayload' => [
                'perfil_id' => 1,
                'perfil_clave' => 'estandar',
                'fuente' => 'preview_superadmin',
                'valores' => $valores,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validarEscritura(Request $request, ?Juego $juego = null): array
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'tipo' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::notIn([Juego::TIPO_NUEVO]),
            ],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'icono' => ['nullable', 'string', 'max:80'],
            'color' => ['nullable', 'string', 'max:20', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'ambiente_id' => ['required', 'integer', 'exists:ambientes,id'],
            'modulo_id' => ['nullable', 'integer', 'exists:modulos,id'],
            'eje_id' => ['nullable', 'integer', 'exists:ejes,id'],
            'tematica_id' => ['nullable', 'integer', 'exists:tematicas,id'],
            'activo' => ['sometimes', 'boolean'],
        ], [
            'nombre.required' => 'Este campo es requerido.',
            'nombre.max' => 'El nombre no puede superar 150 caracteres.',
            'tipo.required' => 'Este campo es requerido.',
            'tipo.regex' => 'El tipo debe estar en snake_case (ej. memoria_visual).',
            'tipo.not_in' => 'Selecciona o crea un tipo válido.',
            'tipo.max' => 'El tipo no puede superar 80 caracteres.',
            'descripcion.max' => 'La descripción no puede superar 2000 caracteres.',
            'icono.max' => 'El icono no puede superar 80 caracteres.',
            'color.regex' => 'El color debe ser un hexadecimal válido (ej. #2563eb).',
            'ambiente_id.required' => 'Este campo es requerido.',
            'ambiente_id.exists' => 'El ambiente seleccionado no es válido.',
            'modulo_id.exists' => 'El módulo seleccionado no es válido.',
            'eje_id.exists' => 'El eje seleccionado no es válido.',
            'tematica_id.exists' => 'La temática seleccionada no es válida.',
        ]);

        if (! Juego::tipoEsValido((string) $datos['tipo'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tipo' => 'El tipo debe estar en snake_case (ej. memoria_visual).',
            ]);
        }

        return $datos;
    }
}
