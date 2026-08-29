<?php

namespace App\Services;

use App\Models\Modulo;
use App\Models\SyncQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CurriculoMediaService
{
    public const TIPO_NINGUNO = 'ninguno';

    public const TIPO_IMAGEN = 'imagen';

    public const TIPO_VIDEO = 'video';

    public const ORIGEN_LOCAL = 'local';

    public const ORIGEN_URL = 'url';

    public const EMBED_DIRECTO = 'directo';

    public const EMBED_YOUTUBE = 'youtube';

    public const EMBED_VIMEO = 'vimeo';

    /**
     * @return array<string, mixed>
     */
    public function validarRequest(Request $request, ?Model $existente = null): array
    {
        $tipoMedia = $request->input('tipo_media', self::TIPO_NINGUNO) ?: self::TIPO_NINGUNO;
        $quitar = $request->boolean('quitar_media');

        $reglas = [
            'tipo_media' => ['nullable', Rule::in([self::TIPO_NINGUNO, self::TIPO_IMAGEN, self::TIPO_VIDEO])],
            'media_origen' => ['nullable', Rule::in([self::ORIGEN_LOCAL, self::ORIGEN_URL])],
            'media_url' => ['nullable', 'string', 'max:500'],
            'quitar_media' => ['nullable', 'boolean'],
            'archivo' => ['nullable', 'file'],
        ];

        if ($quitar || $tipoMedia === self::TIPO_NINGUNO) {
            return $request->validate($reglas, $this->mensajes());
        }

        $origen = $request->input('media_origen');
        $tieneArchivo = $request->hasFile('archivo');
        $tieneMediaExistente = $existente && $existente->tipo_media !== self::TIPO_NINGUNO;

        if ($origen === self::ORIGEN_LOCAL) {
            $mimes = $tipoMedia === self::TIPO_IMAGEN
                ? 'jpg,jpeg,png,gif,webp'
                : 'mp4,webm,mpeg,quicktime';

            $reglas['archivo'] = array_filter([
                (! $tieneArchivo && ! $tieneMediaExistente) ? 'required' : 'nullable',
                'file',
                'mimes:'.$mimes,
            ]);
        } elseif ($origen === self::ORIGEN_URL) {
            $reglas['media_url'] = ['required', 'string', 'max:500', 'url'];
        } else {
            throw ValidationException::withMessages([
                'media_origen' => ['Indica si subes un archivo o usas una URL.'],
            ]);
        }

        $datos = $request->validate($reglas, $this->mensajes());

        if (($datos['media_origen'] ?? null) === self::ORIGEN_URL) {
            try {
                $this->validarUrlCompatible($datos['media_url'], $tipoMedia);
            } catch (\InvalidArgumentException $e) {
                throw ValidationException::withMessages(['media_url' => [$e->getMessage()]]);
            }
        }

        return $datos;
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function aplicar(Model $entidad, string $tipoEntidad, array $datos, ?UploadedFile $archivo = null): void
    {
        $tipoMedia = $datos['tipo_media'] ?? self::TIPO_NINGUNO;
        $quitar = (bool) ($datos['quitar_media'] ?? false);

        if ($quitar || $tipoMedia === self::TIPO_NINGUNO) {
            $this->eliminarArchivoLocal($entidad, $tipoEntidad);
            $entidad->fill([
                'tipo_media' => self::TIPO_NINGUNO,
                'media_origen' => null,
                'media_archivo' => null,
                'media_url' => null,
                'media_embed' => null,
            ])->save();

            return;
        }

        $origen = $datos['media_origen'] ?? null;

        if ($origen === self::ORIGEN_URL) {
            $url = trim((string) ($datos['media_url'] ?? ''));
            $embed = $this->detectarEmbed($url);

            if ($archivo === null && $entidad->media_archivo) {
                $this->eliminarArchivoLocal($entidad, $tipoEntidad);
            }

            $entidad->fill([
                'tipo_media' => $tipoMedia,
                'media_origen' => self::ORIGEN_URL,
                'media_archivo' => null,
                'media_url' => $url,
                'media_embed' => $embed,
            ])->save();

            return;
        }

        if ($origen === self::ORIGEN_LOCAL) {
            if ($archivo) {
                $this->eliminarArchivoLocal($entidad, $tipoEntidad);
                $nombre = $this->guardarArchivo($entidad, $tipoEntidad, $archivo);

                $entidad->fill([
                    'tipo_media' => $tipoMedia,
                    'media_origen' => self::ORIGEN_LOCAL,
                    'media_archivo' => $nombre,
                    'media_url' => null,
                    'media_embed' => self::EMBED_DIRECTO,
                ])->save();

                $this->encolarSyncArchivo($entidad, $tipoEntidad, $this->directorio($tipoEntidad, (int) $entidad->getKey()).'/'.$nombre);
            } elseif ($entidad->media_origen === self::ORIGEN_LOCAL && $entidad->media_archivo) {
                $entidad->fill(['tipo_media' => $tipoMedia])->save();
            }

            return;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function serializarParaForm(Model $entidad): array
    {
        $preview = $this->resolverUrlPublica($entidad);

        return [
            'tipo_media' => $entidad->tipo_media ?? self::TIPO_NINGUNO,
            'media_origen' => $entidad->media_origen,
            'media_url' => $entidad->media_url,
            'media_archivo' => $entidad->media_archivo,
            'media_embed' => $entidad->media_embed,
            'media_preview_url' => $preview['url'] ?? null,
        ];
    }

    /**
     * Payload plano para paradas del camino 3D del kiosco.
     *
     * @return array<string, mixed>
     */
    public function serializarParaKiosco(Model $entidad): array
    {
        if (($entidad->tipo_media ?? self::TIPO_NINGUNO) === self::TIPO_NINGUNO) {
            return [
                'tipo_media' => self::TIPO_NINGUNO,
            ];
        }

        $resuelto = $this->resolverUrlPublica($entidad);

        return [
            'tipo_media' => $entidad->tipo_media,
            'media_origen' => $entidad->media_origen,
            'media_embed' => $entidad->media_embed ?? self::EMBED_DIRECTO,
            'media_url' => $resuelto['url'] ?? null,
            'imagen_url' => $entidad->tipo_media === self::TIPO_IMAGEN ? ($resuelto['url'] ?? null) : null,
            'video_url' => $entidad->tipo_media === self::TIPO_VIDEO ? ($resuelto['url'] ?? null) : null,
            'embed_url' => $resuelto['embed_url'] ?? null,
        ];
    }

    /**
     * @return array{url: ?string, embed_url: ?string}
     */
    public function resolverUrlPublica(Model $entidad): array
    {
        if (($entidad->tipo_media ?? self::TIPO_NINGUNO) === self::TIPO_NINGUNO) {
            return ['url' => null, 'embed_url' => null];
        }

        if ($entidad->media_origen === self::ORIGEN_LOCAL && $entidad->media_archivo) {
            $tipo = $entidad instanceof Modulo ? 'modulos' : 'ejes';
            $url = $this->urlArchivoPublico(
                $this->directorio($tipo, (int) $entidad->getKey()).'/'.$entidad->media_archivo
            );

            return ['url' => $url, 'embed_url' => null];
        }

        if ($entidad->media_origen === self::ORIGEN_URL && $entidad->media_url) {
            $embed = $entidad->media_embed ?? $this->detectarEmbed($entidad->media_url);

            return [
                'url' => $entidad->media_url,
                'embed_url' => $this->urlEmbed($entidad->media_url, $embed),
            ];
        }

        return ['url' => null, 'embed_url' => null];
    }

    public function detectarEmbed(string $url): string
    {
        $url = trim($url);

        if ($this->extraerIdYoutube($url) !== null) {
            return self::EMBED_YOUTUBE;
        }

        if ($this->extraerIdVimeo($url) !== null) {
            return self::EMBED_VIMEO;
        }

        return self::EMBED_DIRECTO;
    }

    public function urlEmbed(string $url, ?string $embed = null): ?string
    {
        $embed = $embed ?? $this->detectarEmbed($url);

        if ($embed === self::EMBED_YOUTUBE) {
            $id = $this->extraerIdYoutube($url);

            return $id ? 'https://www.youtube.com/embed/'.$id : null;
        }

        if ($embed === self::EMBED_VIMEO) {
            $id = $this->extraerIdVimeo($url);

            return $id ? 'https://player.vimeo.com/video/'.$id : null;
        }

        return $url;
    }

    private function validarUrlCompatible(string $url, string $tipoMedia): void
    {
        $embed = $this->detectarEmbed($url);

        if ($tipoMedia === self::TIPO_VIDEO) {
            return;
        }

        if ($tipoMedia === self::TIPO_IMAGEN && $embed !== self::EMBED_DIRECTO) {
            throw new \InvalidArgumentException('Para imagen use una URL directa al archivo (jpg, png, webp, gif).');
        }

        if ($tipoMedia === self::TIPO_IMAGEN && ! preg_match('/\.(jpe?g|png|gif|webp)(\?|$)/i', $url)) {
            throw new \InvalidArgumentException('La URL de imagen debe apuntar a un archivo de imagen válido.');
        }
    }

    private function guardarArchivo(Model $entidad, string $tipoEntidad, UploadedFile $file): string
    {
        $dir = $this->directorio($tipoEntidad, (int) $entidad->getKey());
        Storage::disk('public')->makeDirectory($dir);

        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $final = Str::uuid()->toString().'.'.$ext;

        Storage::disk('public')->putFileAs($dir, $file, $final);

        return $final;
    }

    public function eliminarArchivoLocal(Model $entidad, string $tipoEntidad): void
    {
        if ($entidad->media_origen !== self::ORIGEN_LOCAL || ! $entidad->media_archivo) {
            return;
        }

        $path = $this->directorio($tipoEntidad, (int) $entidad->getKey()).'/'.$entidad->media_archivo;

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function directorio(string $tipoEntidad, int $id): string
    {
        return 'curriculo/'.$tipoEntidad.'/'.$id;
    }

    private function urlArchivoPublico(string $rutaRelativa): string
    {
        return '/storage/'.ltrim(str_replace('\\', '/', $rutaRelativa), '/');
    }

    private function encolarSyncArchivo(Model $entidad, string $tipoEntidad, string $rutaRelativa): void
    {
        $servidor = config('red.servidor_actual');
        if (! $servidor || ! Storage::disk('public')->exists($rutaRelativa)) {
            return;
        }

        SyncQueue::create([
            'entidad' => 'CurriculoMediaArchivo',
            'entidad_id' => (int) $entidad->getKey(),
            'accion' => 'updated',
            'servidor_origen' => $servidor,
            'payload' => [
                'tipo_entidad' => $tipoEntidad,
                'entidad_id' => (int) $entidad->getKey(),
                'ruta_relativa' => $rutaRelativa,
                'checksum' => md5_file(Storage::disk('public')->path($rutaRelativa)),
            ],
            'estado' => 'pendiente',
        ]);
    }

    private function extraerIdYoutube(string $url): ?string
    {
        if (preg_match('~(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    private function extraerIdVimeo(string $url): ?string
    {
        if (preg_match('~vimeo\.com/(?:video/)?(\d+)~', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * @return array<string, string>
     */
    private function mensajes(): array
    {
        return [
            'archivo.required' => 'Selecciona un archivo o indica una URL.',
            'archivo.mimes' => 'El archivo no tiene un formato válido para el tipo de media elegido.',
            'media_url.required' => 'Indica la URL del archivo.',
            'media_url.url' => 'La URL no es válida.',
        ];
    }
}
