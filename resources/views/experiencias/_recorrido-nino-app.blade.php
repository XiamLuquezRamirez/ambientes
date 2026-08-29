@php
    $modo = $modo ?? 'sesion';
    $esSesion = $modo === 'sesion';
    $esPortada = $modo === 'portada';
    $enKioscoShell = $enKioscoShell ?? false;
    $ui = $ui ?? '';
    $esCaminoLineal = $ui === 'camino-lineal';
    $pasoInicial = $pasoInicial ?? ($esSesion ? 'camino' : 'portada');
    $nombreEstudiante = $esSesion
        ? ($estudiante->nombre ?? 'Amigo')
        : 'Amigo';
    $inicialesEstudiante = $esSesion
        ? ($estudiante->iniciales ?? 'AM')
        : 'AM';
    $colorEstudiante = $esSesion
        ? ($estudiante->color_avatar ?? '#2563EB')
        : '#2563EB';
    $slugPortada = $arbol['ambiente']['slug']
        ?? config('ambiente.slugs_bd.'.config('ambiente.slug'), config('ambiente.slug'));
    $portadaImg = $portadaImg ?? '/assets/images/ambientes/'.$slugPortada.'-portada.png';
    $shellClase = match ($pasoInicial) {
        'camino' => 'rn-shell--camino',
        'portada' => 'rn-shell--portada',
        'modulos' => 'rn-shell--modulos',
        default => 'rn-shell--pin',
    };
    $sexoEstudiante = '';
    if ($esSesion && isset($estudiante) && $estudiante) {
        $sexoEstudiante = $estudiante->sexo ?? '';
    }
    $emocionesBase = asset('assets/images/emociones');
@endphp
<div id="rnApp"
    data-modo="{{ $modo }}"
    data-ui="{{ $ui }}"
    data-paso-inicial="{{ $pasoInicial }}"
    data-estudiante-nombre="{{ $nombreEstudiante }}"
    data-estudiante-iniciales="{{ $inicialesEstudiante }}"
    data-estudiante-color="{{ $colorEstudiante }}"
    data-estudiante-sexo="{{ $sexoEstudiante }}"
    data-emociones-base="{{ $emocionesBase }}"
    data-url-experiencia="{{ $urlExperienciaTemplate }}"
    data-url-tts="{{ $urlTts }}"
    data-url-salir="{{ $urlSalir ?? '' }}"
    data-url-continuar="{{ $urlContinuar ?? '' }}"
    data-portada-img="{{ $portadaImg }}">
    <script type="application/json" id="rn-arbol">@json($arbol)</script>
    @if (! empty($camino))
        <script type="application/json" id="rn-camino">@json($camino)</script>
    @endif

    <div id="rnShell" class="rn-shell {{ $shellClase }}">
        @if ($esSesion && ! $enKioscoShell)
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

    <div id="vnDispositivo"
        class="rn-player"
        hidden
        aria-hidden="true"
        data-vn-defer="1"
        data-url-tts="{{ $urlTts }}"
        data-media-base=""
        data-experiencia-nombre=""
        data-estudiante-sexo="{{ $sexoEstudiante }}"
        data-emociones-base="{{ $emocionesBase }}"
        data-version="">
        <button type="button" class="vn-fs-btn" id="vnBtnFullscreen" title="Pantalla completa" aria-label="Pantalla completa">
            <i class="fa-solid fa-expand"></i> Pantalla completa
        </button>
        <div class="vn-tablet-screen" id="vnTabletScreen">
            <header class="vn-screen-top">
                <div class="vn-progress" id="vnProgress" aria-hidden="true"></div>
                <p class="vn-step-label" id="vnStepLabel">Paso 1 de 1</p>
            </header>
            <div class="vn-screen-body" id="vnScreenBody"></div>
            <footer class="vn-screen-nav">
                <button type="button" class="vn-nav-btn vn-nav-prev" id="vnBtnPrev" aria-label="Anterior">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>Atrás</span>
                </button>
                <div class="vn-nav-meta">
                    <strong id="vnTitle">Experiencia</strong>
                    <span id="vnBlockName">—</span>
                </div>
                <button type="button" class="vn-nav-btn vn-nav-next" id="vnBtnNext" aria-label="Siguiente">
                    <span>Siguiente</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </footer>
        </div>
    </div>
</div>
