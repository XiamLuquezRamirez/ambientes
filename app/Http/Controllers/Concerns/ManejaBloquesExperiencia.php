<?php

namespace App\Http\Controllers\Concerns;

use App\Models\BloqueExperiencia;
use App\Models\Experiencia;
use App\Services\BloqueExperienciaService;
use App\Services\RecorridoNinoService;
use App\Services\VistaPreviaNinoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

trait ManejaBloquesExperiencia
{
    abstract protected function servicioBloques(): BloqueExperienciaService;

    abstract protected function asegurarExperienciaVisible(Experiencia $experiencia): void;

    abstract protected function asegurarExperienciaEditable(Experiencia $experiencia): void;

    /**
     * Publicar cambia estado → roles pueden restringirlo (p. ej. docente solo propias).
     */
    protected function asegurarExperienciaPublicable(Experiencia $experiencia): void
    {
        $this->asegurarExperienciaEditable($experiencia);
    }

    protected function asegurarBloqueEditable(BloqueExperiencia $bloque): void
    {
        $bloque->loadMissing('experiencia.tematica');
        $this->asegurarExperienciaEditable($bloque->experiencia);
    }

    public function listar(Experiencia $experiencia)
    {
        $this->asegurarExperienciaVisible($experiencia);

        return response()->json([
            'success' => true,
            'data' => [
                'bloques' => $this->servicioBloques()->listar($experiencia),
                'catalogo' => $this->servicioBloques()->registry()->catalogo(),
            ],
        ]);
    }

    public function guardar(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaEditable($experiencia);

        $datos = $request->validate([
            'tipo' => ['required', 'string', Rule::in(BloqueExperiencia::TIPOS)],
        ]);

        $bloque = $this->servicioBloques()->agregar($experiencia, $datos['tipo']);

        return response()->json([
            'success' => true,
            'message' => 'Bloque agregado.',
            'data' => $this->servicioBloques()->serializarBloque($bloque),
            'bloques' => $this->servicioBloques()->listar($experiencia->fresh()),
        ], 201);
    }

    public function actualizar(Request $request, BloqueExperiencia $bloque)
    {
        $this->asegurarBloqueEditable($bloque);

        $payload = $request->validate([
            'datos' => ['required', 'array'],
        ]);

        $bloque = $this->servicioBloques()->actualizarDatos($bloque, $payload['datos']);

        return response()->json([
            'success' => true,
            'message' => 'Bloque actualizado.',
            'data' => $this->servicioBloques()->serializarBloque($bloque),
        ]);
    }

    public function eliminar(BloqueExperiencia $bloque)
    {
        $this->asegurarBloqueEditable($bloque);
        $experiencia = $bloque->experiencia;
        $this->servicioBloques()->eliminar($bloque);

        return response()->json([
            'success' => true,
            'message' => 'Bloque eliminado.',
            'bloques' => $this->servicioBloques()->listar($experiencia->fresh()),
        ]);
    }

    public function reordenar(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaEditable($experiencia);

        $datos = $request->validate([
            'orden' => ['required', 'array', 'min:1'],
            'orden.*' => ['integer'],
        ]);

        $bloques = $this->servicioBloques()->reordenar($experiencia, $datos['orden']);

        return response()->json([
            'success' => true,
            'message' => 'Orden actualizado.',
            'data' => ['bloques' => $bloques],
        ]);
    }

    public function limpiar(Experiencia $experiencia)
    {
        $this->asegurarExperienciaEditable($experiencia);
        $bloques = $this->servicioBloques()->limpiar($experiencia);

        return response()->json([
            'success' => true,
            'message' => 'Secuencia reiniciada.',
            'data' => ['bloques' => $bloques],
        ]);
    }

    public function publicar(Experiencia $experiencia)
    {
        $this->asegurarExperienciaPublicable($experiencia);

        try {
            $resultado = $this->servicioBloques()->publicar($experiencia);
        } catch (ValidationException $e) {
            $pendientes = $this->servicioBloques()->bloquesIncompletos($experiencia);
            $mensaje = $e->errors()['publicar'][0]
                ?? (count($pendientes).' bloque(s) con campos pendientes.');

            return response()->json([
                'success' => false,
                'message' => $mensaje,
                'errors' => $e->errors(),
                'data' => [
                    'pendientes' => count($pendientes),
                    'bloques_pendientes' => $pendientes,
                ],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Experiencia publicada.',
            'data' => [
                'estado' => $resultado['experiencia']->estado,
                'pendientes' => 0,
            ],
        ]);
    }

    public function upload(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaEditable($experiencia);

        $request->validate([
            'archivo' => [
                'required',
                'file',
                'max:20480',
                'mimes:jpg,jpeg,png,gif,webp,mp3,mp4,wav,webm,mpeg',
            ],
        ], [
            'archivo.mimes' => 'El archivo debe ser imagen (jpg, png, gif, webp), audio (mp3, wav) o video (mp4, webm).',
        ]);

        $nombre = $this->servicioBloques()->subirArchivo($experiencia, $request->file('archivo'));

        return response()->json([
            'success' => true,
            'data' => [
                'archivo' => $nombre,
                'path' => 'experiencias/'.$experiencia->id.'/bloques/'.$nombre,
            ],
        ]);
    }

    public function tts(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaVisible($experiencia);

        $datos = $request->validate([
            'texto' => ['required', 'string', 'max:800'],
        ]);

        try {
            $url = app(\App\Services\TextoAVozService::class)->urlPublica($datos['texto']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar la voz.',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
        ]);
    }

    public function crearVistaPrevia(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaVisible($experiencia);

        $userId = (int) Auth::guard('docente')->id();
        $servicio = app(VistaPreviaNinoService::class);
        $sesion = $servicio->crear($experiencia, $userId);
        $enlace = $servicio->armarUrlTablet($request, $sesion['token']);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $sesion['token'],
                'url' => $enlace['url'],
                'expira_en' => $sesion['expira_en'],
                'host_local' => $enlace['host_local'],
                'ip_lan' => $enlace['ip_lan'],
                'aviso_red' => $enlace['aviso_red'],
            ],
        ]);
    }

    public function focoVistaPrevia(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaVisible($experiencia);

        $datos = $request->validate([
            'token' => ['required', 'string', 'size:40'],
            'bloque_id' => ['nullable', 'integer'],
        ]);

        $ok = app(VistaPreviaNinoService::class)->actualizarFoco(
            $datos['token'],
            (int) $experiencia->id,
            isset($datos['bloque_id']) ? (int) $datos['bloque_id'] : null
        );

        if (! $ok) {
            return response()->json([
                'success' => false,
                'message' => 'El enlace de tablet expiró. Genere uno nuevo.',
            ], 410);
        }

        return response()->json(['success' => true]);
    }

    public function crearRecorridoNino(Request $request, Experiencia $experiencia)
    {
        $this->asegurarExperienciaVisible($experiencia);

        $servicio = app(RecorridoNinoService::class);
        $ambiente = $servicio->ambienteDeExperiencia($experiencia);

        if (! $servicio->esAmbienteDemo($ambiente)) {
            return response()->json([
                'success' => false,
                'message' => 'El recorrido demo solo está disponible para Expresión Artística.',
            ], 422);
        }

        $userId = (int) Auth::guard('docente')->id();
        $sesion = $servicio->crear($ambiente, $userId, (int) $experiencia->id);
        $enlace = $servicio->armarUrlTablet($request, $sesion['token']);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $sesion['token'],
                'url' => $enlace['url'],
                'expira_en' => $sesion['expira_en'],
                'host_local' => $enlace['host_local'],
                'ip_lan' => $enlace['ip_lan'],
                'aviso_red' => $enlace['aviso_red'],
            ],
        ]);
    }
}
