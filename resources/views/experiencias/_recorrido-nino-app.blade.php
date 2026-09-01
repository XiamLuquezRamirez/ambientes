@php
    $modo = $modo ?? 'sesion';
    $esSesion = $modo === 'sesion';
    $esPortada = $modo === 'portada';
    $enKioscoShell = $enKioscoShell ?? false;
    $ui = $ui ?? '';
    $esCaminoLineal = $ui === 'camino-lineal';
    $pasoInicial = $pasoInicial ?? ($esSesion ? 'camino' : 'portada');
    $nombreEstudiante = $esSesion ? $estudiante->nombre ?? 'Amigo' : 'Amigo';
    $inicialesEstudiante = $esSesion ? $estudiante->iniciales ?? 'AM' : 'AM';
    $colorEstudiante = $esSesion ? $estudiante->color_avatar ?? '#2563EB' : '#2563EB';
    $slugPortada =
        $arbol['ambiente']['slug'] ?? config('ambiente.slugs_bd.' . config('ambiente.slug'), config('ambiente.slug'));
    $portadaImg = $portadaImg ?? '/assets/images/ambientes/' . $slugPortada . '-portada.png';
    $fondoImg = $fondoImg ?? '';
    if ($fondoImg === '' && file_exists(public_path('assets/images/ambientes/' . $slugPortada . '-fondo.png'))) {
        $fondoImg = '/assets/images/ambientes/' . $slugPortada . '-fondo.png';
    }
    $shellClase = match ($pasoInicial) {
        'camino' => 'rn-shell--camino',
        'portada' => 'rn-shell--portada',
        'modulos' => 'rn-shell--modulos',
        default => 'rn-shell--pin',
    };
    $sexoEstudiante = '';
    $nivelEtario = 'jardin';
    $gradoNombre = '';
    if ($esSesion && isset($estudiante) && $estudiante) {
        $sexoEstudiante = $estudiante->sexo ?? '';
        $estudiante->loadMissing('grado');
        $gradoNombre = $estudiante->grado->nombre ?? '';
        $edadGrado = (int) ($estudiante->grado->edad_anos ?? 0);
        $gn = mb_strtolower($gradoNombre);
        if (str_contains($gn, 'prejardín') || str_contains($gn, 'prejardin')) {
            $nivelEtario = 'prejardin';
        } elseif (str_contains($gn, 'jardín') || str_contains($gn, 'jardin')) {
            $nivelEtario = 'jardin';
        } elseif (str_contains($gn, 'transición') || str_contains($gn, 'transicion')) {
            $nivelEtario = 'transicion';
        } elseif (str_contains($gn, 'primaria') || $edadGrado >= 6) {
            $nivelEtario = 'primaria';
        }
    }
    $emocionesBase = asset('assets/images/emociones');
@endphp
<div id="rnApp" data-modo="{{ $modo }}" data-ui="{{ $ui }}" data-paso-inicial="{{ $pasoInicial }}"
    data-estudiante-nombre="{{ $nombreEstudiante }}" data-estudiante-iniciales="{{ $inicialesEstudiante }}"
    data-estudiante-color="{{ $colorEstudiante }}" data-estudiante-sexo="{{ $sexoEstudiante }}"
    data-estudiante-grado="{{ $gradoNombre }}" data-nivel-etario="{{ $nivelEtario }}"
    data-emociones-base="{{ $emocionesBase }}" data-url-experiencia="{{ $urlExperienciaTemplate }}"
    data-url-tts="{{ $urlTts }}" data-url-salir="{{ $urlSalir ?? '' }}"
    data-url-continuar="{{ $urlContinuar ?? '' }}" data-portada-img="{{ $portadaImg }}"
    data-fondo-img="{{ $fondoImg }}">
    <script type="application/json" id="rn-arbol">@json($arbol)</script>
    @if (!empty($camino))
        <script type="application/json" id="rn-camino">@json($camino)</script>
    @endif

    <div id="rnShell" class="rn-shell {{ $shellClase }}">
        @if ($esSesion && !$enKioscoShell)
            <button type="button" class="rn-salir-btn" id="rnBtnSalirSesion" title="Salir">
                Salir
            </button>
        @endif
        @unless ($enKioscoShell)
            <button type="button" class="rn-fs-btn" id="rnBtnFullscreen" title="Pantalla completa">
                <i class="fa-solid fa-expand"></i>
            </button>
        @endunless
        @unless ($esCaminoLineal)
            <button type="button" class="rn-back" id="rnBtnBack" hidden>
                <i class="fa-solid fa-arrow-left"></i>
                <span>Volver</span>
            </button>
        @endunless
        <div id="rnPaso" class="rn-paso" data-paso="{{ $pasoInicial }}" aria-live="polite"></div>
    </div>

    <div id="vnDispositivo" class="rn-player" hidden aria-hidden="true" data-vn-defer="1"
        data-url-tts="{{ $urlTts }}" data-media-base="" data-experiencia-nombre=""
        data-estudiante-sexo="{{ $sexoEstudiante }}" data-estudiante-grado="{{ $gradoNombre }}"
        data-nivel-etario="{{ $nivelEtario }}" data-estudiante-nombre="{{ $nombreEstudiante }}"
        data-emociones-base="{{ $emocionesBase }}" data-version="">
        <button type="button" class="vn-fs-btn" id="vnBtnFullscreen" title="Pantalla completa"
            aria-label="Pantalla completa">
            <i class="fa-solid fa-expand"></i> Pantalla completa
        </button>
        <div class="vn-tablet-screen" id="vnTabletScreen">
            <div class="vn-screen-body" id="vnScreenBody"></div>
            <footer class="vn-screen-nav">
                <button type="button" class="vn-nav-btn vn-nav-prev" id="vnBtnPrev" aria-label="Anterior">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>Atrás</span>
                </button>
                <div class="vn-nav-center" aria-label="Progreso de la experiencia">
                    <div class="vn-progress" id="vnProgress" aria-hidden="true"></div>
                    <p class="vn-step-label" id="vnStepLabel">Paso 1 de 1</p>
                    <div class="vn-nav-meta">
                        <strong id="vnTitle">Experiencia</strong>
                        <span id="vnBlockName">—</span>
                    </div>
                </div>
                <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext" aria-label="Siguiente">
                    <span>¡Sigue!</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </footer>
        </div>
    </div>
</div>
