/* Busca las diferencias — Multisensorial */
(function () {
    "use strict";

    const L = window.BuscaDiferenciasLogica;
    const LADOS = ["A", "B"];

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let escena = null;
    let indiceReto = 0;
    let reto = null;
    let encontrados = Object.create(null);
    let juegoTerminado = false;
    let bloqueado = true;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let timersReto = [];
    let lupaPunto = null;
    let ultimoGuino = 0;
    let gesto = null;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;
    let demoActiva = false;

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
        const urls = [];
        Object.keys(gameConfig.escenas || {}).forEach(function (k) {
            const e = gameConfig.escenas[k];
            urls.push(e.fondo);
            Object.keys(e.elementos || {}).forEach(function (id) { urls.push(e.elementos[id].img); });
        });
        (gameConfig.niveles || []).forEach(function (n) {
            (n.retos || []).forEach(function (r) {
                Object.keys(r.cambiosB || {}).forEach(function (id) {
                    if (r.cambiosB[id]) urls.push(r.cambiosB[id]);
                });
            });
        });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../../images/victoria.gif",
            "../../../images/nube.png",
            "../../../images/zoe_hablando.gif",
            "../../../images/zeus_hablando.gif"
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
        if (window.BuscaDiferenciasSfx) BuscaDiferenciasSfx.desbloquear();
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

    function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = crearImg(src, "vuelo");
        $id("capa-efectos").appendChild(el);
        const frames = [{
            left: desde.left + "px", top: desde.top + "px", width: desde.width + "px", height: desde.height + "px",
            transform: "rotate(0deg)"
        }];
        if (opts.arco) {
            frames.push({
                offset: 0.5,
                left: (desde.left + hasta.left) / 2 + "px",
                top: Math.min(desde.top, hasta.top) - opts.arco + "px",
                width: (desde.width + hasta.width) / 2 * (opts.escalaMedia || 1) + "px",
                height: (desde.height + hasta.height) / 2 * (opts.escalaMedia || 1) + "px",
                transform: "rotate(" + ((opts.giro || 0) / 2) + "deg)"
            });
        }
        frames.push({
            left: hasta.left + "px", top: hasta.top + "px", width: hasta.width + "px", height: hasta.height + "px",
            transform: "rotate(" + (opts.giro || 0) + "deg)"
        });
        return animar(el, frames, { duration: opts.ms || 650, easing: opts.easing || "cubic-bezier(.3,.7,.3,1)" })
            .then(function () { el.remove(); });
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
            const rot = o.sinGiro ? 0 : Math.round(Math.random() * 360);
            animar(p, [
                { transform: "translate(-50%,-50%) rotate(" + (o.sinGiro ? Math.round(ang * 180 / Math.PI) : 0) + "deg) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) rotate(" + (o.sinGiro ? Math.round(ang * 180 / Math.PI) : rot) + "deg) scale(.35)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)", delay: (o.escalonado || 0) * i })
                .then(function () { p.remove(); });
        }
    }

    function programar(fn, ms) {
        const id = setTimeout(fn, ms);
        timersReto.push(id);
        return id;
    }

    function limpiarTimers() {
        timersReto.forEach(function (id) { clearTimeout(id); });
        timersReto = [];
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
        if (window.BuscaDiferenciasSfx) BuscaDiferenciasSfx.sonar(nombre);
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
            sumar(r.presentacion);
            sumar(r.acierto);
            sumar(r.error);
        });
        sumar(nivel.error);
        sumar(nivel.cierre);
        return lineas;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        escena = gameConfig.escenas[nivelElegido.escena];
        indiceReto = 0;
        $id("etiq-A").textContent = nivelElegido.etiquetas.A;
        $id("etiq-B").textContent = nivelElegido.etiquetas.B;
        prepararHallazgos();
        crearLupas();
        Promise.resolve(imagenesPromise).then(function () { iniciarDemo(gen); });
    };

    /* ── Escena por capas ─────────────────────────────────────── */

    function stackDe(lado) {
        return $id("escena-" + lado);
    }

    function ponerRect(el, r) {
        el.style.left = (r.x / L.ESCENA.w) * 100 + "%";
        el.style.top = (r.y / L.ESCENA.h) * 100 + "%";
        el.style.width = (r.w / L.ESCENA.w) * 100 + "%";
        el.style.height = (r.h / L.ESCENA.h) * 100 + "%";
    }

    function pintarLado(lado) {
        const stack = stackDe(lado);
        stack.querySelectorAll(".capa").forEach(function (el) { el.remove(); });
        const lupa = stack.querySelector(".lupa");
        const fondo = crearImg(escena.fondo, "capa capa-fondo");
        stack.insertBefore(fondo, lupa);
        const mapa = L.elementosLado(escena, reto, lado, encontrados);
        Object.keys(escena.elementos).forEach(function (id) {
            if (!mapa[id]) return;
            const el = escena.elementos[id];
            const capa = crearImg(mapa[id], "capa");
            capa.dataset.el = id;
            if (lado === "A" && el.animacionA) capa.classList.add("anim-" + el.animacionA);
            ponerRect(capa, el);
            stack.insertBefore(capa, lupa);
        });
    }

    function pintarEscenas() {
        LADOS.forEach(pintarLado);
        refrescarLupas();
    }

    function capaDe(lado, id) {
        return stackDe(lado).querySelector('.capa[data-el="' + id + '"]');
    }

    /** Rectángulo en pantalla (px) de un rectángulo de escena en el lado indicado. */
    function rectPantalla(lado, r) {
        const s = stackDe(lado).getBoundingClientRect();
        return {
            left: s.left + (r.x / L.ESCENA.w) * s.width,
            top: s.top + (r.y / L.ESCENA.h) * s.height,
            width: (r.w / L.ESCENA.w) * s.width,
            height: (r.h / L.ESCENA.h) * s.height
        };
    }

    function centroPantalla(lado, r) {
        const p = rectPantalla(lado, r);
        return { x: p.left + p.width / 2, y: p.top + p.height / 2 };
    }

    function elementoDe(obj) {
        return escena.elementos[obj.elemento];
    }

    /* ── Lupa Dúo / Lupa Doble ────────────────────────────────── */

    function crearLupas() {
        const cfg = nivelElegido.lupa;
        LADOS.forEach(function (lado) {
            const stack = stackDe(lado);
            const vieja = stack.querySelector(".lupa");
            if (vieja) vieja.remove();
            const lupa = document.createElement("div");
            lupa.className = "lupa" + (cfg.alTocar ? "" : " visor");
            lupa.hidden = true;
            lupa.innerHTML =
                '<div class="lupa-lente"><div class="lupa-vista"></div>' +
                (cfg.reticula ? '<div class="lupa-reticula"></div>' : "") +
                '<span class="lupa-etiqueta" hidden></span></div>' +
                '<div class="lupa-mango"></div>';
            stack.appendChild(lupa);
        });
    }

    function refrescarLupas() {
        LADOS.forEach(function (lado) {
            const stack = stackDe(lado);
            const vista = stack.querySelector(".lupa-vista");
            if (!vista) return;
            vista.innerHTML = "";
            stack.querySelectorAll(".capa").forEach(function (capa) {
                vista.appendChild(capa.cloneNode(true));
            });
        });
        if (lupaPunto) moverLupa(lupaPunto);
    }

    function moverLupa(p) {
        lupaPunto = p;
        const zoom = L.zoomLupa(p, nivelElegido, reto);
        const etiqueta = reto && reto.reticula && L.dentro(p, reto.reticula.zona) ? reto.reticula.etiqueta : "";
        LADOS.forEach(function (lado) {
            const stack = stackDe(lado);
            const lupa = stack.querySelector(".lupa");
            if (!lupa) return;
            const w = stack.clientWidth;
            const h = stack.clientHeight;
            const d = Math.round(w * nivelElegido.lupa.diametro);
            const px = (p.x / L.ESCENA.w) * w;
            const py = (p.y / L.ESCENA.h) * h;
            lupa.hidden = false;
            lupa.style.left = px + "px";
            lupa.style.top = py + "px";
            lupa.style.width = d + "px";
            lupa.style.height = d + "px";
            const vista = lupa.querySelector(".lupa-vista");
            vista.style.width = w * zoom + "px";
            vista.style.height = h * zoom + "px";
            vista.style.left = d / 2 - px * zoom - 5 + "px";
            vista.style.top = d / 2 - py * zoom - 5 + "px";
            const etq = lupa.querySelector(".lupa-etiqueta");
            etq.hidden = !etiqueta;
            etq.textContent = etiqueta;
        });
        revisarDescubrimiento(p);
    }

    function ocultarLupas() {
        lupaPunto = null;
        LADOS.forEach(function (lado) {
            const lupa = stackDe(lado).querySelector(".lupa");
            if (lupa) lupa.hidden = true;
        });
    }

    /** 3-4, reto del sol: al pasar la lupa por el cielo vacío, el sol de A guiña y lanza un destello. */
    function revisarDescubrimiento(p) {
        if (!reto || !reto.descubrimiento || fase !== "elegir") return;
        const obj = reto.objetivos[0];
        if (encontrados[obj.id]) return;
        const zona = L.zonaTactil(L.rectObjetivo(escena, obj), nivelElegido.minimo);
        if (!L.dentro(p, zona)) return;
        const ahora = Date.now();
        if (ahora - ultimoGuino < 2600) return;
        ultimoGuino = ahora;
        const capa = capaDe("A", obj.elemento);
        if (capa) {
            capa.classList.remove("guina");
            void capa.offsetWidth;
            capa.classList.add("guina");
            programar(function () { capa.classList.remove("guina"); }, 950);
        }
        efecto("guino");
        const r = elementoDe(obj);
        const desde = centroPantalla("A", r);
        const hasta = centroPantalla("B", r);
        const destello = document.createElement("div");
        destello.className = "brillo-guino";
        destello.style.left = desde.x + "px";
        destello.style.top = desde.y + "px";
        destello.style.width = destello.style.height = rectPantalla("A", r).width * 1.4 + "px";
        $id("capa-efectos").appendChild(destello);
        animar(destello, [
            { transform: "translate(-50%,-50%) scale(.4)", opacity: 1 },
            { transform: "translate(calc(-50% + " + (hasta.x - desde.x) * 0.55 + "px), -50%) scale(1)", opacity: 0.9, offset: 0.6 },
            { transform: "translate(calc(-50% + " + (hasta.x - desde.x) + "px), -50%) scale(.6)", opacity: 0 }
        ], { duration: 1100, easing: "ease-out" }).then(function () { destello.remove(); });
    }

    function barridoLupa(cfg, gen) {
        return new Promise(function (resolve) {
            const t0 = performance.now();
            const ms = reducirMovimiento() ? 200 : cfg.ms;
            const paso = function (t) {
                if (gen !== rondaGen) { resolve(); return; }
                const k = Math.min(1, (t - t0) / ms);
                const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                moverLupa({
                    x: cfg.desde.x + (cfg.hasta.x - cfg.desde.x) * e,
                    y: cfg.desde.y + (cfg.hasta.y - cfg.desde.y) * e
                });
                if (k < 1) requestAnimationFrame(paso);
                else resolve();
            };
            requestAnimationFrame(paso);
        });
    }

    /* ── Toques: tocar responde, arrastrar mueve la lupa ──────── */

    function enlazarPaneles() {
        LADOS.forEach(function (lado) {
            const frame = $id("frame-" + lado);
            const punto = function (ev) {
                return L.puntoEscena(ev.clientX, ev.clientY, stackDe(lado).getBoundingClientRect());
            };
            frame.addEventListener("pointerdown", function (ev) {
                if (fase !== "elegir" || juegoTerminado || gesto) return;
                gesto = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, arrastre: false };
                try { frame.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                if (nivelElegido.lupa.alTocar) moverLupa(punto(ev));
            });
            frame.addEventListener("pointermove", function (ev) {
                if (!gesto || gesto.id !== ev.pointerId || fase !== "elegir") return;
                if (!gesto.arrastre && L.clasificarGesto(ev.clientX - gesto.x0, ev.clientY - gesto.y0) === "arrastre") {
                    gesto.arrastre = true;
                }
                if (gesto.arrastre) moverLupa(punto(ev));
            });
            frame.addEventListener("pointerup", function (ev) {
                if (!gesto || gesto.id !== ev.pointerId) return;
                const g = gesto;
                gesto = null;
                const p = punto(ev);
                if (!g.arrastre) {
                    responder(p);
                } else if (reto && reto.soltarLupa && fase === "elegir" &&
                    L.objetivoEn(p, escena, reto, encontrados, nivelElegido.minimo)) {
                    responder(p);
                }
            });
            frame.addEventListener("pointercancel", function () { gesto = null; });
        });
        window.addEventListener("resize", function () {
            if (lupaPunto) moverLupa(lupaPunto);
        });
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (gen !== rondaGen || juegoTerminado) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre();
            return;
        }
        encontrados = Object.create(null);
        fase = "";
        bloqueado = true;
        limpiarTimers();
        ocultarLupas();
        pintarEscenas();
        if (!nivelElegido.lupa.alTocar) moverLupa({ x: L.ESCENA.w / 2, y: L.ESCENA.h / 2 });
        await decir(reto.presentacion);
        if (gen !== rondaGen) return;
        if (reto.autoLupa) await barridoLupa(reto.autoLupa, gen);
        if (gen !== rondaGen) return;
        fase = "elegir";
        bloqueado = false;
    }

    async function responder(p) {
        if (bloqueado || fase !== "elegir" || juegoTerminado) return;
        const gen = rondaGen;
        const id = L.objetivoEn(p, escena, reto, encontrados, nivelElegido.minimo);
        bloqueado = true;
        if (!id) {
            await decir(reto.error || nivelElegido.error, { estado: "error" });
            if (gen === rondaGen && fase === "elegir") bloqueado = false;
            return;
        }
        fase = "";
        encontrados[id] = true;
        const obj = reto.objetivos.find(function (o) { return o.id === id; });
        const puntoLupa = lupaPunto;
        ocultarLupas();
        if (obj.previo && PREVIOS[obj.previo]) await PREVIOS[obj.previo](obj);
        await REACCIONES[obj.reaccion](obj);
        pintarLado("B");
        refrescarLupas();
        if (gen !== rondaGen) return;
        if (!L.retoCompleto(reto, encontrados)) {
            if (puntoLupa) moverLupa(puntoLupa);
            fase = "elegir";
            bloqueado = false;
            return;
        }
        ocultarLupas();
        await decir(reto.acierto, { estado: "acierto" });
        if (gen !== rondaGen) return;
        if (nivelElegido.contador) encenderRanura(indiceReto);
        await sleep(350);
        await deslizarBsobreA();
        if (gen !== rondaGen) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /** Al terminar cada reto la imagen B se desliza sobre la A: ya son idénticas. */
    async function deslizarBsobreA() {
        const panelA = $id("panel-A");
        const panelB = $id("panel-B");
        const dx = panelA.getBoundingClientRect().left - panelB.getBoundingClientRect().left;
        panelB.classList.add("desliza");
        efecto("deslizar");
        await animarFijo(panelB, [
            { transform: "translateX(0)" },
            { transform: "translateX(" + dx + "px)" }
        ], { duration: 1100, easing: "ease-in-out" });
        await sleep(900);
        await animarFijo(panelB, [
            { transform: "translateX(" + dx + "px)" },
            { transform: "translateX(0)" }
        ], { duration: 700, easing: "ease-in-out" });
        panelB.style.transform = "";
        panelB.classList.remove("desliza");
    }

    /* ── Contador de hallazgos (5-6) ──────────────────────────── */

    function prepararHallazgos() {
        const aside = $id("hallazgos");
        aside.innerHTML = "";
        aside.hidden = !nivelElegido.contador;
        for (let i = 0; i < (nivelElegido.contador || 0); i++) {
            const r = document.createElement("span");
            r.className = "ranura";
            r.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
            aside.appendChild(r);
        }
    }

    function encenderRanura(i) {
        const r = $id("hallazgos").children[i];
        if (!r) return;
        r.classList.add("activa");
        efecto("magia");
    }

    /* ── Marcas sobre la escena ───────────────────────────────── */

    function crearMarca(lado, r, clase, factor) {
        const stack = stackDe(lado);
        const w = stack.clientWidth;
        const lado_px = Math.max(r.w, r.h) / L.ESCENA.w * w * (factor || 1.5);
        const m = document.createElement("div");
        m.className = "marca " + clase;
        m.style.left = ((r.x + r.w / 2) / L.ESCENA.w) * 100 + "%";
        m.style.top = ((r.y + r.h / 2) / L.ESCENA.h) * 100 + "%";
        m.style.width = m.style.height = lado_px + "px";
        stack.appendChild(m);
        return m;
    }

    function quitarMarcas() {
        document.querySelectorAll(".marca, .marca-texto").forEach(function (m) { m.remove(); });
    }

    const PREVIOS = {
        /** 3-4 pelota: un círculo mágico encierra ambas pelotas mostrando el contraste. */
        circuloVerificacion: async function (obj) {
            const r = elementoDe(obj);
            LADOS.forEach(function (lado) { crearMarca(lado, r, "marca-circulo", 1.5); });
            efecto("magia");
            await sleep(1500);
            quitarMarcas();
        },
        /** 5-6 sol: círculo objetivo en la Pantalla B con ¡bip-bip! */
        target: async function (obj) {
            crearMarca("B", elementoDe(obj), "marca-target", 1.2);
            efecto("bipbip");
            await sleep(1000);
        },
        /** 5-6 balón: el visor ejecuta el análisis espectral de color. */
        analisis: async function (obj) {
            const r = elementoDe(obj);
            moverLupa(L.centro(r));
            LADOS.forEach(function (lado) { crearMarca(lado, r, "marca-analisis", 1.5); });
            efecto("escaner");
            await sleep(1300);
            const texto = document.createElement("div");
            texto.className = "marca-texto";
            texto.textContent = "¡Análisis completado!";
            texto.style.left = ((r.x + r.w / 2) / L.ESCENA.w) * 100 + "%";
            texto.style.top = (Math.max(0, r.y - 40) / L.ESCENA.h) * 100 + "%";
            stackDe("B").appendChild(texto);
            efecto("bipbip");
            await sleep(1100);
            quitarMarcas();
            ocultarLupas();
        }
    };

    /* ── Reacciones del documento ─────────────────────────────── */

    function rebotarJuntas(id) {
        efecto("bote");
        return Promise.all(LADOS.map(function (lado) {
            return animar(capaDe(lado, id), [
                { transform: "translateY(0)" },
                { transform: "translateY(-38%)", offset: 0.3 },
                { transform: "translateY(0)", offset: 0.55 },
                { transform: "translateY(-14%)", offset: 0.78 },
                { transform: "translateY(0)" }
            ], { duration: 800, easing: "ease-in-out" });
        }));
    }

    function girarYCambiar(capa, src, vueltas, ms) {
        programar(function () { capa.src = src; }, ms / 2);
        return animar(capa, [
            { transform: "rotate(0deg)" },
            { transform: "rotate(" + 360 * vueltas + "deg)" }
        ], { duration: ms, easing: "ease-in-out" });
    }

    const REACCIONES = {
        /** 3-4 sol: vuela como pegatina mágica de A a B con explosión de chispas. */
        pegatina: async function (obj) {
            const r = elementoDe(obj);
            efecto("magia");
            await volar(r.img, rectPantalla("A", r), rectPantalla("B", r), { arco: 70, giro: 360, ms: 1100, escalaMedia: 1.3 });
            pintarLado("B");
            const c = centroPantalla("B", r);
            efecto("chispas");
            particulas(c.x, c.y, { n: 24, tipo: "estrella", dist: 130 });
            await animar(capaDe("B", obj.elemento), [
                { transform: "scale(1.35)" },
                { transform: "scale(0.92)", offset: 0.6 },
                { transform: "scale(1)" }
            ], { duration: 500 });
        },
        /** 3-4 flor: brota de la tierra bailando y soltando polen (¡Boing-pop!). */
        brota: async function (obj) {
            const r = elementoDe(obj);
            pintarLado("B");
            const capa = capaDe("B", obj.elemento);
            capa.style.transformOrigin = "50% 100%";
            efecto("boingpop");
            const c = centroPantalla("B", r);
            particulas(c.x, c.y - 10, { n: 18, tipo: "polen", angulo: -Math.PI / 2, abanico: 1.8, dist: 90, ms: 1300 });
            programar(function () {
                particulas(c.x, c.y - 10, { n: 14, tipo: "polen", angulo: -Math.PI / 2, abanico: 2.2, dist: 80, ms: 1300 });
            }, 600);
            await animar(capa, [
                { transform: "scaleY(0)" },
                { transform: "scaleY(1.25)", offset: 0.35 },
                { transform: "rotate(-12deg)", offset: 0.55 },
                { transform: "rotate(10deg)", offset: 0.75 },
                { transform: "rotate(-5deg)", offset: 0.88 },
                { transform: "rotate(0deg)" }
            ], { duration: 1300, easing: "ease-out" });
        },
        /** 3-4 pelota: gira como trompo y se pinta de rojo y amarillo (¡Swoosh-splash!); ambas rebotan. */
        trompo: async function (obj) {
            const r = elementoDe(obj);
            efecto("swooshsplash");
            await girarYCambiar(capaDe("B", obj.elemento), r.img, 3, 1000);
            const c = centroPantalla("B", r);
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 80 });
            await rebotarJuntas(obj.elemento);
        },
        /** 5-6 sol: el sol de A lanza un rayo de luz que pinta el sol en B. */
        rayo: async function (obj) {
            const r = elementoDe(obj);
            const a = centroPantalla("A", r);
            const b = centroPantalla("B", r);
            const largo = Math.hypot(b.x - a.x, b.y - a.y);
            const rayo = document.createElement("div");
            rayo.className = "rayo";
            rayo.style.left = a.x + "px";
            rayo.style.top = a.y + "px";
            rayo.style.width = largo + "px";
            const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            $id("capa-efectos").appendChild(rayo);
            efecto("rayo");
            await animar(rayo, [
                { transform: "rotate(" + ang + "deg) scaleX(0)" },
                { transform: "rotate(" + ang + "deg) scaleX(1)" }
            ], { duration: 450, easing: "ease-in" });
            quitarMarcas();
            pintarLado("B");
            efecto("chispas");
            particulas(b.x, b.y, { n: 18, tipo: "estrella", dist: 110 });
            const capa = capaDe("B", obj.elemento);
            const pinta = animar(capa, [
                { opacity: 0, transform: "scale(.5)" },
                { opacity: 1, transform: "scale(1.2)", offset: 0.6 },
                { opacity: 1, transform: "scale(1)" }
            ], { duration: 600 });
            await animar(rayo, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
            rayo.remove();
            await pinta;
        },
        /** 5-6 balón: gira a toda velocidad entre chispas (¡Swoosh!) y recupera rojo y verde; bote coordinado. */
        giroChispas: async function (obj) {
            const r = elementoDe(obj);
            const c = centroPantalla("B", r);
            efecto("swoosh");
            particulas(c.x, c.y, { n: 26, tipo: "estrella", dist: 90, escalonado: 30 });
            await girarYCambiar(capaDe("B", obj.elemento), r.img, 5, 1000);
            await rebotarJuntas(obj.elemento);
        },
        /** 5-6 flores: chispas mágicas verdes y las flores se mueven (B vuelve a ser igual a A). */
        chispasMover: async function (obj) {
            const r = elementoDe(obj);
            const c = centroPantalla("B", r);
            efecto("chispas");
            particulas(c.x, c.y, { n: 20, tipo: "verde", dist: 80 });
            const capaB = capaDe("B", obj.elemento);
            programar(function () { capaB.src = r.img; }, 500);
            await Promise.all(LADOS.map(function (lado) {
                const capa = capaDe(lado, obj.elemento);
                capa.style.transformOrigin = "50% 100%";
                return animar(capa, [
                    { transform: "rotate(0deg)" },
                    { transform: "rotate(-14deg)", offset: 0.2 },
                    { transform: "rotate(12deg)", offset: 0.45 },
                    { transform: "rotate(-8deg)", offset: 0.7 },
                    { transform: "rotate(0deg)" }
                ], { duration: 1100, easing: "ease-in-out" });
            }));
        },
        /** 5-6 hoja: brota con viento mágico (¡Fuuush!) y se posiciona en la rama. */
        hojaViento: async function (obj) {
            const r = elementoDe(obj);
            const hasta = rectPantalla("B", r);
            const s = stackDe("B").getBoundingClientRect();
            const desde = { left: s.left + s.width * 0.55, top: hasta.top + s.height * 0.05, width: hasta.width * 0.4, height: hasta.height * 0.4 };
            efecto("fuuush");
            particulas(desde.left, desde.top, { n: 12, tipo: "viento", angulo: -0.25, abanico: 0.4, dist: 140, ms: 1100, sinGiro: true, dispersionY: 40, escalonado: 40 });
            await volar(r.img, desde, hasta, { arco: 30, giro: 720, ms: 1100, escalaMedia: 1.8 });
            pintarLado("B");
            const c = centroPantalla("B", r);
            particulas(c.x, c.y, { n: 12, tipo: "verde", dist: 50 });
            await animar(capaDe("B", obj.elemento), [
                { transform: "scale(1.6)", filter: "drop-shadow(0 0 6px #b2f2bb)" },
                { transform: "scale(1)", filter: "drop-shadow(0 0 0 transparent)" }
            ], { duration: 500 });
        },
        /** 5-6 fruta: la fruta diferente se convierte en la fruta original. */
        frutaCambia: async function (obj) {
            const r = elementoDe(obj);
            const capa = capaDe("B", obj.elemento);
            efecto("magia");
            await animarFijo(capa, [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: 280, easing: "ease-in" });
            capa.src = r.img;
            const c = centroPantalla("B", r);
            particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 50 });
            await animarFijo(capa, [{ transform: "scaleX(0)" }, { transform: "scaleX(1.2)", offset: 0.7 }, { transform: "scaleX(1)" }], { duration: 380, easing: "ease-out" });
        }
    };

    /* ── Demostración (escena propia: no revela ningún reto) ──── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    function terminarDemo(gen) {
        detenerDemo();
        if (gen !== rondaGen) return;
        escena = gameConfig.escenas[nivelElegido.escena];
        indiceReto = 0;
        iniciarReto(gen);
    }

    async function iniciarDemo(gen) {
        const demo = gameConfig.demo;
        const escenaDemo = demo && gameConfig.escenas[demo.escena];
        if (!escenaDemo || !demo.reto || !window.PedniaTutorial) {
            if (demoActiva) detenerDemo();
            escena = gameConfig.escenas[nivelElegido.escena];
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        bloqueado = true;
        await PedniaTutorial.activarDemo();
        escena = escenaDemo;
        reto = demo.reto;
        encontrados = Object.create(null);
        ocultarLupas();
        pintarEscenas();
        if (!nivelElegido.lupa.alTocar) moverLupa({ x: L.ESCENA.w / 2, y: L.ESCENA.h / 2 });
        const cancelado = function () { return !demoActiva || gen !== rondaGen; };
        const t = textos();
        await sleep(450);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (cancelado()) return;

        const obj = reto.objetivos[0];
        const destino = L.centro(elementoDe(obj));
        const inicio = { x: Math.max(30, destino.x - 80), y: Math.min(L.ESCENA.h - 30, destino.y + 90) };
        const pInicio = centroPantalla("B", { x: inicio.x, y: inicio.y, w: 0, h: 0 });
        const pDestino = centroPantalla("B", { x: destino.x, y: destino.y, w: 0, h: 0 });
        const dur = 1400;
        let raf = 0;
        await PedniaTutorial.animarMano({
            punto: pInicio,
            holdMs: 300,
            arrastre: { dx: pDestino.x - pInicio.x, dy: pDestino.y - pInicio.y, durMs: dur, soltarEnDestino: true },
            cancelado: cancelado,
            onPresionar: function () {
                moverLupa(inicio);
                const t0 = performance.now();
                const paso = function (ahora) {
                    if (cancelado()) return;
                    const k = Math.min(1, (ahora - t0) / dur);
                    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                    moverLupa({ x: inicio.x + (destino.x - inicio.x) * e, y: inicio.y + (destino.y - inicio.y) * e });
                    if (k < 1) raf = requestAnimationFrame(paso);
                };
                raf = requestAnimationFrame(paso);
            },
            onSoltar: function () { cancelAnimationFrame(raf); }
        });
        cancelAnimationFrame(raf);
        if (cancelado()) return;
        await PedniaTutorial.animarMano({ punto: pDestino, holdMs: 400, cancelado: cancelado });
        if (cancelado()) return;

        encontrados[obj.id] = true;
        ocultarLupas();
        await REACCIONES[obj.reaccion](obj);
        pintarLado("B");
        refrescarLupas();
        if (cancelado()) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (cancelado()) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        if (cancelado()) return;
        terminarDemo(gen);
    }

    /* ── Cierre ───────────────────────────────────────────────── */

    function granCierre() {
        juegoTerminado = true;
        fase = "";
        bloqueado = true;
        ocultarLupas();
        efecto("fanfarria");
        mostrarCierre();
    }

    function prepararPremio() {
        const premio = nivelElegido.premio || {};
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector("img.trofeo");
        if (!trofeo) return;
        trofeo.style.display = "none";
        const caja = document.createElement("div");
        caja.className = "trofeo premio " + (premio.tipo || "placa");
        caja.innerHTML =
            '<i class="premio-icono fa-solid ' + (premio.tipo === "insignia" ? "fa-medal" : "fa-magnifying-glass") + '"></i>' +
            '<span class="premio-textos"><span class="premio-titulo"></span><strong class="premio-nombre"></strong></span>';
        caja.querySelector(".premio-titulo").textContent = premio.titulo;
        caja.querySelector(".premio-nombre").textContent = premio.nombre;
        contenido.appendChild(caja);
    }

    function mostrarCierre() {
        const cierre = nivelElegido.cierre || { voz: "zoe", texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre.texto;
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
        if (errores.length) console.warn("[BuscaLasDiferencias] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarPaneles();
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
