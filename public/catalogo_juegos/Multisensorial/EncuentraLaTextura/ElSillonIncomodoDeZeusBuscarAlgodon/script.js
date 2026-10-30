/* Encuentra la textura — Multisensorial */
(function () {
    "use strict";

    const L = window.EncuentraTexturaLogica;
    const IMG = {
        coco: "img/coco.svg",
        cocoMitad: "img/coco_mitad.svg",
        pieza: "img/pieza_madera.svg",
        piezaPulida: "img/pieza_madera_pulida.svg",
        nube: "img/nube_feliz.svg",
        cajaCuerpo: "img/caja_cuerpo.svg",
        cajaTapa: "img/caja_tapa.svg",
        sillon: "img/sillon.svg",
        cojin: "img/cojin.svg",
        mesa: "img/mesa.svg",
        mapa: "img/mapa_tesoro.svg",
        pintura: "img/pintura_vieja.svg",
        crayon: "img/corteza_crayon.svg"
    };
    const GESTO_ICONO = {
        acariciar: "fa-hand",
        arrugar: "fa-face-grimace",
        golpear: "fa-hand-fist",
        rascar: "fa-face-laugh-squint"
    };
    const PARTICULAS_TACTO = {
        nube: { n: 3, tipo: "nube", dist: 60, gravedad: -30, ms: 1000 },
        polvo: { n: 5, tipo: "polvo", dist: 40, gravedad: 30, ms: 650 },
        burbuja: { n: 3, tipo: "burbuja", dist: 55, gravedad: -50, ms: 900 },
        brillo: { n: 2, tipo: "brillo", dist: 30, ms: 500 },
        astilla: { n: 3, tipo: "astilla", dist: 50, gravedad: 30, ms: 700 },
        migas: { n: 4, tipo: "migas", dist: 40, gravedad: 40, ms: 700 }
    };
    const FROTE_COLS = 14;
    const FROTE_ROWS = 7;
    const GOLPES_COCO = 3;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let erroresReto = 0;
    let demoActiva = false;
    let gesto = null;
    let estadoTacto = Object.create(null);
    let ultimoGesto = { id: null, t: 0 };
    let usoFrote = null;
    let usoRelleno = null;
    let usoGolpes = null;
    let pista = { timer: null, fn: null, ms: 0 };
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function $id(id) {
        return document.getElementById(id);
    }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function material(id) { return (gameConfig.materiales || {})[id] || {}; }
    function esTaller() { return !!nivelElegido && nivelElegido.escenario === "taller"; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }

    function aplicarVolumenCalibrado(pct) {
        const n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        const vol = n / 100;
        if (typeof TextoVoz !== "undefined" && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(vol);
        } else if (audioFondo) {
            audioFondo.volume = vol;
        }
        const icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0
                ? "fa-solid fa-volume-xmark"
                : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function setMenuVol(abierto) {
        const panel = $id("menu-vol-panel");
        const btn = $id("btn-menu-vol");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    }

    function pintarMenuVol() {
        const pct = volumenFondoPct();
        const slider = $id("rango-volumen");
        const val = $id("vol-val");
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
    }

    function enlazarMenuVol() {
        const btn = $id("btn-menu-vol");
        const cerrar = $id("btn-cerrar-vol");
        const slider = $id("rango-volumen");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                const panel = $id("menu-vol-panel");
                setMenuVol(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) {
            slider.addEventListener("input", function () {
                const n = Number(slider.value);
                const val = $id("vol-val");
                if (val) val.textContent = String(n);
                aplicarVolumenCalibrado(n);
            });
        }
        document.addEventListener("pointerdown", function (ev) {
            const menu = $id("menu-vol");
            if (!menu || menu.contains(ev.target)) return;
            setMenuVol(false);
        });
        pintarMenuVol();
    }

    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty(
            "--mc-letter-spacing",
            (isFinite(n) && n >= 0 ? n : 2) + "px"
        );
    }

    function preloadUrl(url) {
        return new Promise(function (resolve) {
            if (!url) { resolve(); return; }
            if (imgCache[url] && imgCache[url].complete) { resolve(imgCache[url]); return; }
            const img = new Image();
            const done = function () { imgCache[url] = img; resolve(img); };
            img.onload = done;
            img.onerror = function () { resolve(null); };
            img.src = url;
            setTimeout(function () {
                if (!imgCache[url]) { imgCache[url] = img; resolve(img); }
            }, 600);
        });
    }

    function preloadAudio(ruta) {
        return new Promise(function (resolve) {
            if (!ruta) { resolve(); return; }
            if (audioCache[ruta]) { resolve(audioCache[ruta]); return; }
            try {
                const audio = new Audio();
                audio.preload = "auto";
                const done = function () { audioCache[ruta] = audio; resolve(audio); };
                audio.addEventListener("canplaythrough", done, { once: true });
                audio.addEventListener("error", function () { resolve(null); }, { once: true });
                audio.src = ruta;
                setTimeout(function () {
                    if (!audioCache[ruta]) { audioCache[ruta] = audio; resolve(audio); }
                }, 400);
            } catch (e) { resolve(null); }
        });
    }

    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        try {
            let audio = audioCache[ruta];
            if (!audio) {
                audio = new Audio(ruta);
                audioCache[ruta] = audio;
            } else {
                try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
            }
            audio.loop = !!loop;
            audio.volume = volumen != null ? volumen : 0.8;
            const p = audio.play();
            if (p && p.catch) p.catch(function () {});
            if (loop) audioFondo = audio;
            return audio;
        } catch (e) { return null; }
    }

    function urlsImagenesCriticas() {
        const urls = Object.keys(IMG).map(function (k) { return IMG[k]; });
        Object.keys(gameConfig.materiales || {}).forEach(function (id) { urls.push(gameConfig.materiales[id].img); });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../../images/zoe_hablando.gif",
            "../../../images/zeus_hablando.gif",
            "../../../img/zoe_normal.gif",
            "../../../img/zeus_normal.gif"
        ];
        const audios = [
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ];
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin].filter(Boolean);
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    function sincronizarDialogoIntro3d() {
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};

        const conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};

        function textoPlano(html) {
            if (!html) return "";
            const tmp = document.createElement("div");
            tmp.innerHTML = String(html).replace(/<br\s*\/?>/gi, " ");
            return String(tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
        }

        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            const indice = Number(linea.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indice] && introConfig.personajes[indice].nombre)
                || (id === "zoe" ? "Zoe" : "Zeus");

            return {
                personaje: id,
                nombre: nombre,
                color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
                texto: textoPlano(linea.texto)
            };
        });
    }

    function mostrarIntro3d() {
        const root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        const root = $id("intro3d-root");
        if (root) {
            root.classList.add("is-closing");
            setTimeout(function () {
                root.hidden = true;
                if (window.__introPhaser) {
                    try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                    window.__introPhaser = null;
                }
                if (typeof window.__intro3dDispose === "function") {
                    window.__intro3dDispose();
                }
                root.remove();
            }, 450);
        }
    }

    function omitirIntro3d() {
        if (cerrardo) return;
        const root = $id("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrardo) return;
        cerrardo = true;
        conversacionCancelada = true;
        cancelarIntroPendiente();
        TextoVoz.detener();
        asegurarAudioFondo();
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(800);
        PedniaEdad.iniciarNivel({
            niveles: (gameConfig && gameConfig.niveles) || [],
            elegirManual: elegirNivel,
            onElegido: function (nivel) {
                if (nivel) window.confirmarNivel(nivel.id);
            }
        });
    }

    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        TextoVoz.desbloquear();
        if (window.EncuentraTexturaSfx) EncuentraTexturaSfx.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();

        let oculto = false;
        const ocultarPantalla = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "inicioDisuelve") ocultarPantalla();
        });
        setTimeout(ocultarPantalla, 1250);
    }

    window.cerrar_anuncio = function cerrar_anuncio() {
        empezarJuegoTrasIntro();
    };

    function asegurarAudioFondo() {
        if (audioFondo) {
            const p = audioFondo.play();
            if (p && p.catch) p.catch(function () {});
            return audioFondo;
        }
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, TextoVoz.VOLUMEN_FONDO, true);
    }

    /* ── Animación y efectos ─────────────────────────────────── */

    function reducirMovimiento() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve(null);
        const o = Object.assign({ duration: 400, easing: "ease", fill: "forwards" }, opts || {});
        if (reducirMovimiento()) o.duration = Math.min(o.duration, 120);
        let a;
        try { a = el.animate(frames, o); } catch (e) { return Promise.resolve(null); }
        return Promise.race([
            a.finished.catch(function () {}),
            sleep(o.duration * (o.iterations && isFinite(o.iterations) ? o.iterations : 1) + (o.delay || 0) + 600)
        ]).then(function () { return a; });
    }

    /** Anima y deja el estado final como estilo en línea (sin acumular animaciones con fill). */
    function animarFijo(el, frames, opts) {
        return animar(el, frames, opts).then(function (a) {
            if (!a) return;
            try { a.commitStyles(); } catch (e) { /* noop */ }
            try { a.cancel(); } catch (e2) { /* noop */ }
        });
    }

    function crearImg(src, clase) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.draggable = false;
        img.className = clase;
        return img;
    }

    function rectDe(el) {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = crearImg(src, "vuelo");
        $id("capa-efectos").appendChild(el);
        const frames = [{
            left: desde.left + "px", top: desde.top + "px", width: desde.width + "px", height: desde.height + "px",
            opacity: 1, transform: "rotate(0deg)"
        }];
        if (opts.arco) {
            frames.push({
                offset: 0.5,
                left: (desde.left + hasta.left) / 2 + "px",
                top: Math.min(desde.top, hasta.top) - opts.arco + "px",
                width: (desde.width + hasta.width) / 2 + "px",
                height: (desde.height + hasta.height) / 2 + "px",
                opacity: 1,
                transform: "rotate(" + ((opts.giro || 0) / 2) + "deg)"
            });
        }
        frames.push({
            left: hasta.left + "px", top: hasta.top + "px", width: hasta.width + "px", height: hasta.height + "px",
            opacity: opts.opacidadFinal != null ? opts.opacidadFinal : 1,
            transform: "rotate(" + (opts.giro || 0) + "deg)"
        });
        return animar(el, frames, { duration: opts.ms || 650, easing: opts.easing || "cubic-bezier(.3,.7,.3,1)" })
            .then(function () {
                if (opts.conservar) return el;
                el.remove();
                return null;
            });
    }

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = o.n || 14;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            p.style.left = x + (o.dispersionX ? (Math.random() - 0.5) * o.dispersionX : 0) + "px";
            p.style.top = y + (o.dispersionY ? (Math.random() - 0.5) * o.dispersionY : 0) + "px";
            capa.appendChild(p);
            const ang = o.angulo != null
                ? o.angulo + (Math.random() - 0.5) * (o.abanico != null ? o.abanico : 1)
                : Math.random() * Math.PI * 2;
            const dist = (o.dist || 90) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            const rot = Math.round(Math.random() * 360);
            animar(p, [
                { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) rotate(" + rot + "deg) scale(.35)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    /* ── Pista sin voz tras inactividad (fases de uso) ────────── */

    function cancelarPista() {
        clearTimeout(pista.timer);
        pista = { timer: null, fn: null, ms: 0 };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarPista(fn, ms) {
        clearTimeout(pista.timer);
        pista.fn = fn;
        pista.ms = ms;
        pista.timer = setTimeout(function () {
            if (pista.fn !== fn) return;
            Promise.resolve(fn()).then(function () {
                if (pista.fn === fn) programarPista(fn, ms + 1500);
            });
        }, ms);
    }

    function reprogramarPista() {
        if (!pista.fn) return;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
        programarPista(pista.fn, pista.ms);
    }

    function manoPista(opts) {
        if (!window.PedniaTutorial) return Promise.resolve();
        const fn = pista.fn;
        return PedniaTutorial.animarMano(Object.assign({
            holdMs: 300,
            cancelado: function () { return pista.fn !== fn || fase !== opts.fase; }
        }, opts));
    }

    /* ── Sonido y voz ─────────────────────────────────────────── */

    function efecto(nombre) {
        if (!nombre) return;
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const ruta = efectos[nombre];
        if (ruta) {
            const a = reproducirAudio(ruta, 0.85, false);
            if (a) setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, 3000);
            return;
        }
        if (window.EncuentraTexturaSfx) EncuentraTexturaSfx.sonar(nombre);
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto", "es-error");
        if (estado) dialogo.classList.add("es-" + estado);
        avatar.src = avatarDe(voz, true);
        avatar.alt = voz === "zeus" ? "Zeus" : "Zoe";
        $id("enunciado").textContent = texto;
        dialogo.classList.remove("pop");
        void dialogo.offsetWidth;
        dialogo.classList.add("pop");
    }

    function silenciarAvatar() {
        const dialogo = $id("dialogo");
        $id("dialogo-avatar").src = avatarDe(dialogo.dataset.voz === "zeus" ? "zeus" : "zoe", false);
    }

    /** Muestra el texto cuando la voz empieza de verdad (no antes) y resuelve cuando termina. */
    function decir(linea, opts) {
        opts = opts || {};
        if (!linea || !linea.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = linea.voz === "zeus" ? "zeus" : "zoe";
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, linea.texto, opts.estado);
        };
        const respaldo = setTimeout(mostrar, 6000);
        let p;
        try { p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 1200)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    /* ── Edad ─────────────────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : "primary";
            botones +=
                '<div class="col-12 text-center mb-2">' +
                '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
                "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            heightAuto: false,
            scrollbarPadding: false,
            width: 420
        });
    }

    function lineasDelNivel(nivel) {
        const lineas = [];
        const sumar = function (l) { if (l && l.texto) lineas.push({ texto: l.texto, personaje: l.voz || "zoe" }); };
        (nivel.retos || []).forEach(function (r) {
            L.lineas(r.presentacion).forEach(sumar);
            sumar(r.acierto);
            sumar(r.error);
            Object.keys(r.errores || {}).forEach(function (k) { sumar(r.errores[k]); });
        });
        sumar(nivel.cierre);
        return lineas;
    }

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        montarEscenario();
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    /* ── Escenario ────────────────────────────────────────────── */

    function montarEscenario() {
        const taller = esTaller();
        $id("escenario").className = "escenario nivel-" + (taller ? "taller" : "mesa");
        $id("bloque-ensayo").hidden = !(taller && nivelElegido.bloqueEnsayo);
        $id("mesa").hidden = taller;
        $id("objeto-central").hidden = !taller;
        (taller ? $id("cinta") : $id("almohadilla")).appendChild($id("muestras"));
    }

    function cartaDe(id) {
        return $id("muestras").querySelector('.muestra[data-id="' + id + '"]');
    }

    function cartas() {
        return Array.prototype.slice.call($id("muestras").querySelectorAll(".muestra"));
    }

    function pintarMuestras(ids) {
        const cont = $id("muestras");
        cont.innerHTML = "";
        ids.forEach(function (id, i) {
            const m = material(id);
            const b = document.createElement("button");
            b.type = "button";
            b.className = "muestra t-" + m.tacto + " entra";
            b.dataset.id = id;
            b.style.animationDelay = i * 90 + "ms";
            b.setAttribute("aria-label", m.nombre);
            b.innerHTML = '<img class="muestra-img" alt="" draggable="false"><span class="muestra-nombre"></span>';
            b.querySelector(".muestra-img").src = m.img;
            b.querySelector(".muestra-nombre").textContent = m.nombre;
            setTimeout(function () {
                b.classList.remove("entra");
                b.style.animationDelay = "";
            }, 500 + i * 90);
            cont.appendChild(b);
        });
    }

    function limpiarEscena() {
        $id("capa-escena").innerHTML = "";
        document.querySelectorAll(".coco, .piedra-golpe, .suspiro").forEach(function (el) { el.remove(); });
        ["zoe", "zeus"].forEach(function (voz) {
            const pj = $id("pj-" + voz);
            pj.classList.remove("abrazo", "queja", "sostiene");
            pj.style.zIndex = "";
            pj.querySelector(".pj-img").style.transform = "";
        });
        usoFrote = null;
        usoRelleno = null;
        usoGolpes = null;
        const bloque = $id("bloque");
        bloque.innerHTML = "";
        $id("bloque-material").textContent = "";
    }

    function prepararMesa(r) {
        if (r && r.zoeSostiene === "coco") {
            const coco = document.createElement("div");
            coco.className = "coco";
            coco.id = "coco";
            coco.dataset.grieta = "0";
            coco.innerHTML =
                '<img src="' + IMG.coco + '" alt="" draggable="false">' +
                '<svg class="grietas" viewBox="0 0 120 120" aria-hidden="true">' +
                '<path class="g1" d="M60 16 L54 36 L64 50 L56 66" fill="none" stroke="#1a0d04" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path class="g2" d="M56 66 L66 82 L58 108 M64 50 L82 58" fill="none" stroke="#1a0d04" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
                "</svg>";
            coco.addEventListener("pointerdown", function (ev) {
                if (fase !== "golpes") return;
                ev.preventDefault();
                golpearCoco();
            });
            $id("pj-zoe").appendChild(coco);
            $id("pj-zoe").classList.add("sostiene");
        }
    }

    function prepararObjeto(r) {
        const cont = $id("objeto-central");
        cont.innerHTML = "";
        if (!r) return;
        if (r.objeto === "sillon") {
            cont.innerHTML =
                '<div class="obj obj-sillon" id="obj">' +
                '<img class="obj-base" src="' + IMG.sillon + '" alt="Sillón" draggable="false">' +
                '<div class="funda vacia" id="funda"><img src="' + IMG.cojin + '" alt="" draggable="false"></div>' +
                "</div>";
            const funda = $id("funda");
            funda.style.setProperty("--relleno", String(L.rellenoEscala(0, r.usoMeta)));
            funda.addEventListener("pointerdown", function (ev) {
                if (fase !== "uso" || !usoRelleno) return;
                ev.preventDefault();
                sumarRelleno({ x: ev.clientX, y: ev.clientY });
            });
        } else if (r.objeto === "mesa") {
            cont.innerHTML =
                '<div class="obj obj-mesa" id="obj">' +
                '<img class="obj-base" src="' + IMG.mesa + '" alt="Mesa" draggable="false">' +
                '<div class="tablero" id="tablero"><img src="' + IMG.mapa + '" alt="" draggable="false"><canvas></canvas></div>' +
                "</div>";
            prepararLienzo($id("tablero").querySelector("canvas"), { img: IMG.pintura });
        } else if (r.objeto === "libro") {
            cont.innerHTML =
                '<div class="obj obj-libro" id="obj"><div class="libro">' +
                '<div class="pagina pagina-izq"><i class="fa-solid fa-tree" aria-hidden="true"></i></div>' +
                '<div class="pagina pagina-der"><div class="hoja" id="hoja">' +
                '<img src="' + IMG.crayon + '" alt="" draggable="false"><canvas></canvas>' +
                "</div></div></div></div>";
            prepararLienzo($id("hoja").querySelector("canvas"), { color: "#fffdf6" });
        }
    }

    /** Lienzo que tapa la imagen de abajo; frotar lo borra. */
    function prepararLienzo(canvas, relleno) {
        const r = canvas.getBoundingClientRect();
        const w = Math.max(1, r.width);
        const h = Math.max(1, r.height);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas._w = w;
        canvas._h = h;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (relleno.color) {
            ctx.fillStyle = relleno.color;
            ctx.fillRect(0, 0, w, h);
            return;
        }
        ctx.fillStyle = "#6c8a5a";
        ctx.fillRect(0, 0, w, h);
        preloadUrl(relleno.img).then(function (img) {
            if (img) ctx.drawImage(img, 0, 0, w, h);
        });
    }

    /* ── Tacto: frotar explora, tocar elige ───────────────────── */

    function quitarTocando(excepto) {
        cartas().forEach(function (c) {
            if (c !== excepto) c.classList.remove("tocando");
        });
    }

    function gestoPersonajes(id) {
        if (esTaller()) return;
        const ahora = performance.now();
        if (ultimoGesto.id === id && ahora - ultimoGesto.t < 2600) return;
        if (ahora - ultimoGesto.t < 900) return;
        ultimoGesto = { id: id, t: ahora };
        ["zoe", "zeus"].forEach(function (voz) {
            const g = L.gestoDe(gameConfig, id, voz);
            if (g) hacerGesto(voz, g);
        });
    }

    function hacerGesto(voz, g) {
        if (!g) return;
        const pj = $id("pj-" + voz);
        Object.keys(GESTO_ICONO).forEach(function (k) { pj.classList.remove("gesto-" + k); });
        void pj.offsetWidth;
        pj.classList.add("gesto-" + g);
        const burbuja = pj.querySelector(".pj-gesto");
        burbuja.querySelector("i").className = "fa-solid " + GESTO_ICONO[g];
        burbuja.hidden = false;
        burbuja.style.animation = "none";
        void burbuja.offsetWidth;
        burbuja.style.animation = "";
        clearTimeout(pj._gestoT);
        pj._gestoT = setTimeout(function () {
            pj.classList.remove("gesto-" + g);
            burbuja.hidden = true;
        }, 1150);
    }

    function anilloFirme(card) {
        card.classList.remove("firme-anillo");
        void card.offsetWidth;
        card.classList.add("firme-anillo");
        setTimeout(function () { card.classList.remove("firme-anillo"); }, 480);
    }

    /** Reacción de la muestra bajo el dedo (hundirse, polvo, brillo, sonido…). */
    function tocarMuestra(card, x, y, o) {
        o = o || {};
        const id = card.dataset.id;
        const m = material(id);
        const ahora = performance.now();
        quitarTocando(card);
        card.classList.add("tocando");
        const st = estadoTacto[id] || (estadoTacto[id] = { sonido: 0, part: 0 });
        const r = card.getBoundingClientRect();
        if (m.tacto === "peinar" && o.dx) card.style.setProperty("--peine", (o.dx > 0 ? 14 : -14) + "deg");
        if (m.tacto === "deslizar") {
            const f = (x - r.left) / r.width;
            card.style.setProperty("--brillo", ((1.1 - f) / 1.2) * 100 + "%");
        }
        if (o.inicio && m.sonidoToque) {
            efecto(m.sonidoToque);
            st.sonido = ahora;
        }
        if (ahora - st.sonido > 420) {
            st.sonido = ahora;
            efecto(m.sonido);
            if (m.tacto === "firme") anilloFirme(card);
            if (m.tacto === "peinar") {
                card.classList.remove("rie");
                void card.offsetWidth;
                card.classList.add("rie");
            }
        }
        const pc = PARTICULAS_TACTO[m.particula];
        if (pc && ahora - st.part > 90) {
            st.part = ahora;
            particulas(x, y, pc);
        }
        gestoPersonajes(id);
    }

    function puedeExplorar() {
        return !demoActiva && !juegoTerminado && (fase === "presentacion" || fase === "elegir" || fase === "uso");
    }

    function cintaRect() {
        return $id("cinta").getBoundingClientRect();
    }

    function zonasSoltar() {
        return {
            objeto: $id("objeto-central").getBoundingClientRect(),
            bloque: nivelElegido.bloqueEnsayo ? $id("bloque-ensayo").getBoundingClientRect() : null
        };
    }

    function marcarSobre(destino) {
        $id("objeto-central").classList.toggle("sobre", destino === "objeto");
        $id("bloque-ensayo").classList.toggle("sobre", destino === "bloque");
    }

    function moverFantasma(id, x, y) {
        let f = document.querySelector(".fantasma");
        if (!f) {
            f = crearImg(material(id).img, "fantasma");
            $id("capa-efectos").appendChild(f);
        }
        if (f.dataset.id !== id) {
            f.dataset.id = id;
            f.src = material(id).img;
        }
        f.style.left = x + "px";
        f.style.top = y + "px";
        marcarSobre(L.soltarEn({ x: x, y: y }, zonasSoltar()));
    }

    function quitarFantasma() {
        const f = document.querySelector(".fantasma");
        if (f) f.remove();
        marcarSobre(null);
    }

    function enlazarMuestras() {
        const cont = $id("muestras");
        cont.addEventListener("pointerdown", function (ev) {
            const card = ev.target.closest(".muestra");
            if (!card || gesto || !puedeExplorar()) return;
            ev.preventDefault();
            gesto = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, xUlt: ev.clientX, origen: card, actual: card, arrastre: false, fuera: false };
            try { cont.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            tocarMuestra(card, ev.clientX, ev.clientY, { inicio: true });
        });
        cont.addEventListener("pointermove", function (ev) {
            if (!gesto || gesto.id !== ev.pointerId) return;
            if (!puedeExplorar()) return;
            if (!gesto.arrastre && L.clasificarGesto(ev.clientX - gesto.x0, ev.clientY - gesto.y0) === "arrastre") {
                gesto.arrastre = true;
            }
            const dx = ev.clientX - gesto.xUlt;
            gesto.xUlt = ev.clientX;
            const bajo = document.elementFromPoint(ev.clientX, ev.clientY);
            const card = bajo && bajo.closest ? bajo.closest("#muestras .muestra") : null;
            if (card) {
                if (gesto.fuera) quitarFantasma();
                gesto.fuera = false;
                gesto.actual = card;
                tocarMuestra(card, ev.clientX, ev.clientY, { dx: dx });
                return;
            }
            quitarTocando();
            if (esTaller() && gesto.arrastre && ev.clientY < cintaRect().top - 4) {
                gesto.fuera = true;
                moverFantasma(gesto.actual.dataset.id, ev.clientX, ev.clientY);
            }
        });
        const fin = function (ev) {
            if (!gesto || gesto.id !== ev.pointerId) return;
            const g = gesto;
            gesto = null;
            quitarTocando();
            if (ev.type === "pointercancel") {
                quitarFantasma();
                return;
            }
            if (!g.arrastre) {
                tocarCarta(g.origen);
                return;
            }
            if (!g.fuera) return;
            const p = { x: ev.clientX, y: ev.clientY };
            const destino = L.soltarEn(p, zonasSoltar());
            const id = g.actual.dataset.id;
            quitarFantasma();
            if (destino === "bloque") {
                probarEnBloque(id);
            } else if (destino === "objeto" && fase === "elegir") {
                elegir(id, g.actual, "arrastre", p);
            } else if (destino === "objeto" && fase === "uso" && usoRelleno && id === reto.correcta) {
                sumarRelleno(p);
            } else {
                volar(material(id).img, { left: p.x - 55, top: p.y - 55, width: 110, height: 110 }, rectDe(g.actual.querySelector(".muestra-img")), { ms: 380 });
            }
        };
        cont.addEventListener("pointerup", fin);
        cont.addEventListener("pointercancel", fin);
        cont.addEventListener("click", function (ev) {
            if (ev.detail !== 0) return;
            const card = ev.target.closest(".muestra");
            if (card && puedeExplorar()) tocarCarta(card);
        });
    }

    function tocarCarta(card) {
        const id = card.dataset.id;
        if (fase === "elegir") {
            elegir(id, card, "toque");
        } else if (fase === "uso" && usoRelleno && id === reto.correcta) {
            const funda = $id("funda");
            volar(material(id).img, rectDe(card.querySelector(".muestra-img")), rectDe(funda), { arco: 60, ms: 520, opacidadFinal: 0.3 })
                .then(function () { sumarRelleno(centroDe(funda)); });
        }
    }

    /* ── Bloque de ensayo (5-6) ───────────────────────────────── */

    function probarEnBloque(id) {
        if (!puedeExplorar()) return;
        const m = material(id);
        const bloque = $id("bloque");
        bloque.innerHTML = "";
        const img = crearImg(m.img, "prueba");
        bloque.appendChild(img);
        $id("bloque-material").textContent = m.nombre;
        const c = centroDe(bloque);
        efecto(m.sonido);
        if (m.tacto === "hundir" || m.tacto === "comprimir") {
            animar(img, [
                { transform: "translate(-50%,-50%) scale(1)" },
                { transform: "translate(-50%,-38%) scale(1.1,.7)", offset: 0.4 },
                { transform: "translate(-50%,-50%) scale(1)" }
            ], { duration: 700, fill: "none" });
        } else if (m.tacto === "raspar") {
            for (let i = 0; i < 4; i++) {
                const rayon = document.createElement("span");
                rayon.className = "rayon";
                rayon.style.left = 10 + Math.random() * 30 + "%";
                rayon.style.top = 15 + i * 20 + Math.random() * 6 + "%";
                rayon.style.width = 40 + Math.random() * 25 + "%";
                rayon.style.transform = "rotate(" + (Math.random() * 16 - 8) + "deg)";
                bloque.appendChild(rayon);
            }
            animar(img, [
                { transform: "translate(-62%,-50%)" }, { transform: "translate(-38%,-50%)" },
                { transform: "translate(-62%,-50%)" }, { transform: "translate(-50%,-50%)" }
            ], { duration: 600, fill: "none" });
        } else if (m.tacto === "deslizar") {
            animar(img, [
                { transform: "translate(-80%,-50%)" }, { transform: "translate(-20%,-50%)" }, { transform: "translate(-50%,-50%)" }
            ], { duration: 500, easing: "ease-out", fill: "none" });
        } else if (m.tacto === "firme") {
            animar(img, [
                { transform: "translate(-50%,-90%)" }, { transform: "translate(-50%,-50%)", offset: 0.4 },
                { transform: "translate(-50%,-60%)", offset: 0.6 }, { transform: "translate(-50%,-50%)" }
            ], { duration: 500, fill: "none" });
        } else {
            animar(img, [
                { transform: "translate(-50%,-50%) skewX(0)" }, { transform: "translate(-50%,-50%) skewX(12deg)" },
                { transform: "translate(-50%,-50%) skewX(-12deg)" }, { transform: "translate(-50%,-50%) skewX(0)" }
            ], { duration: 700, fill: "none" });
        }
        const pc = PARTICULAS_TACTO[m.particula];
        if (pc) particulas(c.x, c.y, Object.assign({}, pc, { n: pc.n * 3 }));
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        fase = "presentacion";
        erroresReto = 0;
        estadoTacto = Object.create(null);
        cancelarPista();
        limpiarEscena();
        if (esTaller()) prepararObjeto(reto);
        else prepararMesa(reto);
        pintarMuestras(L.mezclar(reto.muestras));
        await sleep(500);
        if (!vivo(gen)) return;
        if (reto.objeto === "sillon") await zeusSeQueja(gen);
        const ls = L.lineas(reto.presentacion);
        for (let i = 0; i < ls.length; i++) {
            await decir(ls[i]);
            if (!vivo(gen)) return;
        }
        if (fase === "presentacion") fase = "elegir";
    }

    async function retoCompletado(gen) {
        await sleep(900);
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    async function elegir(id, card, via, punto) {
        if (fase !== "elegir" || juegoTerminado) return;
        const gen = rondaGen;
        if (L.esCorrecta(reto, id)) {
            fase = "respuesta";
            cartas().forEach(function (c) { c.classList.remove("pista"); });
            card.classList.add("elegida");
            efecto("magia");
            const c = centroDe(card);
            particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 90 });
            await responder(card, via, punto, gen);
            if (!vivo(gen)) return;
            await retoCompletado(gen);
            return;
        }
        fase = "error";
        erroresReto += 1;
        card.classList.remove("rechazo");
        void card.offsetWidth;
        card.classList.add("rechazo");
        if (via === "arrastre" && punto) {
            volar(material(id).img, { left: punto.x - 55, top: punto.y - 55, width: 110, height: 110 }, rectDe(card.querySelector(".muestra-img")), { ms: 420 });
        }
        const c = centroDe(card);
        tocarMuestra(card, c.x, c.y, { inicio: true });
        setTimeout(function () { card.classList.remove("tocando"); }, 700);
        const linea = L.lineaError(reto, id);
        if (linea && !esTaller()) hacerGesto(linea.voz, L.gestoDe(gameConfig, id, linea.voz));
        await decir(linea, { estado: "error" });
        if (gen !== rondaGen) return;
        card.classList.remove("rechazo");
        if (erroresReto >= 3) {
            const ok = cartaDe(reto.correcta);
            if (ok) ok.classList.add("pista");
        }
        fase = "elegir";
    }

    function responder(card, via, punto, gen) {
        switch (reto.respuesta || reto.uso) {
            case "almohada": return respAlmohada(card, gen);
            case "pulir": return respPulir(card, gen);
            case "coco": return respCoco(card, gen);
            case "rellenar": return respRellenar(card, via, gen);
            case "lijar": return respLijar(card, gen);
            case "estampar": return respEstampar(card, gen);
            default: return decir(reto.acierto, { estado: "acierto" });
        }
    }

    /* ── Respuestas 3-4 ───────────────────────────────────────── */

    /** Zoe y Zeus abrazan el algodón, que crece como nube feliz y abraza la pantalla. */
    async function respAlmohada(card) {
        const desde = rectDe(card.querySelector(".muestra-img"));
        const mesa = $id("mesa").getBoundingClientRect();
        const lado = mesa.height * 0.8;
        const medio = { left: mesa.left + mesa.width / 2 - lado * 0.75, top: mesa.top + mesa.height / 2 - lado / 2, width: lado * 1.5, height: lado };
        const W = window.innerWidth;
        const H = window.innerHeight;
        const pantalla = { left: -W * 0.2, top: -H * 0.2, width: W * 1.4, height: H * 1.4 };
        const nube = crearImg(IMG.nube, "nube-abrazo");
        $id("capa-efectos").appendChild(nube);
        const caja = function (r, extra) {
            return Object.assign({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }, extra || {});
        };
        efecto("fluff");
        const voz = decir(reto.acierto, { estado: "acierto" });
        setTimeout(function () {
            $id("pj-zoe").classList.add("abrazo");
            $id("pj-zeus").classList.add("abrazo");
        }, 500);
        setTimeout(function () { efecto("fluff"); }, 1500);
        await animar(nube, [
            caja(desde, { opacity: 0.6 }),
            caja(medio, { opacity: 1, offset: 0.3 }),
            caja(medio, { opacity: 1, offset: 0.55 }),
            caja(pantalla, { opacity: 0.95, offset: 0.8 }),
            caja(pantalla, { opacity: 0 })
        ], { duration: 3000, easing: "ease-in-out" });
        nube.remove();
        $id("pj-zoe").classList.remove("abrazo");
        $id("pj-zeus").classList.remove("abrazo");
        const c = centroDe($id("mesa"));
        particulas(c.x, c.y, { n: 16, tipo: "nube", dist: 160, ms: 1100 });
        await voz;
    }

    /** La lija pule una piecita de madera de juguete hasta dejarla brillante. */
    async function respPulir(card, gen) {
        cartas().forEach(function (c) { if (c !== card) c.classList.add("atenuada"); });
        card.classList.add("oculta");
        const pieza = crearImg(IMG.pieza, "pieza-juguete");
        $id("capa-escena").appendChild(pieza);
        await animar(pieza, [
            { transform: "translate(-50%,-50%) scale(.2)", opacity: 0 },
            { transform: "translate(-50%,-50%) scale(1)", opacity: 1 }
        ], { duration: 450, easing: "cubic-bezier(.3,1.5,.5,1)" });
        const rp = pieza.getBoundingClientRect();
        const tam = rp.height * 0.55;
        const lija = await volar(material("lija").img, rectDe(card.querySelector(".muestra-img")), {
            left: rp.left + rp.width / 2 - tam / 2, top: rp.top + rp.height * 0.18 - tam / 2, width: tam, height: tam
        }, { arco: 80, ms: 600, conservar: true });
        if (!vivo(gen)) { if (lija) lija.remove(); return; }
        const pasadas = 6;
        const iv = setInterval(function () {
            efecto("rasch");
            const c = lija ? centroDe(lija) : centroDe(pieza);
            particulas(c.x, c.y + tam * 0.3, { n: 6, tipo: "polvo", dist: 60, gravedad: 40, ms: 700 });
        }, 340);
        setTimeout(function () { pieza.src = IMG.piezaPulida; }, 340 * 4);
        await animar(lija, [
            { transform: "translateX(-60px) rotate(-10deg)" },
            { transform: "translateX(60px) rotate(8deg)" }
        ], { duration: 340, iterations: pasadas, direction: "alternate", easing: "ease-in-out" });
        clearInterval(iv);
        if (lija) lija.remove();
        pieza.src = IMG.piezaPulida;
        pieza.classList.add("brilla");
        efecto("chispas");
        const c = centroDe(pieza);
        particulas(c.x, c.y, { n: 18, tipo: "brillo", dist: 130 });
        particulas(c.x, c.y, { n: 10, tipo: "estrella", dist: 110 });
        await decir(reto.acierto, { estado: "acierto" });
    }

    function puntoBezier(p0, p1, p2, p3, t) {
        const u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
        };
    }

    /** La piedra lisa patina por un tobogán de agua hasta las manos de Zoe y se parte el coco. */
    async function respCoco(card, gen) {
        const coco = $id("coco");
        const esc = $id("escenario").getBoundingClientRect();
        const mesa = $id("mesa").getBoundingClientRect();
        const rc = coco.getBoundingClientRect();
        const tam = 70;
        const S = { x: mesa.right - 70, y: mesa.top + 30 };
        const E = { x: rc.left + rc.width / 2, y: rc.top - 60 };
        const C1 = { x: S.x - 60, y: S.y + (E.y - S.y) * 1.4 };
        const C2 = { x: E.x + (S.x - E.x) * 0.45, y: E.y - 30 };

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "tobogan");
        svg.setAttribute("width", esc.width);
        svg.setAttribute("height", esc.height);
        svg.style.left = "0";
        svg.style.top = "0";
        const d = "M" + (S.x - esc.left) + " " + (S.y - esc.top) +
            " C" + (C1.x - esc.left) + " " + (C1.y - esc.top) + " " + (C2.x - esc.left) + " " + (C2.y - esc.top) +
            " " + (E.x - esc.left) + " " + (E.y - esc.top);
        [["#1c7ed6", 34], ["#74c0fc", 22]].forEach(function (s) {
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", s[0]);
            path.setAttribute("stroke-width", s[1]);
            path.setAttribute("stroke-linecap", "round");
            svg.appendChild(path);
        });
        const agua = document.createElementNS(svgNS, "path");
        agua.setAttribute("d", d);
        agua.setAttribute("fill", "none");
        agua.setAttribute("stroke", "#e7f5ff");
        agua.setAttribute("stroke-width", "4");
        agua.setAttribute("stroke-dasharray", "14 12");
        agua.setAttribute("stroke-linecap", "round");
        svg.appendChild(agua);
        $id("capa-escena").appendChild(svg);
        animar(svg, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
        animar(agua, [{ strokeDashoffset: 0 }, { strokeDashoffset: -104 }], { duration: 900, iterations: 3, easing: "linear" });

        card.classList.add("oculta");
        const piedra = await volar(material("piedra_lisa").img, rectDe(card.querySelector(".muestra-img")), {
            left: S.x - tam / 2, top: S.y - tam / 2, width: tam, height: tam
        }, { arco: 70, ms: 550, conservar: true });
        if (!vivo(gen)) { if (piedra) piedra.remove(); return; }
        efecto("fiiiu");
        efecto("agua");
        const frames = [];
        for (let i = 0; i <= 24; i++) {
            const p = puntoBezier(S, C1, C2, E, i / 24);
            frames.push({ left: p.x - tam / 2 + "px", top: p.y - tam / 2 + "px", transform: "rotate(" + i * 30 + "deg)" });
        }
        const gotas = setInterval(function () {
            const c = centroDe(piedra);
            particulas(c.x, c.y, { n: 2, tipo: "gota", dist: 40, gravedad: -20, ms: 600 });
        }, 110);
        await animar(piedra, frames, { duration: 1300, easing: "ease-in" });
        clearInterval(gotas);
        piedra.remove();
        animar(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }).then(function () { svg.remove(); });

        const enMano = crearImg(material("piedra_lisa").img, "piedra-golpe");
        enMano.id = "piedra-golpe";
        $id("pj-zoe").appendChild(enMano);
        efecto("tactac");
        await sleep(300);
        if (!vivo(gen)) return;

        const edad = window.PedniaEdad && typeof PedniaEdad.edadSesion === "function" ? PedniaEdad.edadSesion() : null;
        if (L.debeAyudar(edad, reto)) await golpesDelNino(gen);
        else await golpesAuto(gen);
        if (!vivo(gen)) return;
        await partirCoco();
        await decir(reto.acierto, { estado: "acierto" });
    }

    function golpearCoco() {
        const coco = $id("coco");
        const piedra = $id("piedra-golpe");
        if (!coco || !usoGolpes) return;
        usoGolpes.n += 1;
        const n = usoGolpes.n;
        reprogramarPista();
        animar(piedra, [
            { transform: "translateY(0) rotate(0)" },
            { transform: "translateY(-26px) rotate(-18deg)", offset: 0.35 },
            { transform: "translateY(30px) rotate(0)", offset: 0.6 },
            { transform: "translateY(0) rotate(0)" }
        ], { duration: 320, fill: "none" });
        setTimeout(function () {
            efecto("golpe");
            coco.dataset.grieta = String(Math.min(2, n));
            coco.classList.remove("golpe");
            void coco.offsetWidth;
            coco.classList.add("golpe");
            const c = centroDe(coco);
            particulas(c.x, c.y - 20, { n: 6, tipo: "polvo", dist: 50, ms: 500 });
        }, 190);
        if (n >= GOLPES_COCO) {
            const fin = usoGolpes.resolve;
            usoGolpes = null;
            fase = "respuesta";
            coco.classList.remove("golpeable");
            cancelarPista();
            setTimeout(fin, 420);
        }
    }

    /** A partir de 4 años el niño da los golpecitos mientras Zoe sostiene el coco. */
    function golpesDelNino() {
        return new Promise(function (resolve) {
            const coco = $id("coco");
            usoGolpes = { n: 0, resolve: resolve };
            fase = "golpes";
            coco.classList.add("golpeable");
            programarPista(function () {
                return manoPista({ punto: coco, fase: "golpes" });
            }, 3500);
        });
    }

    async function golpesAuto(gen) {
        usoGolpes = { n: 0, resolve: function () {} };
        for (let i = 0; i < GOLPES_COCO; i++) {
            await sleep(600);
            if (!vivo(gen)) return;
            golpearCoco();
        }
        await sleep(450);
    }

    async function partirCoco() {
        const coco = $id("coco");
        const piedra = $id("piedra-golpe");
        if (!coco) return;
        efecto("crack");
        coco.querySelector("img").style.visibility = "hidden";
        coco.querySelector(".grietas").style.visibility = "hidden";
        const izq = crearImg(IMG.cocoMitad, "coco-mitad");
        izq.style.left = "0";
        const der = crearImg(IMG.cocoMitad, "coco-mitad");
        der.style.right = "0";
        der.style.transform = "scaleX(-1)";
        coco.appendChild(izq);
        coco.appendChild(der);
        const c = centroDe(coco);
        particulas(c.x, c.y, { n: 14, tipo: "gota", dist: 90, gravedad: -30, angulo: -Math.PI / 2, abanico: 2.4 });
        particulas(c.x, c.y, { n: 8, tipo: "estrella", dist: 100 });
        if (piedra) animar(piedra, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
        await Promise.all([
            animar(izq, [{ transform: "translateX(0) rotate(0)" }, { transform: "translateX(-40px) rotate(-30deg)" }], { duration: 500, easing: "cubic-bezier(.3,1.4,.5,1)" }),
            animar(der, [{ transform: "scaleX(-1) translateX(0) rotate(0)" }, { transform: "scaleX(-1) translateX(-40px) rotate(-30deg)" }], { duration: 500, easing: "cubic-bezier(.3,1.4,.5,1)" })
        ]);
    }

    /* ── Respuestas 5-6 ───────────────────────────────────────── */

    function transformHacia(img, destino, escala) {
        const a = img.getBoundingClientRect();
        const dx = destino.x - (a.left + a.width / 2);
        const dy = destino.y - a.bottom;
        return "translate(" + dx + "px," + dy + "px) scale(" + escala + ")";
    }

    /** Zeus intenta sentarse en el sillón rígido, rebota y se queja. */
    async function zeusSeQueja(gen) {
        const pj = $id("pj-zeus");
        const img = pj.querySelector(".pj-img");
        const funda = $id("funda");
        if (!funda) return;
        const f = funda.getBoundingClientRect();
        const T = transformHacia(img, { x: f.left + f.width / 2, y: f.bottom }, 0.8);
        pj.style.zIndex = "13";
        setTimeout(function () { efecto("toc"); }, 1150);
        await animar(img, [
            { transform: "none" },
            { transform: T, offset: 0.4 },
            { transform: T + " translateY(-40px) rotate(-8deg)", offset: 0.55 },
            { transform: T, offset: 0.68 },
            { transform: "none" }
        ], { duration: 2400, easing: "ease-in-out", fill: "none" });
        pj.style.zIndex = "";
        if (!vivo(gen)) return;
    }

    /** Arrastrar o dar toques de algodón sobre el cojín hasta inflarlo; luego Zeus se sienta. */
    async function respRellenar(card, via, gen) {
        const funda = $id("funda");
        if (via !== "arrastre") {
            await volar(material(reto.correcta).img, rectDe(card.querySelector(".muestra-img")), rectDe(funda), { arco: 60, ms: 560, opacidadFinal: 0.3 });
        }
        if (!vivo(gen)) return;
        card.classList.remove("elegida");
        await new Promise(function (resolve) {
            usoRelleno = { pasos: 0, resolve: resolve };
            fase = "uso";
            funda.classList.add("activa");
            sumarRelleno(centroDe(funda));
            programarPista(function () {
                const origen = cartaDe(reto.correcta);
                if (!origen) return Promise.resolve();
                const a = centroDe(origen);
                const b = centroDe(funda);
                return manoPista({ punto: a, fase: "uso", arrastre: { dx: b.x - a.x, dy: b.y - a.y, durMs: 900 } });
            }, 4500);
        });
        if (!vivo(gen)) return;
        await zeusSeSienta(gen);
        await decir(reto.acierto, { estado: "acierto" });
    }

    function sumarRelleno(p) {
        if (!usoRelleno) return;
        const funda = $id("funda");
        usoRelleno.pasos += 1;
        reprogramarPista();
        funda.classList.remove("vacia");
        funda.style.setProperty("--relleno", String(L.rellenoEscala(usoRelleno.pasos, reto.usoMeta)));
        efecto("puff");
        const c = p || centroDe(funda);
        particulas(c.x, c.y, { n: 6, tipo: "algodon", dist: 70, gravedad: -20, ms: 800 });
        if (usoRelleno.pasos >= reto.usoMeta) {
            const fin = usoRelleno.resolve;
            usoRelleno = null;
            fase = "respuesta";
            funda.classList.remove("activa");
            cancelarPista();
            efecto("magia");
            setTimeout(fin, 500);
        }
    }

    async function zeusSeSienta(gen) {
        const pj = $id("pj-zeus");
        const img = pj.querySelector(".pj-img");
        const funda = $id("funda");
        const f = funda.getBoundingClientRect();
        const T = transformHacia(img, { x: f.left + f.width / 2, y: f.top + f.height * 0.75 }, 0.8);
        pj.style.zIndex = "13";
        await animarFijo(img, [
            { transform: "none" },
            { transform: T + " translateY(-40px)", offset: 0.75 },
            { transform: T }
        ], { duration: 1200, easing: "ease-in-out" });
        if (!vivo(gen)) return;
        efecto("fuuushboing");
        funda.classList.add("hundida");
        await animar(img, [
            { transform: T },
            { transform: T + " scale(1.05,.86)", offset: 0.4 },
            { transform: T }
        ], { duration: 700, fill: "none" });
        const suspiro = document.createElement("span");
        suspiro.className = "suspiro";
        suspiro.innerHTML = '<i class="fa-solid fa-face-smile-beam" aria-hidden="true"></i>';
        pj.appendChild(suspiro);
        const r = img.getBoundingClientRect();
        const pr = pj.getBoundingClientRect();
        suspiro.style.left = r.left - pr.left + r.width / 2 + "px";
        suspiro.style.top = r.top - pr.top - 10 + "px";
        efecto("suspiro");
        await sleep(600);
    }

    /**
     * Frotar sobre la zona borra la tapa (pintura vieja o papel) y descubre lo de abajo.
     * Resuelve cuando la cobertura llega a la meta.
     */
    function usarFrote(o) {
        return new Promise(function (resolve) {
            const zona = o.zona;
            const canvas = zona.querySelector("canvas");
            const w = canvas._w;
            const h = canvas._h;
            const radio = w * o.radio;
            const st = { celdas: {}, ult: null, ptr: null, sonido: 0, part: 0, listo: false };
            usoFrote = st;
            fase = "uso";
            zona.classList.add("activa");
            const ctx = canvas.getContext("2d");

            const punto = function (ev) {
                const r = zona.getBoundingClientRect();
                return { x: (ev.clientX - r.left) * (w / r.width), y: (ev.clientY - r.top) * (h / r.height) };
            };
            const ponerHerramienta = function (p) {
                if (!o.herramienta) return;
                o.herramienta.style.left = zona.offsetLeft + p.x * (zona.offsetWidth / w) + "px";
                o.herramienta.style.top = zona.offsetTop + p.y * (zona.offsetHeight / h) + "px";
            };
            const trazo = function (a, b, cx, cy) {
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.lineWidth = radio * 2;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x + 0.01, b.y);
                ctx.stroke();
                ctx.restore();
                ponerHerramienta(b);
                L.marcarTrazo(st.celdas, a, b, radio, w, h, FROTE_COLS, FROTE_ROWS);
                const ahora = performance.now();
                if (ahora - st.sonido > 300) {
                    st.sonido = ahora;
                    efecto(o.sonido);
                }
                const pc = PARTICULAS_TACTO[o.particula];
                if (pc && ahora - st.part > 70) {
                    st.part = ahora;
                    particulas(cx, cy, pc);
                }
                if (L.cobertura(st.celdas, FROTE_COLS, FROTE_ROWS) >= o.meta) terminar();
            };
            const terminar = function () {
                if (st.listo) return;
                st.listo = true;
                usoFrote = null;
                fase = "respuesta";
                zona.classList.remove("activa");
                cancelarPista();
                canvas.style.opacity = "0";
                if (o.herramienta) o.herramienta.style.opacity = "0";
                setTimeout(resolve, 650);
            };

            zona.addEventListener("pointerdown", function (ev) {
                if (fase !== "uso" || usoFrote !== st || st.listo) return;
                ev.preventDefault();
                st.ptr = ev.pointerId;
                try { zona.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                st.ult = punto(ev);
                reprogramarPista();
                trazo(st.ult, st.ult, ev.clientX, ev.clientY);
            });
            zona.addEventListener("pointermove", function (ev) {
                if (st.ptr !== ev.pointerId || st.listo) return;
                const p = punto(ev);
                reprogramarPista();
                trazo(st.ult, p, ev.clientX, ev.clientY);
                st.ult = p;
            });
            const soltar = function (ev) { if (st.ptr === ev.pointerId) st.ptr = null; };
            zona.addEventListener("pointerup", soltar);
            zona.addEventListener("pointercancel", soltar);

            programarPista(function () {
                const r = zona.getBoundingClientRect();
                return manoPista({
                    punto: { x: r.left + r.width * 0.25, y: r.top + r.height * 0.5 },
                    fase: "uso",
                    arrastre: { dx: r.width * 0.5, dy: 0, durMs: 900 }
                });
            }, 5000);
        });
    }

    /** La lija pule la mesa: salta polvillo y aparece un mapa del tesoro. */
    async function respLijar(card, gen) {
        const tablero = $id("tablero");
        const obj = $id("obj");
        const herr = crearImg(material(reto.correcta).img, "herramienta");
        herr.style.opacity = "0";
        herr.style.left = tablero.offsetLeft + tablero.offsetWidth * 0.86 + "px";
        herr.style.top = tablero.offsetTop + tablero.offsetHeight * 0.3 + "px";
        obj.appendChild(herr);
        await volar(material(reto.correcta).img, rectDe(card.querySelector(".muestra-img")), rectDe(herr), { arco: 70, ms: 560 });
        if (!vivo(gen)) return;
        herr.style.opacity = "1";
        card.classList.remove("elegida");
        await usarFrote({ zona: tablero, herramienta: herr, radio: 0.075, meta: reto.usoMeta, sonido: "rasch", particula: "polvo" });
        if (!vivo(gen)) return;
        tablero.classList.add("pulida");
        efecto("ding");
        const c = centroDe(tablero);
        particulas(c.x, c.y, { n: 18, tipo: "brillo", dist: 180, dispersionX: tablero.offsetWidth * 0.6 });
        await decir(reto.acierto, { estado: "acierto" });
    }

    /** Frotado de crayón sobre la corteza; el dibujo se enmarca solo y se cuelga. */
    async function respEstampar(card, gen) {
        const hoja = $id("hoja");
        const obj = $id("obj");
        const canvas = hoja.querySelector("canvas");
        await volar(material(reto.correcta).img, rectDe(card.querySelector(".muestra-img")), rectDe(hoja), { arco: 60, ms: 600, opacidadFinal: 0.15 });
        if (!vivo(gen)) return;
        canvas.style.opacity = "0.88";
        card.classList.remove("elegida");
        const crayon = document.createElement("span");
        crayon.className = "crayon";
        crayon.style.left = hoja.offsetLeft + hoja.offsetWidth * 0.85 + "px";
        crayon.style.top = hoja.offsetTop + hoja.offsetHeight * 0.3 + "px";
        hoja.parentElement.appendChild(crayon);
        efecto("magia");
        await usarFrote({ zona: hoja, herramienta: crayon, radio: 0.11, meta: reto.usoMeta, sonido: "frufru", particula: "migas" });
        if (!vivo(gen)) return;
        efecto("chispas");
        const desde = rectDe(hoja);
        const centro = $id("centro").getBoundingClientRect();
        const alto = Math.min(centro.height * 0.62, 230);
        const ancho = alto * (200 / 240);
        const hasta = { left: centro.left + centro.width / 2 - ancho / 2, top: centro.top + centro.height * 0.18, width: ancho, height: alto };
        const cuadro = document.createElement("div");
        cuadro.className = "cuadro";
        cuadro.innerHTML = '<img src="' + IMG.crayon + '" alt="" draggable="false">';
        cuadro.style.position = "fixed";
        $id("capa-efectos").appendChild(cuadro);
        animar(obj, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
        await animar(cuadro, [
            { left: desde.left + "px", top: desde.top + "px", width: desde.width + "px", height: desde.height + "px", borderWidth: "0px" },
            { left: hasta.left + "px", top: hasta.top + "px", width: hasta.width + "px", height: hasta.height + "px", borderWidth: "10px" }
        ], { duration: 900, easing: "cubic-bezier(.3,.8,.3,1)" });
        if (!vivo(gen)) { cuadro.remove(); return; }
        const cr = $id("centro").getBoundingClientRect();
        cuadro.getAnimations().forEach(function (a) { a.cancel(); });
        cuadro.style.position = "absolute";
        cuadro.style.left = hasta.left - cr.left + "px";
        cuadro.style.top = hasta.top - cr.top + "px";
        cuadro.style.width = hasta.width + "px";
        cuadro.style.height = hasta.height + "px";
        cuadro.classList.add("colgado");
        $id("centro").appendChild(cuadro);
        efecto("toc");
        const c = centroDe(cuadro);
        particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 140 });
        await decir(reto.acierto, { estado: "acierto" });
        cuadro.remove();
        obj.style.opacity = "";
    }

    /* ── Demostración (muestra que no es un reto real) ────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const id = gameConfig.demo && gameConfig.demo.muestra;
        if (!id || !material(id).img) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        if (window.PedniaTutorial) await PedniaTutorial.activarDemo();
        else document.body.classList.add("demo-activa");
        limpiarEscena();
        if (esTaller()) prepararObjeto(null);
        pintarMuestras([id]);
        const t = textos();
        await sleep(450);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const card = cartaDe(id);
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        if (card && window.PedniaTutorial) {
            const r = card.getBoundingClientRect();
            const x0 = r.left + r.width * 0.25;
            const y0 = r.top + r.height * 0.45;
            const dx = r.width * 0.5;
            const dur = 1400;
            let iv = null;
            await PedniaTutorial.animarMano({
                punto: { x: x0, y: y0 },
                holdMs: 300,
                arrastre: { dx: dx, dy: 0, durMs: dur },
                cancelado: cancelado,
                onPresionar: function () {
                    card.classList.add("is-demo-target");
                    const t0 = performance.now();
                    tocarMuestra(card, x0, y0, { inicio: true });
                    iv = setInterval(function () {
                        const k = Math.min(1, (performance.now() - t0) / dur);
                        tocarMuestra(card, x0 + dx * k, y0, { dx: 1 });
                        if (k >= 1) { clearInterval(iv); quitarTocando(); }
                    }, 90);
                },
                onSoltar: function () { clearInterval(iv); quitarTocando(); }
            });
            clearInterval(iv);
            quitarTocando();
            if (!cancelado()) {
                await PedniaTutorial.animarMano({
                    punto: card,
                    holdMs: 500,
                    cancelado: cancelado,
                    onPresionar: function () {
                        card.classList.add("elegida");
                        efecto("magia");
                        const c = centroDe(card);
                        particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 90 });
                    }
                });
            }
        }
        if (!vivo(gen) || !demoActiva) return;
        if (card) card.classList.remove("is-demo-target");
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        const ce = nivelElegido.cierreEscena || { tipo: "caja", titulo: "" };
        const capa = $id("gran-final");
        capa.innerHTML = "";
        capa.className = "gran-final final-" + ce.tipo;
        capa.hidden = false;
        const titulo = document.createElement("h2");
        titulo.className = "gran-final-titulo";
        titulo.textContent = ce.titulo;
        capa.appendChild(titulo);
        const escena = document.createElement("div");
        escena.className = "gran-final-escena";
        capa.appendChild(escena);
        void capa.offsetWidth;
        capa.classList.add("visible");
        efecto("fanfarria");

        if (ce.tipo === "caja") await finalCaja(escena);
        else await finalExposicion(escena);

        await new Promise(function (resolve) {
            const t = setTimeout(resolve, 5500);
            capa.addEventListener("pointerdown", function () { clearTimeout(t); resolve(); }, { once: true });
        });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Zoe y Zeus abren la Caja Sensorial Mágica y salen las texturas descubiertas. */
    async function finalCaja(escena) {
        const zoe = crearImg("../../../img/zoe_normal.gif", "gf-personaje");
        const zeus = crearImg("../../../img/zeus_normal.gif", "gf-personaje");
        const caja = document.createElement("div");
        caja.className = "caja-sensorial";
        const cuerpo = crearImg(IMG.cajaCuerpo, "caja-cuerpo");
        const tapa = crearImg(IMG.cajaTapa, "caja-tapa");
        caja.appendChild(cuerpo);
        caja.appendChild(tapa);
        escena.appendChild(zoe);
        escena.appendChild(caja);
        escena.appendChild(zeus);
        await sleep(800);
        tapa.classList.add("abierta");
        efecto("abrir");
        const c = centroDe(caja);
        particulas(c.x, c.y - 40, { n: 20, tipo: "estrella", dist: 160 });
        const ids = nivelElegido.retos.map(function (r) { return r.correcta; });
        const dxs = [-150, 0, 150];
        for (let i = 0; i < ids.length; i++) {
            await sleep(280);
            const img = crearImg(material(ids[i]).img, "sale");
            caja.insertBefore(img, cuerpo);
            efecto("magia");
            animar(img, [
                { transform: "translate(0, 60px) scale(.3)", opacity: 0 },
                { transform: "translate(" + dxs[i % 3] + "px, -130px) scale(1.2)", opacity: 1 }
            ], { duration: 800, easing: "cubic-bezier(.3,1.4,.5,1)" });
        }
        await sleep(900);
    }

    /** Exposición: sillón acolchado, mesa pulida y cuadro de corteza terminados en el taller. */
    async function finalExposicion(escena) {
        const puestos = [
            '<div class="obj obj-sillon"><img class="obj-base" src="' + IMG.sillon + '" alt="">' +
            '<div class="funda" style="--relleno:1"><img src="' + IMG.cojin + '" alt=""></div></div>',
            '<div class="obj obj-mesa"><img class="obj-base" src="' + IMG.mesa + '" alt="">' +
            '<div class="tablero pulida"><img src="' + IMG.mapa + '" alt=""></div></div>',
            '<div class="cuadro colgado"><img src="' + IMG.crayon + '" alt=""></div>'
        ];
        for (let i = 0; i < puestos.length; i++) {
            const p = document.createElement("div");
            p.className = "puesto";
            p.innerHTML = puestos[i];
            escena.appendChild(p);
            efecto("ding");
            animar(p, [
                { transform: "translateY(60px) scale(.7)", opacity: 0 },
                { transform: "none", opacity: 1 }
            ], { duration: 600, easing: "cubic-bezier(.3,1.4,.5,1)" });
            const c = centroDe(p);
            particulas(c.x, c.y, { n: 10, tipo: "brillo", dist: 120 });
            await sleep(650);
        }
        await sleep(600);
    }

    function prepararPremio() {
        const premio = nivelElegido.premio || {};
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector("img.trofeo");
        if (!trofeo) return;
        trofeo.style.display = "none";
        const caja = document.createElement("div");
        caja.className = "trofeo premio";
        caja.innerHTML =
            '<i class="premio-icono fa-solid fa-medal"></i>' +
            '<span class="premio-textos"><span class="premio-titulo"></span><strong class="premio-nombre"></strong></span>';
        caja.querySelector(".premio-titulo").textContent = premio.titulo;
        caja.querySelector(".premio-nombre").textContent = premio.nombre;
        contenido.appendChild(caja);
    }

    function mostrarCierre() {
        const cierre = nivelElegido.cierre || { voz: "zoe", texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) {
            texto.textContent = cierre.texto;
            texto.classList.toggle("largo", cierre.texto.length > 60);
        }
        prepararPremio();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe");
        setTimeout(function () {
            const caja = $id("final");
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") {
                iniciarSecuenciaVictoria();
            } else if (typeof iniciarVictoria === "function") {
                iniciarVictoria();
            }
        }, 400);
    }

    /* ── Boot ─────────────────────────────────────────────────── */

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EncuentraLaTextura] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarMuestras();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        const btnOmitirIntro = $id("btn-omitir-intro3d");
        if (btnOmitirIntro) {
            btnOmitirIntro.addEventListener("click", omitirIntro3d);
        }
        const btnContinuarIntro = $id("btn-continuar-intro3d");
        if (btnContinuarIntro) {
            btnContinuarIntro.addEventListener("click", function (ev) {
                ev.preventDefault();
                empezarJuegoTrasIntro();
            });
        }
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);

        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
            }
        });
    });
})();
