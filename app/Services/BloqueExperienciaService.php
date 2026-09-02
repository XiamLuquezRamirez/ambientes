<?php

namespace App\Services;

use App\Models\BloqueExperiencia;
use App\Models\Experiencia;
use App\Services\BloqueDatos\BloqueDatosRegistry;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class BloqueExperienciaService
{
    public function __construct(
        private BloqueDatosRegistry $registry,
    ) {}

    public function asegurarObligatorios(Experiencia $experiencia): Collection
    {
        return DB::transaction(function () use ($experiencia) {
            $bloques = $experiencia->bloques()->orderBy('orden')->get();

            $bienvenida = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_BIENVENIDA);
            if (! $bienvenida) {
                $bienvenida = BloqueExperiencia::query()->create([
                    'experiencia_id' => $experiencia->id,
                    'tipo' => BloqueExperiencia::TIPO_BIENVENIDA,
                    'orden' => 1,
                    'datos' => $this->registry->defaults(BloqueExperiencia::TIPO_BIENVENIDA),
                    'activo' => true,
                ]);
            }

            $recompensa = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_RECOMPENSA);
            if (! $recompensa) {
                $maxOrden = (int) $experiencia->bloques()->max('orden');
                $recompensa = BloqueExperiencia::query()->create([
                    'experiencia_id' => $experiencia->id,
                    'tipo' => BloqueExperiencia::TIPO_RECOMPENSA,
                    'orden' => max(2, $maxOrden + 1),
                    'datos' => $this->registry->defaults(BloqueExperiencia::TIPO_RECOMPENSA),
                    'activo' => true,
                ]);
            }

            $this->normalizarOrdenesAnclados($experiencia);

            return $this->listar($experiencia);
        });
    }

    public function listar(Experiencia $experiencia): Collection
    {
        return $experiencia->bloques()
            ->orderBy('orden')
            ->get()
            ->map(fn (BloqueExperiencia $b) => $this->serializarBloque($b));
    }

    public function agregar(Experiencia $experiencia, string $tipo): BloqueExperiencia
    {
        if (! in_array($tipo, BloqueExperiencia::TIPOS, true)) {
            throw ValidationException::withMessages(['tipo' => 'Tipo de bloque no válido.']);
        }

        if (in_array($tipo, BloqueExperiencia::TIPOS_OBLIGATORIOS, true)) {
            throw ValidationException::withMessages(['tipo' => 'Este bloque se crea automáticamente.']);
        }

        if ($tipo === BloqueExperiencia::TIPO_EMOCION
            && $experiencia->bloques()->where('tipo', BloqueExperiencia::TIPO_EMOCION)->exists()
        ) {
            throw ValidationException::withMessages(['tipo' => 'Ya existe un bloque de emoción.']);
        }

        return DB::transaction(function () use ($experiencia, $tipo) {
            $this->asegurarObligatorios($experiencia);

            $recompensa = $experiencia->bloques()
                ->where('tipo', BloqueExperiencia::TIPO_RECOMPENSA)
                ->lockForUpdate()
                ->firstOrFail();

            $ordenNuevo = (int) $recompensa->orden;

            $experiencia->bloques()
                ->where('orden', '>=', $ordenNuevo)
                ->orderByDesc('orden')
                ->get()
                ->each(function (BloqueExperiencia $b) {
                    $b->orden = $b->orden + 1;
                    $b->save();
                });

            $bloque = BloqueExperiencia::query()->create([
                'experiencia_id' => $experiencia->id,
                'tipo' => $tipo,
                'orden' => $ordenNuevo,
                'datos' => $this->registry->defaults($tipo),
                'activo' => true,
            ]);

            $this->normalizarOrdenesAnclados($experiencia);

            return $bloque->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizarDatos(BloqueExperiencia $bloque, array $datos): BloqueExperiencia
    {
        $normalizados = $this->registry->normalizar($bloque->tipo, $datos);
        $bloque->datos = $normalizados;
        $bloque->save();

        return $bloque->fresh();
    }

    public function eliminar(BloqueExperiencia $bloque): void
    {
        if (! $bloque->puedeEliminar()) {
            throw ValidationException::withMessages(['bloque' => 'Este bloque no se puede eliminar.']);
        }

        DB::transaction(function () use ($bloque) {
            $experienciaId = $bloque->experiencia_id;
            $bloque->delete();
            $experiencia = Experiencia::query()->findOrFail($experienciaId);
            $this->normalizarOrdenesAnclados($experiencia);
        });
    }

    /**
     * @param  list<int>  $idsOrdenados
     */
    public function reordenar(Experiencia $experiencia, array $idsOrdenados): Collection
    {
        return DB::transaction(function () use ($experiencia, $idsOrdenados) {
            $bloques = $experiencia->bloques()->lockForUpdate()->orderBy('orden')->get();
            $bienvenida = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_BIENVENIDA);
            $recompensa = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_RECOMPENSA);

            if (! $bienvenida || ! $recompensa) {
                $this->asegurarObligatorios($experiencia);
                $bloques = $experiencia->bloques()->lockForUpdate()->orderBy('orden')->get();
                $bienvenida = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_BIENVENIDA);
                $recompensa = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_RECOMPENSA);
            }

            $movibles = $bloques->filter(fn (BloqueExperiencia $b) => $b->puedeMover())->keyBy('id');
            $idsMovibles = array_values(array_filter(
                array_map('intval', $idsOrdenados),
                fn (int $id) => $movibles->has($id)
            ));

            if (count($idsMovibles) !== $movibles->count()
                || count(array_unique($idsMovibles)) !== $movibles->count()
            ) {
                throw ValidationException::withMessages(['orden' => 'El orden de bloques no es válido.']);
            }

            // Evitar colisión UNIQUE (experiencia_id, orden) dentro de TINYINT UNSIGNED (máx. 255)
            $this->aparcarOrdenesTemporales($bloques);

            $orden = 1;
            $bienvenida->orden = $orden++;
            $bienvenida->save();

            foreach ($idsMovibles as $id) {
                $bloque = $movibles->get($id);
                $bloque->orden = $orden++;
                $bloque->save();
            }

            $recompensa->orden = $orden;
            $recompensa->save();

            return $this->listar($experiencia->fresh());
        });
    }

    public function limpiar(Experiencia $experiencia): Collection
    {
        return DB::transaction(function () use ($experiencia) {
            $experiencia->bloques()->delete();

            BloqueExperiencia::query()->create([
                'experiencia_id' => $experiencia->id,
                'tipo' => BloqueExperiencia::TIPO_BIENVENIDA,
                'orden' => 1,
                'datos' => $this->registry->defaults(BloqueExperiencia::TIPO_BIENVENIDA),
                'activo' => true,
            ]);

            BloqueExperiencia::query()->create([
                'experiencia_id' => $experiencia->id,
                'tipo' => BloqueExperiencia::TIPO_RECOMPENSA,
                'orden' => 2,
                'datos' => $this->registry->defaults(BloqueExperiencia::TIPO_RECOMPENSA),
                'activo' => true,
            ]);

            return $this->listar($experiencia->fresh());
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function bloquesIncompletos(Experiencia $experiencia): array
    {
        $bloques = $experiencia->bloques()->where('activo', true)->orderBy('orden')->get();
        $pendientesDetalle = [];

        foreach ($bloques as $bloque) {
            $lista = $this->registry->pendientes($bloque->tipo, $bloque->datos ?? []);
            if ($lista !== []) {
                $pendientesDetalle[] = [
                    'id' => $bloque->id,
                    'tipo' => $bloque->tipo,
                    'orden' => $bloque->orden,
                    'pendientes' => $lista,
                ];
            }
        }

        return $pendientesDetalle;
    }

    /**
     * @return array{experiencia: Experiencia, pendientes: int, bloques_pendientes: list<array<string, mixed>>}
     */
    public function publicar(Experiencia $experiencia): array
    {
        $pendientesDetalle = $this->bloquesIncompletos($experiencia);

        if ($pendientesDetalle !== []) {
            throw ValidationException::withMessages([
                'publicar' => [count($pendientesDetalle).' bloque(s) con campos pendientes.'],
            ]);
        }

        $experiencia->estado = Experiencia::ESTADO_ACTIVA;
        $experiencia->save();

        return [
            'experiencia' => $experiencia->fresh(),
            'pendientes' => 0,
            'bloques_pendientes' => [],
        ];
    }

    public function subirArchivo(Experiencia $experiencia, UploadedFile $file): string
    {
        $dir = 'experiencias/'.$experiencia->id.'/bloques';
        $nombre = $file->getClientOriginalName();
        $base = pathinfo($nombre, PATHINFO_FILENAME);
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $safeBase = preg_replace('/[^a-zA-Z0-9_\-]+/', '_', $base) ?: 'archivo';
        $final = $safeBase.'_'.uniqid().'.'.$ext;

        Storage::disk('public')->putFileAs($dir, $file, $final);

        return $final;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializarBloque(BloqueExperiencia $bloque): array
    {
        $meta = $this->registry->metaTipo($bloque->tipo);
        $datos = $this->registry->normalizar($bloque->tipo, $bloque->datos ?? []);

        if ($bloque->tipo === BloqueExperiencia::TIPO_CLASIFICACION && $datos !== ($bloque->datos ?? [])) {
            $bloque->datos = $datos;
            $bloque->saveQuietly();
        }

        $pendientes = $this->registry->pendientes($bloque->tipo, $datos);

        return [
            'id' => $bloque->id,
            'experiencia_id' => $bloque->experiencia_id,
            'tipo' => $bloque->tipo,
            'orden' => (int) $bloque->orden,
            'datos' => $datos,
            'activo' => (bool) $bloque->activo,
            'nombre' => $meta['nombre'],
            'descripcion' => $meta['descripcion'],
            'icono' => $meta['icono'],
            'categoria' => $meta['categoria'],
            'categoria_label' => $meta['categoria_label'],
            'obligatorio' => (bool) $meta['obligatorio'],
            'completo' => $pendientes === [],
            'pendientes' => $pendientes,
            'puede_eliminar' => $bloque->puedeEliminar(),
            'puede_mover' => $bloque->puedeMover(),
        ];
    }

    public function registry(): BloqueDatosRegistry
    {
        return $this->registry;
    }

    private function normalizarOrdenesAnclados(Experiencia $experiencia): void
    {
        $bloques = $experiencia->bloques()->orderBy('orden')->get();
        $bienvenida = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_BIENVENIDA);
        $recompensa = $bloques->firstWhere('tipo', BloqueExperiencia::TIPO_RECOMPENSA);
        $otros = $bloques->filter(
            fn (BloqueExperiencia $b) => ! in_array($b->tipo, BloqueExperiencia::TIPOS_OBLIGATORIOS, true)
        )->values();

        if (! $bienvenida || ! $recompensa) {
            return;
        }

        $this->aparcarOrdenesTemporales($bloques);

        $orden = 1;
        $bienvenida->orden = $orden++;
        $bienvenida->save();

        foreach ($otros as $bloque) {
            $bloque->orden = $orden++;
            $bloque->save();
        }

        $recompensa->orden = $orden;
        $recompensa->save();
    }

    /**
     * Reasigna órdenes temporales únicos dentro del rango TINYINT UNSIGNED (1–255)
     * para poder reescribir el orden final sin violar el UNIQUE (experiencia_id, orden).
     *
     * @param  \Illuminate\Support\Collection<int, BloqueExperiencia>  $bloques
     */
    private function aparcarOrdenesTemporales(Collection $bloques): void
    {
        if ($bloques->isEmpty()) {
            return;
        }

        if ($bloques->count() > 255) {
            throw ValidationException::withMessages([
                'orden' => 'No se pueden gestionar más de 255 bloques en una experiencia.',
            ]);
        }

        // De 255 hacia abajo: no choca con los órdenes finales (1..N).
        $temp = 255;
        foreach ($bloques->values() as $bloque) {
            $bloque->orden = $temp--;
            $bloque->save();
        }
    }
}
