/* Encuentra la pareja — Multisensorial */
(function () {
    "use strict";

    const L = window.EncuentraParejaLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const IMG_OJO_GAFAS = "img/ojo_gafas.svg";
    const CLASES_IDLE = ["repica", "aroma", "gotea", "brilla"];

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let ordenOpciones = [];
    let posicionAnterior = -1;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let tokenIntento = 0;
    let ultimoError = null;
    let erroresReto = 0;
    let demoActiva = false;
    let opcionesActivas = false;
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

    function urlsImagenesCriticas() {
        const urls = [IMG_OJO_GAFAS];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) {
            const e = gameConfig.elementos[id];
            urls.push(e.img);
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
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const audios = [
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ].concat(Object.keys(efectos).map(function (k) { return efectos[k]; }));
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
        if (window.EncuentraParejaSfx) EncuentraParejaSfx.desbloquear();
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

    /* ── Animacion y efectos ─────────────────────────────────── */

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

    /** Cancela WAAPI; sin esto un fill:forwards deja el estímulo desplazado en el siguiente reto. */
    function cancelarAnimaciones(el) {
        if (!el || typeof el.getAnimations !== "function") return;
        el.getAnimations().forEach(function (a) {
            try { a.cancel(); } catch (e) { /* noop */ }
        });
    }

    /** Anima y deja el estado final en estilo en línea (sin acumular fill:forwards). */
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
            const rot = o.sinGiro ? 0 : Math.round(Math.random() * 360);
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

    function efecto(nombre) {
        if (!nombre) return;
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const ruta = efectos[nombre];
        if (ruta) {
            const a = reproducirAudio(ruta, 0.85, false);
            if (a) setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, 3000);
            return;
        }
        if (window.EncuentraParejaSfx) EncuentraParejaSfx.sonar(nombre);
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

    /* ── Estimulo y cable ─────────────────────────────────────── */

    function limpiarClasesIdle(est) {
        CLASES_IDLE.forEach(function (c) { est.classList.remove(c); });
        est.classList.remove("rebota", "vuela", "arrastrando");
    }

    function mostrarEstimulo(id) {
        const e = elemento(id);
        const est = $id("estimulo");
        const img = $id("estimulo-img");
        if (!e.img) return;
        cancelarAnimaciones(est);
        limpiarClasesIdle(est);
        img.src = e.img;
        img.alt = e.nombre || id;
        if (e.idle) est.classList.add(e.idle);
        est.hidden = false;
        est.style.transform = "";
        est.style.opacity = "";
        if (e.sonidoIdle) efecto(e.sonidoIdle);
    }

    function ocultarEstimulo() {
        const est = $id("estimulo");
        cancelarAnimaciones(est);
        limpiarClasesIdle(est);
        est.hidden = true;
        est.style.transform = "";
        est.style.opacity = "";
        ocultarCable();
    }

    function pintarCable(x1, y1, x2, y2) {
        const svg = $id("cable");
        svg.hidden = false;
        svg.innerHTML =
            '<line class="cable-linea" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }

    function ocultarCable() {
        const svg = $id("cable");
        svg.hidden = true;
        svg.innerHTML = "";
    }

    function limpiarDestinosArrastre() {
        $id("opciones").querySelectorAll(".destino").forEach(function (o) { o.classList.remove("destino"); });
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
            sumar(r.presentacion);
            sumar(r.acierto);
            sumar(r.errorOtro);
            (r.errores || []).forEach(sumar);
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
        posicionAnterior = -1;
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
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        document.body.classList.toggle("laboratorio-sensorial", String(nivelElegido.id) === "5");
        $id("opciones").innerHTML = "";
        ocultarEstimulo();
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
                p.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }

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

    async function llegarOpciones(lista) {
        const cont = $id("opciones");
        cont.className = "opciones cant-" + Math.max(2, Math.min(6, lista.length));
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

    function pintarPista() {
        if (!reto || erroresReto < 3) return;
        const t = opcionDe(reto.correcto);
        if (t) t.classList.add("pista");
    }

    function puedeResponder(el) {
        if (!opcionesActivas || demoActiva || juegoTerminado || !reto) return false;
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

    function enlazarArrastreEstimulo() {
        const est = $id("estimulo");
        let inicio = null;
        let arrastrando = false;
        let opcionSobre = null;

        est.addEventListener("pointerdown", function (ev) {
            if (!opcionesActivas || demoActiva || juegoTerminado || !reto) return;
            if (fase !== "jugar" && fase !== "error") return;
            inicio = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
            try { est.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });

        est.addEventListener("pointermove", function (ev) {
            if (!inicio || inicio.id !== ev.pointerId) return;
            const dx = ev.clientX - inicio.x;
            const dy = ev.clientY - inicio.y;
            if (!arrastrando && L.clasificarGesto(dx, dy) === "arrastre") {
                arrastrando = true;
                est.classList.add("arrastrando");
            }
            if (!arrastrando) return;
            const c0 = centroDe(est);
            pintarCable(c0.x, c0.y, ev.clientX, ev.clientY);
            limpiarDestinosArrastre();
            opcionSobre = null;
            Array.prototype.forEach.call($id("opciones").children, function (op) {
                const r = op.getBoundingClientRect();
                if (L.dentro({ x: ev.clientX, y: ev.clientY }, r, 14)) {
                    op.classList.add("destino");
                    opcionSobre = op;
                }
            });
        });

        function terminar(ev) {
            if (!inicio || inicio.id !== ev.pointerId) return;
            try { est.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            ocultarCable();
            est.classList.remove("arrastrando");
            if (arrastrando && opcionSobre && puedeResponder(opcionSobre)) {
                intentar(opcionSobre);
            }
            inicio = null;
            arrastrando = false;
            limpiarDestinosArrastre();
            opcionSobre = null;
        }

        est.addEventListener("pointerup", terminar);
        est.addEventListener("pointercancel", terminar);
    }

    /* ── Pista sin voz tras inactividad ───────────────────────── */

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

    /** La mano toca el organo correcto (no revela con voz). */
    function pistaOrganoCorrecto(g) {
        if (!window.PedniaTutorial || fase !== "jugar" || !reto) return Promise.resolve();
        const el = opcionDe(reto.correcto);
        if (!el) return Promise.resolve();
        return PedniaTutorial.animarMano({
            punto: el,
            holdMs: 480,
            cancelado: function () { return pista.gen !== g || fase !== "jugar"; },
            onPresionar: function () { reiniciarClase(el, "toca", 450); }
        });
    }

    function pistaTrasError(g) {
        if (!window.PedniaTutorial || fase !== "jugar") return Promise.resolve();
        const alEstimulo = erroresReto % 2 === 1;
        const punto = alEstimulo ? $id("estimulo") : opcionDe(reto.correcto);
        if (!punto) return Promise.resolve();
        return PedniaTutorial.animarMano({
            punto: punto,
            holdMs: 460,
            cancelado: function () { return pista.gen !== g || fase !== "jugar"; },
            onPresionar: function () {
                if (alEstimulo) {
                    const e = elemento(reto.estimulo);
                    if (e.sonidoIdle) efecto(e.sonidoIdle);
                    else reiniciarClase(punto, "repica", 600);
                } else {
                    reiniciarClase(punto, "toca", 450);
                }
            }
        });
    }

    /* ── Flujo de reto ────────────────────────────────────────── */

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        erroresReto = 0;
        ordenOpciones = L.ordenarOpciones(reto.opciones, reto.correcto, posicionAnterior);
        posicionAnterior = ordenOpciones.indexOf(reto.correcto);
        pintarProgreso(indiceReto);
        await presentar(gen);
    }

    async function presentar(gen) {
        fase = "presentacion";
        ultimoError = null;
        opcionesActivas = false;
        cancelarPista();
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };

        if ($id("opciones").children.length) await retirarOpciones();
        if (!sigue()) return;
        mostrarEstimulo(reto.estimulo);
        if (!sigue()) return;
        await sleep(400);
        if (!sigue()) return;
        await decir(reto.presentacion);
        if (!sigue()) return;
        await llegarOpciones(ordenOpciones);
        if (!sigue()) return;
        opcionesActivas = true;
        fase = "jugar";
        pintarPista();
        programarPista(pistaOrganoCorrecto, 9000);
    }

    async function intentar(el) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const id = el.dataset.id;
        const r = L.evaluar(reto, id);
        fase = "animando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        reiniciarClase(el, "toca", 450);
        ocultarCable();
        limpiarDestinosArrastre();

        if (r === "correcto") {
            opcionesActivas = false;
            await responderAcierto(gen, el);
            if (!vivo(gen)) return;
            if (reto.acierto && reto.acierto.texto) await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }

        erroresReto += 1;
        ultimoError = el;
        fase = "error";
        reiniciarClase(el, "tiembla", 600);
        const err = L.errorPara(reto, id);
        efecto(err && err.efecto ? err.efecto : "suave");
        reiniciarClase($id("estimulo"), "rebota", 550);
        pintarPista();
        if (err) await decir(err);
        else await sleep(650);
        if (!sigue()) return;
        fase = "jugar";
        await pistaTrasError(pista.gen);
        programarPista(pistaOrganoCorrecto, 9000);
    }

    async function completarReto(gen) {
        fase = "completo";
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        celebrarPersonajes(false);
        ocultarEstimulo();
        await retirarOpciones();
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Acierto: vuelo, animaciones, verificacion ─────────────── */

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

    async function volarEstimuloHacia(elOrg) {
        const est = $id("estimulo");
        cancelarAnimaciones(est);
        const c0 = centroDe(est);
        const c1 = centroDe(elOrg);
        const dx = c1.x - c0.x;
        const dy = c1.y - c0.y;
        est.classList.add("vuela");
        await animarFijo(est, [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: "translate(" + dx + "px, " + dy + "px) scale(0.45)", opacity: 0.85 }
        ], { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)" });
    }

    function ondasDeOido(el) {
        const c = centroDe(el);
        for (let i = 0; i < 3; i++) {
            setTimeout(function () {
                particulas(c.x, c.y, {
                    n: 8,
                    tipo: "estrella",
                    dist: 50 + i * 18,
                    angulo: -Math.PI / 2,
                    abanico: 2.4,
                    colores: ["#66d9e8", "#15aabf", "#ffd43b"],
                    ms: 700
                });
            }, i * 220);
        }
    }

    function mostrarEcualizador(el) {
        const eq = document.createElement("div");
        eq.className = "ecualizador";
        eq.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement("span");
            bar.style.height = (10 + Math.random() * 18) + "px";
            eq.appendChild(bar);
        }
        el.appendChild(eq);
        setTimeout(function () { if (eq.parentNode) eq.remove(); }, 2600);
    }

    async function animacionAcierto(el, nombre) {
        const img = el.querySelector(".opcion-img");
        switch (nombre) {
            case "vuelaOido":
                el.classList.add("escucha", "correcta", "brilla", "animando");
                ondasDeOido(el);
                await sleep(1400);
                break;
            case "aspira":
                el.classList.add("aspira", "correcta", "brilla", "animando");
                {
                    const c = centroDe(el);
                    particulas(c.x, c.y - 20, { n: 16, tipo: "corazon", dist: 100, angulo: -Math.PI / 2, abanico: 1.8, ms: 1100 });
                }
                await sleep(1500);
                break;
            case "lenguetazo":
                el.classList.add("saborea", "correcta", "brilla", "animando");
                await sleep(1400);
                break;
            case "gafas":
                el.classList.add("mira", "correcta", "brilla", "animando");
                if (img) {
                    const original = img.src;
                    img.src = IMG_OJO_GAFAS;
                    await sleep(2800);
                    img.src = original;
                } else {
                    await sleep(1400);
                }
                break;
            case "une":
            default:
                el.classList.add("correcta", "brilla", "animando");
                reiniciarClase(el, "salta", 1000);
                await sleep(1100);
        }
    }

    async function responderAcierto(gen, el) {
        const a = reto.acierto || {};
        fase = "celebrando";
        Array.prototype.forEach.call($id("opciones").children, function (b) {
            b.classList.remove("pista", "destino");
            if (b !== el) b.classList.add("apagada");
        });

        await volarEstimuloHacia(el);
        if (!vivo(gen)) return;

        await animacionAcierto(el, a.animacion);
        if (!vivo(gen)) return;

        efecto(a.efecto);
        if (a.verificacion === "ecualizador") mostrarEcualizador(el);

        const c = centroDe(el);
        particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
        await sleep(500);
    }

    /* ── Demostracion (tambor -> oido) ────────────────────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.estimulo || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        const t = textos();
        const cancelado = function () { return !demoActiva || !vivo(gen); };

        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (cancelado()) return;

        mostrarEstimulo(d.estimulo);
        const est = $id("estimulo");
        const eDemo = elemento(d.estimulo);
        await PedniaTutorial.animarMano({
            punto: est,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                if (eDemo.sonidoIdle) efecto(eDemo.sonidoIdle);
                else reiniciarClase(est, eDemo.idle || "repica", 700);
            }
        });
        if (cancelado()) return;
        await sleep(350);
        await llegarOpciones(L.ordenarOpciones(d.opciones, d.correcto, -1));
        if (cancelado()) return;

        const el = opcionDe(d.correcto);
        await PedniaTutorial.animarMano({
            punto: el,
            holdMs: 450,
            cancelado: cancelado,
            onPresionar: function () {
                reiniciarClase(el, "toca", 450);
                if (eDemo.sonidoIdle) efecto(eDemo.sonidoIdle);
            }
        });
        if (cancelado()) return;

        el.classList.add("brilla", "correcta");
        await volarEstimuloHacia(el);
        el.classList.add("escucha");
        ondasDeOido(el);
        efecto("recompensa");
        const c = centroDe(el);
        particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });

        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        ocultarEstimulo();
        await retirarOpciones();
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre y tablero 5-6 ────────────────────────────── */

    async function escenaTableroSensorial() {
        const tab = $id("tablero-sensorial");
        if (!tab) return;
        tab.hidden = false;
        tab.setAttribute("aria-hidden", "false");
        const secuencia = ["oido", "ojo", "nariz", "lengua", "mano", "cerebro"];
        for (let i = 0; i < secuencia.length; i++) {
            const org = secuencia[i];
            const nodo = tab.querySelector('.tablero-nodo[data-org="' + org + '"]');
            if (nodo) nodo.classList.add("encendido");
            if (window.PedniaTutorial && nodo) {
                await PedniaTutorial.animarMano({
                    punto: nodo,
                    holdMs: 320,
                    cancelado: function () { return juegoTerminado; }
                });
            }
            await sleep(org === "cerebro" ? 450 : 320);
        }
        await sleep(2500);
        tab.querySelectorAll(".tablero-nodo").forEach(function (n) { n.classList.remove("encendido"); });
        tab.hidden = true;
        tab.setAttribute("aria-hidden", "true");
    }

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        celebrarPersonajes(true);
        fiesta(centroDe($id("zona-estimulo") || $id("centro")));
        await sleep(1200);
        if (gen !== rondaGen) return;
        if (nivelElegido && nivelElegido.cierreEscena === "tablero") {
            await escenaTableroSensorial();
        }
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
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        });
    }

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
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelInicial = nivelDeSesion();
        if (nivelInicial && String(nivelInicial.id) === "5") {
            document.body.classList.add("laboratorio-sensorial");
            document.querySelectorAll(".inicio-el img[data-laboratorio]").forEach(function (img) {
                img.src = img.dataset.laboratorio;
            });
        }

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EncuentraLaPareja] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarOpciones();
        enlazarArrastreEstimulo();
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
