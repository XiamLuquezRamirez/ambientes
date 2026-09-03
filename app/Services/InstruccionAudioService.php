<?php

namespace App\Services;

use App\Models\BloqueExperiencia;
use App\Models\InstruccionAudio;

class InstruccionAudioService
{
    /**
     * @param  list<array<string, mixed>>|null  $filas
     * @return list<array{texto: string, personaje: string, orden: int}>
     */
    public function normalizarLista(?array $filas): array
    {
        if (! is_array($filas)) {
            return [];
        }

        $out = [];
        foreach ($filas as $fila) {
            if (! is_array($fila)) {
                continue;
            }
            $texto = trim((string) ($fila['texto'] ?? $fila['instruccion'] ?? ''));
            $personaje = $this->normalizarPersonaje($fila['personaje'] ?? null);
            $out[] = [
                'texto' => mb_substr($texto, 0, 800),
                'personaje' => $personaje,
            ];
            if (count($out) >= InstruccionAudio::MAX_POR_BLOQUE) {
                break;
            }
        }

        $normalizadas = [];
        foreach ($out as $i => $fila) {
            $normalizadas[] = [
                'texto' => $fila['texto'],
                'personaje' => $fila['personaje'],
                'orden' => $i + 1,
            ];
        }

        return $normalizadas;
    }

    /**
     * @param  list<array{texto: string, personaje: string, orden: int}>  $filas
     */
    public function textoLegacy(array $filas): string
    {
        $partes = [];
        foreach ($filas as $fila) {
            $texto = trim((string) ($fila['texto'] ?? ''));
            if ($texto !== '') {
                $partes[] = $texto;
            }
        }

        return implode(' ', $partes);
    }

    /**
     * @return list<array{id: int|null, texto: string, personaje: string, orden: int}>
     */
    public function serializar(BloqueExperiencia $bloque): array
    {
        $bloque->loadMissing('instruccionesAudio');
        $guardadas = $bloque->instruccionesAudio
            ->map(fn (InstruccionAudio $fila) => [
                'id' => $fila->id,
                'texto' => (string) $fila->instruccion,
                'personaje' => $this->normalizarPersonaje($fila->personaje),
                'orden' => (int) $fila->orden,
            ])
            ->values()
            ->all();

        if ($guardadas !== []) {
            return $guardadas;
        }

        $legacy = trim((string) (($bloque->datos ?? [])['instruccion'] ?? ''));
        if ($legacy === '') {
            return [[
                'id' => null,
                'texto' => '',
                'personaje' => InstruccionAudio::PERSONAJE_ZOE,
                'orden' => 1,
            ]];
        }

        return [[
            'id' => null,
            'texto' => $legacy,
            'personaje' => InstruccionAudio::PERSONAJE_ZOE,
            'orden' => 1,
        ]];
    }

    /**
     * @param  list<array<string, mixed>>|null  $filas
     * @return list<array{texto: string, personaje: string, orden: int}>
     */
    public function sincronizar(BloqueExperiencia $bloque, ?array $filas): array
    {
        $normalizadas = $this->normalizarLista($filas);
        $bloque->instruccionesAudio()->delete();

        foreach ($normalizadas as $fila) {
            $bloque->instruccionesAudio()->create([
                'instruccion' => $fila['texto'],
                'personaje' => $fila['personaje'],
                'orden' => $fila['orden'],
            ]);
        }

        $bloque->unsetRelation('instruccionesAudio');

        return $normalizadas;
    }

    /**
     * Si el cliente viejo solo manda `datos.instruccion` y aún no hay filas, las crea.
     *
     * @return list<array{texto: string, personaje: string, orden: int}>
     */
    public function asegurarDesdeLegacy(BloqueExperiencia $bloque, string $textoLegacy): array
    {
        $bloque->loadMissing('instruccionesAudio');
        if ($bloque->instruccionesAudio->isNotEmpty()) {
            return $this->serializar($bloque);
        }

        $texto = trim($textoLegacy);
        if ($texto === '') {
            return [];
        }

        return $this->sincronizar($bloque, [[
            'texto' => $texto,
            'personaje' => InstruccionAudio::PERSONAJE_ZOE,
        ]]);
    }

    public function normalizarPersonaje(mixed $personaje): string
    {
        $valor = strtolower(trim((string) $personaje));

        return in_array($valor, InstruccionAudio::PERSONAJES, true)
            ? $valor
            : InstruccionAudio::PERSONAJE_ZOE;
    }
}
