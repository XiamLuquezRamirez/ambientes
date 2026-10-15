(function () {
    'use strict';

    const seleccion = [];
    let app = null;
    let enviando = false;

    function mensajeEl() {
        return document.getElementById('pinMensaje');
    }

    function limpiarMensaje() {
        const el = mensajeEl();
        if (!el) return;
        el.textContent = '';
        el.classList.remove('visible', 'pin-mensaje--aviso');
    }

    function mostrarMensaje(texto, esAviso) {
        const el = mensajeEl();
        if (!el) return;
        el.textContent = texto || 'No se pudo verificar el PIN.';
        el.classList.toggle('pin-mensaje--aviso', !!esAviso);
        el.classList.add('visible');
    }

    function actualizarIndicadores() {
        if (!app) return;

        for (let i = 0; i < 3; i++) {
            const ind = document.getElementById('ind-' + i);
            if (!ind) continue;

            const icono = seleccion[i];
            const catalogo = window.FIGURAS_CATALOGO || {};

            if (icono && catalogo[icono]) {
                const figura = catalogo[icono];
                ind.classList.add('activo');
                ind.innerHTML = '<i class="' + figura.icon + '" style="color:' + figura.color + ';" aria-hidden="true"></i>';
            } else {
                ind.classList.remove('activo');
                ind.textContent = '';
            }
        }
    }

    function mostrarError(mensaje) {
        const inds = document.getElementById('indicadores');
        if (inds) {
            inds.classList.remove('shake');
            void inds.offsetWidth;
            inds.classList.add('shake');
        }

        seleccion.length = 0;
        mostrarMensaje(mensaje || 'PIN incorrecto. Inténtalo de nuevo.');

        setTimeout(function () {
            actualizarIndicadores();
            if (inds) inds.classList.remove('shake');
        }, 500);
    }

    const MENSAJE_ACIERTO = '¡Muy bien! Recordaste tus tres figuras.';
    /* Rotan para que un niño que falla varias veces no oiga siempre lo mismo. */
    const MENSAJES_ANIMO = [
        'Ups, esas no eran. No pasa nada, ¡tú puedes! Inténtalo otra vez.',
        'Todos nos equivocamos a veces. Piensa en tus figuras y vuelve a intentarlo.',
        '¡Sigue intentando! Mira bien y toca tus tres figuras de nuevo.',
    ];
    /* La voz entra cuando el sonido ya casi termina, para no pisarse. */
    const VOZ_TRAS_ACIERTO_MS = 900;
    const VOZ_TRAS_ERROR_MS = 700;
    const sonidos = { acierto: null, error: null };
    let indiceAnimo = 0;

    /* Se crean al montar el PIN para que suenen sin esperar la descarga. */
    function precargarSonidos() {
        ['acierto', 'error'].forEach(function (tipo) {
            const src = app.dataset['sonido' + tipo.charAt(0).toUpperCase() + tipo.slice(1)];
            if (!src || (sonidos[tipo] && sonidos[tipo].dataset.src === src)) return;
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.dataset.src = src;
            sonidos[tipo] = audio;
        });
    }

    function reproducir(tipo) {
        const audio = sonidos[tipo];
        if (!audio) return;
        try {
            audio.currentTime = 0;
            const promesa = audio.play();
            if (promesa && promesa.catch) promesa.catch(function () { /* sin audio */ });
        } catch (e) { /* sin audio */ }
    }

    let sonidosFigura = [];

    function precargarSonidosFigura() {
        let fuentes = [];
        try {
            fuentes = JSON.parse(app.dataset.sonidosFigura || '[]');
        } catch (e) {
            fuentes = [];
        }
        sonidosFigura = fuentes.map(function (src) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            return audio;
        });
    }

    /*
     * Reparto parejo y barajado en cada carga: así el sonido no delata qué figura se tocó
     * a quien escucha cerca, pero las tres suenan con la misma frecuencia.
     */
    function asignarSonidosFigura() {
        const botones = Array.from(app.querySelectorAll('.figura-btn[data-icon]'));
        if (!sonidosFigura.length) return;
        const indices = botones.map(function (_, i) { return i % sonidosFigura.length; });
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = indices[i];
            indices[i] = indices[j];
            indices[j] = t;
        }
        botones.forEach(function (btn, i) {
            btn.dataset.sonido = String(indices[i]);
        });
    }

    /* Copia por toque: dos figuras seguidas con el mismo sonido no se cortan entre sí. */
    function sonarFigura(btn) {
        const audio = btn ? sonidosFigura[Number(btn.dataset.sonido)] : null;
        if (!audio) return;
        try {
            const copia = audio.cloneNode();
            const promesa = copia.play();
            if (promesa && promesa.catch) promesa.catch(function () { /* sin audio */ });
        } catch (e) { /* sin audio */ }
    }

    let frasesPorSonar = 0;

    /* esperar: promesa tras la cual hablar (p. ej. el montaje de la página siguiente). */
    function decir(texto, retrasoMs, esperar) {
        if (!texto || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
        frasesPorSonar++;
        setTimeout(function () {
            Promise.resolve(esperar).catch(function () { /* se habla igual */ }).then(function () {
                frasesPorSonar--;
                window.speechSynthesis.cancel();
                const frase = new SpeechSynthesisUtterance(texto);
                frase.lang = 'es-CO';
                frase.rate = 0.95;
                window.speechSynthesis.speak(frase);
            });
        }, retrasoMs);
    }

    /*
     * No se cancela en init(): la bienvenida monta encima y espera a que esta frase termine.
     * montaje: montar /listo pasa por KioscoCamino.destroy(), que cancela speechSynthesis.
     */
    function celebrarAcierto(montaje) {
        reproducir('acierto');
        decir(MENSAJE_ACIERTO, VOZ_TRAS_ACIERTO_MS, montaje);
    }

    /* Solo el PIN equivocado invita a reintentar; bloqueado o sin red se lee el mensaje tal cual. */
    function avisarError(pinIncorrecto, mensaje) {
        reproducir('error');
        let texto = mensaje;
        if (pinIncorrecto) {
            texto = MENSAJES_ANIMO[indiceAnimo % MENSAJES_ANIMO.length];
            indiceAnimo++;
        }
        decir(texto, VOZ_TRAS_ERROR_MS);
    }

    async function enviarPin() {
        if (!app || enviando) return;
        enviando = true;
        let exito = false;
        limpiarMensaje();

        const body = {
            figura_1: seleccion[0],
            figura_2: seleccion[1],
            figura_3: seleccion[2],
            _token: app.dataset.csrf || '',
        };

        try {
            const resp = await fetch(app.dataset.verificar, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': app.dataset.csrf || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            let data = {};
            try {
                data = await resp.json();
            } catch (e) {
                data = {};
            }

            if (data.ok) {
                exito = true;
                if (window.KioscoNav && typeof window.KioscoNav.ir === 'function') {
                    const redirect = data.redirect || '/listo';
                    const path = redirect.startsWith('http')
                        ? new URL(redirect).pathname
                        : redirect;
                    // La bienvenida se arma encima del PIN, que sigue visible hasta que termina.
                    celebrarAcierto(window.KioscoNav.ir(path, false, { superponer: true }));
                } else {
                    celebrarAcierto();
                    window.location.href = data.redirect;
                }
                return;
            }

            mostrarError(data.mensaje);
            avisarError(resp.status === 422, data.mensaje || 'No se pudo verificar. Pide ayuda a tu profe.');
        } catch (err) {
            mostrarError('No hay conexión. Inténtalo de nuevo.');
            avisarError(false, 'Algo falló. Inténtalo de nuevo.');
        } finally {
            // Tras un PIN correcto se mantiene bloqueado hasta navegar: Borrar no debe deshacer la tercera figura.
            if (!exito) enviando = false;
        }
    }

    function seleccionarFigura(icono, btn) {
        const catalogo = window.FIGURAS_CATALOGO || {};
        if (enviando || seleccion.length >= 3 || !catalogo[icono]) return;

        sonarFigura(btn);
        limpiarMensaje();
        seleccion.push(icono);
        actualizarIndicadores();

        if (seleccion.length === 3) {
            enviarPin();
        }
    }

    function borrarUltima() {
        if (enviando || seleccion.length === 0) return;
        seleccion.pop();
        limpiarMensaje();
        actualizarIndicadores();
    }

    function enlazarControles() {
        document.querySelectorAll('.figura-btn[data-icon]').forEach(function (btn) {
            btn.onclick = function () {
                seleccionarFigura(btn.dataset.icon, btn);
            };
        });

        const borrar = document.getElementById('btnBorrarPin');
        if (borrar) {
            borrar.onclick = borrarUltima;
        }
    }

    const INICIO_VOZ_MS = 500;
    let timerVoz = 0;

    function pinActivo(el) {
        return app === el && el.isConnected && !el.closest('[data-kiosco-saliente]');
    }

    /* Sin un toque previo (F5 o URL directa) Chrome rechaza speak(); llegando desde /alumnos sí suena. */
    function saludar() {
        const texto = (app.dataset.voz || '').trim();
        if (!texto || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
        const miApp = app;

        function programar() {
            timerVoz = setTimeout(function () {
                /* Si ya empezó a tocar figuras, el saludo sobra. */
                if (!pinActivo(miApp) || seleccion.length > 0) return;
                window.speechSynthesis.cancel();
                const frase = new SpeechSynthesisUtterance(texto);
                frase.lang = 'es-CO';
                frase.rate = 0.95;
                window.speechSynthesis.speak(frase);
            }, INICIO_VOZ_MS);
        }

        /* Montado debajo del selector de alumnos mientras este se desvanece: se habla al quedar visible. */
        const pane = document.getElementById('kioscoPane');
        if (pane && pane.getAttribute('data-kiosco-superponiendo') === 'debajo') {
            document.addEventListener('kiosco:superposicion-terminada', programar, { once: true });
            return;
        }
        programar();
    }

    function init() {
        clearTimeout(timerVoz);
        app = document.getElementById('kioscoPinApp');
        if (app && app.closest('[data-kiosco-saliente]')) {
            app = null;
            return;
        }
        seleccion.length = 0;
        enviando = false;
        limpiarMensaje();

        if (!app) return;

        try {
            window.FIGURAS_CATALOGO = JSON.parse(app.dataset.catalogo || '{}');
        } catch (e) {
            window.FIGURAS_CATALOGO = {};
        }

        actualizarIndicadores();
        enlazarControles();
        precargarSonidos();
        precargarSonidosFigura();
        asignarSonidosFigura();
        saludar();
    }

    window.seleccionarFigura = seleccionarFigura;
    window.borrarUltima = borrarUltima;
    window.KioscoPin = {
        init: init,
        /* Frase programada tras el sonido que aún no entró a speechSynthesis. */
        vozPendiente: function () { return frasesPorSonar > 0; },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
