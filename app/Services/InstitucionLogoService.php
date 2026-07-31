<?php

namespace App\Services;

use App\Models\Institucion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * Gestión del logo de institución (tabla instituciones.logo).
 *
 * Convención de almacenamiento:
 * - Ruta relativa en disco public: instituciones/{id}/logo.{jpg|png}
 * - URL pública: asset('storage/' . logo)
 */
class InstitucionLogoService
{
    public const MAX_KILOBYTES = 2048;

    private const MIME_PERMITIDOS = ['image/jpeg', 'image/png'];

    /** URL pública a partir de la ruta relativa guardada en BD. */
    public function urlPublica(?string $rutaRelativa): ?string
    {
        return $rutaRelativa ? asset('storage/'.$rutaRelativa) : null;
    }

    /** Iniciales derivadas del nombre (fallback visual cuando no hay logo). */
    public function iniciales(Institucion $institucion): string
    {
        $nombre = trim($institucion->nombre ?? '');
        $partes = preg_split('/\s+/', $nombre) ?: [];

        if (count($partes) >= 2) {
            return mb_strtoupper(
                mb_substr($partes[0], 0, 1).mb_substr($partes[1], 0, 1)
            );
        }

        return mb_strtoupper(mb_substr($nombre, 0, 2)) ?: 'IE';
    }

    /**
     * Guarda o reemplaza el logo de la institución.
     *
     * @return array{logo: string, logo_url_publica: string, iniciales: string}
     */
    public function guardar(Institucion $institucion, UploadedFile $archivo): array
    {
        $this->validarArchivo($archivo);

        $extension = $archivo->getClientOriginalExtension() === 'png' ? 'png' : 'jpg';
        $nombreArchivo = "logo.{$extension}";

        if ($institucion->logo) {
            Storage::disk('public')->delete($institucion->logo);
        }

        $ruta = $archivo->storeAs("instituciones/{$institucion->id}", $nombreArchivo, 'public');
        $institucion->update(['logo' => $ruta]);

        return [
            'logo' => $ruta,
            'logo_url_publica' => $this->urlPublica($ruta),
            'iniciales' => $this->iniciales($institucion),
        ];
    }

    /**
     * Elimina el logo de la institución.
     *
     * @return array{logo: null, logo_url_publica: null, iniciales: string}
     */
    public function eliminar(Institucion $institucion): array
    {
        if ($institucion->logo) {
            Storage::disk('public')->delete($institucion->logo);
            $institucion->update(['logo' => null]);
        }

        return [
            'logo' => null,
            'logo_url_publica' => null,
            'iniciales' => $this->iniciales($institucion),
        ];
    }

    private function validarArchivo(UploadedFile $archivo): void
    {
        if (! in_array($archivo->getMimeType(), self::MIME_PERMITIDOS, true)) {
            throw new InvalidArgumentException('Solo se permiten archivos JPG o PNG.');
        }

        if ($archivo->getSize() > self::MAX_KILOBYTES * 1024) {
            throw new InvalidArgumentException('La imagen supera el tamaño máximo de 2 MB.');
        }
    }
}
