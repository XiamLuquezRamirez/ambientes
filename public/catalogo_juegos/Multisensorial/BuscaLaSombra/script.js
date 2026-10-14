/* Busca la sombra — Multisensorial */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let retosRonda = [];
    let indiceReto = 0;
    let retoActual = null;
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaToque = false;
    let demoActiva = false;
    let demoTimers = [];
    let rondaGen = 0;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;

    const L = window.BuscaSombraLogica;
    let estadoReto = { errores: 0, pistaActiva: false };
    let timerInactividad = null;
    let gesto = null;
    let hablaToken = 0;

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
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
        const panel = document.getElementById("menu-vol-panel");
        const btn = document.getElementById("btn-menu-vol");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    }

    function pintarMenuVol() {
        const pct = volumenFondoPct();
        const slider = document.getElementById("rango-volumen");
        const val = document.getElementById("vol-val");
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
    }

    function enlazarMenuVol() {
        const btn = document.getElementById("btn-menu-vol");
        const cerrar = document.getElementById("btn-cerrar-vol");
        const slider = document.getElementById("rango-volumen");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                const panel = document.getElementById("menu-vol-panel");
                setMenuVol(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) {
            slider.addEventListener("input", function () {
                const n = Number(slider.value);
                const val = document.getElementById("vol-val");
                if (val) val.textContent = String(n);
                aplicarVolumenCalibrado(n);
            });
        }
        document.addEventListener("pointerdown", function (ev) {
            const menu = document.getElementById("menu-vol");
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

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function metaObj(id) {
        return (gameConfig.objetos && gameConfig.objetos[id]) || {
            nombre: id,
            etiqueta: id,
            img: "",
            sombra: ""
        };
    }

    function plantilla(tpl, vars) {
        return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) {
            return vars[k] != null ? String(vars[k]) : "";
        });
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
        Object.keys(gameConfig.objetos || {}).forEach(function (id) {
            const m = metaObj(id);
            if (m.img) urls.push(m.img);
            if (m.sombra) urls.push(m.sombra);
        });
        Object.keys(gameConfig.escenas || {}).forEach(function (k) {
            if (gameConfig.escenas[k].fondo) urls.push(gameConfig.escenas[k].fondo);
        });
        (gameConfig.niveles || []).forEach(function (n) {
            if (n.premio && n.premio.img) urls.push(n.premio.img);
        });
        return urls;
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [GUIAS.zoe.normal, GUIAS.zoe.hablando, GUIAS.zeus.normal, GUIAS.zeus.hablando];
        const a = gameConfig.audios || {};
        const audios = [a.acierto, a.error, a.cierre, a.fondo];
        Object.keys(a.efectos || {}).forEach(function (k) { audios.push(a.efectos[k]); });
        return Promise.all(urls.map(preloadUrl).concat(audios.filter(Boolean).map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        const frases = [t.cierre, t.enunciado, t.eligeNivel, t.errorGenerico, t.demostracion, t.demostracionFin, t.ayudaRecorrido];
        const linea = function (l) { if (l && l.texto) frases.push(l.texto); };
        (gameConfig.niveles || []).forEach(function (n) {
            frases.push(n.cierre);
            if (n.demo) {
                frases.push(plantilla(DEMO_ACIERTO, { objeto: metaObj(n.demo.objeto).nombre }));
            }
            (n.retos || []).forEach(function (r) {
                linea(r.presentacion);
                linea(r.acierto);
                linea(r.pista);
                Object.keys(r.errores || {}).forEach(function (k) { linea(r.errores[k]); });
                const rec = r.acierto && r.acierto.recompensa;
                if (rec) { linea(rec); linea(rec.llegada); }
            });
            Object.keys(n.final || {}).forEach(function (k) { linea(n.final[k]); });
        });
        return frases.filter(Boolean);
    }


    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    let introDesdeEmpecemos = false;

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
        const root = document.getElementById("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        const root = document.getElementById("intro3d-root");
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
        const root = document.getElementById("intro3d-root");
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
        const pantalla = document.getElementById("pantalla-inicio");
        const btn = document.getElementById("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        TextoVoz.desbloquear();
        if (window.BuscaSombraSfx) BuscaSombraSfx.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        TextoVoz.precargar();
        pantalla.classList.add("is-out");
        introDesdeEmpecemos = true;
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

    function escAttr(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }

    function escHtml(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /* ── Edad / nivel ─────────────────────────────────────────── */

    const DEMO_ACIERTO = "¡Muy bien! Encontraste la sombra de {objeto}.";
    const GUIAS = {
        zoe: { normal: "../../images/zoe_normal.gif", hablando: "../../images/zoe_hablando.gif" },
        zeus: { normal: "../../images/zeus_normal.gif", hablando: "../../images/zeus_hablando.gif" }
    };

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

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        juegoTerminado = false;
        esperandoFeedback = false;
        aceptaToque = false;
        TextoVoz.detener();
        retosRonda = (nivelElegido.retos || []).slice();
        indiceReto = 0;
        aplicarTema();
        pintarProgreso();
        Promise.resolve(imagenesPromise).then(function () {
            if (mostrarIntroActiva()) {
                iniciarDemo(rondaGen);
            } else {
                iniciarConsigna(rondaGen);
            }
        });
    };

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    /* ── Utilidades de escena ─────────────────────────────────── */

    function nivel() { return nivelElegido || {}; }
    function esLaboratorio() { return nivel().tema === "laboratorio"; }
    function reglasPista() { return nivel().pista || { errores: 2 }; }

    function reducirMovimiento() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function capa() { return document.getElementById("capa-efectos"); }

    function centro(r) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function setEnunciado(texto) {
        const el = document.getElementById("enunciado");
        if (el) el.textContent = texto || "";
    }

    function efecto(nombre, respaldo) {
        const a = gameConfig.audios || {};
        const archivo = a.efectos && a.efectos[nombre];
        if (archivo) {
            reproducirAudio(archivo, 0.85, false);
            return;
        }
        if (window.BuscaSombraSfx && BuscaSombraSfx.sonar(nombre)) return;
        if (respaldo && a[respaldo]) reproducirAudio(a[respaldo], 0.85, false);
    }

    function marcarHablando(voz) {
        ["zoe", "zeus"].forEach(function (pj) {
            const el = document.getElementById("guia-" + pj);
            if (!el) return;
            const activo = pj === voz;
            const src = activo ? GUIAS[pj].hablando : GUIAS[pj].normal;
            if (el.getAttribute("src") !== src) el.setAttribute("src", src);
            el.classList.toggle("hablando", activo);
        });
    }

    function hablar(linea, opts) {
        if (!linea || !linea.texto) return Promise.resolve();
        const voz = linea.voz === "zeus" ? "zeus" : "zoe";
        if (!(opts && opts.sinEnunciado)) setEnunciado(linea.texto);
        const token = ++hablaToken;
        marcarHablando(voz);
        return Promise.resolve(TextoVoz.hablar(linea.texto, voz))
            .catch(function () {})
            .then(function () { if (token === hablaToken) marcarHablando(null); });
    }

    function hablarYEsperar(linea, minMs) {
        return Promise.race([
            Promise.all([hablar(linea), sleep(minMs || 0)]),
            sleep(14000)
        ]);
    }

    /** El tope evita que el juego se detenga si el navegador deja de pintar (pestaña en segundo plano). */
    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve();
        const a = el.animate(frames, opts);
        return Promise.race([
            a.finished.then(function () {}, function () {}),
            sleep((Number(opts && opts.duration) || 0) + 600)
        ]);
    }

    function clonImagen(src, rect, clase) {
        const caja = document.createElement("div");
        caja.className = "clon-vuelo " + (clase || "");
        caja.style.left = rect.left + "px";
        caja.style.top = rect.top + "px";
        caja.style.width = rect.width + "px";
        caja.style.height = rect.height + "px";
        caja.innerHTML = '<img src="' + escAttr(src) + '" alt="">';
        capa().appendChild(caja);
        return caja;
    }

    /** Vuela una copia de la imagen desde un rectángulo hasta otro (o rebota si opts.rebote). */
    async function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = clonImagen(src, desde, opts.clase);
        const a = centro(desde);
        const b = centro(hasta);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const s = Math.min(hasta.width / desde.width, hasta.height / desde.height) * (opts.escala || 0.8);
        const arco = opts.arco != null ? opts.arco : -90;
        const t = function (fx, fy, sc, extra) {
            return { transform: "translate(" + fx + "px," + fy + "px) scale(" + sc + ")" + (extra || "") };
        };
        let frames;
        if (opts.rebote) {
            frames = [
                t(0, 0, 1),
                Object.assign(t(dx * 0.45, dy * 0.45 + arco, (1 + s) / 2), { offset: 0.3 }),
                Object.assign(t(dx * 0.8, dy * 0.8, s), { offset: 0.5 }),
                Object.assign(t(dx * 0.66, dy * 0.66 - 40, s, " rotate(-14deg)"), { offset: 0.64 }),
                Object.assign(t(dx * 0.7, dy * 0.7 - 10, s, " rotate(8deg)"), { offset: 0.72 }),
                t(0, 0, 1)
            ];
        } else {
            frames = [t(0, 0, 1), t(dx / 2, dy / 2 + arco, (1 + s) / 2), t(dx, dy, s)];
        }
        const ms = reducirMovimiento() ? 1 : (opts.ms || (opts.rebote ? 1200 : 750));
        await animar(el, frames, { duration: ms, easing: "ease-in-out", fill: "forwards" });
        if (!opts.conservar) el.remove();
        return el;
    }

    function particulas(x, y, tipo, n, opts) {
        opts = opts || {};
        const cont = capa();
        if (!cont) return;
        const total = reducirMovimiento() ? Math.min(n, 3) : n;
        for (let i = 0; i < total; i++) {
            const p = document.createElement("span");
            p.className = "particula particula-" + tipo;
            let dx;
            let dy;
            if (opts.direccion === "arriba") {
                dx = (Math.random() - 0.5) * 70;
                dy = -(110 + Math.random() * 90);
            } else if (opts.direccion === "abajo") {
                dx = (Math.random() - 0.5) * 140;
                dy = 90 + Math.random() * 90;
            } else {
                const ang = Math.random() * Math.PI * 2;
                const dist = (opts.dist || 90) * (0.5 + Math.random() * 0.7);
                dx = Math.cos(ang) * dist;
                dy = Math.sin(ang) * dist;
            }
            p.style.left = (x + (Math.random() - 0.5) * (opts.dispersion || 0)) + "px";
            p.style.top = y + "px";
            p.style.setProperty("--dx", dx.toFixed(0) + "px");
            p.style.setProperty("--dy", dy.toFixed(0) + "px");
            p.style.setProperty("--rot", Math.round(Math.random() * 360) + "deg");
            p.style.animationDelay = Math.round(Math.random() * (opts.retraso || 160)) + "ms";
            cont.appendChild(p);
            setTimeout(function () { p.remove(); }, 2600);
        }
    }

    function haz(desde, hasta, clase, ms) {
        const a = centro(desde);
        const b = centro(hasta);
        const el = document.createElement("div");
        el.className = "haz " + (clase || "");
        el.style.left = a.x + "px";
        el.style.top = a.y + "px";
        el.style.width = Math.hypot(b.x - a.x, b.y - a.y) + "px";
        el.style.transform = "rotate(" + Math.atan2(b.y - a.y, b.x - a.x) + "rad)";
        capa().appendChild(el);
        setTimeout(function () { el.remove(); }, ms || 1600);
        return el;
    }

    function quitarClaseLuego(el, clase, ms) {
        if (!el) return;
        el.classList.add(clase);
        setTimeout(function () { el.classList.remove(clase); }, ms);
    }

    /* ── Tema y progreso ──────────────────────────────────────── */

    function aplicarTema() {
        const tema = nivel().tema || "teatro";
        document.body.classList.remove("tema-teatro", "tema-laboratorio");
        document.body.classList.add("tema-" + tema);
        const escena = (gameConfig.escenas && gameConfig.escenas[tema]) || {};
        const principal = document.getElementById("principal");
        if (principal) principal.style.backgroundImage = escena.fondo ? 'url("' + escena.fondo + '")' : "";
    }

    function pintarProgreso() {
        const cont = document.getElementById("progreso-escena");
        if (!cont) return;
        const total = retosRonda.length;
        if (nivel().progreso === "energia") {
            let segs = "";
            for (let i = 1; i < total; i++) {
                segs += '<span class="medidor-corte" style="left:' + (i / total * 100) + '%"></span>';
            }
            cont.innerHTML =
                '<div class="medidor" role="img" aria-label="Medidor de energía">' +
                '<i class="fa-solid fa-bolt medidor-icono" aria-hidden="true"></i>' +
                '<div class="medidor-barra"><div class="medidor-relleno" id="medidor-relleno"></div>' + segs + "</div></div>";
        } else {
            let focos = "";
            for (let j = 0; j < total; j++) focos += '<span class="foco" data-i="' + j + '"><span class="foco-luz"></span></span>';
            cont.innerHTML = '<div class="focos" role="img" aria-label="Focos del teatro">' + focos + "</div>";
        }
        cont.hidden = false;
    }

    function avanzarProgreso(completados) {
        const total = retosRonda.length || 1;
        if (nivel().progreso === "energia") {
            const r = document.getElementById("medidor-relleno");
            if (r) r.style.width = Math.min(100, completados / total * 100) + "%";
            quitarClaseLuego(document.querySelector(".medidor"), "cargando", 1200);
            efecto("energia");
        } else {
            const foco = document.querySelector('.foco[data-i="' + (completados - 1) + '"]');
            if (foco) foco.classList.add("encendido");
            efecto("foco");
        }
    }

    /* ── Pintado del reto ─────────────────────────────────────── */

    function pintarObjetoObjetivo(objetoId, reto) {
        const cont = document.getElementById("objeto-objetivo");
        if (!cont) return;
        const m = metaObj(objetoId);
        const anim = reto && reto.animacionObjeto ? " anim-" + reto.animacionObjeto : "";
        cont.innerHTML =
            '<div class="objeto-marco" id="objeto-marco">' +
            '<img class="objeto-img' + anim + '" id="objeto-img" src="' + escAttr(m.img) + '" alt="' + escAttr(m.etiqueta || m.nombre || objetoId) + '">' +
            '<span class="zona-pista" id="zona-pista" hidden></span>' +
            "</div>" +
            '<span class="objeto-objetivo-nombre">' + escHtml(m.etiqueta || m.nombre || objetoId) + "</span>";
    }

    function pintarSombras(ids, reto) {
        const zona = document.getElementById("zona-sombras");
        if (!zona) return;
        const animaciones = (reto && reto.animacionSombras) || {};
        zona.innerHTML = "";
        zona.dataset.count = String(ids.length);
        ids.forEach(function (id, i) {
            const m = metaObj(id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sombra";
            btn.dataset.sombra = id;
            btn.style.setProperty("--i", String(i));
            btn.setAttribute("aria-label", "Sombra de " + (m.etiqueta || m.nombre || id));
            const anim = animaciones[id] && !reducirMovimiento() ? " anim-" + animaciones[id] : "";
            btn.innerHTML =
                '<span class="sombra-fig' + anim + '">' +
                '<img class="sombra-img" src="' + escAttr(m.sombra || m.img) + '" alt="">' +
                '<img class="sombra-color" src="' + escAttr(m.img) + '" alt="">' +
                "</span>" +
                '<span class="holograma-zona" hidden></span>';
            zona.appendChild(btn);
        });
        if (esLaboratorio()) {
            zona.classList.remove("cinta-entrando");
            void zona.offsetWidth;
            zona.classList.add("cinta-entrando");
            // La animación de entrada fija transform y bloquearía el zoom/presión de las tarjetas.
            setTimeout(function () { zona.classList.remove("cinta-entrando"); }, 1300 + ids.length * 110);
        }
    }

    function tarjeta(id) {
        return document.querySelector('#zona-sombras .sombra[data-sombra="' + id + '"]');
    }

    /* ── Demostración ─────────────────────────────────────────── */

    function detenerDemo() {
        demoActiva = false;
        demoTimers.forEach(function (id) { clearTimeout(id); });
        demoTimers = [];
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else {
            document.body.classList.remove("demo-activa");
            document.querySelectorAll(".is-demo-target").forEach(function (el) {
                el.classList.remove("is-demo-target");
            });
        }
    }

    async function hablarDemo(texto, minMs) {
        if (window.PedniaTutorial) {
            await PedniaTutorial.hablarDemo(texto, minMs);
            return;
        }
        const minimo = minMs != null ? minMs : 2800;
        TextoVoz.hablar(texto, "zoe");
        await sleep(minimo);
    }

    async function iniciarDemo(gen) {
        if (gen !== rondaGen || juegoTerminado) return;
        demoActiva = true;
        aceptaToque = false;
        if (window.PedniaTutorial) PedniaTutorial.activarDemo();
        else document.body.classList.add("demo-activa");

        const demo = nivel().demo;
        if (!demo || !demo.objeto) {
            detenerDemo();
            iniciarConsigna(gen);
            return;
        }
        retoActual = { objeto: demo.objeto, sombras: demo.sombras, acierto: { efecto: esLaboratorio() ? "laser" : "chispas" } };
        pintarObjetoObjetivo(demo.objeto, retoActual);
        pintarSombras(shuffle(demo.sombras.slice()), retoActual);

        const msg = textos().demostracion || "¡Vamos con un ejemplo! Mira cómo se hace: observa el objeto y toca su sombra.";
        setEnunciado(msg);
        await hablarDemo(msg, 3000);
        if (gen !== rondaGen || !demoActiva) return;

        const card = tarjeta(demo.objeto);
        if (card) {
            card.classList.add("is-demo-target");
            await sleep(2600);
            if (gen !== rondaGen || !demoActiva) return;
            card.classList.remove("is-demo-target");
            await animacionAcierto(card, false);
        }
        if (gen !== rondaGen || !demoActiva) return;
        const textoAcierto = plantilla(DEMO_ACIERTO, { objeto: metaObj(demo.objeto).nombre });
        setEnunciado(textoAcierto);
        await hablarDemo(textoAcierto, 2200);

        if (gen !== rondaGen) return;
        detenerDemo();
        const fin = textos().demostracionFin || "¡Ahora te toca a ti! Encuentra la sombra correcta.";
        setEnunciado(fin);
        await hablarDemo(fin, 2600);
        if (gen !== rondaGen || juegoTerminado) return;
        indiceReto = 0;
        retoActual = null;
        iniciarConsigna(gen);
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    async function iniciarConsigna(gen) {
        if (gen !== rondaGen || juegoTerminado) return;
        retoActual = retosRonda[indiceReto] || null;
        if (!retoActual || !retoActual.objeto) {
            await secuenciaFinal(gen);
            return;
        }
        const reto = retoActual;
        estadoReto = { errores: 0, pistaActiva: false };
        detenerInactividad();
        pintarObjetoObjetivo(reto.objeto, reto);
        pintarSombras(shuffle((reto.sombras || []).slice()), reto);
        aceptaToque = true;
        esperandoFeedback = false;
        await hablar(reto.presentacion);
        if (gen !== rondaGen || retoActual !== reto || esperandoFeedback) return;
        iniciarInactividad();
    }

    function detenerInactividad() {
        if (timerInactividad) clearTimeout(timerInactividad);
        timerInactividad = null;
    }

    function iniciarInactividad() {
        detenerInactividad();
        const reglas = reglasPista();
        if (!(reglas.inactividadMs > 0) || estadoReto.pistaActiva) return;
        const reto = retoActual;
        timerInactividad = setTimeout(function () {
            timerInactividad = null;
            if (retoActual !== reto || juegoTerminado) return;
            if (!aceptaToque || esperandoFeedback || gesto) {
                iniciarInactividad();
                return;
            }
            const estado = { errores: estadoReto.errores, pistaActiva: estadoReto.pistaActiva, inactivoMs: reglas.inactividadMs };
            if (L.debeMostrarPista(estado, reglas)) activarPista();
        }, reglas.inactividadMs);
    }

    function activarPista() {
        if (!retoActual || estadoReto.pistaActiva) return;
        estadoReto.pistaActiva = true;
        detenerInactividad();
        const reto = retoActual;
        if (reglasPista().modo === "detalle") {
            const z = reto.pista && reto.pista.zona;
            const zona = document.getElementById("zona-pista");
            if (z && zona) {
                zona.style.left = (z.x - z.w / 2) + "%";
                zona.style.top = (z.y - z.h / 2) + "%";
                zona.style.width = z.w + "%";
                zona.style.height = z.h + "%";
                zona.hidden = false;
            }
        } else {
            const marco = document.getElementById("objeto-marco");
            const card = tarjeta(reto.objeto);
            if (marco) marco.classList.add("pista-contorno");
            if (card) card.classList.add("pista-contorno");
        }
        hablar(reto.pista);
    }

    async function responder(id, card) {
        if (demoActiva || !aceptaToque || esperandoFeedback || juegoTerminado || !retoActual || !card) return;
        const gen = rondaGen;
        const reto = retoActual;
        esperandoFeedback = true;
        aceptaToque = false;
        detenerInactividad();
        if (id === reto.objeto) {
            await secuenciaAcierto(card, reto);
            if (gen !== rondaGen) return;
            indiceReto += 1;
            await sleep(500);
            iniciarConsigna(gen);
            return;
        }
        estadoReto.errores += 1;
        await secuenciaError(id, card, reto);
        if (gen !== rondaGen || juegoTerminado || retoActual !== reto) return;
        esperandoFeedback = false;
        aceptaToque = true;
        if (L.debeMostrarPista(estadoReto, reglasPista())) activarPista();
        else iniciarInactividad();
    }

    /* ── Acierto ──────────────────────────────────────────────── */

    /** Encaje visual: el objeto vuela a la sombra y la llena de color. */
    async function animacionAcierto(card, conSonido) {
        const reto = retoActual;
        const tipo = (reto.acierto && reto.acierto.efecto) || "chispas";
        const objImg = document.getElementById("objeto-img");
        const src = metaObj(reto.objeto).img;
        card.classList.add("correcta");
        document.querySelectorAll(".pista-contorno").forEach(function (el) { el.classList.remove("pista-contorno"); });
        const zonaPista = document.getElementById("zona-pista");
        if (zonaPista) zonaPista.hidden = true;

        if (esLaboratorio()) {
            if (conSonido) efecto("laser", "acierto");
            card.classList.add("escaneo-ok");
            await sleep(reducirMovimiento() ? 200 : 750);
        }

        if (tipo === "faros" && objImg) {
            if (conSonido) efecto("vroom", "acierto");
            document.getElementById("objeto-marco").classList.add("faros-encendidos");
            haz(objImg.getBoundingClientRect(), card.getBoundingClientRect(), "haz-faros", 1800);
            await sleep(reducirMovimiento() ? 200 : 700);
            card.classList.add("revelada");
            await sleep(500);
            return;
        }

        if (objImg) {
            const desde = objImg.getBoundingClientRect();
            const hasta = card.querySelector(".sombra-fig").getBoundingClientRect();
            objImg.classList.add("en-vuelo");
            if (tipo === "holograma" && conSonido) efecto("salto");
            await volar(src, desde, hasta, { arco: tipo === "holograma" ? -200 : -90, ms: tipo === "holograma" ? 950 : 750 });
        }
        card.classList.add("revelada");
        const c = centro(card.getBoundingClientRect());
        if (tipo === "holograma") {
            if (conSonido) efecto("holograma", "acierto");
            particulas(c.x, c.y, "holo", 22, { dist: 140 });
        } else if (tipo === "turbinas") {
            if (conSonido) efecto("whoosh", "acierto");
            card.classList.add("turbinas");
            particulas(c.x - card.offsetWidth / 2, c.y, "humo", 10, { dist: 60 });
        } else {
            if (conSonido) efecto(esLaboratorio() ? "laser" : "chispas", esLaboratorio() ? null : "acierto");
            particulas(c.x, c.y, "chispa", 16, { dist: 110 });
        }
        await sleep(400);
    }

    async function secuenciaAcierto(card, reto) {
        await animacionAcierto(card, true);
        await hablarYEsperar(reto.acierto, 1600);
        const rec = reto.acierto && reto.acierto.recompensa;
        if (rec) await recompensa(rec, card, reto);
        avanzarProgreso(indiceReto + 1);
        await sleep(900);
    }

    /* ── Error ────────────────────────────────────────────────── */

    async function secuenciaError(id, card, reto) {
        const info = L.textoError(reto, id, textos());
        const animaciones = [];
        if (esLaboratorio()) {
            efecto("escanerPausa", "error");
            quitarClaseLuego(card, "escaneo-alerta", 1400);
        } else {
            efecto("boing", "error");
            const objImg = document.getElementById("objeto-img");
            if (objImg) {
                objImg.classList.add("en-vuelo");
                animaciones.push(
                    volar(metaObj(reto.objeto).img, objImg.getBoundingClientRect(), card.querySelector(".sombra-fig").getBoundingClientRect(), { rebote: true })
                        .then(function () { objImg.classList.remove("en-vuelo"); })
                );
                await sleep(reducirMovimiento() ? 0 : 560);
            }
        }
        reaccionar(info, card);
        animaciones.push(hablarYEsperar(info, 1500));
        await Promise.all(animaciones);
    }

    function reaccionar(info, card) {
        const c = centro(card.getBoundingClientRect());
        const fig = card.querySelector(".sombra-fig");
        switch (info.reaccion) {
            case "burbujas":
                efecto("burbujas");
                particulas(c.x, c.y - 10, "burbuja", 10, { direccion: "arriba", dispersion: 60, retraso: 500 });
                quitarClaseLuego(fig, "reac-temblar", 700);
                break;
            case "hojas":
                efecto("hojas");
                particulas(c.x, c.y - card.offsetHeight / 3, "hoja", 9, { direccion: "abajo", dispersion: 80, retraso: 600 });
                quitarClaseLuego(fig, "reac-mecer", 1300);
                break;
            case "orejas":
                quitarClaseLuego(fig, "reac-orejas", 1300);
                break;
            case "temblar":
                quitarClaseLuego(fig, "reac-temblar", 900);
                break;
            case "zoom":
                quitarClaseLuego(card, "reac-zoom", 1800);
                break;
            case "holograma": {
                efecto("holograma");
                const z = info.zona;
                const holo = card.querySelector(".holograma-zona");
                if (z && holo) {
                    holo.style.left = (z.x - z.w / 2) + "%";
                    holo.style.top = (z.y - z.h / 2) + "%";
                    holo.style.width = z.w + "%";
                    holo.style.height = z.h + "%";
                    holo.hidden = false;
                    setTimeout(function () { holo.hidden = true; }, 2600);
                }
                break;
            }
            case "alerta":
                break;
            default:
                quitarClaseLuego(card, "is-error", 450);
        }
    }

    /* ── Recompensas ──────────────────────────────────────────── */

    async function recompensa(rec, card, reto) {
        if (rec.tipo === "vuelta") return vueltaCarro(card, reto);
        if (rec.tipo === "vuelo") return vueloMariposa(card, reto);
        if (rec.tipo === "riel" || rec.tipo === "libre") return recorrido(rec, reto);
    }

    async function vueltaCarro(card, reto) {
        if (reducirMovimiento()) return;
        const r = card.getBoundingClientRect();
        const size = Math.min(140, r.width);
        const desde = { left: r.left + (r.width - size) / 2, top: r.top + (r.height - size) / 2, width: size, height: size };
        const el = clonImagen(metaObj(reto.objeto).img, desde, "clon-carro");
        const W = window.innerWidth;
        const H = window.innerHeight;
        const m = 16;
        const pts = [
            [desde.left, desde.top],
            [W - size - m, H - size - m],
            [W - size - m, 110],
            [m, 110],
            [m, H - size - m],
            [desde.left, desde.top]
        ];
        let total = 0;
        const largos = [0];
        for (let i = 1; i < pts.length; i++) {
            total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            largos.push(total);
        }
        const frames = pts.map(function (p, i) {
            const izquierda = i > 0 && p[0] < pts[i - 1][0] - 1;
            return {
                transform: "translate(" + (p[0] - desde.left) + "px," + (p[1] - desde.top) + "px)" + (izquierda ? " scaleX(-1)" : ""),
                offset: total ? largos[i] / total : i / (pts.length - 1)
            };
        });
        card.classList.add("vaciada");
        await animar(el, frames, { duration: 3400, easing: "linear", fill: "forwards" });
        el.remove();
        card.classList.remove("vaciada");
    }

    async function vueloMariposa(card, reto) {
        if (reducirMovimiento()) return;
        const r = card.querySelector(".sombra-fig").getBoundingClientRect();
        const el = clonImagen(metaObj(reto.objeto).img, r, "clon-mariposa");
        const W = window.innerWidth;
        const H = window.innerHeight;
        const puntos = [
            [0, 0],
            [W * 0.15 - r.left, H * 0.25 - r.top],
            [W * 0.5 - r.left, H * 0.12 - r.top],
            [W * 0.8 - r.left, H * 0.3 - r.top],
            [W * 0.55 - r.left, H * 0.5 - r.top],
            [0, 0]
        ];
        const frames = puntos.map(function (p, i) {
            const s = i === 0 || i === puntos.length - 1 ? 1 : 1.25;
            return { transform: "translate(" + p[0] + "px," + p[1] + "px) scale(" + s + ")" };
        });
        card.classList.add("vaciada");
        const polvo = setInterval(function () {
            const c = centro(el.getBoundingClientRect());
            particulas(c.x, c.y + 20, "polvo", 3, { dist: 30, retraso: 0 });
        }, 110);
        await animar(el, frames, { duration: 3600, easing: "ease-in-out", fill: "forwards" });
        clearInterval(polvo);
        el.remove();
        card.classList.remove("vaciada");
    }

    /**
     * Recorrido con obstáculos, sin fallo posible.
     * riel: el actor solo avanza sobre la ruta (obstáculos se superan al pasar).
     * libre: arrastre libre; las nubes sacuden pero no detienen.
     */
    function recorrido(cfg, reto) {
        return new Promise(function (resolve) {
            const cont = document.getElementById("recorrido");
            if (!cont) { resolve(); return; }
            cont.className = "recorrido recorrido-" + cfg.tipo;
            cont.innerHTML = '<p class="recorrido-texto"></p><svg class="recorrido-svg" aria-hidden="true"></svg>';
            cont.hidden = false;
            document.body.classList.add("recorrido-activo");
            const W = cont.clientWidth;
            const H = cont.clientHeight;
            const px = function (p) { return [p[0] / 100 * W, p[1] / 100 * H]; };
            const radio = Math.max(50, Math.min(W, H) * 0.08);

            const actor = document.createElement("div");
            actor.className = "recorrido-actor actor-guia";
            actor.innerHTML = '<img src="' + escAttr(metaObj(reto.objeto).img) + '" alt="' + escAttr(metaObj(reto.objeto).etiqueta) + '">';

            let puntos = null;
            let t = 0;
            let pos = null;
            const obst = [];
            let meta = null;
            const svg = cont.querySelector(".recorrido-svg");
            svg.setAttribute("viewBox", "0 0 " + W + " " + H);

            function elemento(clase, x, y) {
                const el = document.createElement("div");
                el.className = clase;
                el.style.left = x + "px";
                el.style.top = y + "px";
                cont.appendChild(el);
                return el;
            }

            if (cfg.tipo === "riel") {
                puntos = cfg.ruta.map(px);
                const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                poly.setAttribute("points", puntos.map(function (p) { return p.join(","); }).join(" "));
                poly.setAttribute("class", "recorrido-camino");
                svg.appendChild(poly);
                (cfg.obstaculos || []).forEach(function (o) {
                    const p = L.puntoEnRuta(puntos, o.en);
                    obst.push({ cfg: o, el: elemento("obst obst-" + o.tipo, p.x, p.y), superado: false });
                });
                const fin = puntos[puntos.length - 1];
                meta = { x: fin[0], y: fin[1], el: elemento("meta meta-" + ((cfg.meta && cfg.meta.tipo) || "madriguera"), fin[0], fin[1]) };
                pos = puntos[0].slice();
            } else {
                (cfg.obstaculos || []).forEach(function (o) {
                    const p = px([o.x, o.y]);
                    obst.push({ cfg: o, el: elemento("obst obst-" + o.tipo, p[0], p[1]), x: p[0], y: p[1], dentro: false });
                });
                const m = px([cfg.meta.x, cfg.meta.y]);
                meta = { x: m[0], y: m[1], el: elemento("meta meta-" + (cfg.meta.tipo || "bandera"), m[0], m[1]) };
                if (cfg.meta.tipo === "bandera") meta.el.innerHTML = '<i class="fa-solid fa-flag-checkered"></i>';
                pos = px(cfg.inicio);
            }
            cont.appendChild(actor);

            let terminado = false;
            let arrastrando = null;
            let ultimoAvance = performance.now();
            let mejorDist = Infinity;
            let autoTimer = null;

            function colocar(x, y, angulo) {
                pos = [x, y];
                actor.style.left = x + "px";
                actor.style.top = y + "px";
                if (angulo != null) actor.style.setProperty("--ang", angulo + "rad");
            }

            function revisarRiel() {
                obst.forEach(function (o) {
                    const cerca = Math.abs(t - o.cfg.en) < 0.06;
                    if (o.cfg.tipo === "rama") actor.classList.toggle("agachado", cerca);
                    if (o.cfg.tipo === "aro") actor.classList.toggle("saltando", cerca);
                    if (cerca && !o.superado) {
                        o.superado = true;
                        o.el.classList.add("superado");
                        efecto("salto");
                        particulas(cont.getBoundingClientRect().left + pos[0], cont.getBoundingClientRect().top + pos[1], "chispa", 8, { dist: 70 });
                    }
                });
                if (t >= 0.985) llegar();
            }

            function revisarLibre() {
                obst.forEach(function (o) {
                    const dentro = L.dentroDeCirculo(pos, [o.x, o.y], radio * 1.1);
                    if (dentro && !o.dentro) {
                        efecto("nube");
                        quitarClaseLuego(actor, "sacudida", 500);
                        quitarClaseLuego(o.el, "golpeada", 700);
                    }
                    o.dentro = dentro;
                });
                if (L.dentroDeCirculo(pos, [meta.x, meta.y], radio)) llegar();
            }

            function mover(x, y) {
                if (terminado) return;
                if (cfg.tipo === "riel") {
                    const nt = L.proyectarEnRuta(puntos, [x, y]);
                    if (nt > t + 0.005) ultimoAvance = performance.now();
                    t = nt;
                    const p = L.puntoEnRuta(puntos, t);
                    colocar(p.x, p.y, 0);
                    revisarRiel();
                } else {
                    const nx = Math.max(radio / 2, Math.min(W - radio / 2, x));
                    const ny = Math.max(radio / 2, Math.min(H - radio / 2, y));
                    const ang = Math.max(-0.5, Math.min(0.5, Math.atan2(ny - pos[1], Math.abs(nx - pos[0]) + 0.01)));
                    actor.classList.toggle("hacia-izquierda", nx < pos[0] - 2);
                    colocar(nx, ny, ang);
                    const d = Math.hypot(meta.x - nx, meta.y - ny);
                    if (d < mejorDist - 8) { mejorDist = d; ultimoAvance = performance.now(); }
                    revisarLibre();
                }
            }

            function local(ev) {
                const r = cont.getBoundingClientRect();
                return [ev.clientX - r.left, ev.clientY - r.top];
            }

            function onDown(ev) {
                if (terminado || autoTimer) return;
                const p = local(ev);
                if (Math.hypot(p[0] - pos[0], p[1] - pos[1]) > radio * 1.8) return;
                arrastrando = ev.pointerId;
                actor.classList.remove("actor-guia");
                actor.classList.add("arrastrando");
                try { cont.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                ev.preventDefault();
            }
            function onMove(ev) {
                if (arrastrando !== ev.pointerId) return;
                const p = local(ev);
                mover(p[0], p[1]);
            }
            function onUp(ev) {
                if (arrastrando !== ev.pointerId) return;
                arrastrando = null;
                actor.classList.remove("arrastrando");
            }
            cont.addEventListener("pointerdown", onDown);
            cont.addEventListener("pointermove", onMove);
            cont.addEventListener("pointerup", onUp);
            cont.addEventListener("pointercancel", onUp);

            function autocompletar() {
                if (terminado || autoTimer) return;
                arrastrando = null;
                actor.classList.remove("actor-guia");
                hablar({ voz: "zeus", texto: textos().ayudaRecorrido || "¡Te ayudo!" });
                const ini = performance.now();
                const desdeT = t;
                const desdePos = pos.slice();
                const dur = 2600;
                // Temporizador y no rAF: la ayuda debe completarse aunque el navegador deje de pintar.
                const paso = function () {
                    const f = Math.max(0, Math.min(1, (performance.now() - ini) / dur));
                    if (cfg.tipo === "riel") {
                        t = desdeT + (1 - desdeT) * f;
                        const p = L.puntoEnRuta(puntos, t);
                        colocar(p.x, p.y, 0);
                        revisarRiel();
                    } else {
                        mover(desdePos[0] + (meta.x - desdePos[0]) * f, desdePos[1] + (meta.y - desdePos[1]) * f);
                    }
                    if (!terminado && f < 1) autoTimer = setTimeout(paso, 16);
                    else if (!terminado) llegar();
                };
                autoTimer = setTimeout(paso, 16);
            }

            const vigia = setInterval(function () {
                if (terminado) return;
                if (arrastrando == null && performance.now() - ultimoAvance > (cfg.autoMs || 10000)) autocompletar();
            }, 400);

            async function llegar() {
                if (terminado) return;
                terminado = true;
                arrastrando = null;
                clearInterval(vigia);
                if (autoTimer) clearTimeout(autoTimer);
                colocar(meta.x, meta.y, 0);
                actor.classList.remove("agachado", "saltando", "arrastrando", "actor-guia");
                actor.classList.add("llego");
                meta.el.classList.add("activa");
                const r = cont.getBoundingClientRect();
                particulas(r.left + meta.x, r.top + meta.y, "chispa", 18, { dist: 120 });
                efecto("chispas", "acierto");
                await hablarYEsperar(cfg.llegada, 1800);
                cont.removeEventListener("pointerdown", onDown);
                cont.removeEventListener("pointermove", onMove);
                cont.removeEventListener("pointerup", onUp);
                cont.removeEventListener("pointercancel", onUp);
                cont.hidden = true;
                cont.innerHTML = "";
                document.body.classList.remove("recorrido-activo");
                resolve();
            }

            if (cfg.tipo === "riel") colocar(pos[0], pos[1], 0);
            else colocar(pos[0], pos[1], 0);
            hablar(cfg).then(function () { ultimoAvance = Math.max(ultimoAvance, performance.now()); });
            const texto = cont.querySelector(".recorrido-texto");
            if (texto) texto.textContent = cfg.texto || "";
        });
    }

    /* ── Puntero: linterna, lupa y toque ──────────────────────── */

    function sombraBajo(x, y) {
        const el = document.elementFromPoint(x, y);
        return el && el.closest ? el.closest("#zona-sombras .sombra") : null;
    }

    function moverLinterna(x, y) {
        const luz = document.getElementById("linterna-luz");
        if (!luz) return;
        luz.hidden = false;
        luz.style.transform = "translate(" + x + "px," + y + "px)";
    }

    function iluminar(card) {
        document.querySelectorAll(".sombra.iluminada").forEach(function (el) {
            if (el !== card) el.classList.remove("iluminada");
        });
        if (card) card.classList.add("iluminada");
    }

    function mostrarLupa(card, x, y) {
        const lupa = document.getElementById("lupa");
        if (!lupa || !card) return;
        const img = card.querySelector(".sombra-img");
        const lente = lupa.querySelector("img");
        if (lente && img && lente.getAttribute("src") !== img.getAttribute("src")) lente.setAttribute("src", img.getAttribute("src"));
        const tam = lupa.offsetWidth || 220;
        let left = x - tam / 2;
        let top = y - tam - 70;
        if (top < 8) top = Math.min(window.innerHeight - tam - 8, y + 70);
        left = Math.max(8, Math.min(window.innerWidth - tam - 8, left));
        lupa.style.left = left + "px";
        lupa.style.top = top + "px";
        lupa.hidden = false;
    }

    function limpiarGesto() {
        if (gesto && gesto.timerLupa) clearTimeout(gesto.timerLupa);
        gesto = null;
        const luz = document.getElementById("linterna-luz");
        if (luz) luz.hidden = true;
        const lupa = document.getElementById("lupa");
        if (lupa) lupa.hidden = true;
        document.querySelectorAll(".sombra.iluminada, .sombra.presionada").forEach(function (el) {
            el.classList.remove("iluminada", "presionada");
        });
    }

    function onPunteroDown(ev) {
        if (gesto || demoActiva || !aceptaToque || esperandoFeedback || juegoTerminado) return;
        if (ev.target.closest && ev.target.closest(".hud-top")) return;
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        const card = sombraBajo(ev.clientX, ev.clientY);
        gesto = {
            id: ev.pointerId,
            inicio: card ? card.dataset.sombra : null,
            t0: performance.now(),
            lupaMostrada: false,
            timerLupa: null
        };
        if (card) card.classList.add("presionada");
        if (nivel().linterna) {
            moverLinterna(ev.clientX, ev.clientY);
            iluminar(card);
        }
        if (nivel().lupa && card) {
            const x = ev.clientX;
            const y = ev.clientY;
            gesto.timerLupa = setTimeout(function () {
                if (!gesto) return;
                gesto.lupaMostrada = true;
                card.classList.remove("presionada");
                mostrarLupa(sombraBajo(gesto.x || x, gesto.y || y) || card, gesto.x || x, gesto.y || y);
            }, L.UMBRAL_LUPA_MS);
        }
    }

    function onPunteroMove(ev) {
        if (!gesto || gesto.id !== ev.pointerId) return;
        gesto.x = ev.clientX;
        gesto.y = ev.clientY;
        const card = sombraBajo(ev.clientX, ev.clientY);
        if (nivel().linterna) {
            moverLinterna(ev.clientX, ev.clientY);
            iluminar(card);
        }
        if (gesto.lupaMostrada) {
            if (card) mostrarLupa(card, ev.clientX, ev.clientY);
            else document.getElementById("lupa").hidden = true;
        }
    }

    function onPunteroUp(ev) {
        if (!gesto || gesto.id !== ev.pointerId) return;
        const fin = sombraBajo(ev.clientX, ev.clientY);
        const decision = L.clasificarGesto({
            inicio: gesto.inicio,
            fin: fin ? fin.dataset.sombra : null,
            duracionMs: performance.now() - gesto.t0,
            conLupa: !!nivel().lupa,
            lupaMostrada: gesto.lupaMostrada
        });
        limpiarGesto();
        if (decision === "responder") responder(fin.dataset.sombra, fin);
    }

    function enlazarPuntero() {
        const principal = document.getElementById("principal");
        const zona = document.getElementById("zona-sombras");
        if (principal) principal.addEventListener("pointerdown", onPunteroDown);
        document.addEventListener("pointermove", onPunteroMove);
        document.addEventListener("pointerup", onPunteroUp);
        document.addEventListener("pointercancel", function (ev) {
            if (gesto && gesto.id === ev.pointerId) limpiarGesto();
        });
        if (zona) {
            // Teclado (Enter/Espacio): click sin puntero, detail === 0.
            zona.addEventListener("click", function (ev) {
                if (ev.detail !== 0) return;
                const card = ev.target.closest(".sombra");
                if (card) responder(card.dataset.sombra, card);
            });
            zona.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
        }
    }

    /* ── Finales ──────────────────────────────────────────────── */

    async function secuenciaFinal(gen) {
        juegoTerminado = true;
        aceptaToque = false;
        detenerInactividad();
        if (esLaboratorio()) await creadorSombras(gen);
        else await granFinalTeatro(gen);
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    function esperarToqueOTiempo(el, ms) {
        return new Promise(function (resolve) {
            let hecho = false;
            const fin = function () {
                if (hecho) return;
                hecho = true;
                el.removeEventListener("click", fin);
                resolve();
            };
            el.addEventListener("click", fin);
            setTimeout(fin, ms);
        });
    }

    async function granFinalTeatro(gen) {
        const fin = nivel().final || {};
        const gf = document.getElementById("gran-final");
        if (!gf) return;
        const bailarines = retosRonda.map(function (r, i) {
            return '<div class="gf-bailarin" style="--i:' + i + '"><img src="' + escAttr(metaObj(r.objeto).img) + '" alt=""></div>';
        }).join("");
        const premio = nivel().premio || {};
        const icono = premio.img
            ? '<img src="' + escAttr(premio.img) + '" alt="' + escAttr(premio.nombre || "") + '">'
            : '<i class="fa-solid fa-lightbulb" aria-hidden="true"></i>';
        gf.className = "gran-final gf-teatro";
        gf.innerHTML =
            '<span class="gf-reflector gf-reflector-izq"></span><span class="gf-reflector gf-reflector-der"></span>' +
            '<p class="gf-texto"></p>' +
            '<div class="gf-bailarines">' + bailarines + "</div>" +
            '<button type="button" class="gf-linterna" hidden aria-label="' + escAttr(premio.nombre || "Linterna Mágica") + '">' + icono + "</button>";
        gf.hidden = false;
        document.body.classList.add("gran-final-activo");
        const texto = gf.querySelector(".gf-texto");
        if (fin.baile) texto.textContent = fin.baile.texto;
        await hablarYEsperar(fin.baile, 3500);
        if (gen !== rondaGen) return;

        const btn = gf.querySelector(".gf-linterna");
        btn.hidden = false;
        if (fin.premio) texto.textContent = fin.premio.texto;
        hablar(fin.premio, { sinEnunciado: true });
        await esperarToqueOTiempo(btn, fin.autoMs || 12000);
        if (gen !== rondaGen) return;

        efecto("linterna", "acierto");
        gf.classList.add("iluminado");
        btn.classList.add("encendida");
        const c = centro(btn.getBoundingClientRect());
        particulas(c.x, c.y, "confeti", 40, { dist: Math.min(window.innerWidth, 520) });
        if (fin.premioGanado) texto.textContent = fin.premioGanado.texto;
        await hablarYEsperar(fin.premioGanado, 2800);
        gf.hidden = true;
        document.body.classList.remove("gran-final-activo");
    }

    async function creadorSombras(gen) {
        const fin = nivel().final || {};
        const gf = document.getElementById("gran-final");
        if (!gf) return;
        const ids = retosRonda.map(function (r) { return r.objeto; });
        gf.className = "gran-final gf-laboratorio";
        gf.innerHTML =
            '<p class="gf-texto"></p>' +
            '<div class="cr-pared">' + ids.map(function (id) {
                return '<div class="cr-hueco" data-id="' + id + '"><img src="' + escAttr(metaObj(id).sombra) + '" alt=""></div>';
            }).join("") + "</div>" +
            '<div class="cr-maquina">' + ids.map(function (id) {
                return '<button type="button" class="cr-figura" data-id="' + id + '" aria-label="Proyectar ' + escAttr(metaObj(id).etiqueta) + '">' +
                    '<img src="' + escAttr(metaObj(id).img) + '" alt=""></button>';
            }).join("") + '<span class="cr-luz"></span></div>';
        gf.hidden = false;
        document.body.classList.add("gran-final-activo");
        const texto = gf.querySelector(".gf-texto");
        if (fin.creador) texto.textContent = fin.creador.texto;
        hablar(fin.creador, { sinEnunciado: true });

        let restantes = ids.length;
        let avisarListo;
        const listo = new Promise(function (r) { avisarListo = r; });
        const proyectar = function (btn) {
            if (!btn || btn.classList.contains("proyectada")) return;
            btn.classList.add("proyectada");
            const hueco = gf.querySelector('.cr-hueco[data-id="' + btn.dataset.id + '"]');
            efecto("proyectar");
            haz(btn.getBoundingClientRect(), hueco.getBoundingClientRect(), "haz-proyector", 1200);
            setTimeout(function () {
                hueco.classList.add("lleno");
                const c = centro(hueco.getBoundingClientRect());
                particulas(c.x, c.y, "holo", 12, { dist: 90 });
            }, 450);
            restantes -= 1;
            if (restantes === 0) setTimeout(avisarListo, 1200);
        };
        gf.querySelectorAll(".cr-figura").forEach(function (btn) {
            btn.addEventListener("click", function () { proyectar(btn); });
        });
        await Promise.race([listo, sleep(fin.autoMs || 20000)]);
        if (gen !== rondaGen) return;
        const pendientes = Array.prototype.slice.call(gf.querySelectorAll(".cr-figura:not(.proyectada)"));
        for (let i = 0; i < pendientes.length; i++) {
            proyectar(pendientes[i]);
            await sleep(700);
        }
        if (pendientes.length) await listo;
        if (fin.creadorFin) texto.textContent = fin.creadorFin.texto;
        await hablarYEsperar(fin.creadorFin, 2000);
        gf.hidden = true;
        document.body.classList.remove("gran-final-activo");
    }

    function mostrarPremio() {
        const premio = nivel().premio;
        const trofeo = document.querySelector("#final .trofeo");
        if (!trofeo || !premio) return;
        trofeo.classList.add("premio-" + (premio.tipo || "trofeo"));
        if (premio.img) {
            trofeo.src = premio.img;
            trofeo.alt = premio.nombre || "Premio";
        }
    }

    function mostrarCierre() {
        juegoTerminado = true;
        aceptaToque = false;
        const cierre = nivel().cierre || textos().cierre || "¡Excelente!";
        const texto = document.getElementById("texto_final");
        if (texto) texto.textContent = cierre;
        mostrarPremio();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        setTimeout(function () {
            const caja = document.getElementById("final");
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
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        enlazarPuntero();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        sincronizarDialogoIntro3d();
        document.getElementById("btn-empecemos").addEventListener("click", empecemosJuego);
        const btnOmitirIntro = document.getElementById("btn-omitir-intro3d");
        if (btnOmitirIntro) {
            btnOmitirIntro.addEventListener("click", omitirIntro3d);
        }
        const btnContinuarIntro = document.getElementById("btn-continuar-intro3d");
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
