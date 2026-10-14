/* Memoria auditiva — Multisensorial */
(function () {
    "use strict";

    const L = window.MemoriaAuditivaLogica;
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
    let pasos = [];
    let indicePaso = 0;
    let marcadas = [];
    let ordenOpciones = [];
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let tokenSonido = 0;
    let tokenIntento = 0;
    let ultimoError = null;
    let erroresPaso = 0;
    let demoActiva = false;
    let opcionesActivas = false;
    let audioSonido = null;
    let pista = { timer: null, gen: 0 };
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
            urls.push(e.img, e.imgAccion);
        });
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

    /** En kiosco la edad ya se conoce al cargar; en la vista previa del catálogo no. */
    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        const edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }

    /** El saludo depende de la edad; en la vista previa se usa el de 3-4. */
    function conversacionInicial() {
        const nivel = nivelDeSesion();
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
        if (window.MemoriaAuditivaSfx) MemoriaAuditivaSfx.desbloquear();
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
        if (window.MemoriaAuditivaSfx) MemoriaAuditivaSfx.sonar(nombre);
    }

    function detenerSonido() {
        tokenSonido += 1;
        if (audioSonido) {
            try { audioSonido.pause(); } catch (e) { /* noop */ }
            audioSonido = null;
        }
        if (window.MemoriaAuditivaSfx) MemoriaAuditivaSfx.detener();
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
            const seg = window.MemoriaAuditivaSfx ? MemoriaAuditivaSfx.reproducir(elemento(id).sonido, o) : 0;
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
            (r.preguntas || []).forEach(sumar);
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
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        document.body.classList.toggle("archivo", String(nivelElegido.id) === "5");
        $id("opciones").innerHTML = "";
        marcadas = [];
        pasos = [];
        prepararSlots(0);
        ocultarRelacion();
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

    /* Pista sonora: una casilla por sonido que se enciende al sonar (sin revelar cuál es) */

    function slots() {
        return Array.prototype.slice.call($id("secuencia").children);
    }

    function prepararSlots(n) {
        const cont = $id("secuencia");
        cont.innerHTML = "";
        for (let i = 0; i < n; i++) {
            const s = document.createElement("span");
            s.className = "slot";
            s.innerHTML = '<i class="fa-solid fa-music slot-icono" aria-hidden="true"></i>';
            cont.appendChild(s);
        }
    }

    /**
     * Suena una reproducción encendiendo su casilla. Con `iluminar` también se enciende
     * el elemento correspondiente (solo al celebrar: ahí ya no se revela nada).
     */
    async function reproducirPista(gen, lista, opts) {
        opts = opts || {};
        prepararSlots(lista.length);
        const ss = slots();
        const faseInicial = fase;
        const sigue = function () { return vivo(gen) && fase === faseInicial; };
        for (let i = 0; i < lista.length; i++) {
            if (!sigue()) return false;
            const s = ss[i];
            const op = opts.iluminar ? opcionDe(lista[i]) : null;
            if (s) s.classList.add(opts.iluminar ? "brilla" : "suena");
            if (op) op.classList.add("suena");
            await reproducirSonido(lista[i], { breve: true });
            if (s && !opts.iluminar) s.classList.remove("suena");
            if (op) op.classList.remove("suena");
            if (!sigue()) return false;
            await sleep(opts.pausa || 300);
        }
        return sigue();
    }

    /** Al terminar, la pista sonora desaparece y el niño debe recordar lo que escuchó. */
    async function borrarPista() {
        slots().forEach(function (s) { s.classList.add("se-va"); });
        await sleep(420);
        prepararSlots(0);
    }

    function ocultarRelacion() {
        const rel = $id("relacion");
        rel.hidden = true;
        rel.innerHTML = "";
    }

    /** Cambio: lo que sonó antes → lo que sonó después, en el espacio central. */
    function mostrarRelacion(antes, despues) {
        const rel = $id("relacion");
        rel.innerHTML = "";
        const caja = function (id, clase) {
            const c = document.createElement("span");
            c.className = "relacion-el " + clase;
            c.appendChild(crearImg(elemento(id).img, ""));
            return c;
        };
        const flecha = document.createElement("i");
        flecha.className = "fa-solid fa-arrow-right relacion-flecha";
        flecha.setAttribute("aria-hidden", "true");
        rel.appendChild(caja(antes, "antes"));
        rel.appendChild(flecha);
        rel.appendChild(caja(despues, "despues"));
        rel.hidden = false;
        animar(rel, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "ease-out" });
        return { antes: rel.children[0], despues: rel.children[2] };
    }

    /* Opciones (imágenes grandes, sin nombre escrito) */

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
        if (!id) return null;
        return $id("opciones").querySelector('.opcion[data-id="' + id + '"]');
    }

    async function llegarOpciones(lista, opts) {
        opts = opts || {};
        const cont = $id("opciones");
        cont.className = "opciones cant-" + Math.max(2, Math.min(6, lista.length)) + (opts.espera ? " en-espera" : "");
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
            ], { duration: 480, delay: i * 110, easing: "ease-out", fill: "backwards" });
        }));
    }

    async function retirarOpciones() {
        const els = Array.prototype.slice.call($id("opciones").children);
        await Promise.all(els.map(function (b) {
            return animar(b, [{ opacity: 1 }, { opacity: 0, transform: "translateY(40px) scale(.7)" }], { duration: 360 });
        }));
        $id("opciones").innerHTML = "";
    }

    /** Las opciones reflejan siempre `marcadas` (lo que el niño ya recordó en este paso). */
    function pintarMarcas() {
        Array.prototype.forEach.call($id("opciones").children, function (b) {
            const si = marcadas.indexOf(b.dataset.id) !== -1;
            b.classList.toggle("elegida", si);
            b.classList.remove("pista");
            const ok = b.querySelector(".opcion-ok");
            if (si && !ok) {
                const s = document.createElement("span");
                s.className = "opcion-ok";
                s.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
                b.appendChild(s);
            } else if (!si && ok) {
                ok.remove();
            }
        });
        const paso = pasos[indicePaso];
        if (paso && erroresPaso >= 3 && fase !== "presentacion") {
            const falta = paso.correctas.find(function (id) { return marcadas.indexOf(id) === -1; });
            const t = opcionDe(falta);
            if (t) t.classList.add("pista");
        }
    }

    /**
     * Se puede tocar durante la pregunta y durante la frase de error
     * (salvo repetir el mismo elemento equivocado); lo ya marcado no cuenta dos veces.
     */
    function puedeResponder(el) {
        if (!opcionesActivas || demoActiva || juegoTerminado || !reto) return false;
        if (marcadas.indexOf(el.dataset.id) !== -1) return false;
        if (fase === "error") return el !== ultimoError;
        return fase === "jugar";
    }

    function enlazarOpciones() {
        $id("opciones").addEventListener("click", function (ev) {
            const el = ev.target.closest(".opcion");
            if (!el || !puedeResponder(el)) return;
            intentar(el);
        });
    }

    /** Botón grande: se retiran las opciones, vuelve a sonar todo y regresan (lo marcado se conserva). */
    function escucharOtraVez() {
        if (!reto || juegoTerminado || demoActiva || (fase !== "jugar" && fase !== "error")) return;
        tokenIntento += 1;
        tokenDialogo += 1;
        TextoVoz.detener();
        presentar(rondaGen, false);
    }

    /* ── Pista sin voz tras inactividad ───────────────────────── */

    /*
     * Cada programación tiene su número: una mano que ya va en camino se cancela aunque
     * un toque correcto vuelva a programar la misma pista enseguida.
     */
    function cancelarPista() {
        clearTimeout(pista.timer);
        pista.gen += 1;
        pista.timer = null;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarPista(fn, ms) {
        clearTimeout(pista.timer);
        const g = ++pista.gen;
        pista.timer = setTimeout(function () {
            if (pista.gen !== g) return;
            Promise.resolve(fn(g)).then(function () {
                if (pista.gen === g) programarPista(fn, Math.max(ms, 9000) + 2000);
            });
        }, ms);
    }

    /** La mano toca el botón de escuchar y todo vuelve a sonar (no revela la respuesta). */
    function pistaEscuchar(g) {
        const btn = $id("btn-escuchar");
        if (!window.PedniaTutorial || fase !== "jugar") return Promise.resolve();
        return PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: function () { return pista.gen !== g || fase !== "jugar"; },
            onPresionar: function () {
                reiniciarClase(btn, "pulsa", 500);
                escucharOtraVez();
            }
        });
    }

    /* ── Flujo: escuchar → recordar → observar → elegir → validar ── */

    async function iniciarReto(gen) {
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        pasos = L.pasosDe(reto);
        indicePaso = 0;
        marcadas = [];
        erroresPaso = 0;
        ordenOpciones = L.ordenarOpciones(reto.opciones, reto.reproducciones[0]);
        pintarProgreso(indiceReto);
        await presentar(gen, true);
    }

    function preguntaActual() {
        return (reto.preguntas || [])[indicePaso] || null;
    }

    /**
     * Suenan las reproducciones sin opciones a la vista; al terminar la pista desaparece
     * y llegan las opciones. En 3-4 reto 1 las imágenes se muestran antes del sonido.
     */
    async function presentar(gen, primera) {
        fase = "presentacion";
        ultimoError = null;
        opcionesActivas = false;
        cancelarPista();
        detenerSonido();
        habilitarEscuchar(false);
        $id("btn-escuchar").classList.remove("invita");
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };

        if ($id("opciones").children.length) await retirarOpciones();
        if (!sigue()) return;
        if (primera && reto.mostrarAntes) {
            await llegarOpciones(ordenOpciones, { espera: true });
            if (!sigue()) return;
            await sleep(1600);
            if (!sigue()) return;
            await retirarOpciones();
            if (!sigue()) return;
        }
        await sleep(500);
        const reps = reto.reproducciones;
        for (let k = 0; k < reps.length; k++) {
            if (!sigue()) return;
            await reproducirPista(gen, reps[k]);
            if (!sigue()) return;
            await borrarPista();
            if (k < reps.length - 1) await sleep(700);
        }
        if (!sigue()) return;
        await sleep(300);
        if (!sigue()) return;
        await llegarOpciones(ordenOpciones);
        if (!sigue()) return;
        activarPaso(gen);
    }

    /** Opciones listas para tocar; si el paso tiene pregunta, se dice (se puede responder mientras). */
    function activarPaso(gen) {
        opcionesActivas = true;
        fase = "jugar";
        pintarMarcas();
        habilitarEscuchar(true);
        const preg = preguntaActual();
        if (preg) {
            decir(preg).then(function () {
                if (vivo(gen) && fase === "jugar") programarPista(pistaEscuchar, 9000);
            });
        } else {
            programarPista(pistaEscuchar, 9000);
        }
    }

    async function intentar(el) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const id = el.dataset.id;
        const paso = pasos[indicePaso];
        const r = L.evaluar(paso, marcadas, id);
        if (r === "repetido") return;
        fase = "animando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        detenerSonido();
        reiniciarClase(el, "toca", 450);
        $id("btn-escuchar").classList.remove("invita");

        if (r === "correcto") {
            marcadas.push(id);
            fase = "jugar";
            pintarMarcas();
            programarPista(pistaEscuchar, 9000);
            reproducirSonido(id, { breve: true });
            return;
        }
        if (r === "completo") {
            marcadas.push(id);
            opcionesActivas = false;
            habilitarEscuchar(false);
            pintarMarcas();
            if (indicePaso < pasos.length - 1) {
                await pasarAlSiguientePaso(gen);
                return;
            }
            await responderAcierto(gen, el);
            if (!vivo(gen)) return;
            if (reto.acierto.texto) await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }

        /* Error: lo ya recordado se conserva; se puede volver a escuchar. */
        erroresPaso += 1;
        ultimoError = el;
        fase = "error";
        reiniciarClase(el, "tiembla", 600);
        if (!reto.error) efecto("suave");
        pintarMarcas();
        if (reto.error) await decir(reto.error);
        else await sleep(650);
        if (!sigue()) return;
        fase = "jugar";
        habilitarEscuchar(true);
        $id("btn-escuchar").classList.add("invita");
        programarPista(pistaEscuchar, 9000);
    }

    /** Gran desafío: cada pregunta resuelta se celebra y llega la siguiente con las marcas limpias. */
    async function pasarAlSiguientePaso(gen) {
        fase = "animando";
        marcadas.forEach(function (id) { const op = opcionDe(id); if (op) op.classList.add("brilla"); });
        efecto("recompensa");
        const c = centroDe($id("opciones"));
        particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 150, colores: COLORES_FIESTA });
        await sleep(1200);
        if (!vivo(gen)) return;
        Array.prototype.forEach.call($id("opciones").children, function (b) { b.classList.remove("brilla"); });
        indicePaso += 1;
        marcadas = [];
        erroresPaso = 0;
        ultimoError = null;
        activarPaso(gen);
    }

    async function completarReto(gen) {
        fase = "completo";
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        celebrarPersonajes(false);
        await retirarOpciones();
        if (!vivo(gen)) return;
        ocultarRelacion();
        prepararSlots(0);
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Respuestas ───────────────────────────────────────────── */

    function celebrarPersonajes(si) {
        $id("pj-zoe").classList.toggle("celebra", !!si);
        $id("pj-zeus").classList.toggle("celebra", !!si);
    }

    function fiesta(c) {
        particulas(c.x, c.y, { n: 26, tipo: "estrella", dist: 280, colores: COLORES_FIESTA, ms: 1300 });
        setTimeout(function () {
            particulas(c.x, c.y, { n: 22, tipo: "confeti", dist: 320, colores: COLORES_FIESTA, gravedad: 80, ms: 1500 });
        }, 450);
    }

    function opcionesCorrectas() {
        return L.unicos([].concat.apply([], pasos.map(function (p) { return p.correctas; })))
            .map(opcionDe)
            .filter(Boolean);
    }

    /** Vuelve a sonar la primera reproducción completa encendiendo cada elemento. */
    async function repetirIluminando(gen) {
        await sleep(300);
        await reproducirPista(gen, reto.reproducciones[0], { iluminar: true, pausa: 200 });
        await borrarPista();
    }

    async function responderAcierto(gen, el) {
        const a = reto.acierto || {};
        const id = el.dataset.id;
        const c = centroDe(el);
        fase = "celebrando";
        switch (a.efecto) {
            case "aplaude": {
                const e = elemento(id);
                const img = el.querySelector(".opcion-img");
                el.classList.add("brilla");
                efecto(a.sonido);
                for (let i = 0; i < 8 && img && e.imgAccion; i++) {
                    img.src = i % 2 ? e.img : e.imgAccion;
                    await sleep(170);
                }
                if (img) img.src = e.img;
                particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
                await sleep(400);
                break;
            }
            case "marcar": {
                const ops = opcionesCorrectas();
                ops.forEach(function (op) { op.classList.add("brilla"); });
                await repetirIluminando(gen);
                if (!vivo(gen)) return;
                efecto(a.sonido || "celebracion");
                ops.forEach(function (op) {
                    const p = centroDe(op);
                    particulas(p.x, p.y, { n: 12, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
                });
                await sleep(1000);
                break;
            }
            case "doble": {
                el.classList.add("brilla");
                for (let i = 0; i < (a.veces || 2); i++) {
                    if (i < 2) reiniciarClase(el, "brinco", 450);
                    await reproducirSonido(id, { breve: true });
                    if (!vivo(gen)) return;
                    await sleep(180);
                }
                efecto(a.sonido);
                particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
                await sleep(500);
                break;
            }
            case "galopa": {
                el.classList.add("brilla", "galopa");
                efecto(a.sonido || "recompensa");
                await sleep(1750);
                el.classList.remove("galopa");
                particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 150, colores: COLORES_FIESTA });
                break;
            }
            case "cambio": {
                const cb = L.cambioDe(reto);
                [cb.antes, cb.despues].forEach(function (x) { const op = opcionDe(x); if (op) op.classList.add("brilla"); });
                const rel = mostrarRelacion(cb.antes, cb.despues);
                await sleep(500);
                rel.antes.classList.add("suena");
                await reproducirSonido(cb.antes, { breve: true });
                rel.antes.classList.remove("suena");
                if (!vivo(gen)) return;
                await sleep(250);
                rel.despues.classList.add("suena");
                await reproducirSonido(cb.despues, { breve: true });
                rel.despues.classList.remove("suena");
                if (!vivo(gen)) return;
                efecto(a.sonido || "recompensa");
                const p = centroDe($id("relacion"));
                particulas(p.x, p.y, { n: 16, tipo: "estrella", dist: 170, colores: COLORES_FIESTA });
                await sleep(600);
                break;
            }
            case "perdido": {
                el.classList.add("brilla");
                reiniciarClase(el, "salta", 1000);
                await reproducirSonido(id, { breve: true });
                if (!vivo(gen)) return;
                await repetirIluminando(gen);
                if (!vivo(gen)) return;
                efecto(a.sonido || "recompensa");
                particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
                await sleep(600);
                break;
            }
            case "especial": {
                el.classList.add("brilla", "especial");
                celebrarPersonajes(true);
                efecto(a.sonido);
                fiesta(c);
                await sleep(1800);
                break;
            }
            case "final": {
                await repetirIluminando(gen);
                if (!vivo(gen)) return;
                opcionesCorrectas().forEach(function (op) { op.classList.add("brilla", "especial"); });
                celebrarPersonajes(true);
                efecto(a.sonido);
                fiesta(centroDe($id("opciones")));
                fiesta(centroDe($id("zona-escucha")));
                await sleep(2000);
                break;
            }
            default: {
                efecto(a.sonido || "celebracion");
                particulas(c.x, c.y, { n: 20, tipo: "estrella", dist: 190, colores: COLORES_FIESTA });
                await sleep(1300);
            }
        }
    }

    /* ── Demostración (con elementos que no aparecen en ningún reto) ── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.sonido || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        PedniaTutorial.activarDemo();
        const t = textos();
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        marcadas = [];
        pasos = [];
        habilitarEscuchar(true);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (cancelado()) return;

        const btn = $id("btn-escuchar");
        let sonando = Promise.resolve();
        await PedniaTutorial.animarMano({
            punto: btn,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(btn, "pulsa", 500);
                sonando = reproducirPista(gen, [d.sonido]).then(borrarPista);
            }
        });
        await sonando;
        if (cancelado()) return;
        await llegarOpciones(L.ordenarOpciones(d.opciones, [d.sonido]));
        if (cancelado()) return;
        const el = opcionDe(d.sonido);
        await PedniaTutorial.animarMano({
            punto: el,
            holdMs: 450,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(el, "toca", 450);
                marcadas = [d.sonido];
                pintarMarcas();
                reproducirSonido(d.sonido, { breve: true });
            }
        });
        if (cancelado()) return;
        await sleep(600);
        el.classList.add("brilla");
        efecto("recompensa");
        const c = centroDe(el);
        particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        await retirarOpciones();
        marcadas = [];
        prepararSlots(0);
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

    /** El cierre puede tener varias voces (Zoe y luego Zeus): se dicen en orden. */
    function hablarCierre(lineas) {
        return lineas.reduce(function (p, l) {
            return p.then(function () {
                return Promise.resolve(TextoVoz.hablar(l.texto, l.voz === "zeus" ? "zeus" : "zoe")).catch(function () {});
            });
        }, Promise.resolve());
    }

    function mostrarCierre() {
        const cierre = (nivelElegido.cierre && nivelElegido.cierre.length) ? nivelElegido.cierre : [{ voz: "zoe", texto: "¡Excelente!" }];
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre.map(function (l) { return l.texto; }).join(" ");
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        hablarCierre(cierre);
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
        const nivelInicial = nivelDeSesion();
        if (nivelInicial && String(nivelInicial.id) === "5") {
            document.body.classList.add("archivo");
            document.querySelectorAll(".inicio-el img[data-archivo]").forEach(function (img) {
                img.src = img.dataset.archivo;
            });
        }

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[MemoriaAuditiva] config:", errores);

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
