/* Suave o áspero — Multisensorial */
(function () {
    "use strict";

    const L = window.SuaveAsperoLogica;
    const IMG = {
        pieza: "img/pieza_madera.svg",
        piezaPulida: "img/pieza_madera_pulida.svg",
        nube: "img/nube_feliz.svg",
        cama: "img/cama_nube.svg"
    };
    const GESTO_ICONO = {
        rascar: "fa-face-laugh-squint"
    };
    const PARTICULAS = {
        polvoBrillante: [{ n: 4, tipo: "polvo", dist: 45, gravedad: 30, ms: 650 }, { n: 2, tipo: "brillo", dist: 35, ms: 500 }],
        polvo: [{ n: 5, tipo: "polvo", dist: 40, gravedad: 30, ms: 650 }],
        dorada: [{ n: 3, tipo: "dorada", dist: 45, gravedad: -20, ms: 700 }],
        chispitas: [{ n: 8, tipo: "brillo", dist: 70, ms: 650 }],
        nube: [{ n: 4, tipo: "nube", dist: 60, gravedad: -30, ms: 1000 }],
        migas: [{ n: 4, tipo: "migas", dist: 40, gravedad: 40, ms: 700 }]
    };
    const PUNTOS_GRIETA = L.muestrearGrietas(0.03);
    const LUPA_ZOOM = 3;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
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
    let exploracion = null;
    let sobreDestino = null;
    let ultimoGesto = 0;
    let onda = { actividad: 0, calibrar: 0, raf: 0 };
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
    function esLab() { return !!nivelElegido && nivelElegido.escenario === "laboratorio"; }
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
        if (window.SuaveAsperoSfx) SuaveAsperoSfx.desbloquear();
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

    function rectDe(el) {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function cajaEn(c, lado) {
        return { left: c.x - lado / 2, top: c.y - lado / 2, width: lado, height: lado };
    }

    function caja(r, extra) {
        return Object.assign({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }, extra || {});
    }

    function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = crearImg(src, "vuelo");
        $id("capa-efectos").appendChild(el);
        const frames = [caja(desde, { opacity: 1, transform: "rotate(0deg)" })];
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
        frames.push(caja(hasta, {
            opacity: opts.opacidadFinal != null ? opts.opacidadFinal : 1,
            transform: "rotate(" + (opts.giro || 0) + "deg)"
        }));
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

    function particulasDe(nombre, x, y, multiplicar) {
        (PARTICULAS[nombre] || []).forEach(function (pc) {
            particulas(x, y, Object.assign({}, pc, { n: pc.n * (multiplicar || 1) }));
        });
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
                if (pista.fn === fn) programarPista(fn, Math.max(ms, 4000) + 1500);
            });
        }, ms);
    }

    function reprogramarPista() {
        if (!pista.fn) return;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
        programarPista(pista.fn, Math.max(pista.ms, 5000));
    }

    /** Mano que frota el objeto (o lo presiona / recorre la grieta) sin decir la respuesta. */
    function pistaExplorar() {
        if (!window.PedniaTutorial || !exploracion || exploracion.listo || fase !== "explorar") {
            if (exploracion && exploracion.listo) cancelarPista();
            return Promise.resolve();
        }
        const fn = pista.fn;
        const r = $id("objeto-img").getBoundingClientRect();
        const tacto = exploracion.ex.tacto;
        const opts = {
            holdMs: 400,
            cancelado: function () { return pista.fn !== fn || fase !== "explorar" || !exploracion || exploracion.listo; }
        };
        if (tacto === "hundir") {
            opts.punto = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        } else if (tacto === "grietas") {
            const g = L.GRIETAS[0];
            opts.punto = { x: r.left + g[0].x * r.width, y: r.top + g[0].y * r.height };
            opts.arrastre = { dx: 0, dy: r.height * 0.55, durMs: 1100 };
        } else {
            opts.punto = { x: r.left + r.width * 0.25, y: r.top + r.height * 0.5 };
            opts.arrastre = { dx: r.width * 0.5, dy: 0, durMs: 1000 };
        }
        return PedniaTutorial.animarMano(opts);
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
        if (window.SuaveAsperoSfx) SuaveAsperoSfx.sonar(nombre);
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
        const lab = esLab();
        $id("escenario").className = "escenario nivel-" + nivelElegido.escenario;
        $id("zona-rotulo").textContent = lab ? "Cámara de Análisis" : "Escáner Sensorial";
        pintarDestinos();
        if (lab) requestAnimationFrame(iniciarOnda);
        else detenerOnda();
    }

    function pintarDestinos() {
        const lab = esLab();
        const cont = $id("destinos");
        cont.innerHTML = "";
        nivelElegido.destinos.forEach(function (d) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "destino destino-" + d.id + (lab ? " modulo" : " contenedor");
            b.dataset.id = d.id;
            b.setAttribute("aria-label", d.nombre);
            let deco = "";
            if (lab) {
                deco = '<span class="modulo-luz"></span><span class="modulo-muestra"></span>';
            } else if (d.id === "suave") {
                deco = '<span class="tobogan"></span><img class="cama" src="' + IMG.cama + '" alt="" draggable="false">';
            } else {
                deco = '<span class="trampilla"></span><span class="luz-verde"></span>';
            }
            b.innerHTML = deco + '<span class="destino-interior"></span><span class="destino-nombre"></span>';
            b.querySelector(".destino-nombre").textContent = d.nombre;
            cont.appendChild(b);
        });
    }

    function destinoDe(id) {
        return $id("destinos").querySelector('.destino[data-id="' + id + '"]');
    }

    function destinos() {
        return Array.prototype.slice.call($id("destinos").querySelectorAll(".destino"));
    }

    function datosDestino(id) {
        return (nivelElegido.destinos || []).find(function (d) { return d.id === id; }) || {};
    }

    function limpiarEscena() {
        $id("capa-escena").innerHTML = "";
        $id("escenario").classList.remove("lab-iluminado");
        destinos().forEach(function (d) {
            d.classList.remove("sobre", "pista", "calibrando", "rebota", "abierta", "abrazo", "ok", "luz-ok", "rustico");
        });
        ["zoe", "zeus"].forEach(function (voz) {
            const pj = $id("pj-" + voz);
            pj.style.zIndex = "";
            pj.querySelector(".pj-img").style.transform = "";
        });
        quitarFantasma();
        ocultarLupa();
    }

    function pintarGrietas(activas) {
        const svg = $id("grietas");
        svg.innerHTML = "";
        if (!activas) return;
        const ns = "http://www.w3.org/2000/svg";
        L.GRIETAS.forEach(function (linea) {
            const pl = document.createElementNS(ns, "polyline");
            pl.setAttribute("points", linea.map(function (p) { return p.x + "," + p.y; }).join(" "));
            pl.setAttribute("class", "grieta-guia");
            pl.setAttribute("vector-effect", "non-scaling-stroke");
            svg.appendChild(pl);
        });
    }

    function marcarGrietaVista(i) {
        const ns = "http://www.w3.org/2000/svg";
        const p = PUNTOS_GRIETA[i];
        const c = document.createElementNS(ns, "ellipse");
        c.setAttribute("cx", p.x);
        c.setAttribute("cy", p.y);
        c.setAttribute("rx", 0.028);
        c.setAttribute("ry", 0.028);
        c.setAttribute("class", "grieta-vista");
        $id("grietas").appendChild(c);
    }

    function prepararObjeto(matId, ex, opts) {
        opts = opts || {};
        const obj = $id("objeto");
        const img = $id("objeto-img");
        img.src = material(matId).img;
        img.style.cssText = "";
        obj.dataset.material = matId;
        obj.className = "objeto t-" + ex.tacto + (opts.flota ? " flota" : "");
        obj.style.cssText = "";
        obj.setAttribute("aria-label", opts.nombre || "");
        pintarGrietas(ex.tacto === "grietas");
        exploracion = {
            ex: ex,
            medida: { recorrido: 0, ancho: Math.max(1, img.getBoundingClientRect().width), toques: 0, grietas: 0 },
            visitados: {},
            listo: false,
            sonidoT: 0,
            partT: 0
        };
        obj.style.setProperty("--progreso", "0");
        $id("destinos").classList.remove("activos");
    }

    /** El objeto llega por la cinta (3-4) o aparece escaneado en la cámara (5-6). */
    async function llegaObjeto() {
        const obj = $id("objeto");
        if (esLab()) {
            const zona = $id("zona-objeto");
            zona.classList.add("escaneando");
            efecto("escaneo");
            await animar(obj, [
                { transform: "translateY(-40px) scale(.3)", opacity: 0 },
                { transform: "none", opacity: 1 }
            ], { duration: 650, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "none" });
            setTimeout(function () { zona.classList.remove("escaneando"); }, 500);
            return;
        }
        const cinta = $id("cinta");
        const rc = cinta.getBoundingClientRect();
        const r = obj.getBoundingClientRect();
        const dy = (rc.top + rc.height / 2) - (r.top + r.height / 2);
        const dx = rc.left - (r.left + r.width / 2);
        cinta.classList.add("andando");
        efecto("cinta");
        await animar(obj, [
            { transform: "translate(" + dx + "px," + dy + "px) scale(.4)", opacity: 0.4 },
            { transform: "translate(0px," + dy + "px) scale(.4)", opacity: 1, offset: 0.55 },
            { transform: "translate(0px,0px) scale(1)", opacity: 1 }
        ], { duration: 1500, easing: "ease-in-out", fill: "none" });
        cinta.classList.remove("andando");
    }

    /* ── Exploración táctil ───────────────────────────────────── */

    function puedeExplorar() {
        return !juegoTerminado && !!exploracion && (demoActiva || fase === "presentacion" || fase === "explorar");
    }

    function hacerGesto(voz, g) {
        if (!g || !GESTO_ICONO[g]) return;
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

    function frotarCepillos() {
        const zona = $id("zona-objeto");
        zona.classList.add("frotando");
        clearTimeout(zona._frotaT);
        zona._frotaT = setTimeout(function () { zona.classList.remove("frotando"); }, 280);
    }

    function mostrarLupa(x, y) {
        if (!esLab()) return;
        const lupa = $id("lupa");
        const img = $id("objeto-img");
        const r = img.getBoundingClientRect();
        const zona = $id("zona-objeto").getBoundingClientRect();
        const tam = lupa.offsetWidth || 130;
        lupa.hidden = false;
        lupa.style.backgroundImage = 'url("' + img.getAttribute("src") + '")';
        lupa.style.backgroundSize = r.width * LUPA_ZOOM + "px " + r.height * LUPA_ZOOM + "px";
        lupa.style.backgroundPosition = -((x - r.left) * LUPA_ZOOM - tam / 2) + "px " + -((y - r.top) * LUPA_ZOOM - tam / 2) + "px";
        const izq = Math.min(zona.width - tam - 6, Math.max(6, x - zona.left + 50));
        const arr = Math.min(zona.height - tam - 6, Math.max(6, y - zona.top - tam - 20));
        lupa.style.left = izq + "px";
        lupa.style.top = arr + "px";
    }

    function ocultarLupa() {
        const lupa = $id("lupa");
        if (lupa) lupa.hidden = true;
    }

    function marcarListo() {
        if (!exploracion || exploracion.listo) return;
        exploracion.listo = true;
        $id("objeto").style.setProperty("--progreso", "1");
        $id("objeto").classList.add("listo");
        $id("destinos").classList.add("activos");
        if (!demoActiva) {
            cancelarPista();
            efecto("magia");
        }
    }

    /** Reacción del objeto bajo el dedo: peinar, raspar, hundir, seguir grietas o mecer. */
    function explorar(x, y, o) {
        o = o || {};
        if (!exploracion) return;
        const st = exploracion;
        const ex = st.ex;
        const obj = $id("objeto");
        const img = $id("objeto-img");
        const ahora = performance.now();
        obj.classList.add("tocando");
        clearTimeout(obj._tocaT);
        obj._tocaT = setTimeout(function () { obj.classList.remove("tocando", "resiste"); }, 300);
        if (!esLab()) frotarCepillos();
        else {
            mostrarLupa(x, y);
            onda.actividad = 1;
        }

        const mov = Math.hypot(o.dx || 0, o.dy || 0);
        if (mov) st.medida.recorrido += mov;
        if (o.toque) st.medida.toques += 1;

        let sonar = false;
        if (ex.tacto === "peinar" && o.dx) {
            obj.style.setProperty("--peine", (o.dx > 0 ? 12 : -12) + "deg");
        }
        if (ex.tacto === "raspar" && ex.resistencia && o.dx) {
            obj.classList.add("resiste");
            obj.style.setProperty("--resiste", Math.max(-14, Math.min(14, o.dx * 1.5)) + "px");
        }
        if (ex.tacto === "grietas") {
            const r = img.getBoundingClientRect();
            const p = { x: (x - r.left) / r.width, y: (y - r.top) / r.height };
            const antes = Object.keys(st.visitados).length;
            const nuevos = L.marcarGrietas(st.visitados, PUNTOS_GRIETA, p, 0.07);
            if (nuevos) {
                Object.keys(st.visitados).slice(antes).forEach(function (k) { marcarGrietaVista(Number(k)); });
                st.medida.grietas = L.fraccion(st.visitados, PUNTOS_GRIETA.length);
                sonar = ahora - st.sonidoT > 380;
            }
        } else if (ex.tacto === "hundir") {
            sonar = !!o.toque;
        } else {
            sonar = !!o.toque || (mov > 0 && ahora - st.sonidoT > 420);
        }

        if (sonar) {
            st.sonidoT = ahora;
            efecto(ex.sonido);
            if (esLab() && material(obj.dataset.material).clase === "aspero") {
                obj.classList.remove("vibra");
                void obj.offsetWidth;
                obj.classList.add("vibra");
            }
            if (ex.gesto && ahora - ultimoGesto > 2600) {
                ultimoGesto = ahora;
                hacerGesto(ex.gesto.voz, ex.gesto.gesto);
                setTimeout(function () { efecto("jeje"); }, 250);
            }
        }
        if (ex.particula && (o.toque || ahora - st.partT > 140) && (sonar || mov)) {
            st.partT = ahora;
            particulasDe(ex.particula, x, y, o.toque ? 2 : 1);
        }

        const prog = L.progresoExploracion(ex, st.medida);
        obj.style.setProperty("--progreso", String(prog));
        if (prog >= 1) marcarListo();
    }

    function hundir(abajo) {
        const obj = $id("objeto");
        if (abajo) {
            obj.classList.remove("resorte");
            obj.classList.add("hundido");
            return;
        }
        obj.classList.remove("hundido");
        void obj.offsetWidth;
        obj.classList.add("resorte");
        clearTimeout(obj._resorteT);
        obj._resorteT = setTimeout(function () { obj.classList.remove("resorte"); }, 700);
    }

    function pedirTacto() {
        const obj = $id("objeto");
        obj.classList.remove("pide-tacto");
        void obj.offsetWidth;
        obj.classList.add("pide-tacto");
        if (fase === "explorar") programarPista(pistaExplorar, 300);
    }

    function zonasDestino() {
        const z = {};
        destinos().forEach(function (d) { z[d.dataset.id] = d.getBoundingClientRect(); });
        return z;
    }

    function marcarSobre(id) {
        destinos().forEach(function (d) { d.classList.toggle("sobre", d.dataset.id === id); });
        if (id && id !== sobreDestino && !esLab()) efecto(datosDestino(id).sonido);
        sobreDestino = id;
    }

    function moverFantasma(x, y) {
        let f = document.querySelector(".fantasma");
        if (!f) {
            f = crearImg($id("objeto-img").getAttribute("src"), "fantasma");
            $id("capa-efectos").appendChild(f);
        }
        f.style.left = x + "px";
        f.style.top = y + "px";
        marcarSobre(L.soltarEn({ x: x, y: y }, zonasDestino()));
    }

    function quitarFantasma() {
        const f = document.querySelector(".fantasma");
        if (f) f.remove();
        marcarSobre(null);
    }

    function enlazarObjeto() {
        const obj = $id("objeto");
        obj.addEventListener("pointerdown", function (ev) {
            if (gesto || demoActiva || !puedeExplorar()) return;
            ev.preventDefault();
            gesto = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, xUlt: ev.clientX, yUlt: ev.clientY, arrastre: false, fuera: false, avisado: false };
            try { obj.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            reprogramarPista();
            if (exploracion.ex.tacto === "hundir") hundir(true);
            explorar(ev.clientX, ev.clientY, { inicio: true });
        });
        obj.addEventListener("pointermove", function (ev) {
            if (!gesto || gesto.id !== ev.pointerId || !puedeExplorar()) return;
            const dx = ev.clientX - gesto.xUlt;
            const dy = ev.clientY - gesto.yUlt;
            gesto.xUlt = ev.clientX;
            gesto.yUlt = ev.clientY;
            if (!gesto.arrastre && L.clasificarGesto(ev.clientX - gesto.x0, ev.clientY - gesto.y0) === "arrastre") {
                gesto.arrastre = true;
            }
            const p = { x: ev.clientX, y: ev.clientY };
            if (L.dentro(p, $id("zona-objeto").getBoundingClientRect())) {
                if (gesto.fuera) {
                    gesto.fuera = false;
                    quitarFantasma();
                    obj.classList.remove("levantado");
                }
                if (L.dentro(p, $id("objeto-img").getBoundingClientRect())) explorar(p.x, p.y, { dx: dx, dy: dy });
                else ocultarLupa();
                return;
            }
            ocultarLupa();
            if (fase === "explorar" && exploracion.listo) {
                gesto.fuera = true;
                obj.classList.add("levantado");
                moverFantasma(p.x, p.y);
            } else if (!gesto.avisado) {
                gesto.avisado = true;
                pedirTacto();
            }
        });
        const fin = function (ev) {
            if (!gesto || gesto.id !== ev.pointerId) return;
            const g = gesto;
            gesto = null;
            ocultarLupa();
            const tacto = exploracion && exploracion.ex.tacto;
            if (tacto === "hundir") hundir(false);
            if (ev.type === "pointercancel") {
                quitarFantasma();
                obj.classList.remove("levantado");
                return;
            }
            const p = { x: ev.clientX, y: ev.clientY };
            if (g.fuera) {
                const destino = L.soltarEn(p, zonasDestino());
                quitarFantasma();
                if (destino && fase === "explorar") {
                    clasificar(destino, p);
                } else {
                    volar($id("objeto-img").getAttribute("src"), cajaEn(p, 120), rectDe($id("objeto-img")), { ms: 380 })
                        .then(function () { obj.classList.remove("levantado"); });
                }
                return;
            }
            if (tacto === "hundir") {
                if (!g.fuera) explorar(p.x, p.y, { toque: true });
            } else if (!g.arrastre) {
                explorar(p.x, p.y, { toque: true });
            }
        };
        obj.addEventListener("pointerup", fin);
        obj.addEventListener("pointercancel", fin);

        $id("destinos").addEventListener("click", function (ev) {
            const b = ev.target.closest(".destino");
            if (!b || demoActiva || juegoTerminado || fase !== "explorar") return;
            if (!exploracion || !exploracion.listo) {
                pedirTacto();
                return;
            }
            clasificar(b.dataset.id, null);
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
        cancelarPista();
        limpiarEscena();
        prepararObjeto(reto.material, reto.exploracion, { flota: reto.flota, nombre: reto.nombre });
        await llegaObjeto();
        if (!vivo(gen)) return;
        exploracion.medida.ancho = Math.max(1, $id("objeto-img").getBoundingClientRect().width);
        const ls = L.lineas(reto.presentacion);
        for (let i = 0; i < ls.length; i++) {
            await decir(ls[i]);
            if (!vivo(gen)) return;
        }
        if (fase === "presentacion") {
            fase = "explorar";
            if (!exploracion.listo) programarPista(pistaExplorar, 5000);
        }
    }

    async function retoCompletado(gen) {
        await sleep(900);
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    function guardarEnDestino(destino, matId) {
        const interior = destino.querySelector(".destino-interior");
        if (!interior) return;
        const img = crearImg(material(matId).img, "guardado");
        interior.appendChild(img);
        animar(img, [
            { transform: "scale(.2)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 }
        ], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "none" });
    }

    async function clasificar(id, punto) {
        if (fase !== "explorar" || juegoTerminado || !reto) return;
        const gen = rondaGen;
        cancelarPista();
        const destino = destinoDe(id);
        if (!destino) return;
        const obj = $id("objeto");
        const desde = punto ? cajaEn(punto, 120) : rectDe($id("objeto-img"));
        obj.classList.add("oculto");
        obj.classList.remove("levantado");
        if (L.esCorrecta(reto, id)) {
            fase = "respuesta";
            destinos().forEach(function (d) { d.classList.remove("pista"); });
            efecto("magia");
            await responder(destino, desde, gen);
            if (!vivo(gen)) return;
            guardarEnDestino(destino, reto.material);
            await retoCompletado(gen);
            return;
        }
        fase = "error";
        erroresReto += 1;
        const voz = decir(L.lineaError(reto, id), { estado: "error" });
        await rechazar(destino, desde);
        if (gen !== rondaGen) return;
        obj.classList.remove("oculto");
        await voz;
        if (gen !== rondaGen) return;
        if (erroresReto >= 3) {
            const ok = destinoDe(reto.correcta);
            if (ok) ok.classList.add("pista");
        }
        fase = "explorar";
    }

    /** El contenedor equivocado rebota (Boing), expulsa flotando o emite la onda de calibración amarilla. */
    async function rechazar(destino, desde) {
        const src = material(reto.material).img;
        const r = destino.getBoundingClientRect();
        const lado = Math.min(110, r.height * 0.6);
        const meta = cajaEn({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 }, lado);
        const origen = rectDe($id("objeto-img"));
        const llegada = await volar(src, desde, meta, { ms: 420, conservar: true });
        if (llegada) llegada.remove();
        if (reto.rechazo === "calibrar") {
            destino.classList.add("calibrando");
            onda.calibrar = performance.now();
            efecto("calibracion");
            await sleep(800);
            destino.classList.remove("calibrando");
            await volar(src, meta, origen, { arco: 60, ms: 520 });
            return;
        }
        if (reto.rechazo === "expulsar") {
            efecto(datosDestino(destino.dataset.id).sonido);
            const el = crearImg(src, "vuelo");
            $id("capa-efectos").appendChild(el);
            const frames = [];
            const pasos = 6;
            for (let i = 0; i <= pasos; i++) {
                const t = i / pasos;
                const vaiven = Math.sin(t * Math.PI * 3) * 40 * (1 - t);
                frames.push(caja({
                    left: meta.left + (origen.left - meta.left) * t + vaiven,
                    top: meta.top + (origen.top - meta.top) * t - Math.sin(t * Math.PI) * 120,
                    width: meta.width + (origen.width - meta.width) * t,
                    height: meta.height + (origen.height - meta.height) * t
                }, { transform: "rotate(" + vaiven / 3 + "deg)" }));
            }
            setTimeout(function () { efecto("fluff"); }, 200);
            await animar(el, frames, { duration: 1600, easing: "ease-in-out" });
            el.remove();
            return;
        }
        destino.classList.add("rebota");
        efecto("boing");
        await volar(src, meta, origen, { arco: 140, ms: 720, easing: "cubic-bezier(.2,.9,.3,1.1)" });
        destino.classList.remove("rebota");
    }

    function responder(destino, desde, gen) {
        switch (reto.respuesta) {
            case "camita": return respCamita(destino, desde);
            case "pulir": return respPulir(destino, desde, gen, false);
            case "almohada": return respAlmohada(destino, desde);
            case "abrazaNube": return respAbrazaNube(destino, desde);
            case "pulirBloque": return respPulir(destino, desde, gen, true);
            case "iluminar": return respIluminar(destino, desde);
            case "encajar": return respEncajar(destino, desde);
            default: return decir(reto.acierto, { estado: "acierto" });
        }
    }

    /* ── Respuestas 3-4 ───────────────────────────────────────── */

    /** El peluche baja por el tobogán de algodón, da un salto y se acomoda en la camita esponjosa. */
    async function respCamita(destino, desde) {
        const src = material(reto.material).img;
        const r = destino.getBoundingClientRect();
        const cama = destino.querySelector(".cama").getBoundingClientRect();
        const lado = Math.min(96, r.height * 0.5);
        const arriba = cajaEn({ x: r.left + lado * 0.6, y: r.top + lado * 0.3 }, lado);
        const abajo = cajaEn({ x: cama.left + cama.width / 2, y: cama.top + cama.height * 0.15 }, lado);
        const voz = decir(reto.acierto, { estado: "acierto" });
        const el = await volar(src, desde, arriba, { arco: 40, ms: 480, conservar: true });
        efecto("tobogan");
        await animar(el, [caja(arriba, { transform: "rotate(0deg)" }), caja(abajo, { transform: "rotate(-12deg)" })], { duration: 700, easing: "ease-in" });
        efecto("boing");
        const salto = Object.assign({}, abajo, { top: abajo.top - 70 });
        await animar(el, [
            caja(abajo), caja(salto, { offset: 0.45 }), caja(abajo, { offset: 0.8 }),
            caja({ left: abajo.left, top: abajo.top + 6, width: abajo.width, height: abajo.height - 6 })
        ], { duration: 800, easing: "ease-in-out" });
        efecto("fluff");
        particulas(cama.left + cama.width / 2, cama.top + cama.height * 0.3, { n: 10, tipo: "nube", dist: 80, gravedad: -20, ms: 900 });
        await sleep(300);
        el.remove();
        await voz;
    }

    /** La lija pule una pieza de madera en tiempo real (3-4: dentro de la trampilla con luz verde; 5-6: en la cámara). */
    async function respPulir(destino, desde, gen, lab) {
        const src = material(reto.material).img;
        let base;
        if (lab) {
            base = $id("objeto-img").getBoundingClientRect();
        } else {
            destino.classList.add("abierta");
            efecto("clack");
            const r = destino.getBoundingClientRect();
            await volar(src, desde, cajaEn({ x: r.left + r.width / 2, y: r.top + 30 }, 50), { arco: 50, ms: 480, opacidadFinal: 0.3 });
            base = { left: r.left + r.width * 0.25, top: r.top - r.height * 0.35, width: r.width * 0.5, height: r.height * 0.8 };
        }
        const pieza = crearImg(IMG.pieza, "pieza-fija");
        Object.assign(pieza.style, caja(base));
        $id("capa-efectos").appendChild(pieza);
        await animar(pieza, [
            { transform: "scale(.2)", opacity: 0 },
            { transform: "scale(1)", opacity: 1 }
        ], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)" });
        const tam = Math.min(base.width, base.height) * 0.5;
        const sobre = cajaEn({ x: base.left + base.width / 2, y: base.top + base.height * 0.35 }, tam);
        const lija = await volar(src, lab ? desde : cajaEn({ x: base.left + base.width / 2, y: base.top + base.height }, 50), sobre, { arco: 40, ms: 450, conservar: true });
        if (!vivo(gen)) { if (lija) lija.remove(); pieza.remove(); return; }
        const iv = setInterval(function () {
            efecto("rascrasc");
            const c = lija ? centroDe(lija) : centroDe(pieza);
            particulas(c.x, c.y + tam * 0.3, { n: 6, tipo: "polvo", dist: 60, gravedad: 40, ms: 700 });
        }, 360);
        setTimeout(function () { pieza.src = IMG.piezaPulida; }, 360 * 3);
        await animar(lija, [
            { transform: "translateX(-50px) rotate(-10deg)" },
            { transform: "translateX(50px) rotate(8deg)" }
        ], { duration: 340, iterations: 6, direction: "alternate", easing: "ease-in-out" });
        clearInterval(iv);
        if (lija) lija.remove();
        pieza.src = IMG.piezaPulida;
        pieza.classList.add("brilla");
        const c = centroDe(pieza);
        particulas(c.x, c.y, { n: 14, tipo: "brillo", dist: 120, ms: 900 });
        efecto(lab ? "pffding" : "clackding");
        destino.classList.add(lab ? "ok" : "luz-ok");
        const voz = decir(reto.acierto, { estado: "acierto" });
        if (lab) {
            await sleep(500);
            await volar(src, rectDe(pieza), cajaEn(centroDe(destino), 60), { arco: 50, ms: 520, opacidadFinal: 0.4 });
        }
        await sleep(700);
        await animar(pieza, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 });
        pieza.remove();
        destino.classList.remove("abierta");
        await voz;
    }

    function relativoEscenario(r) {
        const e = $id("escenario").getBoundingClientRect();
        return { left: r.left - e.left, top: r.top - e.top, width: r.width, height: r.height };
    }

    /** El algodón se une a las nubes y forma una almohada gigante donde Zoe salta de alegría. */
    async function respAlmohada(destino, desde) {
        const src = material(reto.material).img;
        const r = destino.getBoundingClientRect();
        const voz = decir(reto.acierto, { estado: "acierto" });
        await volar(src, desde, cajaEn({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 }, 80), { arco: 60, ms: 600, opacidadFinal: 0.5 });
        efecto("fluff");
        const pequena = relativoEscenario({ left: r.left + r.width * 0.3, top: r.top + r.height * 0.2, width: r.width * 0.4, height: r.height * 0.4 });
        const grande = relativoEscenario({ left: r.left - r.width * 0.1, top: r.top - r.height * 0.75, width: r.width * 1.2, height: r.height * 1.3 });
        const almohada = crearImg(IMG.nube, "almohada-gigante");
        $id("capa-escena").appendChild(almohada);
        await animar(almohada, [caja(pequena, { opacity: 0 }), caja(grande, { opacity: 1 })], { duration: 700, easing: "cubic-bezier(.3,1.4,.5,1)" });
        const pj = $id("pj-zoe");
        const zoe = pj.querySelector(".pj-img");
        const zr = zoe.getBoundingClientRect();
        const ga = $id("capa-escena").lastElementChild.getBoundingClientRect();
        const dx = ga.left + ga.width / 2 - (zr.left + zr.width / 2);
        const dy = ga.top + ga.height * 0.45 - zr.bottom;
        pj.style.zIndex = "14";
        const sobre = "translate(" + dx + "px," + dy + "px) scale(.6)";
        const alto = "translate(" + dx + "px," + (dy - 60) + "px) scale(.6)";
        setTimeout(function () { efecto("boing"); }, 900);
        setTimeout(function () { efecto("boing"); }, 1500);
        await animar(zoe, [
            { transform: "none" },
            { transform: "translate(" + dx / 2 + "px," + (dy - 140) + "px) scale(.75)", offset: 0.2 },
            { transform: sobre, offset: 0.35 },
            { transform: alto, offset: 0.48 },
            { transform: sobre, offset: 0.6 },
            { transform: alto, offset: 0.72 },
            { transform: sobre, offset: 0.84 },
            { transform: "none" }
        ], { duration: 2600, easing: "ease-in-out", fill: "none" });
        pj.style.zIndex = "";
        const c = centroDe(almohada);
        particulas(c.x, c.y, { n: 16, tipo: "nube", dist: 160, ms: 1100 });
        await animar(almohada, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
        almohada.remove();
        await voz;
    }

    /* ── Respuestas 5-6 ───────────────────────────────────────── */

    /** El peluche abraza la nube del módulo Suave y se enciende el indicador verde. */
    async function respAbrazaNube(destino, desde) {
        const src = material(reto.material).img;
        const nube = crearImg(IMG.nube, "modulo-nube");
        destino.appendChild(nube);
        const voz = decir(reto.acierto, { estado: "acierto" });
        await volar(src, desde, cajaEn(centroDe(destino), 70), { arco: 80, ms: 650 });
        efecto("swooshsoft");
        destino.classList.add("abrazo", "ok");
        const c = centroDe(destino);
        particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 90 });
        await sleep(1200);
        nube.remove();
        destino.classList.remove("abrazo");
        await voz;
    }

    /** El algodón entra al módulo Suave e ilumina todo el laboratorio. */
    async function respIluminar(destino, desde) {
        const src = material(reto.material).img;
        const voz = decir(reto.acierto, { estado: "acierto" });
        await volar(src, desde, cajaEn(centroDe(destino), 70), { arco: 80, ms: 650 });
        efecto("pufffluff");
        destino.classList.add("ok");
        $id("escenario").classList.add("lab-iluminado");
        setTimeout(function () { efecto("chispas"); }, 250);
        const e = $id("escenario").getBoundingClientRect();
        particulas(e.left + e.width / 2, e.top + e.height / 2, { n: 24, tipo: "brillo", dist: 360, ms: 1300 });
        await sleep(1600);
        $id("escenario").classList.remove("lab-iluminado");
        await voz;
    }

    /** La corteza encaja en la estructura rústica del módulo verde. */
    async function respEncajar(destino, desde) {
        const src = material(reto.material).img;
        destino.classList.add("rustico");
        const voz = decir(reto.acierto, { estado: "acierto" });
        const el = await volar(src, desde, cajaEn(centroDe(destino), 70), { arco: 80, ms: 650, conservar: true });
        efecto("crocrasch");
        await animar(el, [
            { transform: "scale(1.3)" }, { transform: "scale(.9)", offset: 0.6 }, { transform: "scale(1)" }
        ], { duration: 420, easing: "ease-out" });
        el.remove();
        efecto("clack");
        destino.classList.add("ok");
        const c = centroDe(destino);
        particulas(c.x, c.y, { n: 10, tipo: "migas", dist: 70, gravedad: 30 });
        await sleep(600);
        await voz;
    }

    /* ── Escáner de fricción (5-6) ────────────────────────────── */

    function claseActual() {
        const id = $id("objeto").dataset.material;
        return (id && material(id).clase) || "suave";
    }

    function ajustarOnda() {
        const cv = $id("onda");
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        cv._w = r.width;
        cv._h = r.height;
        cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pintarOnda(ts) {
        const cv = $id("onda");
        if (!cv._w) ajustarOnda();
        const ctx = cv.getContext("2d");
        const w = cv._w;
        const h = cv._h;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(116, 192, 252, 0.25)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        const calibrando = performance.now() - onda.calibrar < 1500;
        onda.actividad *= 0.95;
        const clase = calibrando ? "calibracion" : claseActual();
        const amp = calibrando ? 1 : Math.max(0.06, onda.actividad);
        const vals = L.curvaFriccion(clase, 90, ts / 1000 * (clase === "aspero" ? 1.4 : 0.5));
        ctx.strokeStyle = calibrando ? "#fcc419" : "#3bc9db";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.beginPath();
        vals.forEach(function (v, i) {
            const x = (i / (vals.length - 1)) * w;
            const y = h / 2 - v * amp * h * 0.42;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        onda.raf = requestAnimationFrame(pintarOnda);
    }

    function iniciarOnda() {
        detenerOnda();
        ajustarOnda();
        onda.raf = requestAnimationFrame(pintarOnda);
    }

    function detenerOnda() {
        if (onda.raf) cancelAnimationFrame(onda.raf);
        onda.raf = 0;
    }

    /* ── Demostración (material que no es un reto real) ───────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.material || !material(d.material).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        limpiarEscena();
        prepararObjeto(d.material, d.exploracion, { nombre: d.nombre });
        await llegaObjeto();
        const t = textos();
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const img = $id("objeto-img");
        const r = img.getBoundingClientRect();
        const x0 = r.left + r.width * 0.25;
        const y0 = r.top + r.height * 0.5;
        const dx = r.width * 0.5;
        const dur = 1400;
        let iv = null;
        await PedniaTutorial.animarMano({
            punto: { x: x0, y: y0 },
            holdMs: 300,
            arrastre: { dx: dx, dy: 0, durMs: dur },
            cancelado: cancelado,
            onPresionar: function () {
                const t0 = performance.now();
                let xUlt = x0;
                explorar(x0, y0, { inicio: true });
                iv = setInterval(function () {
                    const k = Math.min(1, (performance.now() - t0) / dur);
                    const x = x0 + dx * k;
                    explorar(x, y0, { dx: x - xUlt });
                    xUlt = x;
                    if (k >= 1) clearInterval(iv);
                }, 90);
            },
            onSoltar: function () { clearInterval(iv); }
        });
        clearInterval(iv);
        if (cancelado()) return;
        marcarListo();
        const destino = destinoDe(material(d.material).clase);
        const c = centroDe(img);
        const cd = centroDe(destino);
        const obj = $id("objeto");
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 300,
            arrastre: { dx: cd.x - c.x, dy: cd.y - c.y, durMs: 1100, soltarEnDestino: true },
            cancelado: cancelado,
            onDuranteArrastre: function () {
                obj.classList.add("oculto");
                destino.classList.add("is-demo-target");
                volar(img.getAttribute("src"), rectDe(img), cajaEn(cd, 90), { ms: 1100, easing: "ease" });
            },
            onSoltar: function () {
                efecto(datosDestino(destino.dataset.id).sonido || "magia");
                efecto("magia");
                particulas(cd.x, cd.y, { n: 12, tipo: "estrella", dist: 90 });
                destino.classList.add(esLab() ? "ok" : "luz-ok");
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        destino.classList.remove("is-demo-target");
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
        detenerOnda();
        const ce = nivelElegido.cierreEscena || { tipo: "tubo", titulo: "" };
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

        if (ce.tipo === "tubo") await finalTubo(escena);
        else await finalMatriz(escena);

        await new Promise(function (resolve) {
            const t = setTimeout(resolve, 4500);
            capa.addEventListener("pointerdown", function (ev) {
                if (ev.target.closest(".tubo-objeto")) return;
                clearTimeout(t);
                resolve();
            });
        });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Los objetos clasificados vuelven a pasar por el tubo y caen en su contenedor (tocarlos los hace sonar). */
    async function finalTubo(escena) {
        const RUTAS = {
            suave: "M 20 50 H 300 Q 380 50 380 130 Q 380 210 260 262",
            aspero: "M 20 50 H 300 Q 380 50 380 130 Q 380 210 500 262"
        };
        const zoe = crearImg("../../../img/zoe_normal.gif", "gf-personaje");
        const zeus = crearImg("../../../img/zeus_normal.gif", "gf-personaje");
        const circuito = document.createElement("div");
        circuito.className = "circuito";
        circuito.innerHTML =
            '<svg class="circuito-tubo" viewBox="0 0 760 360" aria-hidden="true">' +
            Object.keys(RUTAS).map(function (k) { return '<path class="tubo-vidrio" d="' + RUTAS[k] + '"/>'; }).join("") +
            Object.keys(RUTAS).map(function (k) { return '<path class="tubo-brillo" d="' + RUTAS[k] + '"/>'; }).join("") +
            "</svg>" +
            '<div class="circuito-bin bin-suave" data-id="suave"></div>' +
            '<div class="circuito-bin bin-aspero" data-id="aspero"></div>';
        escena.appendChild(zoe);
        escena.appendChild(circuito);
        escena.appendChild(zeus);
        const soportaRuta = !!(window.CSS && CSS.supports && CSS.supports("offset-path", "path('M 0 0 H 1')"));
        await sleep(500);
        const viajes = nivelElegido.retos.map(function (r, i) {
            return sleep(i * 750).then(function () {
                const el = crearImg(material(r.material).img, "tubo-objeto");
                el.addEventListener("pointerdown", function () {
                    efecto(r.exploracion.sonido);
                    const c = centroDe(el);
                    particulas(c.x, c.y, { n: 8, tipo: "estrella", dist: 60 });
                });
                circuito.appendChild(el);
                efecto("tubo");
                const bin = circuito.querySelector('.circuito-bin[data-id="' + r.correcta + '"]');
                let viaje;
                if (soportaRuta) {
                    el.style.offsetPath = "path('" + RUTAS[r.correcta] + "')";
                    viaje = animar(el, [{ offsetDistance: "0%" }, { offsetDistance: "100%" }], { duration: 2200, easing: "ease-in-out" });
                } else {
                    el.style.transform = "translate(-50%,-50%)";
                    viaje = animar(el, [
                        { left: "20px", top: "50px" },
                        { left: "380px", top: "130px" },
                        { left: (r.correcta === "suave" ? 260 : 500) + "px", top: "262px" }
                    ], { duration: 2200, easing: "ease-in-out" });
                }
                return viaje.then(function () {
                    efecto(datosDestino(r.correcta).sonido);
                    bin.classList.remove("recibe");
                    void bin.offsetWidth;
                    bin.classList.add("recibe");
                    const c = centroDe(bin);
                    particulas(c.x, c.y - 20, { n: 12, tipo: "estrella", dist: 80 });
                });
            });
        });
        await Promise.all(viajes);
        await sleep(600);
    }

    /** Panel con los materiales analizados, su textura y su curva de fricción. */
    async function finalMatriz(escena) {
        const panel = document.createElement("div");
        panel.className = "matriz";
        panel.innerHTML =
            '<div class="matriz-fila matriz-cabeza"><span>Material</span><span>Textura</span><span>Curva de fricción</span></div>';
        escena.appendChild(panel);
        for (let i = 0; i < nivelElegido.retos.length; i++) {
            const r = nivelElegido.retos[i];
            const fila = document.createElement("div");
            fila.className = "matriz-fila";
            fila.innerHTML =
                '<span class="matriz-material"><img alt="" draggable="false"><span></span></span>' +
                '<span class="matriz-textura textura-' + r.correcta + '"></span>' +
                '<canvas class="matriz-curva"></canvas>';
            fila.querySelector("img").src = material(r.material).img;
            fila.querySelector(".matriz-material span").textContent = r.nombre;
            fila.querySelector(".matriz-textura").textContent = datosDestino(r.correcta).nombre;
            panel.appendChild(fila);
            dibujarCurva(fila.querySelector("canvas"), material(r.material).clase, i * 0.37);
            efecto("ding");
            animar(fila, [
                { transform: "translateX(-40px)", opacity: 0 },
                { transform: "none", opacity: 1 }
            ], { duration: 450, easing: "cubic-bezier(.3,1.4,.5,1)" });
            await sleep(650);
        }
        await sleep(600);
    }

    function dibujarCurva(cv, clase, fase) {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        const ctx = cv.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const vals = L.curvaFriccion(clase, 80, fase || 0);
        ctx.strokeStyle = clase === "aspero" ? "#2b8a3e" : "#d6336c";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.beginPath();
        vals.forEach(function (v, i) {
            const x = (i / (vals.length - 1)) * r.width;
            const y = r.height / 2 - v * r.height * 0.42;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function prepararPremio() {
        const premio = nivelElegido.premio || {};
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector("img.trofeo");
        if (!trofeo) return;
        trofeo.style.display = "none";
        const cajaPremio = document.createElement("div");
        cajaPremio.className = "trofeo premio";
        cajaPremio.innerHTML =
            '<i class="premio-icono fa-solid ' + (premio.icono || "fa-medal") + '"></i>' +
            '<span class="premio-textos"><span class="premio-titulo"></span><strong class="premio-nombre"></strong></span>';
        cajaPremio.querySelector(".premio-titulo").textContent = premio.titulo;
        cajaPremio.querySelector(".premio-nombre").textContent = premio.nombre;
        contenido.appendChild(cajaPremio);
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
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[SuaveOAspero] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarObjeto();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        window.addEventListener("resize", function () {
            if (esLab() && onda.raf) ajustarOnda();
        });
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
