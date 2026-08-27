<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManejaBloquesExperiencia;
use App\Http\Controllers\Controller;
use App\Models\Experiencia;
use App\Models\Institucion;
use App\Services\BloqueExperienciaService;
use Illuminate\Support\Facades\Auth;

class BloquesExperienciaAdminController extends Controller
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
        $institucionId = $this->institucionId();
        $experiencia->loadMissing('tematica.eje.modulo');

        $tematica = $experiencia->tematica;
        if (! $tematica || (! $tematica->esOficial() && ! $tematica->esDeInstitucion($institucionId))) {
            abort(403, 'No puede consultar esta experiencia.');
        }

        $this->asegurarAmbienteActivoContratado($tematica->eje->modulo->ambiente_id, $institucionId);
    }

    protected function asegurarExperienciaEditable(Experiencia $experiencia): void
    {
        $this->asegurarExperienciaVisible($experiencia);
        $institucionId = $this->institucionId();

        if (! $experiencia->puedeGestionarComoAdmin($institucionId)) {
            abort(403, 'Solo puede editar experiencias de temáticas propias de su institución.');
        }

        $tematica = $experiencia->tematica;
        if (! $tematica->activo) {
            abort(422, 'La temática no está activa.');
        }
        if (! $tematica->eje->activo) {
            abort(422, 'El eje de la temática no está activo.');
        }
    }

    private function asegurarAmbienteActivoContratado(int $ambienteId, int $institucionId): void
    {
        $activo = Institucion::query()
            ->whereKey($institucionId)
            ->whereHas(
                'ambientesActivos',
                fn ($q) => $q->where('ambientes.id', $ambienteId)
            )
            ->exists();

        if (! $activo) {
            abort(403, 'El ambiente no está activo para esta institución.');
        }
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;
        abort_unless($institucionId, 403, 'No se pudo determinar la institución del administrador.');

        return (int) $institucionId;
    }
}
