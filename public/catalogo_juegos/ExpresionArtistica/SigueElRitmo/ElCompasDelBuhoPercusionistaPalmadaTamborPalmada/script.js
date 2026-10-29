/* Palmada y Tambor — Sigue el ritmo (EA) */
(function () {
    "use strict";

    const L = window.SigueElRitmoLogica;
    const COLORES = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    /** Durante el pulso el fondo se calla del todo para que se oiga el compás. */
    const VOLUMEN_FONDO_RITMO = 0;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let juegoTerminado = false;
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let ayuda = { timer: null, fn: null, ms: 0 };
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;
    let atacar = null;

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

    function promesa() {
        let resolve;
        const p = new Promise(function (r) { resolve = r; });
        return { p: p, resolve: resolve };
    }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function escenaUrl(id) { return (gameConfig.escenas || {})[id] || ""; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.SigueElRitmoSfx || null; }

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
        const urls = ["img/buho.svg", "img/globo.svg"];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) { urls.push(gameConfig.elementos[id].img); });
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
        const rutas = (gameConfig.audios && gameConfig.audios.sonidos) || {};
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
        document.body.classList.toggle("tema-estudio", tema === "estudio");
        document.body.classList.toggle("tema-pista", tema !== "estudio");
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
                if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
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
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        asegurarAudioFondo();
        if (typeof TextoVoz !== "undefined") TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(800);
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: (gameConfig && gameConfig.niveles) || [],
                elegirManual: elegirNivel,
                onElegido: function (nivel) {
                    if (nivel) window.confirmarNivel(nivel.id);
                }
            });
        } else {
            elegirNivel();
        }
    }

    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
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
        const vol = (typeof TextoVoz !== "undefined" && TextoVoz.VOLUMEN_FONDO != null)
            ? TextoVoz.VOLUMEN_FONDO
            : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, vol, true);
    }

    function atenuarFondo(si) {
        if (typeof TextoVoz === "undefined") {
            if (audioFondo) audioFondo.volume = si ? VOLUMEN_FONDO_RITMO : volumenFondoPct() / 100;
            return;
        }
        TextoVoz.volumenFondo(si ? VOLUMEN_FONDO_RITMO : TextoVoz.VOLUMEN_FONDO);
    }

    /* ── Animación ───────────────────────────────────────────── */

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

    function asset(url) {
        if (!url || url.indexOf("?v=") !== -1) return url;
        return url + "?v=20261023c";
    }

    function crearImg(src, clase) {
        const img = document.createElement("img");
        img.src = asset(src);
        img.alt = "";
        img.draggable = false;
        if (clase) img.className = clase;
        return img;
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function reiniciarClase(el, clase, ms) {
        if (!el) return;
        el.classList.remove(clase);
        void el.offsetWidth;
        el.classList.add(clase);
        clearTimeout(el["_t_" + clase]);
        el["_t_" + clase] = setTimeout(function () { el.classList.remove(clase); }, ms || 600);
    }

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        if (!capa) return;
        const n = o.n || 12;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "nota");
            const color = o.colores ? o.colores[i % o.colores.length] : null;
            if (o.tipo === "nota" || !o.tipo) {
                p.innerHTML = '<i class="fa-solid fa-music" aria-hidden="true"></i>';
                if (color) p.style.color = color;
            } else if (color) {
                p.style.background = color;
            }
            p.style.left = x + "px";
            p.style.top = y + "px";
            capa.appendChild(p);
            const ang = Math.random() * Math.PI * 2;
            const dist = (o.dist || 110) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            animar(p, [
                { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(.4)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.5), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    function cambiarEscena(id) {
        const url = escenaUrl(id);
        const imgs = Array.prototype.slice.call(document.querySelectorAll("#escena-fondo .escena-capa"));
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        const destino = asset(url);
        if (!url || !actual) return;
        if (actual.getAttribute("src") === destino && actual.classList.contains("activa")) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        if (!sig) return;
        let hecho = false;
        const mostrar = function () {
            if (hecho) return;
            hecho = true;
            sig.classList.add("activa");
            actual.classList.remove("activa");
        };
        sig.onload = mostrar;
        sig.src = destino;
        setTimeout(mostrar, 500);
    }

    /* ── Sonido ──────────────────────────────────────────────── */

    function efecto(nombre) {
        if (sfx()) sfx().sonar(nombre);
    }

    function golpeDe(id) {
        const el = elemento(id);
        const rutas = (gameConfig.audios && gameConfig.audios.sonidos) || {};
        if (el.sonido && rutas[el.sonido]) {
            reproducirAudio(rutas[el.sonido], 0.9, false);
            return;
        }
        if (sfx() && el.sonido) sfx().golpe(el.sonido);
    }

    function notaDe(nombre) {
        if (sfx() && nombre) sfx().nota(nombre, 0.35);
    }

    /* ── Voz ─────────────────────────────────────────────────── */

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        if (!dialogo || !avatar) return;
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
        const avatar = $id("dialogo-avatar");
        if (!dialogo || !avatar) return;
        avatar.src = avatarDe(dialogo.dataset.voz === "zeus" ? "zeus" : "zoe", false);
    }

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
        let p = null;
        try {
            if (typeof TextoVoz !== "undefined") p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar });
        } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    function callar() {
        tokenDialogo += 1;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
    }

    async function decirLineas(x, opts) {
        const lista = L.lineas(x);
        for (let i = 0; i < lista.length; i++) {
            if (juegoTerminado && opts && opts.estado !== "acierto") return;
            await decir(lista[i], opts);
        }
    }

    /* ── Edad ────────────────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : "primary";
            botones +=
                '<div class="col-12 text-center mb-2">' +
                '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
                "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        if (typeof TextoVoz !== "undefined") TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
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
        const sumar = function (x) {
            L.lineas(x).forEach(function (l) { lineas.push({ texto: l.texto, personaje: l.voz }); });
        };
        (nivel.retos || []).forEach(function (r) {
            sumar(r.consigna);
            sumar(r.acierto);
            sumar(r.error);
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
        atacar = null;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        if (sfx()) sfx().detener();
        if (typeof TextoVoz !== "undefined" && typeof TextoVoz.encolarFrases === "function") {
            TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        }
        montarEscenario();
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    /* ── Escenario ───────────────────────────────────────────── */

    function montarEscenario() {
        aplicarTema(nivelElegido.tema);
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("estacion").innerHTML = "";
        $id("estacion").style.visibility = "";
        cambiarEscena(nivelElegido.escena);
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
                p.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }

    function celebrarPersonajes(si) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            const pj = $id(id);
            if (pj) pj.classList.toggle("celebra", !!si);
        });
    }

    function crearPad(id, grande) {
        const el = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pad" + (grande ? " pad-grande" : "");
        b.dataset.id = id;
        b.setAttribute("aria-label", el.nombre || id);
        b.appendChild(crearImg(el.img));
        return b;
    }

    function enlazarPad(boton) {
        let ultimo = 0;
        boton.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            const ahora = performance.now();
            if (ahora - ultimo < 160) return;
            ultimo = ahora;
            if (demoActiva || !atacar) return;
            atacar(boton.dataset.id, boton);
        });
    }

    /* ── Ayuda ───────────────────────────────────────────────── */

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

    function vigilarInactividad(fn, ms) {
        programarAyuda(fn, ms || 8000);
    }

    function manoTocar(el) {
        if (!window.PedniaTutorial || !el) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: el,
            holdMs: 420,
            cancelado: function () { return ayuda.fn !== fn; }
        });
    }

    /* ── Reloj de la ronda ───────────────────────────────────── */

    function crearRitmo(plan, gen) {
        const ronda = {
            beats: plan.beats.map(function (b) { return { t: b.t, id: b.id, descanso: !!b.descanso }; }),
            inicio: 0,
            ventana: plan.ventanaMs,
            cursor: 0
        };
        let raf = 0;
        let parado = false;
        const oye = {};
        /* La luz aparece cuando abre la ventana, para que el toque del niño alcance a entrar. */
        const anticipa = ronda.ventana;

        function parar() {
            parado = true;
            cancelAnimationFrame(raf);
        }

        function loop() {
            if (parado || !vivo(gen)) return;
            const ahora = performance.now();
            const b = ronda.beats[ronda.cursor];
            if (b && !b.visto && ahora >= ronda.inicio + b.t - anticipa) {
                /* Si el primer frame llega tarde, reabre la ventana en vez de marcar error. */
                const margen = ronda.ventana * 0.25;
                if (ahora > ronda.inicio + b.t - anticipa + margen) {
                    const abrir = ahora - (ronda.inicio + b.t - anticipa);
                    for (let k = ronda.cursor; k < ronda.beats.length; k++) ronda.beats[k].t += abrir;
                }
                b.visto = true;
                if (oye.pulso) oye.pulso(b, ronda.cursor);
            }
            const v = L.vencer(ronda, ahora);
            if (v.estado === "tarde" || v.estado === "completo" || v.cursor !== ronda.cursor) {
                const previo = ronda.beats[ronda.cursor];
                ronda.cursor = v.cursor;
                if (oye.vencer) oye.vencer(v, previo);
                if (v.estado === "tarde" || v.estado === "completo") {
                    parar();
                    return;
                }
            }
            raf = requestAnimationFrame(loop);
        }

        return {
            parar: parar,
            arrancar: function (leadMs) {
                ronda.inicio = performance.now() + (leadMs || 0);
                ronda.cursor = 0;
                raf = requestAnimationFrame(loop);
            },
            tocar: function (id) {
                if (parado || !ronda.inicio) return null;
                const ev = L.evaluarToque(ronda, performance.now(), id);
                if (ev.estado === "bien" || ev.estado === "completo" || ev.estado === "mal" || ev.estado === "tarde") {
                    ronda.cursor = ev.cursor;
                }
                if (ev.estado === "completo" || ev.estado === "mal" || ev.estado === "tarde") parar();
                return ev;
            },
            on: function (k, fn) { oye[k] = fn; }
        };
    }

    /**
     * Una pasada del compás. Resuelve true si se completó.
     * hooks.pulso(beat, i), hooks.bien(id), hooks.fallo(), hooks.descanso().
     */
    function jugarCompas(plan, gen, hooks) {
        return new Promise(function (resolve) {
            const ritmo = crearRitmo(plan, gen);
            let cerrado = false;
            const fin = function (ok) {
                if (cerrado) return;
                cerrado = true;
                atacar = null;
                ritmo.parar();
                atenuarFondo(false);
                resolve(!!ok && vivo(gen));
            };
            ritmo.on("pulso", function (b, i) {
                if (hooks.pulso) hooks.pulso(b, i);
            });
            ritmo.on("vencer", function (v, previo) {
                if (previo && previo.descanso && hooks.descanso) hooks.descanso();
                if (v.estado === "tarde") {
                    if (hooks.fallo) hooks.fallo();
                    fin(false);
                    return;
                }
                if (v.estado === "completo") fin(true);
            });
            atacar = function (id) {
                const ev = ritmo.tocar(id);
                if (!ev || cerrado) return;
                if (ev.estado === "espera") {
                    if (hooks.pronto) hooks.pronto();
                    return;
                }
                if (ev.estado === "mal" || ev.estado === "tarde") {
                    if (hooks.fallo) hooks.fallo();
                    fin(false);
                    return;
                }
                if (hooks.bien) hooks.bien(id);
                if (ev.estado === "completo") fin(true);
            };
            atenuarFondo(true);
            ritmo.arrancar(hooks.leadMs == null ? 320 : hooks.leadMs);
        });
    }

    function marcarPasos(nodos, cursor) {
        Array.prototype.forEach.call(nodos, function (n, i) {
            n.classList.toggle("hecho", i < cursor);
            n.classList.toggle("ahora", i === cursor);
        });
    }

    async function contar(n, pulsoMs, gen, fn) {
        for (let i = 0; i < n; i++) {
            if (!vivo(gen)) return;
            fn(i);
            await sleep(pulsoMs);
        }
    }

    /* ── Retos ───────────────────────────────────────────────── */

    async function retoPulso(r, gen) {
        const est = $id("estacion");
        const plan = L.beatsDe(r, nivelElegido.edad);
        const conAnimales = r.elemento === "aplauso";
        const caja = document.createElement("div");
        caja.className = "est-pulso";
        const marcas = document.createElement("div");
        marcas.className = "marcas";
        for (let i = 0; i < r.compases; i++) marcas.appendChild(document.createElement("span"));
        caja.appendChild(marcas);
        let animales = null;
        if (conAnimales) {
            animales = document.createElement("div");
            animales.className = "animales";
            (gameConfig.animales || []).forEach(function (id) {
                animales.appendChild(crearImg(elemento(id).img, "animal"));
            });
            caja.appendChild(animales);
        }
        const boton = crearPad(r.elemento, true);
        caja.appendChild(boton);
        est.appendChild(caja);
        enlazarPad(boton);

        await decir(r.consigna);
        if (!vivo(gen)) return;

        const pulsoMs = plan.pulsoMs;
        while (vivo(gen)) {
            marcarPasos(marcas.children, 0);
            await contar(2, pulsoMs, gen, function () {
                reiniciarClase(boton, "late", 420);
                golpeDe(r.elemento);
            });
            if (!vivo(gen)) return;
            const ok = await jugarCompas(plan, gen, {
                pulso: function (b, i) {
                    reiniciarClase(boton, "encendido", Math.round(plan.ventanaMs * 2));
                    if (r.melodia) notaDe(r.melodia[i % r.melodia.length]);
                    else golpeDe(r.elemento);
                    marcarPasos(marcas.children, i);
                },
                bien: function () {
                    reiniciarClase(boton, "toca", 300);
                    golpeDe(r.elemento);
                    const c = centroDe(boton);
                    particulas(c.x, c.y - 20, { n: 10, tipo: "nota", dist: 140, colores: COLORES });
                    marcarPasos(marcas.children, marcas.querySelectorAll(".hecho").length + 1);
                    if (animales) {
                        Array.prototype.forEach.call(animales.children, function (a) { reiniciarClase(a, "salta", 500); });
                    }
                },
                pronto: function () { reiniciarClase(boton, "rebota", 420); },
                fallo: function () {
                    boton.classList.remove("encendido");
                    reiniciarClase(boton, "rebota", 500);
                    efecto("rebote");
                }
            });
            if (!vivo(gen)) return;
            if (ok) break;
            atacar = null;
            boton.classList.remove("encendido");
            if (r.error) await decir(r.error);
            if (!vivo(gen)) return;
            await sleep(350);
        }
        efecto("recompensa");
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoPasos(r, gen) {
        const est = $id("estacion");
        const plan = L.beatsDe(r, nivelElegido.edad);
        const caja = document.createElement("div");
        caja.className = "est-pasos";
        const guia = document.createElement("div");
        guia.className = "guia-pasos";
        for (let i = 0; i < r.repeticiones; i++) {
            r.patron.forEach(function () {
                const s = document.createElement("span");
                s.className = "gp";
                guia.appendChild(s);
            });
            const stop = document.createElement("span");
            stop.className = "gp-stop";
            stop.innerHTML = '<i class="fa-solid fa-hand" aria-hidden="true"></i>';
            guia.appendChild(stop);
        }
        const globos = document.createElement("div");
        globos.className = "globos";
        for (let g = 0; g < 4; g++) globos.appendChild(crearImg("img/globo.svg", "globo g" + (g + 1)));
        const boton = crearPad(r.elemento, true);
        caja.appendChild(guia);
        caja.appendChild(globos);
        caja.appendChild(boton);
        est.appendChild(caja);
        enlazarPad(boton);

        await decir(r.consigna);
        if (!vivo(gen)) return;

        while (vivo(gen)) {
            marcarPasos(guia.children, 0);
            const ok = await jugarCompas(plan, gen, {
                pulso: function (b, i) {
                    marcarPasos(guia.children, i);
                    if (b.descanso) return;
                    reiniciarClase(boton, "encendido", Math.round(plan.ventanaMs * 2));
                    golpeDe(r.elemento);
                },
                bien: function () {
                    reiniciarClase(boton, "toca", 280);
                    reiniciarClase(boton, "zapatea", 400);
                    golpeDe(r.elemento);
                    const hechos = guia.querySelectorAll(".hecho").length;
                    marcarPasos(guia.children, hechos + 1);
                },
                descanso: function () {
                    const hechos = guia.querySelectorAll(".hecho").length;
                    marcarPasos(guia.children, hechos + 1);
                },
                pronto: function () { reiniciarClase(boton, "rebota", 420); },
                fallo: function () {
                    boton.classList.remove("encendido");
                    reiniciarClase(boton, "rebota", 500);
                    efecto("rebote");
                }
            });
            if (!vivo(gen)) return;
            if (ok) break;
            atacar = null;
            boton.classList.remove("encendido");
            if (r.error) await decir(r.error);
            await sleep(350);
        }
        if (!vivo(gen)) return;
        Array.prototype.forEach.call(globos.children, function (g, i) {
            setTimeout(function () {
                g.classList.add("explota");
                efecto("globo");
            }, i * 140);
        });
        efecto("celebracion");
        celebrarPersonajes(true);
        await sleep(700);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    function partitura(pasos, buho) {
        const barra = document.createElement("div");
        barra.className = "partitura";
        if (buho) barra.appendChild(crearImg("img/buho.svg", "metronomo"));
        else {
            const punto = document.createElement("span");
            punto.className = "metronomo-punto";
            barra.appendChild(punto);
        }
        pasos.forEach(function (id, i) {
            if (i) {
                const f = document.createElement("i");
                f.className = "fa-solid fa-arrow-right flecha";
                f.setAttribute("aria-hidden", "true");
                barra.appendChild(f);
            }
            const slot = document.createElement("div");
            slot.className = "slot";
            slot.appendChild(crearImg(elemento(id).img));
            barra.appendChild(slot);
        });
        return barra;
    }

    async function mostrarSecuencia(pasos, pulsoMs, gen, alPaso) {
        atenuarFondo(true);
        for (let i = 0; i < pasos.length; i++) {
            if (!vivo(gen)) break;
            if (alPaso) alPaso(pasos[i], i);
            golpeDe(pasos[i]);
            await sleep(pulsoMs * 0.92);
        }
        atenuarFondo(false);
        await sleep(280);
    }

    async function retoSecuencia(r, gen) {
        const est = $id("estacion");
        const plan = L.beatsDe(r, nivelElegido.edad);
        const caja = document.createElement("div");
        caja.className = "est-sec";
        const barra = partitura(r.pasos, r.id === "buho");
        const slots = barra.querySelectorAll(".slot");
        const fila = document.createElement("div");
        fila.className = "pads" + (r.pasos.length > 3 ? " pads-cuatro" : "");
        const unicos = [];
        r.pasos.forEach(function (id) { if (unicos.indexOf(id) === -1) unicos.push(id); });
        const pads = {};
        unicos.forEach(function (id) {
            const b = crearPad(id, false);
            fila.appendChild(b);
            pads[id] = b;
            enlazarPad(b);
        });
        caja.appendChild(barra);
        caja.appendChild(fila);
        est.appendChild(caja);

        await decir(r.consigna);
        if (!vivo(gen)) return;

        const metro = barra.querySelector(".metronomo, .metronomo-punto");
        while (vivo(gen)) {
            marcarPasos(slots, -1);
            await mostrarSecuencia(r.pasos, plan.pulsoMs, gen, function (id, i) {
                reiniciarClase(pads[id], "late", 360);
                reiniciarClase(metro, "late", 360);
                slots[i].classList.add("ahora");
                setTimeout(function () { slots[i].classList.remove("ahora"); }, plan.pulsoMs * 0.7);
            });
            if (!vivo(gen)) return;
            const ok = await jugarCompas(plan, gen, {
                pulso: function (b, i) {
                    marcarPasos(slots, i);
                    reiniciarClase(pads[b.id], "encendido", Math.round(plan.ventanaMs * 2));
                    reiniciarClase(metro, "late", 360);
                    if (sfx()) sfx().golpe("tick");
                },
                bien: function (id) {
                    reiniciarClase(pads[id], "toca", 280);
                    golpeDe(id);
                    const hechos = barra.querySelectorAll(".slot.hecho").length;
                    marcarPasos(slots, hechos + 1);
                },
                pronto: function () {},
                fallo: function () {
                    Object.keys(pads).forEach(function (id) { pads[id].classList.remove("encendido"); });
                    efecto("rebote");
                }
            });
            if (!vivo(gen)) return;
            if (ok) break;
            atacar = null;
            if (r.error) await decir(r.error);
            await sleep(300);
        }
        if (!vivo(gen)) return;
        if (r.id === "bateria") {
            est.classList.add("laser");
            efecto("chispas");
            efecto("aplausos");
            const c = centroDe(est);
            particulas(c.x, c.y, { n: 28, tipo: "confeti", dist: 280, colores: COLORES, gravedad: 40, ms: 1400 });
        } else {
            est.classList.add("laser");
            efecto("laser");
            ["do5", "mi5", "sol5", "do5"].forEach(function (n, i) {
                setTimeout(function () { notaDe(n); }, i * 180);
            });
        }
        celebrarPersonajes(true);
        await sleep(500);
        await decirLineas(r.acierto, { estado: "acierto" });
        est.classList.remove("laser");
    }

    async function retoMemoria(r, gen) {
        const est = $id("estacion");
        const pulsoMs = 60000 / r.bpm;
        const caja = document.createElement("div");
        caja.className = "est-mem";
        const fila = document.createElement("div");
        fila.className = "pads pads-grandes";
        const pads = {};
        r.pasos.forEach(function (id) {
            const b = crearPad(id, false);
            fila.appendChild(b);
            pads[id] = b;
            enlazarPad(b);
        });
        caja.appendChild(fila);
        est.appendChild(caja);

        await decir(r.consigna);
        if (!vivo(gen)) return;

        while (vivo(gen)) {
            Object.keys(pads).forEach(function (id) { pads[id].classList.remove("verde"); });
            await mostrarSecuencia(r.pasos, pulsoMs, gen, function (id) {
                reiniciarClase(pads[id], "late", 420);
            });
            if (!vivo(gen)) return;
            const ok = await esperarOrden(r.pasos, gen, pads);
            if (!vivo(gen)) return;
            if (ok) break;
            if (r.error) await decir(r.error);
            await sleep(300);
        }
        efecto("recompensa");
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    function esperarOrden(pasos, gen, pads) {
        return new Promise(function (resolve) {
            let hechos = 0;
            let cerrado = false;
            const fin = function (ok) {
                if (cerrado) return;
                cerrado = true;
                atacar = null;
                cancelarAyuda();
                resolve(!!ok && vivo(gen));
            };
            const ayudaTurno = function () {
                return manoTocar(pads[pasos[hechos]]);
            };
            atacar = function (id, boton) {
                if (cerrado || !vivo(gen)) return;
                const res = L.evaluarOrden(pasos, hechos, id);
                if (res.estado === "mal") {
                    reiniciarClase(boton, "rebota", 500);
                    efecto("rebote");
                    fin(false);
                    return;
                }
                hechos += 1;
                boton.classList.add("verde");
                golpeDe(id);
                const c = centroDe(boton);
                particulas(c.x, c.y - 16, { n: 8, tipo: "nota", dist: 120, colores: COLORES });
                if (res.estado === "completo") fin(true);
                else vigilarInactividad(ayudaTurno, 6000);
            };
            vigilarInactividad(ayudaTurno, 5000);
        });
    }

    const RETOS = {
        pulso: retoPulso,
        patron: retoPasos,
        secuencia: retoSecuencia,
        memoria: retoMemoria
    };

    /* ── Flujo ───────────────────────────────────────────────── */

    async function iniciarReto(gen) {
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        const r = nivelElegido.retos[indiceReto];
        if (!r) {
            granCierre(gen);
            return;
        }
        cancelarAyuda();
        atacar = null;
        celebrarPersonajes(false);
        pintarProgreso(indiceReto);
        $id("estacion").className = "estacion reto-" + r.tipo;
        await sleep(350);
        if (!vivo(gen)) return;
        await RETOS[r.tipo](r, gen);
        if (!vivo(gen)) return;
        cancelarAyuda();
        atacar = null;
        pintarProgreso(indiceReto + 1);
        await sleep(600);
        if (!vivo(gen)) return;
        const est = $id("estacion");
        await animar(est, [{ opacity: 1 }, { opacity: 0, transform: "scale(.96)" }], { duration: 320 });
        est.innerHTML = "";
        est.className = "estacion";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        est.style.opacity = "";
        indiceReto += 1;
        iniciarReto(gen);
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const el = elemento(d.elemento);
        if (!el.img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        await PedniaTutorial.activarDemo();
        const t = textos();
        const est = $id("estacion");
        est.className = "estacion reto-demo";
        const boton = crearPad(d.elemento, true);
        boton.id = "demo-pad";
        est.appendChild(boton);
        await animar(boton, [
            { transform: "scale(.5)", opacity: 0 },
            { transform: "scale(1.06)", opacity: 1, offset: 0.7 },
            { transform: "none", opacity: 1 }
        ], { duration: 480, fill: "none" });
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2200 });
        if (!vivo(gen) || !demoActiva) return;
        reiniciarClase(boton, "late", 700);
        await PedniaTutorial.animarMano({
            punto: boton,
            holdMs: 500,
            cancelado: function () { return !demoActiva || !vivo(gen); },
            onPresionar: function () {
                reiniciarClase(boton, "toca", 400);
                golpeDe(d.elemento);
                const c = centroDe(boton);
                particulas(c.x, c.y, { n: 12, tipo: "nota", dist: 150, colores: COLORES });
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        await sleep(400);
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1200 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1200 });
        detenerDemo();
        if (!vivo(gen)) return;
        await animar(est, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 });
        est.innerHTML = "";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        est.style.opacity = "";
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Cierre ──────────────────────────────────────────────── */

    async function concierto(gen) {
        const pista = nivelElegido.tema === "pista";
        const ids = pista
            ? ["tambor", "aplauso", "zapato", "conejo", "oso", "pato"]
            : ["platillo", "bombo", "caja", "tambor"];
        $id("estacion").style.visibility = "hidden";
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        const items = {};
        ids.forEach(function (id) {
            const d = document.createElement("div");
            d.className = "concierto-item";
            d.appendChild(crearImg(elemento(id).img));
            tarima.appendChild(d);
            items[id] = d;
        });
        const caja = $id("concierto");
        caja.hidden = false;
        caja.setAttribute("aria-hidden", "false");
        await sleep(500);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        atenuarFondo(true);
        const patron = pista
            ? ["tambor", "aplauso", "tambor", "aplauso", "zapato", "zapato", "aplauso", "tambor"]
            : ["platillo", "bombo", "caja", "tambor", "platillo", "bombo", "caja", "tambor"];
        const pulso = 60000 / (nivelElegido.bpm || 104);
        for (let i = 0; i < patron.length; i++) {
            if (gen !== rondaGen) break;
            const id = patron[i];
            golpeDe(id);
            if (items[id]) reiniciarClase(items[id], "baila", 400);
            if (pista && id === "aplauso") {
                ["conejo", "oso", "pato"].forEach(function (a) {
                    if (items[a]) reiniciarClase(items[a], "baila", 500);
                });
            }
            await sleep(pulso);
        }
        atenuarFondo(false);
        if (gen !== rondaGen) return;
        efecto(pista ? "celebracion" : "aplausos");
        const r = tarima.getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top, { n: 26, tipo: "confeti", dist: 320, colores: COLORES, gravedad: 70, ms: 1500 });
        await sleep(700);
    }

    async function granCierre(gen) {
        juegoTerminado = true;
        cancelarAyuda();
        atacar = null;
        await sleep(280);
        if (gen !== rondaGen) return;
        await concierto(gen);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 1100 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

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
            particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 130, colores: COLORES });
        });
    }

    function mostrarCierre() {
        const primera = (nivelElegido.cierre || [])[0] || { texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = primera.texto;
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        const ins = nivelElegido.insignia || {};
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 2800);
        setTimeout(function () {
            const cajaFinal = $id("final");
            if (cajaFinal) {
                cajaFinal.hidden = false;
                cajaFinal.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
            else if (typeof iniciarVictoria === "function") iniciarVictoria();
        }, 400);
    }

    /* ── Boot ────────────────────────────────────────────────── */

    $(document).ready(function () {
        const bruto = readText("config.json");
        const introBruto = readText("../../../intro.json");
        if (!bruto || !introBruto) {
            console.error("[SigueElRitmo] no se pudo leer config.json o intro.json");
            return;
        }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelSesion = nivelDeSesion();
        if (nivelSesion) aplicarTema(nivelSesion.tema);
        cambiarEscena((nivelSesion || gameConfig.niveles[0] || {}).escena);

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[SigueElRitmo] config:", errores);

        const btn = $id("btn-empecemos");
        if (btn) btn.addEventListener("click", empecemosJuego);
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: frasesFijasTts()
            });
        } catch (e) {
            console.warn("[SigueElRitmo] voz:", e);
        }
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        window.addEventListener("pagehide", function () {
            if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
        });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        sincronizarDialogoIntro3d();
        const btnOmitirIntro = $id("btn-omitir-intro3d");
        if (btnOmitirIntro) btnOmitirIntro.addEventListener("click", omitirIntro3d);
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
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
