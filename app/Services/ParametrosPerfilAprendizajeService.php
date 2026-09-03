<?php

namespace App\Services;

use App\Models\Estudiante;
use App\Models\PerfilAprendizajePersonalizado;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

/**
 * Lectura y escritura de los 50 parámetros de adaptación por perfil de aprendizaje.
 *
 * Capas de almacenamiento (storage/parametros-perfil/):
 * - defaults/{tipo}/{id}.json — valores por defecto editables por SuperAdmin
 * - {institucion_id}/{tipo}/{id}.json — valores por colegio (admin/docente)
 *
 * Cada JSON almacena siempre los 50 parámetros completos en la clave "valores".
 */
class ParametrosPerfilAprendizajeService
{
    private const STORAGE = 'parametros-perfil';

    private const TIPOS_VALIDOS = ['inclusion', 'personalizado'];

    /**
     * @return array<string, mixed>
     */
    public function catalogo(): array
    {
        $config = config('parametros_perfil', []);

        return [
            'base' => $config['base'] ?? [],
            'presets' => $config['presets'] ?? [],
            'principios' => $config['principios'] ?? [],
            'categorias' => $config['categorias'] ?? [],
            'mapa_perfiles' => $config['mapa_perfiles'] ?? [],
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function listarParametrosDef(): array
    {
        $params = [];

        foreach (config('parametros_perfil.categorias', []) as $cat) {
            foreach ($cat['params'] ?? [] as $p) {
                $params[$p['k']] = $p;
            }
        }

        return $params;
    }

    public function clavePerfilInclusion(int $id): ?string
    {
        $mapa = config('parametros_perfil.mapa_perfiles', []);

        return $mapa[$id] ?? null;
    }

    /**
     * Valores estándar del sistema (config base, 50 parámetros).
     *
     * @return array<string, mixed>
     */
    public function valoresEstandar(): array
    {
        return $this->plantillaValores(config('parametros_perfil.base', []));
    }

    /**
     * Valores de referencia del sistema: BASE + PRESET del diagnóstico.
     *
     * @return array<string, mixed>
     */
    public function valoresSistemaInclusion(int $perfilId): array
    {
        $base = config('parametros_perfil.base', []);
        $clave = $this->clavePerfilInclusion($perfilId);
        $preset = $clave ? (config('parametros_perfil.presets.'.$clave) ?? []) : [];

        return $this->completarValores(array_merge($base, $preset));
    }

    /**
     * Defaults globales (SuperAdmin): valores del JSON o referencia del sistema.
     *
     * @return array<string, mixed>
     */
    public function valoresDefaults(string $tipo, int $id): array
    {
        $this->validarTipo($tipo);
        $referencia = $this->referenciaDefaults($tipo, $id);

        return $this->leerValoresDesdeRuta($this->rutaArchivo($tipo, $id), $referencia);
    }

    /**
     * Referencia contra la cual se calculan overrides institucionales al guardar.
     *
     * @return array<string, mixed>
     */
    public function valoresReferenciaInstitucion(
        int $institucionId,
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        $this->validarTipo($tipo);

        if ($tipo === 'inclusion') {
            return $this->valoresDefaults('inclusion', $id);
        }

        $perfil = $perfil ?? PerfilAprendizajePersonalizado::query()->find($id);
        $baseId = (int) ($perfil?->perfil_aprendizaje_id ?? 0);

        if ($baseId <= 0) {
            return $this->valoresEstandar();
        }

        return $this->valoresResueltosInstitucion($institucionId, 'inclusion', $baseId);
    }

    /**
     * @return array{valores: array<string, mixed>, overrides: array<string, mixed>, actualizado_en: string|null, existe: bool}
     */
    public function leerArchivoInstitucion(
        int $institucionId,
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        $this->validarTipo($tipo);

        $referencia = $this->valoresReferenciaInstitucion($institucionId, $tipo, $id, $perfil);
        $valores = $this->valoresResueltosInstitucion($institucionId, $tipo, $id, $perfil);
        $ruta = $this->rutaArchivo($tipo, $id, $institucionId);

        return [
            'valores' => $valores,
            'overrides' => $this->calcularOverrides($valores, $referencia),
            'actualizado_en' => $this->leerActualizadoEn($ruta),
            'existe' => File::exists($ruta),
        ];
    }

    /**
     * Valores finales para una institución.
     *
     * @return array<string, mixed>
     */
    public function valoresResueltosInstitucion(
        int $institucionId,
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        $this->validarTipo($tipo);

        $ruta = $this->rutaArchivo($tipo, $id, $institucionId);

        if (File::exists($ruta)) {
            $referencia = $this->valoresReferenciaInstitucion($institucionId, $tipo, $id, $perfil);

            return $this->leerValoresDesdeRuta($ruta, $referencia);
        }

        if ($tipo === 'inclusion') {
            return $this->valoresDefaults('inclusion', $id);
        }

        return $this->completarValores(
            $this->valoresReferenciaInstitucion($institucionId, $tipo, $id, $perfil)
        );
    }

    /**
     * @param  array<string, mixed>  $valores
     * @return array{overrides: array<string, mixed>, actualizado_en: string, valores: array<string, mixed>}
     */
    public function guardarInstitucion(
        int $institucionId,
        string $tipo,
        int $id,
        array $valores,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        $this->validarTipo($tipo);

        $referencia = $this->valoresReferenciaInstitucion($institucionId, $tipo, $id, $perfil);
        $this->validarValores($valores);
        $valoresCompletos = $this->completarValores($valores);
        $this->validarValoresCompletos($valoresCompletos);

        $resultado = $this->escribirValores($tipo, $id, $valoresCompletos, $institucionId);

        return [
            'overrides' => $this->calcularOverrides($valoresCompletos, $referencia),
            'valores' => $valoresCompletos,
            'actualizado_en' => $resultado['actualizado_en'],
        ];
    }

    public function restablecerInstitucion(
        int $institucionId,
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): void {
        $this->validarTipo($tipo);

        $referencia = $this->valoresReferenciaInstitucion($institucionId, $tipo, $id, $perfil);
        $this->escribirValores($tipo, $id, $referencia, $institucionId);
    }

    /**
     * @param  array<string, mixed>  $valores
     * @return array{overrides: array<string, mixed>, actualizado_en: string, valores: array<string, mixed>}
     */
    public function guardarDefaults(
        string $tipo,
        int $id,
        array $valores,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        $this->validarTipo($tipo);

        $referencia = $this->referenciaDefaults($tipo, $id, $perfil);
        $this->validarValores($valores);
        $valoresCompletos = $this->completarValores($valores);
        $this->validarValoresCompletos($valoresCompletos);

        $resultado = $this->escribirValores($tipo, $id, $valoresCompletos);

        return [
            'overrides' => $this->calcularOverrides($valoresCompletos, $referencia),
            'valores' => $valoresCompletos,
            'actualizado_en' => $resultado['actualizado_en'],
        ];
    }

    public function restablecerDefaults(string $tipo, int $id, ?PerfilAprendizajePersonalizado $perfil = null): void
    {
        $this->validarTipo($tipo);

        $referencia = $this->referenciaDefaults($tipo, $id, $perfil);
        $this->escribirValores($tipo, $id, $referencia);
    }

    /**
     * @return array{valores: array<string, mixed>, overrides: array<string, mixed>, actualizado_en: string|null, existe: bool}
     */
    public function leerArchivoDefaults(string $tipo, int $id, ?PerfilAprendizajePersonalizado $perfil = null): array
    {
        $this->validarTipo($tipo);

        $referencia = $this->referenciaDefaults($tipo, $id, $perfil);
        $valores = $this->valoresDefaults($tipo, $id);
        $ruta = $this->rutaArchivo($tipo, $id);

        return [
            'valores' => $valores,
            'overrides' => $this->calcularOverrides($valores, $referencia),
            'actualizado_en' => $this->leerActualizadoEn($ruta),
            'existe' => File::exists($ruta),
        ];
    }

    /**
     * Referencia para calcular overrides en defaults de personalizado.
     *
     * @return array<string, mixed>
     */
    public function valoresReferenciaDefaults(
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        return $this->referenciaDefaults($tipo, $id, $perfil);
    }

    /**
     * Crea JSON de defaults para un perfil formal nuevo (valores estándar).
     */
    public function inicializarDefaultsInclusion(int $perfilId): void
    {
        if (File::exists($this->rutaArchivo('inclusion', $perfilId))) {
            return;
        }

        $this->escribirValores('inclusion', $perfilId, $this->valoresEstandar());
    }

    /**
     * Crea JSON de defaults para un personalizado global (SuperAdmin).
     */
    public function inicializarDefaultsPersonalizado(int $perfilId, ?int $baseId = null): void
    {
        if (File::exists($this->rutaArchivo('personalizado', $perfilId))) {
            return;
        }

        $valores = $baseId > 0
            ? $this->valoresDefaults('inclusion', $baseId)
            : $this->valoresEstandar();

        $this->escribirValores('personalizado', $perfilId, $valores);
    }

    /**
     * Crea JSON institucional para un personalizado recién creado.
     */
    public function inicializarInstitucionPersonalizado(
        int $institucionId,
        int $perfilId,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): void {
        if (File::exists($this->rutaArchivo('personalizado', $perfilId, $institucionId))) {
            return;
        }

        $perfil = $perfil ?? PerfilAprendizajePersonalizado::query()->find($perfilId);
        $baseId = (int) ($perfil?->perfil_aprendizaje_id ?? 0);

        $valores = $baseId > 0
            ? $this->valoresResueltosInstitucion($institucionId, 'inclusion', $baseId)
            : $this->valoresEstandar();

        $this->escribirValores('personalizado', $perfilId, $valores, $institucionId);
    }

    /**
     * Crea JSON institucional para un perfil formal si aún no existe.
     */
    public function inicializarInstitucionInclusion(int $institucionId, int $perfilId): void
    {
        if (File::exists($this->rutaArchivo('inclusion', $perfilId, $institucionId))) {
            return;
        }

        $this->escribirValores(
            'inclusion',
            $perfilId,
            $this->valoresDefaults('inclusion', $perfilId),
            $institucionId
        );
    }

    /**
     * Copia todos los JSON de defaults/ a la carpeta de la institución si no existen.
     */
    public function sembrarInstitucion(int $institucionId): void
    {
        $directorioDefaults = storage_path(self::STORAGE.'/defaults');

        if (! File::isDirectory($directorioDefaults)) {
            return;
        }

        foreach (self::TIPOS_VALIDOS as $tipo) {
            $directorioTipo = $directorioDefaults.'/'.$tipo;

            if (! File::isDirectory($directorioTipo)) {
                continue;
            }

            foreach (File::files($directorioTipo) as $archivo) {
                if ($archivo->getExtension() !== 'json') {
                    continue;
                }

                $id = (int) $archivo->getFilenameWithoutExtension();

                if ($id > 0) {
                    $this->sembrarPerfilInstitucion($institucionId, $tipo, $id);
                }
            }
        }
    }

    /**
     * Copia un único default a la institución si aún no tiene archivo propio.
     */
    public function sembrarPerfilInstitucion(int $institucionId, string $tipo, int $id): void
    {
        $this->validarTipo($tipo);

        if (File::exists($this->rutaArchivo($tipo, $id, $institucionId))) {
            return;
        }

        if ($tipo === 'inclusion') {
            $this->inicializarInstitucionInclusion($institucionId, $id);

            return;
        }

        $this->inicializarInstitucionPersonalizado($institucionId, $id);
    }

    /**
     * Resuelve parámetros para el kiosco: personalizado activo o perfil formal.
     *
     * @return array<string, mixed>
     */
    public function valoresParaEstudiante(Estudiante $estudiante): array
    {
        $institucionId = (int) $estudiante->institucion_id;

        $estudiante->loadMissing('perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado');

        $asignacionActiva = $estudiante->perfilAprendizajePersonalizadoActiva;
        $perfilPersonalizado = $asignacionActiva?->perfilAprendizajePersonalizado;

        if ($perfilPersonalizado !== null) {
            return $this->valoresResueltosInstitucion(
                $institucionId,
                'personalizado',
                (int) $perfilPersonalizado->id,
                $perfilPersonalizado
            );
        }

        $perfilId = (int) ($estudiante->perfil_aprendizaje_id ?? 0);

        if ($perfilId <= 0) {
            return $this->valoresEstandar();
        }

        return $this->valoresResueltosInstitucion($institucionId, 'inclusion', $perfilId);
    }

    /**
     * @param  array<string, mixed>  $parcial
     * @return array<string, mixed>
     */
    public function completarValores(array $parcial): array
    {
        $plantilla = $this->plantillaValores(config('parametros_perfil.base', []));
        $completos = [];

        foreach ($plantilla as $clave => $valorBase) {
            $completos[$clave] = array_key_exists($clave, $parcial)
                ? $this->normalizarValor($clave, $parcial[$clave])
                : $valorBase;
        }

        return $completos;
    }

    /**
     * @param  array<string, mixed>  $base
     * @return array<string, mixed>
     */
    private function plantillaValores(array $base): array
    {
        $completos = [];

        foreach (array_keys($this->listarParametrosDef()) as $clave) {
            $completos[$clave] = array_key_exists($clave, $base)
                ? $this->normalizarValor($clave, $base[$clave])
                : $this->normalizarValor($clave, null);
        }

        return $completos;
    }

    /**
     * @return array<string, mixed>
     */
    private function referenciaDefaults(
        string $tipo,
        int $id,
        ?PerfilAprendizajePersonalizado $perfil = null
    ): array {
        if ($tipo === 'inclusion') {
            return $this->valoresSistemaInclusion($id);
        }

        $perfil = $perfil ?? PerfilAprendizajePersonalizado::query()->find($id);
        $baseId = (int) ($perfil?->perfil_aprendizaje_id ?? 0);

        if ($baseId <= 0) {
            return $this->valoresEstandar();
        }

        return $this->valoresDefaults('inclusion', $baseId);
    }

    /**
     * @return array<string, mixed>
     */
    private function leerValoresDesdeRuta(string $ruta, array $referencia): array
    {
        if (! File::exists($ruta)) {
            return $this->completarValores($referencia);
        }

        $datos = json_decode(File::get($ruta), true);

        if (! is_array($datos)) {
            return $this->completarValores($referencia);
        }

        if (isset($datos['valores']) && is_array($datos['valores'])) {
            return $this->completarValores($datos['valores']);
        }

        if (isset($datos['overrides']) && is_array($datos['overrides'])) {
            return $this->completarValores(array_merge($referencia, $datos['overrides']));
        }

        return $this->completarValores($referencia);
    }

    private function leerActualizadoEn(string $ruta): ?string
    {
        if (! File::exists($ruta)) {
            return null;
        }

        $datos = json_decode(File::get($ruta), true);

        return is_array($datos) ? ($datos['actualizado_en'] ?? null) : null;
    }

    /**
     * @param  array<string, mixed>  $valores
     * @param  array<string, mixed>  $referencia
     * @return array<string, mixed>
     */
    private function calcularOverrides(array $valores, array $referencia): array
    {
        $overrides = [];

        foreach (array_keys($this->plantillaValores(config('parametros_perfil.base', []))) as $clave) {
            $nuevo = $valores[$clave] ?? null;
            $ref = $referencia[$clave] ?? null;

            if ($nuevo !== $ref) {
                $overrides[$clave] = $nuevo;
            }
        }

        return $overrides;
    }

    /**
     * @param  array<string, mixed>  $valores
     */
    private function validarValoresCompletos(array $valores): void
    {
        $esperadas = array_keys($this->valoresEstandar());

        foreach ($esperadas as $clave) {
            if (! array_key_exists($clave, $valores)) {
                throw new InvalidArgumentException("Falta el parámetro obligatorio: {$clave}");
            }
        }

        $this->validarValores($valores);
    }

    /**
     * @param  array<string, mixed>  $valores
     */
    private function validarValores(array $valores): void
    {
        $definiciones = $this->listarParametrosDef();

        foreach ($valores as $clave => $valor) {
            if (! isset($definiciones[$clave])) {
                throw new InvalidArgumentException("Parámetro desconocido: {$clave}");
            }

            $def = $definiciones[$clave];
            $valor = $this->normalizarValor($clave, $valor);

            if ($def['type'] === 'toggle' && ! is_bool($valor)) {
                throw new InvalidArgumentException("{$clave} debe ser booleano.");
            }

            if ($def['type'] === 'num') {
                if (! is_int($valor) && ! (is_string($valor) && ctype_digit((string) $valor))) {
                    throw new InvalidArgumentException("{$clave} debe ser numérico.");
                }

                $num = (int) $valor;

                if ($num < $def['min'] || $num > $def['max']) {
                    throw new InvalidArgumentException("{$clave} debe estar entre {$def['min']} y {$def['max']}.");
                }
            }

            if ($def['type'] === 'select' && ! in_array($valor, $def['opts'], true)) {
                throw new InvalidArgumentException("Valor inválido para {$clave}.");
            }
        }
    }

    private function normalizarValor(string $clave, mixed $valor): mixed
    {
        $def = $this->listarParametrosDef()[$clave] ?? null;

        if ($def === null) {
            return $valor;
        }

        if ($def['type'] === 'toggle') {
            return filter_var($valor, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $valor;
        }

        if ($def['type'] === 'num') {
            return (int) $valor;
        }

        return is_string($valor) ? trim($valor) : $valor;
    }

    /**
     * @param  array<string, mixed>  $valores
     * @return array{valores: array<string, mixed>, actualizado_en: string}
     */
    private function escribirValores(
        string $tipo,
        int $id,
        array $valores,
        ?int $institucionId = null
    ): array {
        $ruta = $this->rutaArchivo($tipo, $id, $institucionId);
        File::ensureDirectoryExists(dirname($ruta));

        $valores = $this->completarValores($valores);

        $payload = [
            'tipo' => $tipo,
            'perfil_id' => $id,
            'valores' => $valores,
            'actualizado_en' => now()->toIso8601String(),
        ];

        if ($institucionId !== null) {
            $payload['institucion_id'] = $institucionId;
        }

        File::put(
            $ruta,
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        return [
            'valores' => $valores,
            'actualizado_en' => $payload['actualizado_en'],
        ];
    }

    private function rutaArchivo(string $tipo, int $id, ?int $institucionId = null): string
    {
        $this->validarTipo($tipo);

        $base = storage_path(self::STORAGE);

        if ($institucionId === null) {
            return $base.'/defaults/'.$tipo.'/'.$id.'.json';
        }

        return $base.'/'.$institucionId.'/'.$tipo.'/'.$id.'.json';
    }

    private function validarTipo(string $tipo): void
    {
        if (! in_array($tipo, self::TIPOS_VALIDOS, true)) {
            throw new InvalidArgumentException('Tipo de perfil inválido.');
        }
    }
}
