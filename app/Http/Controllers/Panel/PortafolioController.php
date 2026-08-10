<?php

namespace App\Http\Controllers\Panel;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Eje;
use App\Models\Estudiante;
use App\Models\Modulo;
use App\Models\Observacion;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class PortafolioController extends Controller
{
    public function listar()
    {
        $institucionId = $this->institucionId();
        $docente = Auth::guard('docente')->user()?->docente;

        if (! $docente) {
            abort(403, 'No se encontró el perfil docente.');
        }

        $ambienteIdsAsignados = $docente->cargasActivas()
            ->pluck('ambiente_id')
            ->unique()
            ->filter()
            ->values();

        if ($ambienteIdsAsignados->isEmpty()) {
            return view('panel.portafolio.index', [
                'ambientesModulos' => collect(),
                'docenteId' => (int) $docente->id,
            ]);
        }

        $ambientes = Ambiente::query()
            ->whereIn('id', $ambienteIdsAsignados)
            ->whereHas(
                'instituciones',
                fn ($q) => $q
                    ->where('instituciones.id', $institucionId)
                    ->where('ambiente_institucion.activo', true)
            )
            ->orderBy('nombre')
            ->get();

        $ambientesModulos = $ambientes->map(function (Ambiente $ambiente) use ($institucionId) {
            $oficiales = Modulo::query()
                ->oficiales()
                ->where('ambiente_id', $ambiente->id)
                ->whereHas(
                    'instituciones',
                    fn ($q) => $q->where('instituciones.id', $institucionId)
                )
                ->with([
                    'instituciones' => fn ($q) => $q->where('instituciones.id', $institucionId),
                ])
                ->withCount([
                    'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
                    'temas as temas_count',
                    'ejes as ejes_count',
                    'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
                ])
                ->orderBy('orden')
                ->get()
                ->map(function (Modulo $modulo) {
                    $activoInstitucion = (bool) optional($modulo->instituciones->first())->pivot?->activo;
                    $disponible = (bool) $modulo->activo && $activoInstitucion;

                    return [
                        'modelo' => $modulo,
                        'es_propio' => false,
                        'activo_institucion' => $activoInstitucion,
                        'puede_gestionar' => false,
                        'puede_gestionar_ejes' => $disponible,
                    ];
                });

            $propios = Modulo::query()
                ->deInstitucion($institucionId)
                ->where('ambiente_id', $ambiente->id)
                ->withCount([
                    'temas as temas_activos_count' => fn ($q) => $q->where('activo', true),
                    'temas as temas_count',
                    'ejes as ejes_count',
                    'ejes as ejes_propios_count' => fn ($q) => $q->deInstitucion($institucionId),
                ])
                ->orderBy('orden')
                ->get()
                ->map(fn (Modulo $modulo) => [
                    'modelo' => $modulo,
                    'es_propio' => true,
                    'activo_institucion' => (bool) $modulo->activo,
                    'puede_gestionar' => false,
                    'puede_gestionar_ejes' => (bool) $modulo->activo,
                ]);

            $ambiente->setRelation(
                'modulosInstitucion',
                $oficiales->concat($propios)->sortBy(fn ($item) => $item['modelo']->orden)->values()
            );
            $ambiente->modulos_total_count = $ambiente->modulosInstitucion->count();
            $ambiente->modulos_activos_count = $ambiente->modulosInstitucion
                ->filter(fn ($item) => $item['puede_gestionar_ejes'])
                ->count();
            $ambiente->ambiente_activo = true;

            return $ambiente;
        });

        $this->adjuntarEjesAModulos($ambientesModulos, $institucionId);

        $docenteId = (int) $docente->id;

        return view('panel.portafolio.index', compact('ambientesModulos', 'docenteId'));
    }

    public function verEstudiante($estudiante)
    {
        $estudiante = Estudiante::with(['portafolios' => function ($query) {
            $query->orderByDesc('creado_en');
        }])->findOrFail($estudiante);

        return view('panel.portafolio.estudiante', compact('estudiante'));
    }

    public function guardarObservacion(Request $request, $estudiante)
    {
        $estudiante = Estudiante::findOrFail($estudiante);
        $user = Auth::guard('docente')->user();

        $datos = $request->validate([
            'contenido' => 'required|string|max:2000',
            'tipo' => 'required|in:general,logro',
            'tema_id' => 'nullable|integer|exists:temas,id',
        ]);

        Observacion::create([
            'estudiante_id' => $estudiante->id,
            'user_id' => $user->id,
            'tema_id' => $datos['tema_id'] ?? null,
            'contenido' => $datos['contenido'],
            'tipo' => $datos['tipo'],
        ]);

        return redirect()
            ->route('panel.estudiantes.show', $estudiante)
            ->with('success', 'Observación registrada.');
    }

    public function exportar($estudiante)
    {
        return back()->with('info', 'Pendiente de implementacion.');
    }

    private function adjuntarEjesAModulos(Collection $ambientesModulos, int $institucionId): void
    {
        $moduloIds = $ambientesModulos
            ->flatMap(fn ($ambiente) => $ambiente->modulosInstitucion->pluck('modelo.id'))
            ->unique()
            ->values();

        if ($moduloIds->isEmpty()) {
            foreach ($ambientesModulos as $ambiente) {
                $ambiente->ejes_total_count = 0;
                $ambiente->ejes_activos_count = 0;
            }

            return;
        }

        $ejesPorModulo = Eje::query()
            ->whereIn('modulo_id', $moduloIds)
            ->where(function ($q) use ($institucionId) {
                $q->where(fn ($oficial) => $oficial->oficiales())
                    ->orWhere(fn ($propio) => $propio->deInstitucion($institucionId));
            })
            ->withCount([
                'temas as tematicas_activas_count' => fn ($q) => $q->where('activo', true),
                'temas as temas_count',
            ])
            ->orderBy('orden')
            ->get()
            ->groupBy('modulo_id');

        foreach ($ambientesModulos as $ambiente) {
            $items = $ambiente->modulosInstitucion->map(function (array $item) use ($ejesPorModulo, $institucionId) {
                $modulo = $item['modelo'];
                $ejes = ($ejesPorModulo->get($modulo->id) ?? collect())->values();

                $oficiales = $ejes->filter(fn (Eje $eje) => $eje->esOficial())->values();
                $propios = $ejes->filter(fn (Eje $eje) => $eje->esDeInstitucion($institucionId))->values();

                $item['ejes_oficiales'] = $oficiales;
                $item['ejes_propios'] = $propios;
                $item['ejes_total_count'] = $oficiales->count() + $propios->count();
                $item['ejes_activos_count'] = $oficiales->where('activo', true)->count()
                    + $propios->where('activo', true)->count();

                return $item;
            })->values();

            $ambiente->setRelation('modulosInstitucion', $items);
            $ambiente->ejes_total_count = $items->sum('ejes_total_count');
            $ambiente->ejes_activos_count = $items->sum('ejes_activos_count');
        }
    }

    private function institucionId(): int
    {
        $id = session('institucion_id') ?: Auth::guard('docente')->user()?->institucion_id;

        if (! $id) {
            abort(403, 'No hay institución en sesión.');
        }

        return (int) $id;
    }
}
