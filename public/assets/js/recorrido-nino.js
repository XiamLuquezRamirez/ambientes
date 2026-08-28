/**
 * recorrido-nino.js — Demo navegación curricular (Expresión Artística)
 * Pasos: pin → bienvenida → portada → módulos → ejes+camino → info → experiencia
 */
(function ($) {
    'use strict';

    let $app;
    let $shell;
    let $paso;
    let $btnBack;
    let $player;
    let $btnFs;
    let arbol;
    let urlExperienciaTpl;
    let urlSalir;
    let urlContinuar;
    let portadaImg;
    let modo;
    let modoSesion;
    let modoPortada;
    let pasoInicial;
    let estudianteNombre;
    let estudianteIniciales;
    let estudianteColor;
    let estado;

    const DEMO_NOMBRE = 'Valentina';
    const DEMO_INICIALES = 'VA';

    const FIGURAS_SIMBOLOS = {
        circulo: '⬤',
        estrella: '★',
        corazon: '♥',
        triangulo: '▲',
        cuadrado: '■',
        luna: '☽',
        diamante: '◆',
        rayo: '⚡',
    };

    const NUBE_COLORES = [
        { bg: '#7C3AED', label: '#FDE047', pin: '#5B21B6' },
        { bg: '#22C55E', label: '#FEF08A', pin: '#15803D' },
        { bg: '#EAB308', label: '#6B21A8', pin: '#A16207' },
        { bg: '#F97316', label: '#FEF3C7', pin: '#C2410C' },
        { bg: '#0EA5E9', label: '#FEF08A', pin: '#0369A1' },
        { bg: '#EC4899', label: '#FCE7F3', pin: '#BE185D' },
    ];

    const EJE_NUBE = {
        activo: { bg: '#6D28D9', label: '#FDE68A', pin: '#4C1D95' },
        inactivo: { bg: '#C4B5FD', label: '#5B21B6', pin: '#7C3AED' },
    };

    const ESTACION_COLORES = ['#EAB308', '#22C55E', '#14B8A6', '#F97316', '#EC4899', '#3B82F6'];

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function marcarShellVista(vista) {
        $shell.toggleClass('rn-shell--pin', vista === 'pin' || vista === 'bienvenida');
        $shell.toggleClass('rn-shell--portada', vista === 'portada');
        $shell.toggleClass('rn-shell--modulos', vista === 'modulos');
        $shell.toggleClass('rn-shell--ejes', vista === 'ejes');
        $shell.toggleClass('rn-shell--info', vista === 'info');
        $shell.toggleClass('rn-shell--camino', vista === 'camino');
    }

    function reiniciarAnimacionPaso() {
        const el = $paso[0];
        if (!el) return;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
    }

    function mostrarBack(visible) {
        $btnBack.prop('hidden', !visible);
    }

    function irAtras() {
        if (estado.paso === 'info') {
            estado.tematica = null;
            renderEjes();
            return;
        }
        if (estado.paso === 'camino' || estado.paso === 'ejes') {
            estado.eje = null;
            renderModulos();
            return;
        }
        if (estado.paso === 'modulos') {
            if (modoSesion || modoPortada) return;
            renderPortada();
            return;
        }
        if (estado.paso === 'portada') {
            if (modoSesion || modoPortada) return;
            renderPin();
        }
    }

    function actualizarIndicadoresPin() {
        for (let i = 0; i < 3; i += 1) {
            const $ind = $(`#rnInd${i}`);
            const fig = estado.pin[i];
            if (fig) {
                const yaActivo = $ind.hasClass('is-activo');
                $ind.text(FIGURAS_SIMBOLOS[fig] || '');
                if (!yaActivo) {
                    $ind.removeClass('is-activo');
                    void $ind[0].offsetWidth;
                    $ind.addClass('is-activo');
                }
            } else {
                $ind.removeClass('is-activo').text('');
            }
        }
    }

    function seleccionarFiguraPin(figura, $btn) {
        if (estado.paso !== 'pin' || estado.pin.length >= 3) return;
        if ($btn && $btn.length) {
            $btn.removeClass('is-tap');
            void $btn[0].offsetWidth;
            $btn.addClass('is-tap');
            setTimeout(function () {
                $btn.removeClass('is-tap');
            }, 420);
        }
        estado.pin.push(figura);
        actualizarIndicadoresPin();
        if (estado.pin.length === 3) {
            setTimeout(mostrarBienvenida, 380);
        }
    }

    function borrarUltimaFiguraPin() {
        if (estado.paso !== 'pin') return;
        estado.pin.pop();
        actualizarIndicadoresPin();
    }

    function renderPin() {
        estado.paso = 'pin';
        estado.pin = [];
        marcarShellVista('pin');
        mostrarBack(false);
        $paso.attr('data-paso', 'pin');
        reiniciarAnimacionPaso();

        const figuras = Object.keys(FIGURAS_SIMBOLOS).map((key, i) => `
            <button type="button" class="rn-pin-figura" data-rn-figura="${key}"
                style="--rn-fig-i:${i}" aria-label="${escapar(key)}">
                ${FIGURAS_SIMBOLOS[key]}
            </button>
        `).join('');

        $paso.html(`
            <div class="rn-pin">
                <div class="rn-pin-izquierda">
                    <div class="rn-pin-avatar" style="background:${escapar(estudianteColor)}" aria-hidden="true">${escapar(estudianteIniciales)}</div>
                    <p class="rn-pin-nombre">${escapar(estudianteNombre)}</p>
                    <p class="rn-pin-instruccion">Toca tus 3 figuras</p>
                    <div class="rn-pin-indicadores" id="rnPinIndicadores">
                        <div class="rn-pin-ind" id="rnInd0"></div>
                        <div class="rn-pin-ind" id="rnInd1"></div>
                        <div class="rn-pin-ind" id="rnInd2"></div>
                    </div>
                    <button type="button" class="rn-pin-borrar" id="rnBtnBorrarPin">← Borrar</button>
                </div>
                <div class="rn-pin-grid">${figuras}</div>
            </div>
        `);
    }

    function mostrarBienvenida() {
        estado.paso = 'bienvenida';
        marcarShellVista('bienvenida');
        mostrarBack(false);
        $paso.attr('data-paso', 'bienvenida');
        $paso.html(`
            <div class="rn-bienvenida" role="status">
                <div class="rn-bienvenida-card">
                    <span class="rn-bienvenida-icono" aria-hidden="true">✓</span>
                    <p class="rn-bienvenida-titulo">¡Hola, ${escapar(estudianteNombre)}!</p>
                    <p class="rn-bienvenida-sub">Vamos a explorar el ambiente</p>
                </div>
            </div>
        `);
        setTimeout(function () {
            renderPortada();
        }, 1600);
    }

    function svgNubeMini() {
        return `<svg class="rn-nube-svg" viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <ellipse class="rn-nube-sombra" cx="160" cy="178" rx="86" ry="9"></ellipse>
            <path class="rn-nube-forma" d="M70 142
                C38 142 22 118 40 100
                C22 92 26 62 58 60
                C62 34 96 24 124 42
                C138 18 186 16 208 44
                C236 28 278 46 274 78
                C302 84 310 116 284 128
                C296 146 274 160 244 156
                C226 170 186 174 160 162
                C130 174 94 170 70 142Z"></path>
        </svg>`;
    }

    function posicionesEstaciones(total) {
        const plantillas = {
            1: [{ x: 50, y: 42 }],
            2: [{ x: 28, y: 40 }, { x: 68, y: 55 }],
            3: [{ x: 18, y: 38 }, { x: 50, y: 58 }, { x: 82, y: 36 }],
            4: [{ x: 16, y: 36 }, { x: 38, y: 58 }, { x: 62, y: 34 }, { x: 84, y: 56 }],
            5: [{ x: 14, y: 34 }, { x: 32, y: 58 }, { x: 50, y: 30 }, { x: 68, y: 58 }, { x: 86, y: 36 }],
            6: [{ x: 12, y: 32 }, { x: 28, y: 56 }, { x: 44, y: 30 }, { x: 60, y: 56 }, { x: 76, y: 32 }, { x: 90, y: 54 }],
        };
        if (plantillas[total]) return plantillas[total];
        const out = [];
        for (let i = 0; i < total; i += 1) {
            const t = total === 1 ? 0.5 : i / (total - 1);
            out.push({
                x: 12 + t * 76,
                y: i % 2 === 0 ? 34 : 58,
            });
        }
        return out;
    }

    function htmlMapaCamino(eje) {
        const tematicas = eje?.tematicas || [];
        if (!tematicas.length) {
            return '<div class="rn-mapa-vacio">Este eje aún no tiene temáticas en el camino.</div>';
        }

        const pos = posicionesEstaciones(tematicas.length);
        const estaciones = tematicas.map((t, i) => {
            const color = ESTACION_COLORES[i % ESTACION_COLORES.length];
            const p = pos[i] || { x: 50, y: 45 };
            return `
                <button type="button" class="rn-estacion${t.es_origen ? ' es-origen' : ''}${!t.experiencia_id ? ' sin-experiencia' : ''}"
                    data-rn-tematica="${t.id}"
                    style="left:${p.x}%;top:${p.y}%;--est-color:${color};--est-delay:${(0.15 + i * 0.08).toFixed(2)}s"
                    aria-label="Temática ${i + 1}: ${escapar(t.nombre)}">
                    <span class="rn-estacion-num">${i + 1}</span>
                    <span class="rn-estacion-card">${escapar(t.nombre)}</span>
                    <span class="rn-estacion-pin" aria-hidden="true"></span>
                </button>
            `;
        }).join('');

        return `
            <div class="rn-mapa" aria-label="Camino de temáticas">
                <div class="rn-mapa-decor" aria-hidden="true">
                    <span class="rn-mapa-arbol rn-mapa-arbol--a"></span>
                    <span class="rn-mapa-arbol rn-mapa-arbol--b"></span>
                    <span class="rn-mapa-arbol rn-mapa-arbol--c"></span>
                    <span class="rn-mapa-bush rn-mapa-bush--a"></span>
                    <span class="rn-mapa-bush rn-mapa-bush--b"></span>
                </div>
                <svg class="rn-mapa-path" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M60 210 C160 80, 240 340, 340 180 S520 80, 620 260 820 360, 940 190"
                        fill="none" stroke="#1e3a8a" stroke-width="18" stroke-linecap="round"></path>
                    <path d="M60 210 C160 80, 240 340, 340 180 S520 80, 620 260 820 360, 940 190"
                        fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"
                        stroke-dasharray="2 18"></path>
                </svg>
                <div class="rn-mapa-flag rn-mapa-flag--start" aria-hidden="true">
                    <span class="rn-mapa-mast"></span>
                    <span class="rn-mapa-bandera rn-mapa-bandera--start">START</span>
                </div>
                <div class="rn-mapa-flag rn-mapa-flag--fin" aria-hidden="true">
                    <span class="rn-mapa-mast"></span>
                    <span class="rn-mapa-bandera rn-mapa-bandera--fin">FIN</span>
                </div>
                <div class="rn-estaciones">${estaciones}</div>
            </div>
        `;
    }

    function htmlNubesEjes(ejes) {
        return ejes.map((e, i) => {
            const activo = estado.eje && Number(estado.eje.id) === Number(e.id);
            const color = activo ? EJE_NUBE.activo : EJE_NUBE.inactivo;
            const n = i + 1;
            return `
                <button type="button" class="rn-eje-nube${activo ? ' is-activo' : ''}" data-rn-eje="${e.id}"
                    style="--nube-bg:${color.bg};--nube-label:${color.label};--nube-pin:${color.pin};--nube-delay:${(0.05 + i * 0.07).toFixed(2)}s"
                    aria-pressed="${activo ? 'true' : 'false'}"
                    aria-label="Eje ${n}: ${escapar(e.nombre)}">
                    <span class="rn-nube-colgante">
                        <span class="rn-nube-pin" aria-hidden="true"></span>
                        <span class="rn-nube-cuerdas" aria-hidden="true"></span>
                        <span class="rn-nube-globo rn-nube-globo--eje">
                            ${svgNubeMini()}
                            <span class="rn-nube-contenido">
                                <span class="rn-nube-etiqueta">Eje ${n}:</span>
                                <span class="rn-nube-nombre">${escapar(e.nombre)}</span>
                            </span>
                        </span>
                    </span>
                </button>
            `;
        }).join('');
    }

    function renderPortada() {
        estado.paso = 'portada';
        marcarShellVista('portada');
        mostrarBack(false);
        $paso.attr('data-paso', 'portada');
        reiniciarAnimacionPaso();
        const a = arbol.ambiente || {};
        const nombre = a.nombre || 'Expresión Artística';
        const img = portadaImg
            ? `<img class="rn-portada-img" src="${escapar(portadaImg)}" alt="" decoding="async">`
            : `<div class="rn-portada-img rn-portada-img--fallback" aria-hidden="true"><span>${escapar(a.icono || '🎨')}</span></div>`;

        $paso.html(`
            <div class="rn-portada">
                <header class="rn-portada-banner">
                    <h1 class="rn-portada-titulo">${escapar(nombre)}</h1>
                </header>
                <div class="rn-portada-cuerpo">
                    <div class="rn-portada-ilustracion" aria-hidden="true">
                        ${img}
                    </div>
                    <div class="rn-portada-accion">
                        <div class="rn-portada-iniciar-halo">
                            <button type="button" class="rn-btn-iniciar-pill" id="rnBtnIniciarAmbiente">
                                <span>Iniciar</span>
                                <span class="rn-btn-iniciar-flecha" aria-hidden="true">
                                    <i class="fa-solid fa-chevron-right"></i>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    function renderModulos() {
        estado.paso = 'modulos';
        marcarShellVista('modulos');
        mostrarBack(!modoSesion);
        $paso.attr('data-paso', 'modulos');
        reiniciarAnimacionPaso();
        const modulos = arbol.modulos || [];
        if (!modulos.length) {
            $paso.html(`
                <div class="rn-modulos">
                    <p class="rn-empty">Aún no hay módulos con experiencias para explorar.</p>
                    <div class="rn-modulos-olas" aria-hidden="true"></div>
                </div>
            `);
            return;
        }

        const nubes = modulos.map((m, i) => {
            const color = NUBE_COLORES[i % NUBE_COLORES.length];
            const n = i + 1;
            return `
                <button type="button" class="rn-nube" data-rn-modulo="${m.id}"
                    style="--nube-bg:${color.bg};--nube-label:${color.label};--nube-pin:${color.pin};--nube-delay:${(0.08 + i * 0.1).toFixed(2)}s"
                    aria-label="Módulo ${n}: ${escapar(m.nombre)}">
                    <span class="rn-nube-colgante">
                        <span class="rn-nube-pin" aria-hidden="true"></span>
                        <span class="rn-nube-cuerdas" aria-hidden="true"></span>
                        <span class="rn-nube-globo">
                            ${svgNubeMini()}
                            <span class="rn-nube-contenido">
                                <span class="rn-nube-etiqueta">Módulo ${n}:</span>
                                <span class="rn-nube-nombre">${escapar(m.nombre)}</span>
                                <span class="rn-nube-cta" aria-hidden="true"></span>
                            </span>
                        </span>
                    </span>
                </button>
            `;
        }).join('');

        $paso.html(`
            <div class="rn-modulos">
                <div class="rn-nubes">${nubes}</div>
                <div class="rn-modulos-olas" aria-hidden="true"></div>
            </div>
        `);
    }

    function renderEjes() {
        estado.paso = 'ejes';
        marcarShellVista('ejes');
        mostrarBack(true);
        $paso.attr('data-paso', 'ejes');
        reiniciarAnimacionPaso();

        const ejes = estado.modulo?.ejes || [];
        if (!ejes.length) {
            $paso.html(`
                <div class="rn-ejes">
                    <div class="rn-ejes-top">
                        <p class="rn-empty">Este módulo aún no tiene ejes para explorar.</p>
                    </div>
                    <div class="rn-ejes-ola" aria-hidden="true"></div>
                    <div class="rn-ejes-mapa-wrap">
                        <div class="rn-mapa-vacio">Elige un módulo con ejes para ver el camino.</div>
                    </div>
                </div>
            `);
            return;
        }

        if (!estado.eje || !ejes.some((e) => Number(e.id) === Number(estado.eje.id))) {
            estado.eje = ejes[0];
        }

        $paso.html(`
            <div class="rn-ejes">
                <div class="rn-ejes-top">
                    <div class="rn-ejes-nubes">${htmlNubesEjes(ejes)}</div>
                </div>
                <div class="rn-ejes-ola" aria-hidden="true"></div>
                <div class="rn-ejes-mapa-wrap" id="rnEjesMapa">
                    ${htmlMapaCamino(estado.eje)}
                </div>
            </div>
        `);
    }

    function seleccionarEje(id) {
        const eje = (estado.modulo?.ejes || []).find((e) => Number(e.id) === Number(id));
        if (!eje) return;
        estado.eje = eje;
        estado.paso = 'ejes';

        $paso.find('.rn-eje-nube').each(function () {
            const $btn = $(this);
            const activo = Number($btn.data('rn-eje')) === Number(eje.id);
            const color = activo ? EJE_NUBE.activo : EJE_NUBE.inactivo;
            $btn.toggleClass('is-activo', activo);
            $btn.attr('aria-pressed', activo ? 'true' : 'false');
            $btn.css({
                '--nube-bg': color.bg,
                '--nube-label': color.label,
                '--nube-pin': color.pin,
            });
        });

        const $mapa = $('#rnEjesMapa');
        if ($mapa.length) {
            $mapa.html(htmlMapaCamino(eje));
        }
    }

    function indiceEjeActual() {
        const ejes = estado.modulo?.ejes || [];
        const idx = ejes.findIndex((e) => Number(e.id) === Number(estado.eje?.id));
        return idx >= 0 ? idx + 1 : 1;
    }

    function textoNarracionInfo(t) {
        const partes = [
            t.nombre || '',
            t.competencia || t.experiencia_objetivo || '',
        ].filter(Boolean);
        return partes.join('. ');
    }

    function htmlContenidoPestana(pestana, t) {
        if (pestana === 'objetivo') {
            const objetivo = t.experiencia_objetivo || t.competencia || 'Aún no hay un objetivo cargado para esta experiencia.';
            const proposito = t.experiencia_proposito
                ? `<p class="rn-desc-proposito">${escapar(t.experiencia_proposito)}</p>`
                : '';
            return `
                <div class="rn-desc-panel">
                    <h3 class="rn-desc-actividad-label">Objetivo del aprendizaje</h3>
                    <p class="rn-desc-texto">${escapar(objetivo)}</p>
                    ${proposito}
                </div>
            `;
        }

        if (pestana === 'dba') {
            const dbas = Array.isArray(t.dbas) ? t.dbas : [];
            if (!dbas.length) {
                return `
                    <div class="rn-desc-panel">
                        <h3 class="rn-desc-actividad-label">DBA relacionados</h3>
                        <p class="rn-desc-texto">Esta temática aún no tiene DBA asociados.</p>
                    </div>
                `;
            }
            const items = dbas.map((d) => `
                <li>
                    <strong>${escapar(d.codigo || 'DBA')}</strong>
                    <span>${escapar(d.descripcion || '')}</span>
                </li>
            `).join('');
            return `
                <div class="rn-desc-panel">
                    <h3 class="rn-desc-actividad-label">DBA relacionados</h3>
                    <ul class="rn-desc-dbas">${items}</ul>
                </div>
            `;
        }

        const descripcion = t.competencia
            || t.experiencia_objetivo
            || 'El niño o la niña vivirá esta experiencia paso a paso. ¡Vamos a comenzar!';

        return `
            <div class="rn-desc-actividad">
                <div class="rn-desc-actividad-copy">
                    <h3 class="rn-desc-actividad-label">Actividad</h3>
                    <h4 class="rn-desc-actividad-nombre">${escapar(t.nombre || 'Experiencia')}</h4>
                    <p class="rn-desc-texto">${escapar(descripcion)}</p>
                    <div class="rn-desc-iniciar-halo">
                        <button type="button" class="rn-desc-iniciar" id="rnBtnIniciarExperiencia"
                            ${t.experiencia_id ? '' : 'disabled'}>
                            <span>Iniciar</span>
                            <span class="rn-desc-iniciar-flecha" aria-hidden="true">
                                <i class="fa-solid fa-chevron-right"></i>
                            </span>
                        </button>
                    </div>
                </div>
                <div class="rn-desc-actividad-media" aria-hidden="true">
                    <button type="button" class="rn-desc-tts" id="rnBtnTtsInfo" title="Escuchar">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    <div class="rn-desc-ilustracion">
                        <span class="rn-desc-ilustracion-emoji">🎨</span>
                        <span class="rn-desc-ilustracion-nota">${escapar(t.experiencia_nombre || 'Experiencia')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderInfo() {
        estado.paso = 'info';
        marcarShellVista('info');
        mostrarBack(true);
        $paso.attr('data-paso', 'info');
        reiniciarAnimacionPaso();

        const t = estado.tematica || {};
        const ejeNombre = estado.eje?.nombre || 'Eje';
        const ejeNum = indiceEjeActual();
        const pestana = 'tema';

        $paso.html(`
            <div class="rn-desc" data-pestana="${pestana}">
                <div class="rn-desc-top">
                    <div class="rn-desc-cabecera">
                        <div class="rn-desc-eje-nube" aria-hidden="true">
                            <span class="rn-nube-colgante">
                                <span class="rn-nube-pin"></span>
                                <span class="rn-nube-cuerdas"></span>
                                <span class="rn-nube-globo rn-nube-globo--eje-mini">
                                    ${svgNubeMini()}
                                    <span class="rn-nube-contenido">
                                        <span class="rn-nube-nombre">Eje ${ejeNum}</span>
                                    </span>
                                </span>
                            </span>
                        </div>
                        <h1 class="rn-desc-titulo">${escapar(ejeNombre)}</h1>
                    </div>
                    <div class="rn-desc-tabs" role="tablist">
                        <button type="button" class="rn-desc-tab is-activo" data-rn-tab="tema" role="tab" aria-selected="true">Tema</button>
                        <button type="button" class="rn-desc-tab" data-rn-tab="objetivo" role="tab" aria-selected="false">Objetivo del aprendizaje</button>
                        <button type="button" class="rn-desc-tab" data-rn-tab="dba" role="tab" aria-selected="false">DBA relacionados</button>
                    </div>
                </div>
                <div class="rn-desc-ola" aria-hidden="true"></div>
                <div class="rn-desc-body">
                    <div class="rn-desc-card" id="rnDescCard">
                        ${htmlContenidoPestana(pestana, t)}
                    </div>
                </div>
            </div>
        `);
    }

    function cambiarPestanaInfo(pestana) {
        const t = estado.tematica || {};
        const $root = $paso.find('.rn-desc');
        if (!$root.length) return;
        $root.attr('data-pestana', pestana);
        $root.find('.rn-desc-tab').each(function () {
            const activo = $(this).data('rn-tab') === pestana;
            $(this).toggleClass('is-activo', activo).attr('aria-selected', activo ? 'true' : 'false');
        });
        $('#rnDescCard').html(htmlContenidoPestana(pestana, t));
    }

    function narrarInfo() {
        const texto = textoNarracionInfo(estado.tematica || {});
        if (!texto) return;
        const urlTts = String($app.data('url-tts') || '');
        if (!urlTts) return;

        $.ajax({
            url: urlTts,
            method: 'GET',
            data: { texto },
            dataType: 'json',
        }).done(function (res) {
            const audioUrl = res?.data?.url;
            if (!audioUrl) return;
            const audio = new Audio(audioUrl);
            audio.play().catch(function () { /* autoplay bloqueado */ });
        });
    }

    function urlExperiencia(id) {
        return urlExperienciaTpl.replace('__ID__', String(id));
    }

    function iniciarExperiencia() {
        const id = estado.tematica?.experiencia_id;
        if (!id) return;

        const $btn = $('#rnBtnIniciarExperiencia');
        $btn.prop('disabled', true).text('Cargando…');

        $.ajax({
            url: urlExperiencia(id),
            method: 'GET',
            dataType: 'json',
        }).done(function (res) {
            const data = res?.data;
            if (!data?.bloques) {
                alert('No se pudo cargar la experiencia.');
                $btn.prop('disabled', false).text('Iniciar');
                return;
            }
            $shell.prop('hidden', true);
            $player.prop('hidden', false);
            if (window.VistaNino && typeof window.VistaNino.iniciar === 'function') {
                window.VistaNino.iniciar({
                    bloques: data.bloques,
                    mediaBase: data.media_base || '',
                    experienciaNombre: data.experiencia?.nombre || 'Experiencia',
                    poll: false,
                });
            }
        }).fail(function (xhr) {
            const msg = xhr?.responseJSON?.message || 'No se pudo cargar la experiencia.';
            alert(msg);
            $btn.prop('disabled', false).text('Iniciar');
        });
    }

    function salirExperiencia() {
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') {
            window.VistaNino.detener();
        }
        $player.prop('hidden', true);
        $shell.prop('hidden', false);
        renderInfo();
    }

    function estaEnFullscreen() {
        return window.KioscoFsCore
            ? window.KioscoFsCore.estaEnFullscreen()
            : !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    function pedirFullscreen() {
        if (window.KioscoFsCore) {
            return window.KioscoFsCore.entrarFullscreen(true);
        }
        return Promise.reject(new Error('KioscoFsCore no disponible'));
    }

    function salirFullscreen() {
        if (window.KioscoFsCore) {
            return window.KioscoFsCore.salirFullscreenExplicito();
        }
        const salir = document.exitFullscreen
            || document.webkitExitFullscreen
            || document.webkitCancelFullScreen
            || document.msExitFullscreen;
        if (!salir) return Promise.resolve();
        return Promise.resolve(salir.call(document));
    }

    function actualizarBtnFullscreen() {
        if (!$btnFs.length) return;
        const activo = estaEnFullscreen();
        if (window.KioscoFsCore) {
            window.KioscoFsCore.marcarClaseFullscreen(activo);
        }
        $btnFs.prop('hidden', activo);
        $btnFs.attr('title', activo ? 'Pantalla completa activa' : 'Pantalla completa');
        $btnFs.find('i').attr('class', activo ? 'fa-solid fa-compress' : 'fa-solid fa-expand');
    }

    function toggleFullscreen() {
        if (window.KioscoFsCore) {
            return window.KioscoFsCore.toggleFullscreen().finally(actualizarBtnFullscreen);
        }
        if (estaEnFullscreen()) {
            return salirFullscreen().finally(actualizarBtnFullscreen);
        }
        return pedirFullscreen()
            .catch(function () { /* noop */ })
            .finally(actualizarBtnFullscreen);
    }

    /* ── Eventos ─────────────────────────────────────────────── */

    function csrfToken() {
        return String($('meta[name="csrf-token"]').attr('content') || '');
    }

    function salirSesion() {
        function irInicio() {
            if (window.KioscoNav && window.KioscoNav.esRutaKiosco('/inicio')) {
                window.KioscoNav.ir('/inicio', true);
                return;
            }
            window.location.href = '/inicio';
        }

        if (!urlSalir) {
            irInicio();
            return;
        }

        $.ajax({
            url: urlSalir,
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            data: JSON.stringify({ _token: csrfToken() }),
            contentType: 'application/json',
        }).always(irInicio);
    }

    function enlazarEventos() {
        $btnBack.off('click.rn').on('click.rn', irAtras);
        $('#rnBtnSalirExperiencia').off('click.rn').on('click.rn', salirExperiencia);

        $paso.off('click.rn');
        $paso.on('click.rn', '#rnBtnIniciarAmbiente', function () {
            if (modoPortada && urlContinuar) {
                if (window.KioscoNav && window.KioscoNav.esRutaKiosco(urlContinuar)) {
                    window.KioscoNav.ir(urlContinuar);
                    return;
                }
                window.location.href = urlContinuar;
                return;
            }
            renderModulos();
        });
        $paso.on('click.rn', '[data-rn-figura]', function () {
            seleccionarFiguraPin(String($(this).data('rn-figura') || ''), $(this));
        });
        $paso.on('click.rn', '#rnBtnBorrarPin', borrarUltimaFiguraPin);
        $paso.on('click.rn', '[data-rn-modulo]', function () {
            const id = Number($(this).data('rn-modulo'));
            estado.modulo = (arbol.modulos || []).find((m) => Number(m.id) === id) || null;
            estado.eje = null;
            if (estado.modulo) renderEjes();
        });
        $paso.on('click.rn', '[data-rn-eje]', function () {
            seleccionarEje($(this).data('rn-eje'));
        });
        $paso.on('click.rn', '[data-rn-tematica]', function () {
            const id = Number($(this).data('rn-tematica'));
            estado.tematica = (estado.eje?.tematicas || []).find((t) => Number(t.id) === id) || null;
            if (estado.tematica) renderInfo();
        });
        $paso.on('click.rn', '[data-rn-tab]', function () {
            cambiarPestanaInfo(String($(this).data('rn-tab') || 'tema'));
        });
        $paso.on('click.rn', '#rnBtnTtsInfo', narrarInfo);
        $paso.on('click.rn', '#rnBtnIniciarExperiencia', iniciarExperiencia);

        if ($btnFs.length) {
            $btnFs.off('click.rn').on('click.rn', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
            });
            actualizarBtnFullscreen();
        }

        $('#rnBtnSalirSesion').off('click.rn').on('click.rn', function (e) {
            e.preventDefault();
            salirSesion();
        });
    }

    function renderInicial() {
        if (pasoInicial === 'modulos') {
            renderModulos();
        } else if (pasoInicial === 'portada' || modoSesion || modoPortada) {
            renderPortada();
        } else {
            renderPin();
        }
    }

    function boot() {
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') {
            window.VistaNino.detener();
        }

        $app = $('#rnApp');
        if (!$app.length) return;

        $shell = $('#rnShell');
        $paso = $('#rnPaso');
        $btnBack = $('#rnBtnBack');
        $player = $('#vnDispositivo');
        $btnFs = $('#rnBtnFullscreen');

        try {
            arbol = JSON.parse(document.getElementById('rn-arbol')?.textContent || '{}');
        } catch (e) {
            arbol = { ambiente: {}, modulos: [] };
        }

        urlExperienciaTpl = String($app.data('url-experiencia') || '');
        urlSalir = String($app.data('url-salir') || '');
        urlContinuar = String($app.data('url-continuar') || '');
        portadaImg = String($app.data('portada-img') || '');
        modo = String($app.data('modo') || 'demo');
        modoSesion = modo === 'sesion';
        modoPortada = modo === 'portada';
        pasoInicial = String($app.data('paso-inicial') || (modoSesion ? 'modulos' : (modoPortada ? 'portada' : 'pin')));
        estudianteNombre = String($app.data('estudiante-nombre') || DEMO_NOMBRE);
        estudianteIniciales = String($app.data('estudiante-iniciales') || DEMO_INICIALES);
        estudianteColor = String($app.data('estudiante-color') || '#7C3AED');

        estado = {
            paso: pasoInicial,
            pin: [],
            modulo: null,
            eje: null,
            tematica: null,
        };

        $shell.prop('hidden', false);
        $player.prop('hidden', true);

        if (String($app.data('ui') || '') === 'camino-lineal') {
            // KioscoCamino puede provenir de un <script type="module"> (3D), que se
            // ejecuta de forma diferida. Esperamos a que esté disponible antes de
            // caer al flujo 2D de módulos.
            const ctxCamino = {
                $app: $app, $shell: $shell, $paso: $paso, $player: $player,
                urlExperienciaTpl: urlExperienciaTpl, onSalir: salirSesion,
            };
            const montarCamino = function () {
                if (window.KioscoCamino) {
                    return !!window.KioscoCamino.boot(ctxCamino);
                }
                return false;
            };
            if (montarCamino()) {
                return;
            }
            // reintenta hasta ~3s mientras el módulo 3D termina de cargar
            let intentos = 0;
            const timer = setInterval(function () {
                intentos += 1;
                if (montarCamino() || intentos > 60) {
                    clearInterval(timer);
                    if (intentos > 60 && !window.KioscoCamino) {
                        enlazarEventos();
                        renderInicial();
                    }
                }
            }, 50);
            return;
        }

        enlazarEventos();
        renderInicial();
    }

    $(document).on('fullscreenchange webkitfullscreenchange MSFullscreenChange', function () {
        if ($btnFs && $btnFs.length) actualizarBtnFullscreen();
    });

    window.KioscoRecorrido = { boot };
    $(boot);
})(jQuery);
