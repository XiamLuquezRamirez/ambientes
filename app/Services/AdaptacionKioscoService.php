<?php

namespace App\Services;

use App\Models\Estudiante;
use Illuminate\Http\Request;

/**
 * Resuelve y cachea en sesión los 50 parámetros de perfil para el kiosco.
 * No reimplementa la resolución: delega en ParametrosPerfilAprendizajeService.
 */
class AdaptacionKioscoService
{
    public const SESSION_KEY = 'kiosco_perfil';

    /**
     * Claves inyectadas al kiosco pero sin superficie real todavía.
     *
     * @var list<string>
     */
    public const NOOP = [
        'audio_fondo',
        'audio_btn',
        'ra_inicio',
        'ra_velocidad',
        'ra_contenido',
        'idioma',
        'cooperativo',
        'recordatorio_postura',
        'login_tipo',
        'teclado_grande',
        'modo_aula_automatico',
    ];

    private const FONDOS = [
        'blanco' => '#ffffff',
        'crema' => '#FBF3E4',
        'gris_suave' => '#E8EAED',
    ];

    public function __construct(
        private ParametrosPerfilAprendizajeService $parametros,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function payloadInactivo(): array
    {
        return [
            'activo' => false,
            'estudiante_id' => 0,
            'tipo' => null,
            'perfil_id' => 0,
            'actualizado_en' => null,
            'valores' => [],
            'css_vars' => [],
            'clases' => [],
            'noop' => self::NOOP,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payloadParaEstudiante(Estudiante $estudiante): array
    {
        $valores = $this->parametros->valoresParaEstudiante($estudiante);
        $identidad = $this->identidadPerfil($estudiante);

        return [
            'activo' => true,
            'estudiante_id' => (int) $estudiante->id,
            'tipo' => $identidad['tipo'],
            'perfil_id' => $identidad['perfil_id'],
            'actualizado_en' => $this->actualizadoEn($estudiante, $identidad),
            'valores' => $valores,
            'css_vars' => $this->cssVars($valores),
            'clases' => $this->clasesHtml($valores),
            'noop' => self::NOOP,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function guardarEnSesion(Request $request, Estudiante $estudiante): array
    {
        $payload = $this->payloadParaEstudiante($estudiante);
        $request->session()->put(self::SESSION_KEY, $payload);

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function obtenerDeSesion(Request $request): ?array
    {
        $datos = $request->session()->get(self::SESSION_KEY);

        if (! is_array($datos) || empty($datos['activo'])) {
            return null;
        }

        return $datos;
    }

    /**
     * Reutiliza la sesión si el fingerprint coincide; si no, resuelve de nuevo.
     *
     * @return array<string, mixed>
     */
    public function asegurarEnSesion(Request $request, Estudiante $estudiante): array
    {
        $cache = $this->obtenerDeSesion($request);

        if ($cache !== null && $this->fingerprintCoincide($cache, $estudiante)) {
            return $cache;
        }

        return $this->guardarEnSesion($request, $estudiante);
    }

    public function olvidar(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
    }

    /**
     * @param  array<string, mixed>  $valores
     * @return array<string, string>
     */
    public function cssVars(array $valores): array
    {
        $btn = (int) ($valores['btn_size'] ?? 72);
        $gap = (int) ($valores['btn_spacing'] ?? 12);
        $font = (int) ($valores['font_size'] ?? 16);
        $trans = (int) ($valores['trans_ms'] ?? 300);
        $anim = (int) ($valores['anim_speed'] ?? 100);
        $grosor = (int) ($valores['grosor_pincel'] ?? 6);
        $fondoClave = (string) ($valores['fondo_pantalla'] ?? 'blanco');
        $fondo = self::FONDOS[$fondoClave] ?? self::FONDOS['blanco'];

        return [
            '--kiosco-btn-size' => $btn.'px',
            '--kiosco-btn-spacing' => $gap.'px',
            '--kiosco-font-size' => $font.'pt',
            '--kiosco-trans-ms' => $trans.'ms',
            '--kiosco-anim-factor' => (string) max(0.25, $anim / 100),
            '--kiosco-player-bg' => $fondo,
            '--kiosco-grosor-pincel' => $grosor.'px',
        ];
    }

    /**
     * @param  array<string, mixed>  $valores
     * @return list<string>
     */
    public function clasesHtml(array $valores): array
    {
        $base = config('parametros_perfil.base', []);
        $clases = ['kiosco-perfil--activo'];

        $contraste = (string) ($valores['contraste'] ?? 'estándar');
        if ($contraste === 'alto') {
            $clases[] = 'kiosco-perfil--contraste-alto';
        } elseif ($contraste === 'máximo') {
            $clases[] = 'kiosco-perfil--contraste-maximo';
        }

        $modo = (string) ($valores['modo_color'] ?? 'normal');
        if ($modo === 'daltonismo_protanopia') {
            $clases[] = 'kiosco-perfil--modo-protanopia';
        } elseif ($modo === 'daltonismo_deuteranopia') {
            $clases[] = 'kiosco-perfil--modo-deuteranopia';
        } elseif ($modo === 'escala_grises') {
            $clases[] = 'kiosco-perfil--modo-grises';
        }

        $fondo = (string) ($valores['fondo_pantalla'] ?? 'blanco');
        $fondoBase = (string) ($base['fondo_pantalla'] ?? 'blanco');
        if ($fondo !== $fondoBase && isset(self::FONDOS[$fondo])) {
            $clases[] = 'kiosco-perfil--fondo-'.$fondo;
        }

        if (empty($valores['elementos_flotantes'])) {
            $clases[] = 'kiosco-perfil--sin-flotantes';
        }
        if (empty($valores['anim_decorativas'])) {
            $clases[] = 'kiosco-perfil--sin-anim-decorativas';
        }
        if (! empty($valores['cursor_grande'])) {
            $clases[] = 'kiosco-perfil--cursor-grande';
        }
        if (! empty($valores['juego_bordes'])) {
            $clases[] = 'kiosco-perfil--juego-bordes';
        }
        if (! empty($valores['lectura_facil'])) {
            $clases[] = 'kiosco-perfil--lectura-facil';
        }
        if (! empty($valores['lienzo_cuadriculado'])) {
            $clases[] = 'kiosco-perfil--lienzo-cuadriculado';
        }
        if (($valores['gestos'] ?? '') === 'solo toque') {
            $clases[] = 'kiosco-perfil--solo-toque';
        }

        $progreso = (string) ($valores['progreso'] ?? 'barra');
        if ($progreso === 'barra prominente') {
            $clases[] = 'kiosco-perfil--progreso-barra-prominente';
        } elseif ($progreso === 'barra') {
            $clases[] = 'kiosco-perfil--progreso-barra';
        } elseif ($progreso === 'pasos') {
            $clases[] = 'kiosco-perfil--progreso-pasos';
        } else {
            $clases[] = 'kiosco-perfil--progreso-circulos';
        }

        return $clases;
    }

    /**
     * @param  array<string, mixed>  $cache
     */
    private function fingerprintCoincide(array $cache, Estudiante $estudiante): bool
    {
        return (int) ($cache['estudiante_id'] ?? 0) === (int) $estudiante->id;
    }

    /**
     * @return array{tipo: string, perfil_id: int}
     */
    private function identidadPerfil(Estudiante $estudiante): array
    {
        $estudiante->loadMissing('perfilAprendizajePersonalizadoActiva.perfilAprendizajePersonalizado');

        $personalizado = $estudiante->perfilAprendizajePersonalizadoActiva?->perfilAprendizajePersonalizado;

        if ($personalizado !== null) {
            return [
                'tipo' => 'personalizado',
                'perfil_id' => (int) $personalizado->id,
            ];
        }

        $perfilId = (int) ($estudiante->perfil_aprendizaje_id ?? 0);

        if ($perfilId <= 0) {
            return [
                'tipo' => 'estandar',
                'perfil_id' => 0,
            ];
        }

        return [
            'tipo' => 'inclusion',
            'perfil_id' => $perfilId,
        ];
    }

    /**
     * @param  array{tipo: string, perfil_id: int}  $identidad
     */
    private function actualizadoEn(Estudiante $estudiante, array $identidad): ?string
    {
        if ($identidad['tipo'] === 'estandar' || $identidad['perfil_id'] <= 0) {
            return null;
        }

        $tipoArchivo = $identidad['tipo'] === 'personalizado' ? 'personalizado' : 'inclusion';
        $perfil = $identidad['tipo'] === 'personalizado'
            ? $estudiante->perfilAprendizajePersonalizadoActiva?->perfilAprendizajePersonalizado
            : null;
        $archivo = $this->parametros->leerArchivoInstitucion(
            (int) $estudiante->institucion_id,
            $tipoArchivo,
            $identidad['perfil_id'],
            $perfil
        );

        return $archivo['actualizado_en'] ?? null;
    }
}
