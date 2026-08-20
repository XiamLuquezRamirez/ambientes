<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\ManejaBloquesExperiencia;
use App\Http\Controllers\Controller;
use App\Models\Experiencia;
use App\Services\BloqueExperienciaService;
use Illuminate\Support\Facades\Auth;

class BloquesExperienciaSuperAdminController extends Controller
{
    use ManejaBloquesExperiencia;

    public function __construct(
        private BloqueExperienciaService $bloques,
    ) {}

    protected function servicioBloques(): BloqueExperienciaService
    {
        return $this->bloques;
    }

    protected function asegurarExperienciaVisible(Experiencia $experiencia): void
    {
        $experiencia->loadMissing('tematica');
        if (! $experiencia->tematica || ! $experiencia->tematica->esOficial()) {
            abort(403, 'Solo experiencias de temáticas oficiales.');
        }
    }

    protected function asegurarExperienciaEditable(Experiencia $experiencia): void
    {
        $this->asegurarExperienciaVisible($experiencia);
        if (! $experiencia->puedeGestionarComoSuperAdmin($this->usuarioId())) {
            abort(403, 'Solo puede editar experiencias oficiales que usted creó.');
        }
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
