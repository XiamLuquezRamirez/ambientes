<?php

namespace App\Services;

use App\Models\BloqueExperiencia;
use App\Models\Clase;
use App\Models\Estudiante;
use App\Models\Experiencia;
use App\Models\ResultadoBloqueNino;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ResultadoNinoService
{
    private const TIPOS_BLOQUE_SOPORTADOS = [
        BloqueExperiencia::TIPO_PREGUNTA,
        BloqueExperiencia::TIPO_RETO,
        BloqueExperiencia::TIPO_EMOCION,
        BloqueExperiencia::TIPO_EVIDENCIA,
        BloqueExperiencia::TIPO_DIBUJO,
        BloqueExperiencia::TIPO_JUEGO,
        BloqueExperiencia::TIPO_EMPAREJAR,
        BloqueExperiencia::TIPO_CLASIFICACION,
        BloqueExperiencia::TIPO_ARRASTRAR,
    ];

    private const JUEGOS_REGISTRO = ['memoria', 'rompecabezas', 'secuencia', 'colorear'];

    private const MIME_IMAGEN = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
    ];

    private const MIME_AUDIO = [
        'audio/mp4',
        'audio/mpeg',
        'audio/webm',
        'audio/ogg',
        'audio/x-m4a',
        'audio/aac',
    ];

    private const MIME_VIDEO = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-m4v',
    ];

    public function __construct(
        private SesionNinoService $sesionNino,
        private RecorridoNinoService $recorrido,
        private ClaseKioscoService $claseKiosco,
    ) {}

    /**
     * @param  array{correcto?: bool|null, payload: array<string, mixed>}  $datos
     */
    public function registrar(
        Request $request,
        Experiencia $experiencia,
        BloqueExperiencia $bloque,
        array $datos,
        ?UploadedFile $archivo = null,
    ): ResultadoBloqueNino {
        if ((int) $bloque->experiencia_id !== (int) $experiencia->id) {
            throw ValidationException::withMessages([
                'bloque' => 'El bloque no pertenece a esta experiencia.',
            ]);
        }

        if (! in_array($bloque->tipo, self::TIPOS_BLOQUE_SOPORTADOS, true)) {
            throw ValidationException::withMessages([
                'bloque' => 'Este tipo de bloque aún no registra resultados.',
            ]);
        }

        if ($bloque->tipo === BloqueExperiencia::TIPO_JUEGO) {
            $juegoId = (string) (($bloque->datos ?? [])['juego_id'] ?? '');
            if (! in_array($juegoId, self::JUEGOS_REGISTRO, true)) {
                throw ValidationException::withMessages([
                    'bloque' => 'Este juego aún no registra resultados.',
                ]);
            }
        }

        /** @var Estudiante|null $estudiante */
        $estudiante = $request->attributes->get('estudiante_nino');
        if (! $estudiante) {
            throw ValidationException::withMessages([
                'sesion' => 'No hay sesión de estudiante activa.',
            ]);
        }

        $ambiente = $this->sesionNino->obtenerAmbiente($request);
        $clase = $this->claseKiosco->obtenerClaseSesion($this->sesionNino->claseIdEnSesion($request));

        if (! $clase) {
            $clase = $this->claseKiosco->claseActivaHoy($ambiente);
        }

        if (! $clase instanceof Clase) {
            throw ValidationException::withMessages([
                'clase' => 'No hay una clase activa para registrar el resultado.',
            ]);
        }

        $sesion = [
            'ambiente_id' => $ambiente->id,
            'clase_id' => $clase->id,
            'experiencia_id' => $clase->experiencia_id,
        ];

        if (! $this->recorrido->experienciaPermitidaEnSesion($sesion, $experiencia)) {
            throw ValidationException::withMessages([
                'experiencia' => 'La experiencia no pertenece a la clase de hoy.',
            ]);
        }

        $payload = $datos['payload'];
        $this->validarPayload($bloque, $payload);
        $this->validarArchivo($bloque, $payload, $archivo);

        $tipoRegistro = $this->resolverTipoRegistro($bloque, $payload);

        $correcto = array_key_exists('correcto', $datos) ? $datos['correcto'] : null;
        if (in_array($bloque->tipo, [
            BloqueExperiencia::TIPO_EMOCION,
            BloqueExperiencia::TIPO_EVIDENCIA,
            BloqueExperiencia::TIPO_DIBUJO,
            BloqueExperiencia::TIPO_EMPAREJAR,
            BloqueExperiencia::TIPO_CLASIFICACION,
            BloqueExperiencia::TIPO_ARRASTRAR,
        ], true) || $bloque->tipo === BloqueExperiencia::TIPO_JUEGO) {
            $correcto = null;
        }

        $criterios = [
            'estudiante_id' => $estudiante->id,
            'clase_id' => $clase->id,
            'bloque_experiencia_id' => $bloque->id,
        ];

        $existente = ResultadoBloqueNino::query()->where($criterios)->first();
        $archivoPath = $existente?->archivo_path;

        if ($archivo) {
            if ($archivoPath) {
                Storage::disk('public')->delete($archivoPath);
            }
            $archivoPath = $this->guardarArchivo(
                $experiencia,
                $clase,
                $estudiante,
                $bloque,
                $archivo,
                $tipoRegistro
            );
        }

        return ResultadoBloqueNino::query()->updateOrCreate(
            $criterios,
            [
                'experiencia_id' => $experiencia->id,
                'tipo_bloque' => $bloque->tipo,
                'tipo_registro' => $tipoRegistro,
                'correcto' => $correcto,
                'payload' => $payload,
                'archivo_path' => $archivoPath,
            ]
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolverTipoRegistro(BloqueExperiencia $bloque, array $payload): string
    {
        if ($bloque->tipo === BloqueExperiencia::TIPO_EMOCION) {
            return ResultadoBloqueNino::TIPO_REGISTRO_EMOCION;
        }

        if ($bloque->tipo === BloqueExperiencia::TIPO_EVIDENCIA) {
            $tipoMedia = (string) ($payload['tipo_media'] ?? 'foto');

            return match ($tipoMedia) {
                'audio' => ResultadoBloqueNino::TIPO_REGISTRO_AUDIO,
                'video' => ResultadoBloqueNino::TIPO_REGISTRO_VIDEO,
                default => ResultadoBloqueNino::TIPO_REGISTRO_FOTO,
            };
        }

        if ($bloque->tipo === BloqueExperiencia::TIPO_DIBUJO
            || ($bloque->tipo === BloqueExperiencia::TIPO_JUEGO && (($bloque->datos ?? [])['juego_id'] ?? '') === 'colorear')) {
            return ResultadoBloqueNino::TIPO_REGISTRO_FOTO;
        }

        if (in_array($bloque->tipo, [
            BloqueExperiencia::TIPO_EMPAREJAR,
            BloqueExperiencia::TIPO_CLASIFICACION,
            BloqueExperiencia::TIPO_ARRASTRAR,
        ], true)) {
            return ResultadoBloqueNino::TIPO_REGISTRO_RESULTADO;
        }

        if ($bloque->tipo === BloqueExperiencia::TIPO_JUEGO) {
            return ResultadoBloqueNino::TIPO_REGISTRO_RESULTADO;
        }

        return ResultadoBloqueNino::TIPO_REGISTRO_RESULTADO;
    }

    private function guardarArchivo(
        Experiencia $experiencia,
        Clase $clase,
        Estudiante $estudiante,
        BloqueExperiencia $bloque,
        UploadedFile $archivo,
        string $tipoRegistro,
    ): string {
        $dir = sprintf(
            'resultados-nino/%d/clase_%d/estudiante_%d',
            $experiencia->id,
            $clase->id,
            $estudiante->id
        );

        Storage::disk('public')->makeDirectory($dir);

        $ext = strtolower($archivo->getClientOriginalExtension() ?: $archivo->guessExtension() ?: $this->extensionPorTipoRegistro($tipoRegistro));
        $nombre = sprintf('bloque_%d_%s.%s', $bloque->id, uniqid(), $ext);

        Storage::disk('public')->putFileAs($dir, $archivo, $nombre);

        return $dir.'/'.$nombre;
    }

    private function extensionPorTipoRegistro(string $tipoRegistro): string
    {
        return match ($tipoRegistro) {
            ResultadoBloqueNino::TIPO_REGISTRO_AUDIO => 'm4a',
            ResultadoBloqueNino::TIPO_REGISTRO_VIDEO => 'mp4',
            default => 'png',
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarArchivo(BloqueExperiencia $bloque, array $payload, ?UploadedFile $archivo): void
    {
        $requiereArchivo = $bloque->tipo === BloqueExperiencia::TIPO_EVIDENCIA
            || $bloque->tipo === BloqueExperiencia::TIPO_DIBUJO
            || ($bloque->tipo === BloqueExperiencia::TIPO_JUEGO && (($bloque->datos ?? [])['juego_id'] ?? '') === 'colorear');

        if (! $requiereArchivo) {
            return;
        }

        if (! $archivo) {
            throw ValidationException::withMessages([
                'archivo' => 'Debes adjuntar el archivo del bloque.',
            ]);
        }

        $mime = strtolower((string) $archivo->getMimeType());
        $tipoMedia = (string) ($payload['tipo_media'] ?? '');

        if ($bloque->tipo === BloqueExperiencia::TIPO_EVIDENCIA) {
            $permitidos = match ($tipoMedia) {
                'audio' => self::MIME_AUDIO,
                'video' => self::MIME_VIDEO,
                default => self::MIME_IMAGEN,
            };

            if (! in_array($mime, $permitidos, true)) {
                throw ValidationException::withMessages([
                    'archivo' => 'El tipo de archivo no coincide con la evidencia.',
                ]);
            }

            return;
        }

        if (! in_array($mime, self::MIME_IMAGEN, true)) {
            throw ValidationException::withMessages([
                'archivo' => 'El dibujo debe enviarse como imagen.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayload(BloqueExperiencia $bloque, array $payload): void
    {
        match ($bloque->tipo) {
            BloqueExperiencia::TIPO_PREGUNTA => $this->validarPayloadPregunta($payload),
            BloqueExperiencia::TIPO_RETO => $this->validarPayloadReto($payload),
            BloqueExperiencia::TIPO_EMOCION => $this->validarPayloadEmocion($payload),
            BloqueExperiencia::TIPO_EVIDENCIA => $this->validarPayloadEvidencia($payload),
            BloqueExperiencia::TIPO_DIBUJO => $this->validarPayloadDibujo($payload),
            BloqueExperiencia::TIPO_JUEGO => $this->validarPayloadJuego($bloque, $payload),
            BloqueExperiencia::TIPO_EMPAREJAR => $this->validarPayloadEmparejar($payload),
            BloqueExperiencia::TIPO_CLASIFICACION => $this->validarPayloadClasificacion($payload),
            BloqueExperiencia::TIPO_ARRASTRAR => $this->validarPayloadArrastrar($payload),
            default => throw ValidationException::withMessages([
                'payload' => 'Tipo de bloque no soportado.',
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadPregunta(array $payload): void
    {
        if (! array_key_exists('opcion_index', $payload) || ! is_numeric($payload['opcion_index'])) {
            throw ValidationException::withMessages([
                'payload.opcion_index' => 'La opción elegida es obligatoria.',
            ]);
        }

        if (! array_key_exists('correcta', $payload) || ! is_bool($payload['correcta'])) {
            throw ValidationException::withMessages([
                'payload.correcta' => 'El indicador de acierto es obligatorio.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadReto(array $payload): void
    {
        foreach (['paso', 'opcion_index', 'total_pasos', 'correcta'] as $campo) {
            if (! array_key_exists($campo, $payload)) {
                throw ValidationException::withMessages([
                    "payload.{$campo}" => 'El campo es obligatorio.',
                ]);
            }
        }

        if (! is_numeric($payload['paso']) || ! is_numeric($payload['opcion_index']) || ! is_numeric($payload['total_pasos'])) {
            throw ValidationException::withMessages([
                'payload' => 'Los índices del reto deben ser numéricos.',
            ]);
        }

        if (! is_bool($payload['correcta'])) {
            throw ValidationException::withMessages([
                'payload.correcta' => 'El indicador de acierto es obligatorio.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadEmocion(array $payload): void
    {
        $emocionId = trim((string) ($payload['emocion_id'] ?? ''));
        if ($emocionId === '') {
            throw ValidationException::withMessages([
                'payload.emocion_id' => 'La emoción seleccionada es obligatoria.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadEvidencia(array $payload): void
    {
        $tipoMedia = trim((string) ($payload['tipo_media'] ?? ''));
        if (! in_array($tipoMedia, ['foto', 'audio', 'video', 'seleccion'], true)) {
            throw ValidationException::withMessages([
                'payload.tipo_media' => 'El tipo de evidencia es obligatorio.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadDibujo(array $payload): void
    {
        if (($payload['modo'] ?? '') !== 'dibujo') {
            throw ValidationException::withMessages([
                'payload.modo' => 'El modo de dibujo es obligatorio.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadJuego(BloqueExperiencia $bloque, array $payload): void
    {
        $juegoId = (string) (($bloque->datos ?? [])['juego_id'] ?? '');
        if (($payload['juego_id'] ?? '') !== $juegoId) {
            throw ValidationException::withMessages([
                'payload.juego_id' => 'El juego no coincide con el bloque.',
            ]);
        }

        match ($juegoId) {
            'memoria' => $this->validarPayloadMemoria($payload),
            'rompecabezas' => $this->validarPayloadRompecabezas($payload),
            'secuencia' => $this->validarPayloadSecuencia($payload),
            'colorear' => $this->validarPayloadColorear($payload),
            default => throw ValidationException::withMessages([
                'payload' => 'Juego no soportado.',
            ]),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadMemoria(array $payload): void
    {
        foreach (['pares_total', 'pares_encontrados', 'completado'] as $campo) {
            if (! array_key_exists($campo, $payload)) {
                throw ValidationException::withMessages([
                    "payload.{$campo}" => 'El campo es obligatorio.',
                ]);
            }
        }
        if (! is_bool($payload['completado']) || $payload['completado'] !== true) {
            throw ValidationException::withMessages([
                'payload.completado' => 'El juego debe estar completado.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadRompecabezas(array $payload): void
    {
        if (! array_key_exists('piezas_total', $payload) || ! is_numeric($payload['piezas_total'])) {
            throw ValidationException::withMessages([
                'payload.piezas_total' => 'El total de piezas es obligatorio.',
            ]);
        }
        if (! ($payload['completado'] ?? false)) {
            throw ValidationException::withMessages([
                'payload.completado' => 'El rompecabezas debe estar completado.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadSecuencia(array $payload): void
    {
        if (! array_key_exists('items_total', $payload) || ! is_numeric($payload['items_total'])) {
            throw ValidationException::withMessages([
                'payload.items_total' => 'El total de ítems es obligatorio.',
            ]);
        }
        if (! ($payload['completado'] ?? false)) {
            throw ValidationException::withMessages([
                'payload.completado' => 'La secuencia debe estar completada.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadEmparejar(array $payload): void
    {
        foreach (['pares_total', 'pares_correctos', 'completado'] as $campo) {
            if (! array_key_exists($campo, $payload)) {
                throw ValidationException::withMessages([
                    "payload.{$campo}" => 'El campo es obligatorio.',
                ]);
            }
        }
        if (! ($payload['completado'] ?? false)) {
            throw ValidationException::withMessages([
                'payload.completado' => 'El emparejamiento debe estar completado.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadClasificacion(array $payload): void
    {
        foreach (['items_total', 'items_colocados', 'completado'] as $campo) {
            if (! array_key_exists($campo, $payload)) {
                throw ValidationException::withMessages([
                    "payload.{$campo}" => 'El campo es obligatorio.',
                ]);
            }
        }
        if (! ($payload['completado'] ?? false)) {
            throw ValidationException::withMessages([
                'payload.completado' => 'La clasificación debe estar completada.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadArrastrar(array $payload): void
    {
        foreach (['items_total', 'items_colocados', 'completado'] as $campo) {
            if (! array_key_exists($campo, $payload)) {
                throw ValidationException::withMessages([
                    "payload.{$campo}" => 'El campo es obligatorio.',
                ]);
            }
        }
        if (! ($payload['completado'] ?? false)) {
            throw ValidationException::withMessages([
                'payload.completado' => 'El arrastre debe estar completado.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function validarPayloadColorear(array $payload): void
    {
        if (($payload['modo'] ?? '') !== 'colorear' || ($payload['juego_id'] ?? '') !== 'colorear') {
            throw ValidationException::withMessages([
                'payload' => 'El payload del juego colorear es inválido.',
            ]);
        }
    }
}
