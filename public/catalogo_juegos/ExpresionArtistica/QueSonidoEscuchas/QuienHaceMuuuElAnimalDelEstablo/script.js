/* Sonidos de la Naturaleza y Animales — ¿Qué sonido escuchas? (EA) */
(function () {
    "use strict";

    const L = window.QueSonidoArteLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const COLORES_PISTA = ["#00e5ff", "#ff4081", "#ffd740", "#69f0ae"];
    const VOLUMEN_FONDO_ESCUCHA = 0;
    const BARRAS_EQ = 9;
    const UMBRAL_ARRASTRE = 12;
    const MARGEN_BOCINA = 40;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let objetivo = null;
    let capas = [];
    let activas = [];
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let tokenSonido = 0;
    let tokenIntento = 0;
    let ultimoError = null;
    let erroresReto = 0;
    let demoActiva = false;
    let opcionesActivas = false;
    let pistaSonando = null;
    let audiosPista = [];
    let cortarPista = null;
    let esperaToque = null;
    let gesto = null;
    let suprimirClick = false;
    let ayuda = { timer: null, fn: null, ms: 0 };
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
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function escenaUrl(id) { return (gameConfig.escenas || {})[id] || ""; }
    function esEstudio() { return !!nivelElegido && nivelElegido.tema === "estudio"; }
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

    function rutasSonidos() {
        return (gameConfig.audios && gameConfig.audios.sonidos) || {};
    }

    function urlsImagenesCriticas() {
        const urls = ["img/bocina.svg"];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) {
            const e = gameConfig.elementos[id];
            urls.push(e.img);
            (e.fotogramas || []).forEach(function (f) { urls.push(f); });
        });
        Object.keys(gameConfig.escenas || {}).forEach(function (id) { urls.push(gameConfig.escenas[id]); });
        (gameConfig.niveles || []).forEach(function (n) { if (n.insignia) urls.push(n.insignia.img); });
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
        const rutas = rutasSonidos();
        const audios = [
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ].concat(Object.keys(rutas).map(function (k) { return rutas[k]; }));
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin].filter(Boolean);
    }

    /** En kiosco la edad ya se conoce al cargar; en la vista previa se elige después de la intro. */
    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        const edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }

    function conversacionInicial() {
        const nivel = nivelDeSesion();
        return (nivel && nivel.bienvenida) || textos().conversacion || [];
    }

    function aplicarTema(tema) {
        const estudio = tema === "estudio";
        document.body.classList.toggle("tema-estudio", estudio);
        document.body.classList.toggle("tema-bosque", !estudio);
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};

        const conversacion = conversacionInicial();
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};

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
                texto: TextoVoz.textoPlano(linea.texto)
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
        if (cerrado) return;
        const root = $id("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
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
        if (window.QueSonidoArteSfx) QueSonidoArteSfx.desbloquear();
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

    function crearImg(src, clase) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.draggable = false;
        if (clase) img.className = clase;
        return img;
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = o.n || 14;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            if (o.tipo === "nota") {
                p.innerHTML = '<i class="fa-solid fa-music" aria-hidden="true"></i>';
                if (o.colores) p.style.color = o.colores[i % o.colores.length];
            } else if (o.colores) {
                p.style.background = o.colores[i % o.colores.length];
            }
            p.style.left = x + (o.dispersionX ? (Math.random() - 0.5) * o.dispersionX : 0) + "px";
            p.style.top = y + (o.dispersionY ? (Math.random() - 0.5) * o.dispersionY : 0) + "px";
            capa.appendChild(p);
            const ang = o.angulo != null
                ? o.angulo + (Math.random() - 0.5) * (o.abanico != null ? o.abanico : 1)
                : Math.random() * Math.PI * 2;
            const dist = (o.dist || 90) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            const rot = o.tipo === "nota" ? Math.round((Math.random() - 0.5) * 50) : Math.round(Math.random() * 360);
            animar(p, [
                { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) rotate(" + rot + "deg) scale(.35)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    function reiniciarClase(el, clase, ms) {
        if (!el) return;
        el.classList.remove(clase);
        void el.offsetWidth;
        el.classList.add(clase);
        clearTimeout(el["_t_" + clase]);
        el["_t_" + clase] = setTimeout(function () { el.classList.remove(clase); }, ms || 600);
    }

    /** Cambia una de dos imágenes superpuestas con un fundido (fondo o monitor de la consola). */
    function fundirCapa(selector, url) {
        const imgs = Array.prototype.slice.call(document.querySelectorAll(selector));
        if (imgs.length < 2) return;
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        if (!url) {
            imgs.forEach(function (i) { i.classList.remove("activa"); });
            return;
        }
        if (actual.getAttribute("src") === url && actual.classList.contains("activa")) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        let hecho = false;
        const mostrar = function () {
            if (hecho) return;
            hecho = true;
            sig.classList.add("activa");
            actual.classList.remove("activa");
        };
        sig.onload = mostrar;
        sig.src = url;
        setTimeout(mostrar, 500);
    }

    /** 3-4: la escena cubre la pantalla. 5-6: el estudio queda de fondo y la escena va en el monitor. */
    function cambiarEscena(id) {
        if (esEstudio()) {
            fundirCapa("#consola-monitor .monitor-capa", escenaUrl(id));
            $id("consola").dataset.modo = id || "";
        } else {
            fundirCapa("#escena-fondo .escena-capa", escenaUrl(id));
        }
    }

    /* ── Sonido y voz ─────────────────────────────────────────── */

    function efecto(nombre, arg) {
        if (!nombre) return;
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const ruta = efectos[nombre];
        if (ruta) {
            const a = reproducirAudio(ruta, 0.85, false);
            if (a) setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, 3000);
            return;
        }
        if (window.QueSonidoArteSfx) QueSonidoArteSfx.sonar(nombre, arg);
    }

    function botonEscucha() {
        return esEstudio() ? $id("btn-maestro") : $id("btn-escaner");
    }

    function marcarSonando(si) {
        $id("btn-escaner").classList.toggle("sonando", !!si && !esEstudio());
        $id("btn-maestro").classList.toggle("sonando", !!si && esEstudio());
        $id("consola").classList.toggle("sonando", !!si);
        actualizarPistas();
    }

    function detenerSonido() {
        tokenSonido += 1;
        audiosPista.forEach(function (a) {
            clearTimeout(a._inicio);
            try { a.pause(); } catch (e) { /* noop */ }
        });
        audiosPista = [];
        pistaSonando = null;
        if (window.QueSonidoArteSfx) QueSonidoArteSfx.detener();
        if (cortarPista) {
            const r = cortarPista;
            cortarPista = null;
            r();
        }
        marcarSonando(false);
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    }

    /**
     * Suena la pista del reto: una capa por sonido (grabación de config.audios.sonidos o síntesis),
     * cada una encendida o pausada según `activas`, con la música de fondo atenuada.
     * Resuelve cuando termina o cuando se interrumpe.
     */
    function reproducirPista(lista, o) {
        o = o || {};
        detenerSonido();
        const token = tokenSonido;
        const act = o.activas || lista.map(function () { return true; });
        marcarSonando(true);
        TextoVoz.volumenFondo(Math.min(VOLUMEN_FONDO_ESCUCHA, TextoVoz.VOLUMEN_FONDO));
        const rutas = rutasSonidos();
        const sinteticas = [];
        const grabadas = [];
        lista.forEach(function (c, i) { (rutas[c.sonido] ? grabadas : sinteticas).push(i); });

        const sfx = window.QueSonidoArteSfx;
        const ctl = sfx && sinteticas.length
            ? sfx.reproducirCapas(sinteticas.map(function (i) {
                return { nombre: lista[i].sonido, retraso: lista[i].retrasoMs / 1000, activa: act[i] };
            }), { breve: o.breve })
            : { duracion: 0, activar: function () {} };
        const esperas = [sleep(Math.max(300, ctl.duracion * 1000))];

        audiosPista = grabadas.map(function (i) {
            const c = lista[i];
            const a = new Audio(rutas[c.sonido]);
            a.volume = act[i] ? 1 : 0;
            esperas.push(new Promise(function (resolve) {
                a.addEventListener("ended", resolve, { once: true });
                a.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, c.retrasoMs + (o.breve ? 1300 : 9000));
            }));
            a._inicio = setTimeout(function () {
                const p = a.play();
                if (p && p.catch) p.catch(function () {});
            }, c.retrasoMs);
            return a;
        });

        pistaSonando = {
            activar: function (i, on) {
                const k = sinteticas.indexOf(i);
                if (k !== -1) ctl.activar(k, on);
                const g = grabadas.indexOf(i);
                if (g !== -1 && audiosPista[g]) audiosPista[g].volume = on ? 1 : 0;
            }
        };
        const corte = new Promise(function (resolve) { cortarPista = resolve; });
        return Promise.race([Promise.all(esperas), corte]).then(function () {
            if (token !== tokenSonido) return;
            cortarPista = null;
            audiosPista.forEach(function (a) { try { a.pause(); } catch (e) { /* noop */ } });
            audiosPista = [];
            pistaSonando = null;
            marcarSonando(false);
            TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        });
    }

    function capasDeElemento(id) {
        const s = elemento(id).sonido;
        return s ? [{ sonido: s, principal: true, retrasoMs: 0 }] : [];
    }

    function reproducirElemento(id, o) {
        return reproducirPista(capasDeElemento(id), o);
    }

    /** Concierto: el sonido del elemento sin cortar la base rítmica ni a los demás. */
    function tocarElemento(id, maxMs) {
        const s = elemento(id).sonido;
        if (!s) return;
        const ruta = rutasSonidos()[s];
        if (ruta) {
            const a = new Audio(ruta);
            a.volume = 0.8;
            const p = a.play();
            if (p && p.catch) p.catch(function () {});
            setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, maxMs);
            return;
        }
        if (window.QueSonidoArteSfx) QueSonidoArteSfx.tocar(s, { maxDur: maxMs / 1000, vol: 0.7 });
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto");
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
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
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
            sumar(r.consigna);
            sumar(r.pregunta);
            sumar(r.acierto);
            sumar(r.error);
        });
        (nivel.cierre || []).forEach(sumar);
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
        detenerSonido();
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
        aplicarTema(nivelElegido.tema);
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("btn-escaner").hidden = esEstudio();
        $id("consola").hidden = !esEstudio();
        $id("opciones").innerHTML = "";
        fundirCapa("#escena-fondo .escena-capa", escenaUrl(nivelElegido.escena));
        fundirCapa("#consola-monitor .monitor-capa", "");
        $id("consola").dataset.modo = "";
        capas = [];
        activas = [];
        pintarPistas(false);
        habilitarEscuchar(false);
        pintarProgreso(-1);
    }

    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = (nivelElegido.retos || []).length;
        if (cont.children.length !== total) {
            cont.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const p = document.createElement("span");
                p.className = "progreso-punto";
                p.innerHTML = '<i class="fa-solid fa-music" aria-hidden="true"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }

    function habilitarEscuchar(si) {
        [$id("btn-escaner"), $id("btn-maestro")].forEach(function (btn) {
            const usar = !!si && btn === botonEscucha();
            btn.disabled = !usar;
            btn.classList.toggle("bloqueado", !usar);
            if (!usar) btn.classList.remove("invita");
        });
    }

    function crearBarrasEq() {
        const eq = $id("eq");
        eq.innerHTML = "";
        for (let i = 0; i < BARRAS_EQ; i++) eq.appendChild(document.createElement("span"));
    }

    /* Pistas de la consola (5-6): una por capa, con color propio y sin revelar qué suena */

    function pintarPistas(habilitadas) {
        const cont = $id("pistas");
        cont.innerHTML = "";
        capas.forEach(function (c, i) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pista";
            b.dataset.i = String(i);
            b.style.setProperty("--pista-color", COLORES_PISTA[i % COLORES_PISTA.length]);
            b.setAttribute("aria-label", "Pista " + (i + 1));
            b.disabled = !habilitadas;
            b.innerHTML =
                '<i class="fa-solid fa-wave-square" aria-hidden="true"></i>' +
                '<span class="pista-eq" aria-hidden="true"><i></i><i></i><i></i></span>' +
                '<i class="fa-solid fa-volume-high pista-estado" aria-hidden="true"></i>';
            cont.appendChild(b);
        });
        actualizarPistas();
    }

    function actualizarPistas() {
        const sonando = $id("consola").classList.contains("sonando");
        Array.prototype.forEach.call($id("pistas").children, function (b, i) {
            const on = activas[i] !== false;
            b.classList.toggle("apagada", !on);
            b.classList.toggle("sonando", sonando && on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
            const estado = b.querySelector(".pista-estado");
            if (estado) estado.className = "fa-solid pista-estado " + (on ? "fa-volume-high" : "fa-volume-xmark");
        });
    }

    function puedeTocarPistas() {
        return !!reto && !demoActiva && !juegoTerminado
            && ["presentacion", "escuchando", "jugar", "error"].indexOf(fase) !== -1;
    }

    /** Activa o pausa una capa; si la pista está sonando el cambio se oye en el acto. */
    function alternarPista(i) {
        if (!puedeTocarPistas() || i < 0 || i >= capas.length) return;
        activas[i] = activas[i] === false;
        if (pistaSonando) pistaSonando.activar(i, activas[i]);
        efecto("pop");
        actualizarPistas();
    }

    function enlazarPistas() {
        $id("pistas").addEventListener("click", function (ev) {
            const b = ev.target.closest(".pista");
            if (!b || b.disabled) return;
            alternarPista(Number(b.dataset.i));
        });
    }

    /* Escuchar: bocina (3-4) o botón maestro (5-6) */

    function alTocarEscucha() {
        if (fase === "esperaToque" && esperaToque) {
            const resolver = esperaToque;
            esperaToque = null;
            reiniciarClase(botonEscucha(), "pulsa", 500);
            resolver();
            return;
        }
        escucharOtraVez();
    }

    /** Toque del botón grande: vuelve a escuchar la pista del reto con las capas encendidas. */
    async function escucharOtraVez() {
        if (!reto || juegoTerminado || demoActiva || (fase !== "jugar" && fase !== "error")) return;
        const gen = rondaGen;
        tokenIntento += 1;
        fase = "escuchando";
        cancelarAyuda();
        tokenDialogo += 1;
        TextoVoz.detener();
        const btn = botonEscucha();
        btn.classList.remove("invita");
        reiniciarClase(btn, "pulsa", 500);
        activas = L.normalizarActivas(capas, activas);
        actualizarPistas();
        await reproducirPista(capas, { activas: activas });
        if (!vivo(gen) || fase !== "escuchando") return;
        fase = "jugar";
        programarAyuda(ayudaEscuchar, 8000);
    }

    /** Reto 1 (3-4): el sonido secreto solo suena cuando el niño toca la bocina. */
    function esperarToque() {
        return new Promise(function (resolve) {
            esperaToque = resolve;
            habilitarEscuchar(true);
            botonEscucha().classList.add("invita");
            programarAyuda(ayudaToque, 7000);
        });
    }

    /* Tarjetas (sin nombre escrito) */

    function crearOpcion(id) {
        const e = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcion";
        b.dataset.id = id;
        b.setAttribute("aria-label", e.nombre || id);
        b.appendChild(crearImg(e.img, "opcion-img"));
        return b;
    }

    function opcionDe(id) {
        return $id("opciones").querySelector('.opcion[data-id="' + id + '"]');
    }

    async function llegarOpciones(lista) {
        const cont = $id("opciones");
        cont.innerHTML = "";
        const els = lista.map(function (id) {
            const b = crearOpcion(id);
            cont.appendChild(b);
            return b;
        });
        efecto("pop");
        await Promise.all(els.map(function (b, i) {
            return animar(b, [
                { transform: "translateY(60px) scale(.6)", opacity: 0 },
                { transform: "translateY(-6px) scale(1.04)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 480, delay: i * 120, easing: "ease-out", fill: "backwards" });
        }));
    }

    async function retirarOpciones() {
        const els = Array.prototype.slice.call($id("opciones").children);
        await Promise.all(els.map(function (b) {
            return animar(b, [{ opacity: 1 }, { opacity: 0, transform: "translateY(40px) scale(.7)" }], { duration: 360 });
        }));
        $id("opciones").innerHTML = "";
    }

    /**
     * Se puede responder mientras el sonido aún suena (el niño suele tocar la imagen al reconocerlo)
     * y durante la frase de error, salvo repetir la misma opción equivocada.
     */
    function puedeResponder(el) {
        if (!opcionesActivas || demoActiva || juegoTerminado || !reto) return false;
        if (fase === "error") return el !== ultimoError;
        return fase === "jugar" || fase === "escuchando";
    }

    /* Arrastre (3-4): soltar la tarjeta sobre la bocina cuenta como elegirla */

    function sobreBocina(x, y) {
        const btn = $id("btn-escaner");
        return !btn.hidden && L.soltoSobre({ x: x, y: y }, btn.getBoundingClientRect(), MARGEN_BOCINA);
    }

    function onOpcionDown(ev) {
        if (!nivelElegido || !nivelElegido.arrastre || gesto) return;
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        const el = ev.target.closest(".opcion");
        if (!el || !puedeResponder(el)) return;
        gesto = { id: ev.pointerId, el: el, x0: ev.clientX, y0: ev.clientY, arrastra: false };
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
    }

    function onOpcionMove(ev) {
        if (!gesto || gesto.id !== ev.pointerId) return;
        const dx = ev.clientX - gesto.x0;
        const dy = ev.clientY - gesto.y0;
        if (!gesto.arrastra) {
            if (Math.hypot(dx, dy) < UMBRAL_ARRASTRE) return;
            gesto.arrastra = true;
            gesto.el.classList.remove("vuelve");
            gesto.el.classList.add("arrastrando");
            cancelarAyuda();
        }
        gesto.el.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.06)";
        $id("btn-escaner").classList.toggle("recibe", sobreBocina(ev.clientX, ev.clientY));
    }

    function onOpcionUp(ev) {
        if (!gesto || gesto.id !== ev.pointerId) return;
        const g = gesto;
        gesto = null;
        $id("btn-escaner").classList.remove("recibe");
        if (!g.arrastra) return;
        suprimirClick = true;
        setTimeout(function () { suprimirClick = false; }, 400);
        const el = g.el;
        el.classList.remove("arrastrando");
        el.classList.add("vuelve");
        el.style.transform = "";
        setTimeout(function () { el.classList.remove("vuelve"); }, 350);
        if (ev.type !== "pointercancel" && sobreBocina(ev.clientX, ev.clientY) && puedeResponder(el)) intentar(el);
        else if (fase === "jugar") programarAyuda(ayudaEscuchar, 8000);
    }

    function enlazarOpciones() {
        const cont = $id("opciones");
        cont.addEventListener("click", function (ev) {
            if (suprimirClick) {
                suprimirClick = false;
                return;
            }
            const el = ev.target.closest(".opcion");
            if (!el || !puedeResponder(el)) return;
            intentar(el);
        });
        cont.addEventListener("pointerdown", onOpcionDown);
        cont.addEventListener("pointermove", onOpcionMove);
        cont.addEventListener("pointerup", onOpcionUp);
        cont.addEventListener("pointercancel", onOpcionUp);
        cont.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    }

    /* ── Ayuda sin voz tras inactividad ───────────────────────── */

    function cancelarAyuda() {
        clearTimeout(ayuda.timer);
        ayuda = { timer: null, fn: null, ms: 0 };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarAyuda(fn, ms) {
        clearTimeout(ayuda.timer);
        ayuda.fn = fn;
        ayuda.ms = ms;
        ayuda.timer = setTimeout(function () {
            if (ayuda.fn !== fn) return;
            Promise.resolve(fn()).then(function () {
                if (ayuda.fn === fn) programarAyuda(fn, Math.max(ms, 8000) + 2000);
            });
        }, ms);
    }

    /** La mano toca el botón de escuchar y la pista vuelve a sonar (no revela la respuesta). */
    function ayudaEscuchar() {
        const btn = botonEscucha();
        if (!window.PedniaTutorial || fase !== "jugar") return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: function () { return ayuda.fn !== fn || fase !== "jugar"; },
            onPresionar: function () {
                if (!L.objetivoAudible(capas, activas)) {
                    activas = capas.map(function () { return true; });
                    actualizarPistas();
                }
                escucharOtraVez();
            }
        });
    }

    function ayudaToque() {
        const btn = botonEscucha();
        if (!window.PedniaTutorial || fase !== "esperaToque") return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: function () { return ayuda.fn !== fn || fase !== "esperaToque"; },
            onPresionar: alTocarEscucha
        });
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
        const r = reto;
        fase = "presentacion";
        erroresReto = 0;
        ultimoError = null;
        opcionesActivas = false;
        objetivo = r.correcto;
        capas = L.capasDe(r, gameConfig.elementos);
        activas = capas.map(function () { return true; });
        cancelarAyuda();
        pintarProgreso(indiceReto);
        pintarPistas(true);
        habilitarEscuchar(false);
        cambiarEscena(r.escena);
        const sigue = function () {
            return vivo(gen) && reto === r && (fase === "presentacion" || fase === "esperaToque");
        };

        await sleep(600);
        if (!sigue()) return;
        await decir(r.consigna);
        if (!sigue()) return;

        if (r.esperaToque) {
            fase = "esperaToque";
            await esperarToque();
            if (!sigue()) return;
            cancelarAyuda();
            fase = "presentacion";
            habilitarEscuchar(false);
        }

        await reproducirPista(capas, { activas: activas });
        if (!sigue()) return;
        if (r.pregunta) await decir(r.pregunta);
        if (!sigue()) return;

        await llegarOpciones(L.mezclar(r.opciones));
        if (!sigue()) return;
        opcionesActivas = true;
        fase = "jugar";
        habilitarEscuchar(true);
        programarAyuda(ayudaEscuchar, 8000);
    }

    async function intentar(el) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const id = el.dataset.id;
        fase = "animando";
        cancelarAyuda();
        tokenDialogo += 1;
        TextoVoz.detener();
        detenerSonido();
        reiniciarClase(el, "toca", 450);
        botonEscucha().classList.remove("invita");
        if (id === objetivo) {
            opcionesActivas = false;
            habilitarEscuchar(false);
            el.classList.remove("resalta");
            el.classList.add("correcta");
            Array.prototype.forEach.call($id("opciones").children, function (b) {
                if (b !== el) b.classList.add("apagada");
            });
            await responderAcierto(el);
            if (!vivo(gen)) return;
            await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }
        erroresReto += 1;
        ultimoError = el;
        fase = "error";
        await responderError(el);
        if (!sigue()) return;
        if (erroresReto >= 3) {
            const t = opcionDe(objetivo);
            if (t) t.classList.add("resalta");
        }
        await decir(reto.error);
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(true);
        botonEscucha().classList.add("invita");
        programarAyuda(ayudaEscuchar, 8000);
    }

    async function completarReto(gen) {
        fase = "completo";
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        celebrarPersonajes(false);
        await retirarOpciones();
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Respuestas ───────────────────────────────────────────── */

    function celebrarPersonajes(si) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            const pj = $id(id);
            if (!pj) return;
            pj.classList.toggle("celebra", !!si);
            if (si) reiniciarClase(pj, "baila", 1400);
        });
    }

    function fotogramasDe(id) {
        const e = elemento(id);
        return [e.img].concat(e.fotogramas || []);
    }

    function ponerFotograma(el, i) {
        const img = el && el.querySelector("img");
        const frames = fotogramasDe(el.dataset.id);
        if (img && frames.length) img.src = frames[i % frames.length];
    }

    async function parpadearFotogramas(el, veces, ms) {
        for (let i = 1; i <= veces * 2; i++) {
            ponerFotograma(el, i);
            await sleep(ms);
        }
        ponerFotograma(el, 0);
    }

    /** Una copia de la tarjeta sale disparada hasta salir de la pantalla. */
    function cruzarPantalla(el, o) {
        o = o || {};
        const img = el.querySelector("img");
        const r = img.getBoundingClientRect();
        const clon = crearImg(img.getAttribute("src"), "vehiculo-cruza" + (o.luz ? " con-luz" : ""));
        clon.style.left = r.left + "px";
        clon.style.top = r.top + "px";
        clon.style.width = r.width + "px";
        clon.style.height = r.height + "px";
        $id("capa-efectos").appendChild(clon);
        let parpadeo = null;
        if (o.fotogramas && o.fotogramas.length > 1) {
            let k = 0;
            parpadeo = setInterval(function () { k += 1; clon.src = o.fotogramas[k % o.fotogramas.length]; }, 220);
        }
        el.style.visibility = "hidden";
        const dir = o.direccion < 0 ? -1 : 1;
        const lejos = dir > 0 ? window.innerWidth - r.left + 40 : -(r.right + 40);
        return animar(clon, [
            { transform: "translateX(0) scale(1)" },
            { transform: "translateX(" + (-dir * 30) + "px) scale(1.08)", offset: 0.18 },
            { transform: "translateX(" + lejos + "px) scale(1.15)" }
        ], { duration: o.ms || 1400, easing: "cubic-bezier(.5,0,.75,0)" }).then(function () {
            clearInterval(parpadeo);
            clon.remove();
            el.style.visibility = "";
        });
    }

    /** Se abre la llave y caen gotitas luminosas que suenan como notas al tocar el lavabo. */
    async function gotasDeLaLlave(el) {
        const img = el.querySelector("img");
        const r = img.getBoundingClientRect();
        const salida = { x: r.left + r.width * 0.367, y: r.top + r.height * 0.5 };
        const lavabo = r.top + r.height * 0.75;
        const capa = $id("capa-efectos");
        const n = 12;
        const caidas = [];
        for (let i = 0; i < n; i++) {
            const g = document.createElement("span");
            g.className = "gota-luz";
            g.style.left = salida.x + (Math.random() - 0.5) * 8 + "px";
            g.style.top = salida.y + "px";
            capa.appendChild(g);
            caidas.push(animar(g, [
                { transform: "translateY(0) scale(.6)", opacity: 0 },
                { transform: "translateY(4px) scale(1)", opacity: 1, offset: 0.15 },
                { transform: "translateY(" + (lavabo - salida.y) + "px) scale(1)", opacity: 1 }
            ], { duration: 460, delay: i * 180, easing: "ease-in", fill: "backwards" }).then(function () {
                g.remove();
                efecto("gota", i);
                const onda = document.createElement("span");
                onda.className = "onda-lavabo";
                onda.style.left = salida.x + "px";
                onda.style.top = lavabo + "px";
                capa.appendChild(onda);
                animar(onda, [{ transform: "scale(.4)", opacity: 1 }, { transform: "scale(2.2)", opacity: 0 }], { duration: 520 })
                    .then(function () { onda.remove(); });
                if (i % 3 === 0) particulas(salida.x, lavabo - 10, { n: 2, tipo: "nota", dist: 90, angulo: -Math.PI / 2, abanico: 1.6, colores: COLORES_FIESTA, ms: 1100 });
            }));
        }
        await Promise.all(caidas);
    }

    /** Un rayo brillante cruza el panel de la consola. */
    async function rayoEnConsola() {
        const consola = $id("consola");
        const r = consola.getBoundingClientRect();
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", "rayo");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.style.left = r.left + "px";
        svg.style.top = r.top + "px";
        svg.style.width = r.width + "px";
        svg.style.height = r.height + "px";
        const puntos = [];
        for (let i = 0; i <= 8; i++) puntos.push((i * 12.5) + "," + (i % 2 ? 20 + Math.random() * 20 : 55 + Math.random() * 25));
        const linea = document.createElementNS(ns, "polyline");
        linea.setAttribute("points", puntos.join(" "));
        linea.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(linea);
        const flash = document.createElement("div");
        flash.className = "destello-pantalla";
        const capa = $id("capa-efectos");
        capa.appendChild(flash);
        capa.appendChild(svg);
        reiniciarClase(consola, "relampaguea", 900);
        await Promise.all([
            animar(svg, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.2, offset: 0.25 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 900 }),
            animar(flash, [{ opacity: 0 }, { opacity: 0.55, offset: 0.12 }, { opacity: 0, offset: 0.3 }, { opacity: 0.35, offset: 0.45 }, { opacity: 0 }], { duration: 900 })
        ]);
        svg.remove();
        flash.remove();
    }

    async function responderAcierto(el) {
        const a = reto.acierto || {};
        const c = centroDe(el);
        switch (a.efecto) {
            case "vaca": {
                reiniciarClase(el, "salta", 1100);
                particulas(c.x, c.y - 40, { n: 12, tipo: "corazon", dist: 150, angulo: -Math.PI / 2, abanico: 2.2, ms: 1400 });
                await reproducirElemento(objetivo, { breve: true });
                efecto("recompensa");
                particulas(c.x, c.y - 40, { n: 8, tipo: "corazon", dist: 120, angulo: -Math.PI / 2, abanico: 2, ms: 1200 });
                await sleep(600);
                break;
            }
            case "grifo": {
                ponerFotograma(el, 1);
                reproducirElemento(objetivo, { breve: true });
                await gotasDeLaLlave(el);
                efecto("recompensa");
                await sleep(400);
                break;
            }
            case "ambulancia": {
                el.classList.add("luz-emergencia");
                const sirena = reproducirElemento(objetivo, { breve: true });
                await parpadearFotogramas(el, 2, 220);
                await cruzarPantalla(el, { direccion: 1, luz: true, fotogramas: fotogramasDe(objetivo), ms: 1500 });
                el.classList.remove("luz-emergencia");
                await sirena;
                break;
            }
            case "tren": {
                const consola = $id("consola");
                consola.classList.add("brillo-verde");
                efecto("silbato");
                await cruzarPantalla(el, { direccion: -1, ms: 1300 });
                efecto("recompensa");
                await sleep(500);
                consola.classList.remove("brillo-verde");
                break;
            }
            case "buho": {
                el.classList.add("brillo-dorado");
                const huu = reproducirElemento(objetivo, { breve: true });
                await parpadearFotogramas(el, 4, 260);
                ponerFotograma(el, 1);
                await huu;
                efecto("chispas");
                particulas(c.x, c.y - 30, { n: 14, tipo: "estrella", dist: 150, colores: ["#ffd54f", "#ffe082", "#fff59d"] });
                await sleep(600);
                el.classList.remove("brillo-dorado");
                break;
            }
            case "rayo": {
                efecto("rayo");
                await rayoEnConsola();
                reiniciarClase(el, "salta", 1100);
                particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 180, colores: ["#fff59d", "#ffd600", "#ffffff"] });
                await sleep(900);
                break;
            }
            default: {
                reiniciarClase(el, "salta", 1100);
                efecto("celebracion");
                particulas(c.x, c.y, { n: 22, tipo: "estrella", dist: 200, colores: COLORES_FIESTA });
                await sleep(1100);
            }
        }
    }

    /**
     * La tarjeta se estremece suavemente. En la consola (5-6) la pista se pausa
     * con un zumbido suave; en el bosque (3-4) no hay sonido negativo.
     */
    async function responderError(el) {
        reiniciarClase(el, "tiembla", 650);
        if (esEstudio()) {
            efecto("zumbido");
            reiniciarClase($id("consola"), "pausada", 700);
        }
        await sleep(600);
    }

    /* ── Demostración (con un elemento que no está en ningún reto) ── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const el0 = elemento(d.elemento);
        if (!el0.img || !el0.sonido || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        const t = textos();
        capas = capasDeElemento(d.elemento);
        activas = [true];
        pintarPistas(false);
        habilitarEscuchar(true);
        await llegarOpciones([d.elemento]);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const btn = botonEscucha();
        let sonando = Promise.resolve();
        await PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(btn, "pulsa", 500);
                sonando = reproducirPista(capas);
            }
        });
        await sonando;
        if (!vivo(gen) || !demoActiva) return;
        const el = opcionDe(d.elemento);
        await PedniaTutorial.animarMano({
            punto: el,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(el, "toca", 450);
                el.classList.add("correcta");
                reiniciarClase(el, "salta", 1100);
                efecto("recompensa");
                const c = centroDe(el);
                particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        habilitarEscuchar(false);
        await retirarOpciones();
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Concierto final ──────────────────────────────────────── */

    /** Base rítmica: bombo al inicio del compás, caja a mitad y platillo en los demás tiempos. */
    function pulsoBateria(tiempo, tiempos) {
        if (tiempo === 0) efecto("bombo");
        else if (tiempo === Math.floor(tiempos / 2)) efecto("caja");
        else efecto("platillo");
        if (tiempo === tiempos - 1) efecto("bombo");
    }

    function cantar(el) {
        if (!el) return;
        reiniciarClase(el, "canta", 450);
        const r = el.getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top + 10, { n: 2, tipo: "nota", dist: 110, angulo: -Math.PI / 2, abanico: 1.4, colores: COLORES_FIESTA, ms: 1200 });
    }

    /** Todos los elementos descubiertos suenan por turnos sobre el ritmo y el último tiempo es de todos. */
    async function tocarPrograma(gen, prog, items) {
        const t0 = performance.now();
        for (let i = 0; i < prog.golpes.length; i++) {
            const g = prog.golpes[i];
            const espera = g.t - (performance.now() - t0);
            if (espera > 0) await sleep(espera);
            if (gen !== rondaGen) return;
            pulsoBateria(g.tiempo, prog.tiempos);
            if (g.id) {
                tocarElemento(g.id, prog.pulsoMs * 1.6);
                cantar(items[g.id]);
            } else {
                Object.keys(items).forEach(function (id) { cantar(items[id]); });
                efecto("chispas");
            }
        }
        await sleep(prog.pulsoMs);
    }

    /**
     * 5-6: la consola maestra. El niño enciende cada pad y su sonido entra a la mezcla en su tiempo;
     * si no toca, la mano lo ayuda y, como último recurso, se encienden solos.
     */
    function armarMezcla(gen, ids, items, prog) {
        return new Promise(function (resolve) {
            const activos = [];
            let ultimaAccion = performance.now();
            let manoEnCurso = false;
            const tInicio = performance.now();
            const activar = function (id) {
                if (activos.indexOf(id) !== -1 || gen !== rondaGen) return;
                activos.push(id);
                items[id].classList.add("activo");
                tocarElemento(id, 900);
                cantar(items[id]);
                efecto("pop");
                ultimaAccion = performance.now();
                if (window.PedniaTutorial) PedniaTutorial.quitarManos();
            };
            ids.forEach(function (id) {
                items[id].addEventListener("click", function () { activar(id); });
            });
            (async function bucle() {
                for (let b = 0; gen === rondaGen; b++) {
                    const tiempo = b % prog.tiempos;
                    pulsoBateria(tiempo, prog.tiempos);
                    const id = tiempo < ids.length ? ids[tiempo] : null;
                    if (id && activos.indexOf(id) !== -1) {
                        tocarElemento(id, prog.pulsoMs * 1.6);
                        cantar(items[id]);
                    }
                    if (tiempo === prog.tiempos - 1 && activos.length === ids.length) break;
                    const quieto = performance.now() - ultimaAccion;
                    const sig = ids.find(function (i) { return activos.indexOf(i) === -1; });
                    if (sig && !manoEnCurso && quieto > 5000) {
                        if (window.PedniaTutorial) {
                            manoEnCurso = true;
                            PedniaTutorial.animarMano({
                                punto: items[sig],
                                holdMs: 400,
                                cancelado: function () { return activos.indexOf(sig) !== -1 || gen !== rondaGen; },
                                onPresionar: function () { activar(sig); }
                            }).then(function () {
                                manoEnCurso = false;
                                ultimaAccion = performance.now();
                            });
                        } else {
                            activar(sig);
                        }
                    }
                    if (performance.now() - tInicio > 40000) ids.forEach(activar);
                    await sleep(prog.pulsoMs);
                }
                resolve();
            })();
        });
    }

    async function concierto(gen) {
        const conc = nivelElegido.concierto || {};
        const ids = L.elementosConcierto(nivelElegido);
        const prog = L.programaConcierto(ids, conc);
        const mezcla = conc.tipo === "mezcla";
        cambiarEscena(nivelElegido.escena);
        $id("zona-escucha").style.visibility = "hidden";
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        const items = {};
        ids.forEach(function (id) {
            const b = document.createElement(mezcla ? "button" : "div");
            b.className = "concierto-item" + (mezcla ? " pad" : "");
            b.dataset.id = id;
            if (mezcla) {
                b.type = "button";
                b.setAttribute("aria-label", elemento(id).nombre || id);
            }
            b.appendChild(crearImg(elemento(id).img));
            tarima.appendChild(b);
            items[id] = b;
        });
        const caja = $id("concierto");
        caja.hidden = false;
        caja.setAttribute("aria-hidden", "false");
        document.body.classList.add("concierto-activo");
        TextoVoz.volumenFondo(Math.min(VOLUMEN_FONDO_ESCUCHA, TextoVoz.VOLUMEN_FONDO));
        await Promise.all(ids.map(function (id, i) {
            return animar(items[id], [
                { transform: "translateY(80px) scale(.5)", opacity: 0 },
                { transform: "translateY(-8px) scale(1.05)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 520, delay: i * 160, easing: "ease-out", fill: "backwards" });
        }));
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        if (mezcla) await armarMezcla(gen, ids, items, prog);
        if (gen !== rondaGen) return;
        await tocarPrograma(gen, prog, items);
        if (gen !== rondaGen) return;
        efecto("celebracion");
        const r = tarima.getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top, { n: 26, tipo: "confeti", dist: 320, colores: COLORES_FIESTA, gravedad: 80, ms: 1600 });
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        reto = null;
        cancelarAyuda();
        habilitarEscuchar(false);
        detenerSonido();
        capas = [];
        pintarPistas(false);
        await sleep(400);
        if (gen !== rondaGen) return;
        await concierto(gen);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        const lineas = nivelElegido.cierre || [];
        for (let i = 0; i < lineas.length; i++) {
            await decir(lineas[i], { estado: "acierto", minMs: 1200 });
            if (gen !== rondaGen) return;
        }
        mostrarCierre();
    }

    /** Insignia visual (sin texto) en lugar del trofeo; al tocarla gira y suelta chispas. */
    function prepararInsignia() {
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (!ins || !trofeo) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre;
        trofeo.classList.add("insignia");
        trofeo.addEventListener("click", function () {
            const c = centroDe(trofeo);
            trofeo.classList.add("quieta");
            reiniciarClase(trofeo, "gira", 1000);
            efecto("chispas");
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        });
    }

    /** Las frases de cierre ya se dijeron tras el concierto; aquí solo la victoria y la medalla. */
    function mostrarCierre() {
        const primera = (nivelElegido.cierre || [])[0] || { texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = primera.texto;
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        const ins = nivelElegido.insignia || {};
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 3000);
        setTimeout(function () {
            const cajaFinal = $id("final");
            if (cajaFinal) {
                cajaFinal.hidden = false;
                cajaFinal.style.display = "block";
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
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelSesion = nivelDeSesion();
        if (nivelSesion) aplicarTema(nivelSesion.tema);
        fundirCapa("#escena-fondo .escena-capa", escenaUrl((nivelSesion || gameConfig.niveles[0] || {}).escena));

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[QueSonidoEscuchas EA] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        crearBarrasEq();
        enlazarOpciones();
        enlazarPistas();
        $id("btn-escaner").addEventListener("click", alTocarEscucha);
        $id("btn-maestro").addEventListener("click", alTocarEscucha);
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
