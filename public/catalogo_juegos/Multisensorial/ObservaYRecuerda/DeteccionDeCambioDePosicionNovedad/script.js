/* Observa y recuerda — Multisensorial (memoria visual: intruso, faltante, intercambio) */
(function () {
    "use strict";

    const L = window.ObservaRecuerdaLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const OBSERVACION_MS = 4000;
    const OCULTAMIENTO_MS = 1500;
    const TRANSICION_CUBIERTA_MS = 420;
    /* Nombres del juego -> efectos sintetizados de sfx.js */
    const ALIAS_SFX = {
        cortina: "swooshSwitch",
        humo: "shhhZip",
        niebla: "shhhZip",
        apagon: "clickShhh",
        baul: "clackMagic",
        estrellas: "swooshSwitch",
        chispas: "shineBloom"
    };
    /** Config puede decir baul/niebla/estrellas; la cubierta solo pinta cortina/humo/apagon. */
    const CUBIERTA_VISUAL = { baul: "cortina", niebla: "humo", estrellas: "humo", cortina: "cortina", humo: "humo", apagon: "apagon" };

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let ctx = null;
    let desafio = [];
    let marcados = [];
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let tokenIntento = 0;
    let erroresReto = 0;
    let demoActiva = false;
    let entradaActiva = false;
    let ignorarClickHasta = 0;
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
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function elemento(id) {
        const e = (gameConfig.elementos || {})[id];
        if (e) return e;
        return { img: "img/" + id + ".svg", nombre: id };
    }

    function linea(l) {
        if (!l) return null;
        if (typeof l === "string") return { voz: "zoe", texto: l };
        return l;
    }

    function esCorrecto(r) {
        return r === "correcto" || r === true || !!(r && (r.ok === true || r.resultado === "correcto"));
    }

    /* ── Volumen y accesibilidad ─────────────────────────────── */

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

    /* ── Precarga y audio ────────────────────────────────────── */

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
        const ids = {};
        Object.keys(gameConfig.elementos || {}).forEach(function (id) { ids[id] = true; });
        function sumarIds(o) {
            if (!o) return;
            (o.mostrar || []).forEach(function (id) { ids[id] = true; });
            (o.opciones || []).forEach(function (id) { ids[id] = true; });
            [o.intruso, o.faltante].forEach(function (id) { if (id) ids[id] = true; });
            (o.intercambiar || []).forEach(function (id) { ids[id] = true; });
        }
        sumarIds(gameConfig.demo);
        (gameConfig.niveles || []).forEach(function (n) {
            (n.retos || []).forEach(sumarIds);
            if (n.insignia) urls.push(n.insignia.img);
        });
        Object.keys(ids).forEach(function (id) { urls.push(elemento(id).img); });
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

    /* ── Nivel, intro 3D y arranque ──────────────────────────── */

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

        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (l) {
            const indice = Number(l.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indice] && introConfig.personajes[indice].nombre)
                || (id === "zoe" ? "Zoe" : "Zeus");

            return {
                personaje: id,
                nombre: nombre,
                color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
                texto: TextoVoz.textoPlano(l.texto)
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
        if (window.ObservaRecuerdaSfx && typeof ObservaRecuerdaSfx.desbloquear === "function") ObservaRecuerdaSfx.desbloquear();
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

    /** Cancela WAAPI; sin esto un fill:forwards deja el objeto desplazado en la siguiente ronda. */
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
        if (window.ObservaRecuerdaSfx) {
            try { ObservaRecuerdaSfx.sonar(ALIAS_SFX[nombre] || nombre); } catch (e) { /* noop */ }
        }
    }

    /* ── Diálogo ─────────────────────────────────────────────── */

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

    function decir(l, opts) {
        opts = opts || {};
        l = linea(l);
        if (!l || !l.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = l.voz === "zeus" ? "zeus" : "zoe";
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, l.texto, opts.estado);
        };
        const respaldo = setTimeout(mostrar, 6000);
        let p;
        try { p = TextoVoz.hablar(l.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    /* ── Edad / nivel ────────────────────────────────────────── */

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
        const sumar = function (l) {
            l = linea(l);
            if (l && l.texto) lineas.push({ texto: l.texto, personaje: l.voz || "zoe" });
        };
        (nivel.retos || []).forEach(function (r) {
            sumar(r.presentacion);
            sumar(r.pregunta);
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
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        montarEscenario();
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    /* ── Escenario ───────────────────────────────────────────── */

    function esMuseo() {
        return !!nivelElegido && String(nivelElegido.id) === "5";
    }

    function montarEscenario() {
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        document.body.classList.toggle("museo-sensorial", esMuseo());
        $id("baul").hidden = esMuseo();
        limpiarEscena();
        pintarProgreso(-1);
    }

    function limpiarEscena() {
        cancelarAnimaciones($id("tablero"));
        $id("tablero").innerHTML = "";
        $id("tablero").className = "tablero";
        $id("opciones").innerHTML = "";
        $id("opciones").className = "opciones";
        ocultarBarra();
        const escena = $id("escena-juego");
        if (escena) escena.classList.remove("con-linterna");
        const baul = $id("baul");
        if (baul) baul.classList.remove("cerrando", "abriendo");
        const cub = $id("cubierta");
        cub.hidden = true;
        cub.className = "cubierta";
        cub.innerHTML = "";
        desafio = [];
        marcados = [];
    }

    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = (nivelElegido.retos || []).length;
        if (cont.children.length !== total) {
            cont.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const p = document.createElement("span");
                p.className = "progreso-punto";
                p.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }

    /* ── Tablero ─────────────────────────────────────────────── */

    function crearObjeto(id, i) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.i = String(i);
        if (id == null) {
            b.className = "objeto hueco";
            b.setAttribute("aria-label", "Hueco vacío");
            if (esMuseo()) marcarPedestal(b, i);
            return b;
        }
        const e = elemento(id);
        b.className = "objeto";
        b.dataset.id = id;
        b.setAttribute("aria-label", e.nombre || id);
        b.appendChild(crearImg(e.img, "objeto-img"));
        if (esMuseo()) marcarPedestal(b, i);
        return b;
    }

    function marcarPedestal(el, i) {
        const n = document.createElement("span");
        n.className = "num-pedestal";
        n.textContent = String(i + 1);
        el.appendChild(n);
    }

    async function pintarTablero(items, animado) {
        const cont = $id("tablero");
        cancelarAnimaciones(cont);
        cont.innerHTML = "";
        cont.className = "tablero cant-" + Math.max(2, Math.min(7, items.length));
        const els = items.map(function (id, i) {
            const el = crearObjeto(id, i);
            cont.appendChild(el);
            return el;
        });
        if (animado) {
            efecto("pop");
            await Promise.all(els.map(function (el, i) {
                return animar(el, [
                    { transform: "translateY(40px) scale(.5)", opacity: 0 },
                    { transform: "translateY(-6px) scale(1.06)", opacity: 1, offset: 0.7 },
                    { transform: "none", opacity: 1 }
                ], { duration: 420, delay: i * 90, easing: "ease-out", fill: "backwards" });
            }));
        }
        return els;
    }

    function objetoDe(id) {
        if (!id) return null;
        return $id("tablero").querySelector('.objeto[data-id="' + id + '"]');
    }

    function huecoEl() {
        return $id("tablero").querySelector(".objeto.hueco");
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
                { transform: "translateY(50px) scale(.6)", opacity: 0 },
                { transform: "translateY(-6px) scale(1.04)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 440, delay: i * 100, easing: "ease-out", fill: "backwards" });
        }));
    }

    /* ── Observación, barra de tiempo y cubierta ─────────────── */

    /** 3-4: reloj de arena. 5-6: temporizador circular. */
    function correrReloj(ms) {
        const barra = $id("barra-tiempo");
        const museo = esMuseo();
        barra.hidden = false;
        barra.className = "barra-tiempo " + (museo ? "reloj-circular" : "reloj-arena");
        const dur = ' style="animation-duration:' + ms + 'ms"';
        if (museo) {
            barra.innerHTML = '<span class="reloj-aro"' + dur + '></span>';
            return;
        }
        barra.innerHTML = '<span class="arena-vaso">' +
            '<span class="arena-arriba"' + dur + '></span>' +
            '<span class="arena-cuello"></span>' +
            '<span class="arena-abajo"' + dur + '></span></span>';
    }

    function ocultarBarra() {
        const barra = $id("barra-tiempo");
        barra.hidden = true;
        barra.className = "barra-tiempo";
        barra.innerHTML = "";
    }

    function htmlCubierta(tipo) {
        if (tipo === "humo") {
            return '<span class="c-humo h1"></span><span class="c-humo h2"></span><span class="c-humo h3"></span>' +
                '<span class="c-humo h4"></span><span class="c-humo h5"></span>';
        }
        if (tipo === "apagon") return '<span class="c-oscuro"></span>';
        return '<span class="c-izq"></span><span class="c-der"></span>';
    }

    /** El baúl se cierra sobre los objetos (reto 1 de 3-4). No usa la cortina. */
    async function cerrarBaul(r, trasCubrir, sigue) {
        const ms = Number(r.ocultamientoMs) > 0 ? Number(r.ocultamientoMs) : 2000;
        const baul = $id("baul");
        const tab = $id("tablero");
        baul.classList.add("cerrando");
        efecto(r.ocultamientoEfecto || "clackMagic");
        await sleep(TRANSICION_CUBIERTA_MS);
        if (!sigue()) return false;
        tab.classList.add("oculto-baul");
        await sleep(ms);
        if (!sigue()) return false;
        await trasCubrir();
        if (!sigue()) return false;
        tab.classList.remove("oculto-baul");
        baul.classList.remove("cerrando");
        baul.classList.add("abriendo");
        await sleep(TRANSICION_CUBIERTA_MS);
        baul.classList.remove("abriendo");
        return sigue();
    }

    /** Tapa el tablero; mientras está cubierto se llama a `trasCubrir` para pintar el desafío. */
    async function cubrir(r, trasCubrir, sigue) {
        const clave = r.ocultamiento || "cortina";
        if (clave === "baul" && !esMuseo()) return cerrarBaul(r, trasCubrir, sigue);
        const tipo = CUBIERTA_VISUAL[clave] || "cortina";
        const ms = Number(r.ocultamientoMs) > 0 ? Number(r.ocultamientoMs) : OCULTAMIENTO_MS;
        const cub = $id("cubierta");
        cub.className = "cubierta " + tipo + (clave === "estrellas" ? " estrellas" : "");
        cub.innerHTML = htmlCubierta(tipo) + (clave === "estrellas"
            ? '<span class="c-estrella e1"></span><span class="c-estrella e2"></span><span class="c-estrella e3"></span>'
            : "");
        cub.hidden = false;
        void cub.offsetWidth;
        cub.classList.add("cerrando");
        efecto(r.ocultamientoEfecto || clave);
        await sleep(TRANSICION_CUBIERTA_MS);
        if (!sigue()) return false;
        await sleep(ms);
        if (!sigue()) return false;
        await trasCubrir();
        if (!sigue()) return false;
        cub.classList.remove("cerrando");
        cub.classList.add("abriendo");
        await sleep(TRANSICION_CUBIERTA_MS);
        cub.hidden = true;
        cub.className = "cubierta";
        cub.innerHTML = "";
        return sigue();
    }

    /** Construye el tablero del desafío según la mecánica. */
    function construirDesafio(r) {
        const base = (r.mostrar || []).slice();
        if (ctx && Array.isArray(ctx.desafio) && ctx.desafio.length) return ctx.desafio.slice();
        if (r.mecanica === "intruso") {
            const items = base.slice();
            if (items.indexOf(r.intruso) < 0) {
                const idx = ctx && isFinite(ctx.indiceIntruso)
                    ? Math.max(0, Math.min(items.length, ctx.indiceIntruso))
                    : Math.floor(Math.random() * (items.length + 1));
                items.splice(idx, 0, r.intruso);
            }
            return items;
        }
        if (r.mecanica === "faltante") {
            const k = base.indexOf(r.faltante);
            if (k >= 0) base[k] = null;
            else base.push(null);
            return base;
        }
        if (r.mecanica === "intercambio") {
            const par = r.intercambiar || [];
            const a = base.indexOf(par[0]);
            const b = base.indexOf(par[1]);
            if (a >= 0 && b >= 0) {
                const t = base[a];
                base[a] = base[b];
                base[b] = t;
            }
            return base;
        }
        return base;
    }

    async function pintarDesafio(r) {
        desafio = construirDesafio(r);
        marcados = [];
        // Sin entrada animada bajo la cubierta: el doc pide ~2s de transición, no 4s.
        await pintarTablero(desafio, false);
        if (r.mecanica === "faltante") {
            const lista = ctx && Array.isArray(ctx.opciones) && ctx.opciones.length
                ? ctx.opciones
                : L.ordenarOpciones(r.opciones || [], r.faltante, Math.random);
            await llegarOpciones(lista);
        }
    }

    /**
     * Muestra el tablero, corre la barra, cubre y pinta el desafío.
     * @param {{ yaPintado?: boolean }} opts si yaPintado, no repinta la fase de memoria.
     */
    async function secuenciaObservacion(r, sigue, opts) {
        opts = opts || {};
        if (!opts.yaPintado) {
            await pintarTablero(r.mostrar || [], true);
            if (!sigue()) return false;
        }
        const ms = Number(r.observacionMs) > 0 ? Number(r.observacionMs) : OBSERVACION_MS;
        const escena = $id("escena-juego");
        if (esMuseo() && escena) escena.classList.add("con-linterna");
        correrReloj(ms);
        /* El reloj corre mientras habla el personaje. No se suma otro bloque después. */
        await Promise.all([
            Promise.resolve(opts.voz || null).catch(function () {}),
            sleep(ms)
        ]);
        if (!sigue()) return false;
        ocultarBarra();
        if (escena) escena.classList.remove("con-linterna");
        return cubrir(r, function () { return pintarDesafio(r); }, sigue);
    }

    /* ── Entrada: toques y arrastre ──────────────────────────── */

    function puedeResponder() {
        return entradaActiva && !demoActiva && !juegoTerminado && !!reto && fase === "jugar";
    }

    function enlazarTablero() {
        $id("tablero").addEventListener("click", function (ev) {
            const el = ev.target.closest(".objeto");
            if (!el || !puedeResponder()) return;
            if (el.classList.contains("hueco")) {
                reiniciarClase(el, "toca", 450);
                return;
            }
            if (el.classList.contains("descartado")) return;
            if (reto.mecanica === "intruso") {
                resolver([el.dataset.id], [el]);
            } else if (reto.mecanica === "intercambio") {
                alternarMarca(el);
            }
        });
    }

    function enlazarOpciones() {
        $id("opciones").addEventListener("click", function (ev) {
            const el = ev.target.closest(".opcion");
            if (!el || !puedeResponder() || reto.mecanica !== "faltante") return;
            if (Date.now() < ignorarClickHasta || el.classList.contains("descartada")) return;
            resolver([el.dataset.id], [el]);
        });
    }

    function enlazarArrastreOpciones() {
        const cont = $id("opciones");
        let st = null;

        function limpiarDestino() {
            const h = huecoEl();
            if (h) h.classList.remove("destino");
        }

        function sobreHueco(x, y) {
            const h = huecoEl();
            if (!h) return null;
            return L.dentro({ x: x, y: y }, h.getBoundingClientRect(), 18) ? h : null;
        }

        cont.addEventListener("pointerdown", function (ev) {
            const op = ev.target.closest(".opcion");
            if (!op || !puedeResponder() || reto.mecanica !== "faltante") return;
            if (op.classList.contains("descartada")) return;
            st = { op: op, x: ev.clientX, y: ev.clientY, id: ev.pointerId, arrastra: false, ghost: null };
            try { op.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });

        cont.addEventListener("pointermove", function (ev) {
            if (!st || st.id !== ev.pointerId) return;
            const dx = ev.clientX - st.x;
            const dy = ev.clientY - st.y;
            if (!st.arrastra && L.clasificarGesto(dx, dy) === "arrastre") {
                st.arrastra = true;
                const e = elemento(st.op.dataset.id);
                const r = st.op.getBoundingClientRect();
                const g = crearImg(e.img, "fantasma");
                g.style.width = r.width + "px";
                g.style.height = r.height + "px";
                $id("capa-efectos").appendChild(g);
                st.ghost = g;
                st.op.classList.add("arrastrando");
            }
            if (!st.arrastra) return;
            st.ghost.style.left = ev.clientX + "px";
            st.ghost.style.top = ev.clientY + "px";
            const h = sobreHueco(ev.clientX, ev.clientY);
            limpiarDestino();
            if (h) h.classList.add("destino");
        });

        function terminar(ev) {
            if (!st || st.id !== ev.pointerId) return;
            const s = st;
            st = null;
            try { s.op.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            if (s.ghost) s.ghost.remove();
            s.op.classList.remove("arrastrando");
            const h = s.arrastra ? sobreHueco(ev.clientX, ev.clientY) : null;
            limpiarDestino();
            if (s.arrastra) {
                ignorarClickHasta = Date.now() + 250;
                if (h && ev.type === "pointerup" && puedeResponder()) resolver([s.op.dataset.id], [s.op]);
            }
        }

        cont.addEventListener("pointerup", terminar);
        cont.addEventListener("pointercancel", terminar);
    }

    function alternarMarca(el) {
        const i = marcados.indexOf(el);
        if (i >= 0) {
            marcados.splice(i, 1);
            el.classList.remove("marcado");
            return;
        }
        const corr = (ctx && ctx.correctos) || [];
        // Doc: tocar uno que no cambió → error inmediato (pedestal naranja + voz).
        if (corr.indexOf(el.dataset.id) === -1) {
            marcados.forEach(function (m) { m.classList.remove("marcado"); });
            marcados = [];
            el.classList.add("malo");
            resolver([el.dataset.id], [el]);
            return;
        }
        marcados.push(el);
        el.classList.add("marcado");
        reiniciarClase(el, "toca", 450);
        efecto("pop");
        if (marcados.length === 2) {
            const els = marcados.slice();
            resolver(els.map(function (e) { return e.dataset.id; }), els);
        }
    }

    /* ── Pista sin voz tras inactividad ──────────────────────── */

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

    function puntosDePista() {
        if (!reto) return [];
        if (reto.mecanica === "intruso") return [objetoDe(reto.intruso)];
        if (reto.mecanica === "faltante") return [opcionDe(reto.faltante), huecoEl()];
        if (reto.mecanica === "intercambio") return (reto.intercambiar || []).map(objetoDe);
        return [];
    }

    async function pistaObjetivo(g) {
        if (!window.PedniaTutorial || fase !== "jugar" || !reto) return;
        const cancelado = function () { return pista.gen !== g || fase !== "jugar"; };
        const puntos = puntosDePista().filter(Boolean);
        for (let i = 0; i < puntos.length; i++) {
            if (cancelado()) return;
            const p = puntos[i];
            await PedniaTutorial.animarMano({
                punto: p,
                holdMs: 460,
                cancelado: cancelado,
                onPresionar: function () { reiniciarClase(p, "toca", 450); }
            });
        }
    }

    /** Tras 3 errores resalta la respuesta correcta. */
    function pintarPista() {
        if (!reto || erroresReto < 3) return;
        puntosDePista().forEach(function (p) { if (p) p.classList.add("pista"); });
    }

    /* ── Flujo de reto ───────────────────────────────────────── */

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        erroresReto = 0;
        try { ctx = L.prepararCtx(reto, Math.random); } catch (e) { ctx = null; }
        pintarProgreso(indiceReto);
        await presentar(gen);
    }

    async function presentar(gen) {
        fase = "presentacion";
        entradaActiva = false;
        cancelarPista();
        const sigue = function () { return vivo(gen) && fase === "presentacion"; };

        limpiarEscena();
        await sleep(250);
        if (!sigue()) return;
        await pintarTablero(reto.mostrar || [], true);
        if (!sigue()) return;
        const voz = decir(reto.presentacion);
        const ok = await secuenciaObservacion(reto, sigue, { yaPintado: true, voz: voz });
        if (!ok || !sigue()) return;

        await decir(reto.pregunta);
        if (!sigue()) return;
        entradaActiva = true;
        fase = "jugar";
        pintarPista();
        programarPista(pistaObjetivo, 9000);
    }

    async function resolver(ids, els) {
        const gen = rondaGen;
        const intento = ++tokenIntento;
        const sigue = function () { return vivo(gen) && intento === tokenIntento; };
        const esIntercambio = reto.mecanica === "intercambio";
        const r = L.evaluar(reto, ctx, esIntercambio ? ids : ids[0]);
        fase = "animando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();

        if (esCorrecto(r)) {
            entradaActiva = false;
            await responderAcierto(gen, els);
            if (!vivo(gen)) return;
            if (reto.acierto && reto.acierto.texto) await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }

        erroresReto += 1;
        let idError = ids[0];
        if (esIntercambio) {
            const par = reto.intercambiar || [];
            const malo = ids.filter(function (id) { return par.indexOf(id) < 0; })[0];
            if (malo) idError = malo;
        }
        const errorMuseoIntruso = esMuseo() && reto.mecanica === "intruso";
        els.forEach(function (el) {
            el.classList.remove("marcado");
            el.classList.add(errorMuseoIntruso ? "vibra-amarillo" : "malo");
            reiniciarClase(el, "tiembla", 600);
            setTimeout(function () {
                el.classList.remove("malo", "vibra-amarillo");
            }, 700);
        });
        marcados = [];
        const err = L.errorPara(reto, idError) || reto.errorOtro;
        efecto(err && err.efecto ? err.efecto : "suave");
        pintarPista();
        if (err && err.texto) await decir(err);
        else await sleep(650);
        if (!sigue()) return;
        fase = "jugar";
        programarPista(pistaObjetivo, 9000);
    }

    async function completarReto(gen) {
        fase = "completo";
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        celebrarPersonajes(false);
        await animarSalida();
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    async function animarSalida() {
        const els = Array.prototype.slice.call($id("tablero").children)
            .concat(Array.prototype.slice.call($id("opciones").children));
        await Promise.all(els.map(function (el) {
            return animar(el, [{ opacity: 1 }, { opacity: 0, transform: "translateY(30px) scale(.7)" }], { duration: 340 });
        }));
        limpiarEscena();
    }

    /* ── Acierto ─────────────────────────────────────────────── */

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

    async function animacionAcierto(el, nombre) {
        el.classList.add("correcta", "animando", "brilla");
        const c = centroDe(el);
        switch (nombre) {
            case "vuelaGlobo":
                efecto("tadaaZip");
                reiniciarClase(el, "vuela-globo", 1400);
                particulas(c.x, c.y - 30, { n: 12, tipo: "estrella", dist: 100, angulo: -Math.PI / 2, abanico: 1.2, colores: COLORES_FIESTA });
                await sleep(1400);
                break;
            case "dron":
                efecto("ratataplanFly");
                reiniciarClase(el, "sale-dron", 1300);
                particulas(c.x, c.y, { n: 10, tipo: "estrella", dist: 120, colores: ["#868e96", "#fab005"] });
                await sleep(1300);
                break;
            case "parabolas":
                efecto("clickChime");
                reiniciarClase(el, "salta", 1000);
                particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
                await sleep(1100);
                break;
            case "encaja":
                efecto(esMuseo() ? "shineBloom" : "bloomChime");
                reiniciarClase(el, "crece", 900);
                particulas(c.x, c.y, {
                    n: 12,
                    tipo: esMuseo() ? "petalo" : "mariposa",
                    dist: 110,
                    angulo: -Math.PI / 2,
                    abanico: 2.2
                });
                await sleep(1000);
                break;
            case "gira":
                reiniciarClase(el, "gira", 900);
                await sleep(1000);
                break;
            case "crece":
                reiniciarClase(el, "crece", 1100);
                await sleep(1200);
                break;
            case "salta":
                reiniciarClase(el, "salta", 1000);
                await sleep(1100);
                break;
            case "brilla":
            default:
                reiniciarClase(el, "salta", 1000);
                await sleep(1100);
        }
    }

    function crearFantasma(src, desde, ancho) {
        const g = crearImg(src, "fantasma");
        g.style.width = ancho + "px";
        g.style.height = ancho + "px";
        g.style.left = desde.x + "px";
        g.style.top = desde.y + "px";
        $id("capa-efectos").appendChild(g);
        return g;
    }

    async function encajarEnHueco(gen, op, hueco) {
        const id = op.dataset.id;
        const e = elemento(id);
        const c0 = centroDe(op);
        const c1 = centroDe(hueco);
        const ancho = hueco.getBoundingClientRect().width * 0.8;
        const g = crearFantasma(e.img, c0, ancho);
        op.classList.add("apagada");
        await animar(g, [
            { transform: "translate(-50%,-50%) scale(1)" },
            { transform: "translate(calc(-50% + " + (c1.x - c0.x) + "px), calc(-50% + " + (c1.y - c0.y) + "px)) scale(1)" }
        ], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
        g.remove();
        if (!vivo(gen)) return hueco;
        hueco.classList.remove("hueco", "destino", "pista");
        hueco.dataset.id = id;
        hueco.setAttribute("aria-label", e.nombre || id);
        hueco.appendChild(crearImg(e.img, "objeto-img"));
        return hueco;
    }

    async function intercambiarVisual(a, b) {
        const ca = centroDe(a);
        const cb = centroDe(b);
        const dx = cb.x - ca.x;
        const dy = cb.y - ca.y;
        a.style.zIndex = "6";
        b.style.zIndex = "5";
        await Promise.all([
            animar(a, [
                { transform: "translate(0,0)" },
                { transform: "translate(" + (dx / 2) + "px," + (-60) + "px) scale(1.08)", offset: 0.5 },
                { transform: "translate(" + dx + "px," + dy + "px)" }
            ], { duration: 700, easing: "ease-in-out" }),
            animar(b, [
                { transform: "translate(0,0)" },
                { transform: "translate(" + (-dx / 2) + "px," + 60 + "px) scale(.96)", offset: 0.5 },
                { transform: "translate(" + (-dx) + "px," + (-dy) + "px)" }
            ], { duration: 700, easing: "ease-in-out" })
        ]);
        const idA = a.dataset.id;
        const idB = b.dataset.id;
        const imgA = a.querySelector(".objeto-img");
        const imgB = b.querySelector(".objeto-img");
        cancelarAnimaciones(a);
        cancelarAnimaciones(b);
        a.style.zIndex = "";
        b.style.zIndex = "";
        a.dataset.id = idB;
        b.dataset.id = idA;
        if (imgA && imgB) {
            const s = imgA.src;
            imgA.src = imgB.src;
            imgB.src = s;
        }
    }

    async function responderAcierto(gen, els) {
        const a = reto.acierto || {};
        fase = "celebrando";
        Array.prototype.forEach.call($id("tablero").children, function (b) { b.classList.remove("pista", "marcado"); });
        Array.prototype.forEach.call($id("opciones").children, function (b) { b.classList.remove("pista"); });

        let destacado = els[0];
        if (reto.mecanica === "intruso") {
            Array.prototype.forEach.call($id("tablero").children, function (b) {
                if (b !== els[0]) b.classList.add("apagada");
            });
        } else if (reto.mecanica === "faltante") {
            Array.prototype.forEach.call($id("opciones").children, function (b) {
                if (b !== els[0]) b.classList.add("apagada");
            });
            const h = huecoEl();
            if (h) destacado = await encajarEnHueco(gen, els[0], h);
        } else if (reto.mecanica === "intercambio") {
            Array.prototype.forEach.call($id("tablero").children, function (b) {
                if (els.indexOf(b) < 0) b.classList.add("apagada");
            });
            els.forEach(function (b) { b.classList.add("correcta"); });
            await intercambiarVisual(els[0], els[1]);
        }
        if (!vivo(gen)) return;

        if (a.efecto && ["vuelaGlobo", "dron", "parabolas", "encaja"].indexOf(a.animacion) === -1) {
            efecto(a.efecto);
        }
        await animacionAcierto(destacado, a.animacion);
        if (!vivo(gen)) return;
        const c = centroDe(destacado);
        particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 160, colores: COLORES_FIESTA });
        await sleep(400);
    }

    /* ── Demostración (2 objetos + 1 intruso) ────────────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const mostrar = d.mostrar || d.objetos;
        if (!mostrar || !d.intruso || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        entradaActiva = false;
        await PedniaTutorial.activarDemo();
        const t = textos();
        const cancelado = function () { return !demoActiva || !vivo(gen); };

        const demoTxt = esMuseo()
            ? (t.demostracionMuseo || t.demostracion)
            : (t.demostracionBaul || t.demostracion);
        await decir({ voz: "zoe", texto: demoTxt }, { minMs: 2500 });
        if (cancelado()) return;

        const demoReto = Object.assign({
            observacionMs: 3000,
            ocultamiento: "cortina",
            ocultamientoMs: 1200
        }, d, { mecanica: "intruso", mostrar: mostrar });
        reto = demoReto;
        ctx = null;
        const ok = await secuenciaObservacion(demoReto, function () { return !cancelado(); });
        if (!ok || cancelado()) return;

        await sleep(300);
        const el = objetoDe(d.intruso);
        if (el) {
            await PedniaTutorial.animarMano({
                punto: el,
                holdMs: 500,
                cancelado: cancelado,
                onPresionar: function () { reiniciarClase(el, "toca", 450); efecto("pop"); }
            });
            if (cancelado()) return;
            Array.prototype.forEach.call($id("tablero").children, function (b) {
                if (b !== el) b.classList.add("apagada");
            });
            await animacionAcierto(el, "brilla");
            efecto("recompensa");
            const c = centroDe(el);
            particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        }

        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        await animarSalida();
        reto = null;
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Cierre e insignia ───────────────────────────────────── */

    async function escenaCierreGaleria() {
        const faltante = (nivelElegido.retos || []).filter(function (r) { return r.mecanica === "faltante"; })[0];
        const ids = (faltante && faltante.mostrar && faltante.mostrar.length)
            ? faltante.mostrar.slice()
            : ["manzana", "campana", "flor", "pelota"];
        const baul = $id("baul");
        if (baul) baul.classList.remove("cerrando", "abriendo");
        await pintarTablero(ids.slice(0, 4), true);
        $id("tablero").classList.add("repisa");
        Array.prototype.forEach.call($id("tablero").children, function (el) {
            el.classList.add("gira-cierre");
        });
        fiesta(centroDe($id("escena-juego") || $id("centro")));
        await sleep(2200);
    }

    async function escenaCierreMuseo() {
        const ids = (nivelElegido.retos[0] && nivelElegido.retos[0].mostrar)
            ? nivelElegido.retos[0].mostrar.slice()
            : ["manzana", "campana", "flor", "pelota", "helado"];
        await pintarTablero(ids, true);
        Array.prototype.forEach.call($id("tablero").children, function (el, i) {
            el.classList.add("brilla");
            el.style.animationDelay = (i * 120) + "ms";
        });
        fiesta(centroDe($id("escena-juego") || $id("centro")));
        await sleep(2400);
    }

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        entradaActiva = false;
        cancelarPista();
        celebrarPersonajes(true);
        if (nivelElegido && nivelElegido.cierreEscena === "galeria") {
            await escenaCierreGaleria();
        } else if (nivelElegido && nivelElegido.cierreEscena === "museoFiesta") {
            await escenaCierreMuseo();
        } else {
            fiesta(centroDe($id("escena-juego") || $id("centro")));
            await sleep(1400);
        }
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    function prepararInsignia() {
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (!ins || !trofeo) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre || "Insignia";
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

    /* ── Boot ────────────────────────────────────────────────── */

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelInicial = nivelDeSesion();
        if (nivelInicial && String(nivelInicial.id) === "5") {
            document.body.classList.add("museo-sensorial");
        }

        const errores = L.validarConfig(gameConfig);
        if (errores && errores.length) console.warn("[ObservaYRecuerda] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarTablero();
        enlazarOpciones();
        enlazarArrastreOpciones();
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
