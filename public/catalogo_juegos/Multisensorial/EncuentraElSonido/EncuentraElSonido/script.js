/* Encuentra el sonido — Multisensorial */
(function () {
    "use strict";

    const L = window.EncuentraSonidoLogica;
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
    let ubicacion = {};
    let ultimaRegion = null;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let tokenSonido = 0;
    let tokenViaje = 0;
    let tokenIntento = 0;
    let ultimoError = null;
    let erroresReto = 0;
    let demoActiva = false;
    let elementosActivos = false;
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
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
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
        Object.keys(gameConfig.elementos || {}).forEach(function (id) {
            const e = gameConfig.elementos[id];
            urls.push(e.img, e.imgAlas, e.imgAbierto);
        });
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
        if (window.EncuentraSonidoSfx) EncuentraSonidoSfx.desbloquear();
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

    /** Gotas que caen sobre toda la pantalla (acierto del paraguas). */
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
        if (window.EncuentraSonidoSfx) EncuentraSonidoSfx.sonar(nombre);
    }

    function detenerSonido() {
        tokenSonido += 1;
        if (audioSonido) {
            try { audioSonido.pause(); } catch (e) { /* noop */ }
            audioSonido = null;
        }
        if (window.EncuentraSonidoSfx) EncuentraSonidoSfx.detener();
        $id("btn-escuchar").classList.remove("sonando");
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
    }

    /**
     * Suena el estímulo de un elemento (grabación de config.audios.sonidos o síntesis)
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
            espera = new Promise(function (resolve) {
                if (!a) { resolve(); return; }
                a.addEventListener("ended", resolve, { once: true });
                a.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, o.breve ? 1300 : 9000);
            });
        } else {
            const seg = window.EncuentraSonidoSfx ? EncuentraSonidoSfx.reproducir(elemento(id).sonido, o) : 0;
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
        ultimaRegion = null;
        TextoVoz.detener();
        detenerSonido();
        detenerViaje();
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
        $id("elementos").innerHTML = "";
        mostrarZonas(false);
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

    function mostrarZonas(si) {
        const z = $id("zonas");
        z.hidden = !si;
        z.classList.toggle("aparece", !!si);
    }

    /** Toque del botón grande: vuelve a escuchar el sonido del reto. */
    async function escucharOtraVez() {
        if (!reto || juegoTerminado || demoActiva) return;
        if (fase !== "jugar" && !(fase === "error" && reto.tipo !== "viajero")) return;
        const gen = rondaGen;
        tokenIntento += 1;
        fase = "escuchando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        $id("btn-escuchar").classList.remove("invita");
        await reproducirSonido(objetivo);
        if (!vivo(gen) || fase !== "escuchando") return;
        fase = "jugar";
        programarPista(pistaEscuchar, 8000);
    }

    /* Elementos colocados en el parque (sin nombre escrito) */

    function colocar(el, lugar) {
        el.style.left = lugar.x + "%";
        el.style.top = lugar.y + "%";
    }

    function crearElemento(id, lugar) {
        const e = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "elemento";
        b.dataset.id = id;
        b.dataset.celda = lugar.id || "";
        b.setAttribute("aria-label", e.nombre || id);
        colocar(b, lugar);
        b.appendChild(crearImg(e.img, "elemento-img"));
        return b;
    }

    function elementoDe(id) {
        return $id("elementos").querySelector('.elemento[data-id="' + id + '"]');
    }

    async function llegarElementos(mapa, cantidad) {
        const escena = $id("escena");
        escena.classList.remove("cant-3", "cant-4", "cant-5");
        escena.classList.add("cant-" + Math.max(3, Math.min(5, cantidad)));
        const cont = $id("elementos");
        cont.innerHTML = "";
        const els = Object.keys(mapa).map(function (id) {
            const b = crearElemento(id, mapa[id]);
            cont.appendChild(b);
            return b;
        });
        efecto("pop");
        await Promise.all(els.map(function (b, i) {
            return animar(b, [
                { transform: "scale(.4)", opacity: 0 },
                { transform: "scale(1.08)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 480, delay: i * 110, easing: "ease-out", fill: "backwards" });
        }));
    }

    async function retirarElementos() {
        const els = Array.prototype.slice.call($id("elementos").children);
        await Promise.all(els.map(function (b) {
            return animar(b, [{ opacity: 1 }, { opacity: 0, transform: "scale(.7)" }], { duration: 360 });
        }));
        $id("elementos").innerHTML = "";
    }

    /**
     * Se puede responder mientras el sonido aún suena (el niño suele tocar en cuanto lo reconoce)
     * y durante la frase de error, salvo repetir el mismo elemento equivocado.
     */
    function puedeResponder(el) {
        if (!elementosActivos || demoActiva || juegoTerminado || !reto) return false;
        if (fase === "error") return el !== ultimoError;
        return fase === "jugar" || fase === "escuchando" || fase === "presentacion";
    }

    function enlazarElementos() {
        $id("elementos").addEventListener("click", function (ev) {
            const el = ev.target.closest(".elemento");
            if (!el || !puedeResponder(el)) return;
            intentar(el);
        });
    }

    /* Sonido viajero (5-6): la fuente del sonido salta de un lugar libre a otro hasta que el niño la toca */

    function detenerViaje() {
        tokenViaje += 1;
    }

    /** Deja el elemento donde va en este instante (también a mitad de un desplazamiento). */
    function congelar(el) {
        if (!el) return;
        const cs = getComputedStyle(el);
        const left = cs.left;
        const top = cs.top;
        el.classList.remove("viaja", "regresa");
        el.style.left = left;
        el.style.top = top;
    }

    async function viajar(gen) {
        const token = ++tokenViaje;
        const el = elementoDe(objetivo);
        if (!el) return;
        const sigue = function () { return token === tokenViaje && vivo(gen) && !!el.isConnected; };
        await sleep(900);
        while (sigue()) {
            const ocupadas = Array.prototype.filter.call($id("elementos").children, function (e) { return e !== el; })
                .map(function (e) { return e.dataset.celda; });
            const parada = L.siguienteParada(reto.elementos.length, ocupadas, el.dataset.celda);
            if (!parada) return;
            el.dataset.celda = parada.id;
            el.classList.add("viaja");
            colocar(el, parada);
            await sleep(1600);
            if (!sigue()) return;
            await sleep(1000);
        }
    }

    /** Error en el sonido viajero: se repite el ejercicio desde el lugar de partida. */
    async function repetirViajero(gen) {
        const el = elementoDe(objetivo);
        const inicio = ubicacion[objetivo];
        fase = "presentacion";
        habilitarEscuchar(false);
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };
        if (el && inicio) {
            el.classList.remove("viaja");
            el.classList.add("regresa");
            el.dataset.celda = inicio.id;
            colocar(el, inicio);
            await sleep(950);
            el.classList.remove("regresa");
        }
        if (!sigue()) return;
        await sleep(300);
        if (!sigue()) return;
        await reproducirSonido(objetivo);
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(true);
        programarPista(pistaEscuchar, 8000);
        viajar(gen);
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
        if (!window.PedniaTutorial || fase !== "jugar") return Promise.resolve();
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
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        fase = "presentacion";
        erroresReto = 0;
        ultimoError = null;
        elementosActivos = false;
        detenerViaje();
        objetivo = L.elegirCorrecto(reto);
        ubicacion = L.ubicar(reto, objetivo, null, ultimaRegion);
        ultimaRegion = ubicacion[objetivo] ? ubicacion[objetivo].region : null;
        cancelarPista();
        pintarProgreso(indiceReto);
        habilitarEscuchar(false);
        $id("btn-escuchar").classList.remove("invita");
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };

        mostrarZonas(reto.tipo === "zonas");
        await llegarElementos(ubicacion, reto.elementos.length);
        if (!sigue()) return;
        elementosActivos = true;
        await sleep(350);
        if (!sigue()) return;
        await reproducirSonido(objetivo);
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(true);
        programarPista(pistaEscuchar, 8000);
        if (reto.tipo === "viajero") viajar(gen);
    }

    async function intentar(el) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const id = el.dataset.id;
        fase = "animando";
        cancelarPista();
        detenerViaje();
        tokenDialogo += 1;
        TextoVoz.detener();
        detenerSonido();
        reiniciarClase(el, "toca", 450);
        $id("btn-escuchar").classList.remove("invita");
        if (id === objetivo) {
            elementosActivos = false;
            habilitarEscuchar(false);
            el.classList.remove("pista");
            el.classList.add("correcta");
            Array.prototype.forEach.call($id("elementos").children, function (b) {
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
        if (reto.tipo === "viajero") {
            congelar(elementoDe(objetivo));
            habilitarEscuchar(false);
        }
        await responderError(el);
        if (!sigue()) return;
        if (erroresReto >= 3) {
            const t = elementoDe(objetivo);
            if (t) t.classList.add("pista");
        }
        if (reto.error) await decir(reto.error);
        if (!sigue()) return;
        if (reto.tipo === "viajero") {
            repetirViajero(gen);
            return;
        }
        fase = "jugar";
        habilitarEscuchar(true);
        $id("btn-escuchar").classList.add("invita");
        programarPista(pistaEscuchar, 8000);
    }

    async function completarReto(gen) {
        fase = "completo";
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        celebrarPersonajes(false);
        await retirarElementos();
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Respuestas ───────────────────────────────────────────── */

    function celebrarPersonajes(si) {
        $id("pj-zoe").classList.toggle("celebra", !!si);
        $id("pj-zeus").classList.toggle("celebra", !!si);
    }

    /** "Se reproduce nuevamente": breve o completo según el reto; sin repetición solo una pausa. */
    function repetirSonido(a) {
        if (!a.repetir) return sleep(500);
        return reproducirSonido(objetivo, { breve: a.repetir === "breve" });
    }

    /** Alterna la imagen con alas arriba mientras canta; devuelve la función que lo detiene. */
    function aletear(el) {
        const img = el.querySelector(".elemento-img");
        const e = elemento(el.dataset.id);
        if (!img || !e.imgAlas) return function () {};
        let arriba = false;
        const timer = setInterval(function () {
            arriba = !arriba;
            img.src = arriba ? e.imgAlas : e.img;
        }, 160);
        return function () {
            clearInterval(timer);
            img.src = e.img;
        };
    }

    function abrirParaguas(el) {
        const img = el.querySelector(".elemento-img");
        const e = elemento(el.dataset.id);
        if (img && e.imgAbierto) img.src = e.imgAbierto;
        reiniciarClase(el, "abre", 650);
    }

    function fiesta(c) {
        particulas(c.x, c.y, { n: 26, tipo: "estrella", dist: 260, colores: COLORES_FIESTA, ms: 1300 });
        setTimeout(function () {
            particulas(c.x, c.y, { n: 20, tipo: "confeti", dist: 300, colores: COLORES_FIESTA, gravedad: 80, ms: 1500 });
        }, 450);
    }

    async function responderAcierto(el) {
        const a = reto.acierto || {};
        const c = centroDe(el);
        switch (a.efecto) {
            case "anima": {
                reiniciarClase(el, "salta", 1100);
                await repetirSonido(a);
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 170, colores: COLORES_FIESTA });
                await sleep(700);
                break;
            }
            case "pulso": {
                el.classList.add("pulso");
                await repetirSonido(a);
                el.classList.remove("pulso");
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 12, tipo: "nota", dist: 150, angulo: -Math.PI / 2, abanico: 2.4, ms: 1200 });
                await sleep(800);
                break;
            }
            case "aletea": {
                el.classList.add("aletea");
                const parar = aletear(el);
                await repetirSonido(a);
                await sleep(500);
                parar();
                el.classList.remove("aletea");
                efecto(a.sonido);
                particulas(c.x, c.y - 30, { n: 10, tipo: "nota", dist: 130, angulo: -Math.PI / 2, abanico: 2, ms: 1100 });
                await sleep(400);
                break;
            }
            case "paraguas": {
                abrirParaguas(el);
                lloverPantalla(1800);
                await repetirSonido(a);
                efecto(a.sonido);
                await sleep(500);
                break;
            }
            case "sacude": {
                el.classList.add("sacude");
                await repetirSonido(a);
                el.classList.remove("sacude");
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
                await sleep(700);
                break;
            }
            case "ilumina": {
                el.classList.add("ilumina");
                await repetirSonido(a);
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 22, tipo: "estrella", dist: 190, colores: ["#ffd43b", "#fff3bf", "#fab005"] });
                await sleep(800);
                break;
            }
            case "detiene": {
                congelar(el);
                el.classList.add("especial");
                await repetirSonido(a);
                efecto(a.sonido);
                fiesta(centroDe(el));
                await sleep(1300);
                break;
            }
            case "final": {
                reiniciarClase(el, "salta", 1100);
                await repetirSonido(a);
                el.classList.add("especial");
                celebrarPersonajes(true);
                efecto(a.sonido);
                fiesta(centroDe(el));
                await sleep(1800);
                break;
            }
            case "especial": {
                el.classList.add("especial");
                celebrarPersonajes(true);
                efecto(a.sonido);
                fiesta(c);
                await sleep(2200);
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
     * Sin señal negativa: el elemento hace un pequeño intento y Zeus/Zoe animan a escuchar.
     * Donde el documento no da frase, el intento va con un sonido suave para que sepa que no era.
     */
    async function responderError(el) {
        const e = reto.error;
        if (!e) {
            reiniciarClase(el, "intento", 700);
            efecto("suave");
            await sleep(700);
            return;
        }
        if (e.anima) reiniciarClase(el, "intento", 700);
        await sleep(250);
    }

    /* ── Demostración (con un elemento que no aparece en ningún reto) ── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.elemento || !elemento(d.elemento).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        const t = textos();
        habilitarEscuchar(true);
        const mapa = {};
        mapa[d.elemento] = { id: "demo", x: 50, y: 48 };
        await llegarElementos(mapa, 3);
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
                sonando = reproducirSonido(d.elemento);
            }
        });
        await sonando;
        if (!vivo(gen) || !demoActiva) return;
        const el = elementoDe(d.elemento);
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
        await retirarElementos();
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        detenerViaje();
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
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EncuentraElSonido] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarElementos();
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
