<?php

namespace App\Services;

use App\Models\Docente;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Gestión de la foto de perfil del docente (tabla docentes.foto_url).
 *
 * Convención de almacenamiento:
 * - Ruta relativa en disco public: docentes/{id}/foto.{jpg|png}
 * - URL pública: asset('storage/' . foto_url)
 */
class PerfilFotoService
{
    public const MAX_KILOBYTES = 2048;

    private const MIME_PERMITIDOS = ['image/jpeg', 'image/png'];

    /** URL pública a partir de la ruta relativa guardada en BD. */
    public function urlPublica(?string $rutaRelativa): ?string
    {
        return $rutaRelativa ? asset('storage/'.$rutaRelativa) : null;
    }

    public function iniciales(User $usuario): string
    {
        return mb_strtoupper(
            mb_substr($usuario->nombre ?? '', 0, 1).mb_substr($usuario->apellido ?? '', 0, 1)
        ) ?: 'NN';
    }

    /**
     * Guarda o reemplaza la foto del docente autenticado.
     *
     * @return array{foto_url: string, foto_url_publica: string, iniciales: string}
     */
    public function guardar(User $usuario, UploadedFile $archivo): array
    {
        $docente = $this->resolverDocentePropio($usuario);
        $this->validarArchivo($archivo);

        $extension = $archivo->getClientOriginalExtension() === 'png' ? 'png' : 'jpg';
        $nombreArchivo = "foto.{$extension}";

        if ($docente->foto_url) {
            Storage::disk('public')->delete($docente->foto_url);
        }

        $ruta = $archivo->storeAs("docentes/{$docente->id}", $nombreArchivo, 'public');

        $docente->update(['foto_url' => $ruta]);

        return [
            'foto_url' => $ruta,
            'foto_url_publica' => $this->urlPublica($ruta),
            'iniciales' => $this->iniciales($usuario),
        ];
    }

    /**
     * Elimina la foto del docente autenticado.
     *
     * @return array{foto_url: null, foto_url_publica: null, iniciales: string}
     */
    public function eliminar(User $usuario): array
    {
        $docente = $this->resolverDocentePropio($usuario);

        if ($docente->foto_url) {
            Storage::disk('public')->delete($docente->foto_url);
            $docente->update(['foto_url' => null]);
        }

        return [
            'foto_url' => null,
            'foto_url_publica' => null,
            'iniciales' => $this->iniciales($usuario),
        ];
    }

    private function resolverDocentePropio(User $usuario): Docente
    {
        if (! $usuario->esDocente()) {
            throw new InvalidArgumentException('Solo los docentes pueden gestionar la foto de perfil.');
        }

        $docente = $usuario->docente;

        if (! $docente) {
            throw new NotFoundHttpException('No se encontró el perfil docente asociado.');
        }

        return $docente;
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
