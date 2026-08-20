<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Concerns\ManejaBloquesExperiencia;
use App\Http\Controllers\Controller;
use App\Models\Experiencia;
use App\Models\Institucion;
use App\Services\BloqueExperienciaService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BloquesExperienciaPanelController extends Controller
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

        $this->asegurarAmbienteAsignadoAlDocente($tematica->eje->modulo->ambiente_id, $institucionId);
    }

    protected function asegurarExperienciaEditable(Experiencia $experiencia): void
    {
        $this->asegurarExperienciaVisible($experiencia);
        $institucionId = $this->institucionId();

        if (! $experiencia->puedeGestionarComoDocente($institucionId, $this->usuarioId())) {
            abort(403, 'Solo puede editar experiencias que usted creó.');
        }

        $tematica = $experiencia->tematica;
        if (! $tematica->activo) {
            abort(422, 'La temática no está activa.');
        }
        if (! $tematica->eje->activo) {
            abort(422, 'El eje de la temática no está activo.');
        }
    }

    protected function asegurarExperienciaPublicable(Experiencia $experiencia): void
    {
        $this->asegurarExperienciaEditable($experiencia);

        if (! $experiencia->puedeCambiarEstadoComoDocente($this->institucionId(), $this->usuarioId())) {
            abort(403, 'Solo puede publicar o cambiar el estado de experiencias que usted creó.');
        }
    }

    private function asegurarAmbienteAsignadoAlDocente(int $ambienteId, int $institucionId): void
    {
        $activoInstitucion = Institucion::query()
            ->whereKey($institucionId)
            ->whereHas(
                'ambientesActivos',
                fn ($q) => $q->where('ambientes.id', $ambienteId)
            )
            ->exists();

        if (! $activoInstitucion) {
            abort(403, 'El ambiente no está activo para esta institución.');
        }

        $docenteId = Auth::guard('docente')->user()?->docente?->id;
        abort_unless($docenteId, 403, 'No se encontró el perfil docente.');

        $asignado = DB::table('carga_docente')
            ->where('docente_id', $docenteId)
            ->where('ambiente_id', $ambienteId)
            ->where('activo', true)
            ->where('anio_lectivo', date('Y'))
            ->exists();

        if (! $asignado) {
            abort(403, 'No tiene asignación activa en este ambiente.');
        }
    }

    private function institucionId(): int
    {
        $institucionId = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;
        abort_unless($institucionId, 403, 'No se pudo determinar la institución.');

        return (int) $institucionId;
    }

    private function usuarioId(): int
    {
        $id = Auth::guard('docente')->id();
        abort_unless($id, 403, 'No hay un usuario autenticado.');

        return (int) $id;
    }
}
