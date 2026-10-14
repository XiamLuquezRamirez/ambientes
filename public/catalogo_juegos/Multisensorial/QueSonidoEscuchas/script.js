/* ¿Qué sonido escuchas? — Multisensorial */
(function () {
    "use strict";

    const L = window.QueSonidoLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const VOLUMEN_FONDO_ESCUCHA = 0.03;

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
    let audioSonido = null;
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
    function sonido(id) { return (gameConfig.sonidos || {})[id] || {}; }
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
        const urls = [];
        Object.keys(gameConfig.sonidos || {}).forEach(function (id) { urls.push(gameConfig.sonidos[id].img); });
        (gameConfig.niveles || []).forEach(function (n) { if (n.insignia) urls.push(n.insignia.img); });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../images/zoe_hablando.gif",
            "../../images/zeus_hablando.gif",
            "../../img/zoe_normal.gif",
            "../../img/zeus_normal.gif"
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

    /** El saludo depende de la edad: en kiosco ya se conoce al cargar; en la vista previa se usa el de 3-4. */
    function conversacionInicial() {
        let nivel = null;
        if (window.PedniaEdad && !PedniaEdad.esPreviewCatalogo()) {
            const edad = PedniaEdad.edadSesion();
            if (edad != null) nivel = PedniaEdad.resolverNivel(gameConfig.niveles || [], edad);
        }
        return (nivel && nivel.bienvenida) || textos().conversacion || [];
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
        if (window.QueSonidoSfx) QueSonidoSfx.desbloquear();
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
        img.className = clase;
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
            if (o.colores) p.style.background = o.colores[i % o.colores.length];
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

    /** Gotas que caen sobre toda la pantalla (acierto de la lluvia). */
    function lloverPantalla(ms) {
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const ancho = window.innerWidth;
        const alto = window.innerHeight;
        const n = 70;
        for (let i = 0; i < n; i++) {
            const g = document.createElement("span");
            g.className = "gota";
            g.style.left = Math.random() * ancho + "px";
            g.style.top = "-30px";
            capa.appendChild(g);
            animar(g, [
                { transform: "translateY(0)", opacity: 0.9 },
                { transform: "translateY(" + (alto + 60) + "px)", opacity: 0.9 }
            ], { duration: 700 + Math.random() * 500, delay: Math.random() * (ms || 1800), easing: "linear" })
                .then(function () { g.remove(); });
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
        if (window.QueSonidoSfx) QueSonidoSfx.sonar(nombre);
    }

    function detenerSonido() {
        tokenSonido += 1;
        if (audioSonido) {
            try { audioSonido.pause(); } catch (e) { /* noop */ }
            audioSonido = null;
        }
        if (window.QueSonidoSfx) QueSonidoSfx.detener();
        $id("btn-escuchar").classList.remove("sonando");
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    }

    /**
     * Suena el estímulo de un objeto (grabación de config.audios.sonidos o síntesis)
     * con la música de fondo atenuada; resuelve cuando termina o se interrumpe.
     */
    function reproducirSonido(id, o) {
        o = o || {};
        detenerSonido();
        const token = tokenSonido;
        const btn = $id("btn-escuchar");
        btn.classList.add("sonando");
        TextoVoz.volumenFondo(Math.min(VOLUMEN_FONDO_ESCUCHA, TextoVoz.VOLUMEN_FONDO));
        const ruta = rutasSonidos()[id];
        let espera;
        if (ruta) {
            const a = reproducirAudio(ruta, 1, false);
            audioSonido = a;
            if (a) {
                try { a.playbackRate = o.lento ? 0.7 : 1; } catch (e) { /* noop */ }
            }
            espera = new Promise(function (resolve) {
                if (!a) { resolve(); return; }
                a.addEventListener("ended", resolve, { once: true });
                a.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, o.breve ? 1300 : 9000);
            });
        } else {
            const seg = window.QueSonidoSfx ? QueSonidoSfx.reproducir(sonido(id).sonido, o) : 0;
            espera = sleep(Math.max(300, seg * 1000));
        }
        return espera.then(function () {
            if (token !== tokenSonido) return;
            if (o.breve && audioSonido) {
                try { audioSonido.pause(); } catch (e) { /* noop */ }
            }
            audioSonido = null;
            btn.classList.remove("sonando");
            TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        });
    }

    function avatarDe(voz, hablando) {
        return "../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
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
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("opciones").innerHTML = "";
        prepararSecuencia(null);
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
        const btn = $id("btn-escuchar");
        btn.disabled = !si;
        btn.classList.toggle("bloqueado", !si);
    }

    /** Toque del botón grande: vuelve a escuchar el sonido (o la secuencia) del reto. */
    async function escucharOtraVez() {
        if (!reto || juegoTerminado || demoActiva || (fase !== "jugar" && fase !== "error")) return;
        if (!L.puedeEscuchar(reto, erroresReto)) return;
        const gen = rondaGen;
        tokenIntento += 1;
        fase = "escuchando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        $id("btn-escuchar").classList.remove("invita");
        if (reto.tipo === "secuencia") await reproducirSecuencias(gen);
        else await reproducirSonido(objetivo);
        if (!vivo(gen) || fase !== "escuchando") return;
        fase = "jugar";
        programarPista(pistaEscuchar, 8000);
    }

    /* Opciones (3 imágenes grandes, sin nombre escrito) */

    function crearOpcion(id) {
        const s = sonido(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcion";
        b.dataset.id = id;
        b.setAttribute("aria-label", s.nombre || id);
        b.appendChild(crearImg(s.img, "opcion-img"));
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
        return fase === "jugar" || fase === "escuchando" || fase === "presentacion";
    }

    function enlazarOpciones() {
        $id("opciones").addEventListener("click", function (ev) {
            const el = ev.target.closest(".opcion");
            if (!el || !puedeResponder(el)) return;
            intentar(el);
        });
    }

    /* Secuencia (5-6, ¿qué sonido falta?) */

    function prepararSecuencia(r) {
        const cont = $id("secuencia");
        cont.innerHTML = "";
        if (!r || r.tipo !== "secuencia") {
            cont.hidden = true;
            return;
        }
        r.secuencia.forEach(function () {
            const s = document.createElement("span");
            s.className = "slot";
            s.innerHTML = '<i class="fa-solid fa-music slot-icono" aria-hidden="true"></i><i class="fa-solid fa-question slot-falta" aria-hidden="true"></i>';
            cont.appendChild(s);
        });
        cont.hidden = false;
    }

    function slots() {
        return Array.prototype.slice.call($id("secuencia").children);
    }

    /** Suena la secuencia; los huecos (null) son silencio con el signo de pregunta. */
    async function reproducirSecuencia(gen, lista, opts) {
        opts = opts || {};
        const ss = slots();
        const faseInicial = fase;
        for (let i = 0; i < lista.length; i++) {
            if (!vivo(gen) || fase !== faseInicial) {
                ss.forEach(function (s) { s.classList.remove("suena", "silencio"); });
                return;
            }
            const s = ss[i];
            s.classList.add("suena");
            if (lista[i]) {
                if (opts.revelar) mostrarEnSlot(s, lista[i]);
                await reproducirSonido(lista[i], { breve: true });
            } else {
                s.classList.add("silencio");
                await sleep(1100);
                s.classList.remove("silencio");
            }
            s.classList.remove("suena");
            await sleep(250);
        }
    }

    function mostrarEnSlot(s, id) {
        if (s.querySelector(".slot-img")) return;
        s.appendChild(crearImg(sonido(id).img, "slot-img"));
        s.classList.add("revelado");
    }

    /** Primero la secuencia completa y luego la misma con el sonido que falta. */
    async function reproducirSecuencias(gen) {
        const faseInicial = fase;
        await reproducirSecuencia(gen, reto.secuencia);
        if (!vivo(gen) || fase !== faseInicial) return;
        await sleep(700);
        if (!vivo(gen) || fase !== faseInicial) return;
        await reproducirSecuencia(gen, L.secuenciaIncompleta(reto));
    }

    /* ── Pista sin voz tras inactividad ───────────────────────── */

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
                if (pista.fn === fn) programarPista(fn, Math.max(ms, 8000) + 2000);
            });
        }, ms);
    }

    /** La mano toca el botón de escuchar y el sonido vuelve a sonar (no revela la respuesta). */
    function pistaEscuchar() {
        const btn = $id("btn-escuchar");
        if (!window.PedniaTutorial || fase !== "jugar" || !L.puedeEscuchar(reto, erroresReto)) return Promise.resolve();
        const fn = pista.fn;
        return PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: function () { return pista.fn !== fn || fase !== "jugar"; },
            onPresionar: function () {
                reiniciarClase(btn, "pulsa", 500);
                escucharOtraVez();
            }
        });
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    async function iniciarReto(gen) {
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        fase = "presentacion";
        erroresReto = 0;
        ultimoError = null;
        opcionesActivas = false;
        objetivo = L.elegirCorrecto(reto);
        cancelarPista();
        pintarProgreso(indiceReto);
        prepararSecuencia(reto);
        habilitarEscuchar(false);
        $id("btn-escuchar").classList.remove("invita");
        const opciones = L.mezclar(reto.opciones);
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };

        if (reto.consigna) await decir(reto.consigna);
        if (!sigue()) return;

        if (reto.tipo === "escuchar") {
            await llegarOpciones(opciones);
            if (!sigue()) return;
            opcionesActivas = true;
            await sleep(350);
            if (!sigue()) return;
            await reproducirSonido(objetivo);
        } else if (reto.tipo === "diferido") {
            $id("opciones").innerHTML = "";
            await sleep(400);
            await reproducirSonido(objetivo);
            if (!sigue()) return;
            await sleep(reto.pausaMs || 0);
            if (!sigue()) return;
            await llegarOpciones(opciones);
            opcionesActivas = true;
        } else if (reto.tipo === "secuencia") {
            $id("opciones").innerHTML = "";
            await sleep(400);
            await reproducirSecuencias(gen);
            if (!sigue()) return;
            await sleep(400);
            if (!sigue()) return;
            await llegarOpciones(opciones);
            opcionesActivas = true;
        }
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(L.puedeEscuchar(reto, erroresReto));
        programarPista(pistaEscuchar, 8000);
    }

    async function intentar(el) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const id = el.dataset.id;
        fase = "animando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        detenerSonido();
        reiniciarClase(el, "toca", 450);
        $id("btn-escuchar").classList.remove("invita");
        if (id === objetivo) {
            opcionesActivas = false;
            habilitarEscuchar(false);
            el.classList.remove("pista");
            el.classList.add("correcta");
            Array.prototype.forEach.call($id("opciones").children, function (b) {
                if (b !== el) b.classList.add("apagada");
            });
            await responderAcierto(el);
            if (!vivo(gen)) return;
            if (reto.acierto.texto) await decir(reto.acierto, { estado: "acierto" });
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
            if (t) t.classList.add("pista");
        }
        if (reto.error) await decir(reto.error);
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(L.puedeEscuchar(reto, erroresReto));
        if (L.puedeEscuchar(reto, erroresReto)) $id("btn-escuchar").classList.add("invita");
        programarPista(pistaEscuchar, 8000);
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
        $id("pj-zoe").classList.toggle("celebra", !!si);
        $id("pj-zeus").classList.toggle("celebra", !!si);
    }

    async function responderAcierto(el) {
        const a = reto.acierto || {};
        const c = centroDe(el);
        switch (a.efecto) {
            case "anima": {
                reiniciarClase(el, "salta", 1100);
                if (a.repetir === "breve") await reproducirSonido(objetivo, { breve: true });
                else await sleep(500);
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 170, colores: COLORES_FIESTA });
                await sleep(700);
                break;
            }
            case "gato": {
                reiniciarClase(el, "estira", 1500);
                efecto(a.sonido);
                particulas(c.x, c.y - 40, { n: 12, tipo: "corazon", dist: 140, angulo: -Math.PI / 2, abanico: 2.2, ms: 1300 });
                await sleep(1500);
                break;
            }
            case "lluvia": {
                el.classList.add("llueve");
                efecto(a.sonido);
                lloverPantalla(1600);
                await sleep(2400);
                break;
            }
            case "campana": {
                el.classList.add("balancea");
                await reproducirSonido(objetivo, { lento: true });
                el.classList.remove("balancea");
                break;
            }
            case "especial": {
                el.classList.add("especial");
                celebrarPersonajes(true);
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 26, tipo: "estrella", dist: 260, colores: COLORES_FIESTA, ms: 1300 });
                await sleep(450);
                particulas(c.x, c.y, { n: 20, tipo: "confeti", dist: 300, colores: COLORES_FIESTA, gravedad: 80, ms: 1500 });
                await sleep(1800);
                break;
            }
            case "secuencia": {
                el.classList.add("salta");
                await sleep(300);
                await reproducirSecuencia(rondaGen, reto.secuencia, { revelar: true });
                const s = slots()[reto.falta];
                if (s) {
                    s.classList.add("hallado");
                    const cs = centroDe(s);
                    particulas(cs.x, cs.y, { n: 16, tipo: "estrella", dist: 130, colores: COLORES_FIESTA });
                }
                efecto("recompensa");
                await sleep(900);
                break;
            }
            default: {
                reiniciarClase(el, "salta", 1100);
                efecto(a.sonido || "celebracion");
                particulas(c.x, c.y, { n: 22, tipo: "estrella", dist: 200, colores: COLORES_FIESTA });
                await sleep(1100);
            }
        }
    }

    /**
     * 3-4: sin señal negativa (solo la voz de Zeus y el botón de escuchar invita).
     * 5-6: la imagen tiembla suave para que sepa que no era.
     */
    async function responderError(el) {
        if (reto.error) {
            await sleep(250);
            return;
        }
        reiniciarClase(el, "tiembla", 600);
        efecto("suave");
        await sleep(650);
    }

    /* ── Demostración (con un sonido que no es respuesta de ningún reto) ── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.sonido || !sonido(d.sonido).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        PedniaTutorial.activarDemo();
        const t = textos();
        habilitarEscuchar(true);
        await llegarOpciones([d.sonido]);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const btn = $id("btn-escuchar");
        let sonando = Promise.resolve();
        await PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(btn, "pulsa", 500);
                sonando = reproducirSonido(d.sonido);
            }
        });
        await sonando;
        if (!vivo(gen) || !demoActiva) return;
        const el = opcionDe(d.sonido);
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
        await retirarOpciones();
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        habilitarEscuchar(false);
        celebrarPersonajes(true);
        await sleep(900);
        if (gen !== rondaGen) return;
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

    function mostrarCierre() {
        const cierre = nivelElegido.cierre || { voz: "zoe", texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre.texto;
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe");
        const ins = nivelElegido.insignia || {};
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 1400);
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
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[QueSonidoEscuchas] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        enlazarOpciones();
        $id("btn-escuchar").addEventListener("click", escucharOtraVez);
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
