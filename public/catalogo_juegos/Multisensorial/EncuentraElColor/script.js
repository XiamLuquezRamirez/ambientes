/* Encuentra el Color — Multisensorial */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let coloresRonda = [];
    let indiceColor = 0;
    let colorObjetivo = null;
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaToque = false;
    let rondaGen = 0;
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
        return (gameConfig.objetos && gameConfig.objetos[id]) || { nombre: id, img: "", color: "" };
    }

    function metaColor(id) {
        return (gameConfig.colores && gameConfig.colores[id]) || { nombre: id, hex: "#888" };
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
            if (metaObj(id).img) urls.push(metaObj(id).img);
        });
        return urls;
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../images/correcto.gif",
            "../../images/incorrecto.gif",
            "../../images/victoria.gif",
            "../../images/nube.png"
        ];
        const audios = [
            gameConfig.audios && gameConfig.audios.acierto,
            gameConfig.audios && gameConfig.audios.error,
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ];
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        const frases = [
            t.error, t.cierre, t.enunciado, t.eligeNivel,
            "¡Inténtalo otra vez! Observa muy bien.",
            "¡Excelente! Encontraste todos los colores."
        ];
        Object.keys(gameConfig.colores || {}).forEach(function (id) {
            const c = metaColor(id);
            frases.push(plantilla(t.consignaPlantilla || "Encuentra el objeto de color {color}.", { color: c.nombre }));
            frases.push(plantilla(t.aciertoPlantilla || "¡Muy bien! Encontraste el color {color}.", { color: c.nombre }));
        });
        return frases.filter(Boolean);
    }

    function agendarIntro(fn, ms) {
        const id = setTimeout(fn, ms);
        introTimers.push(id);
        return id;
    }

    function renderPersonajes(personajes) {
        const cont = document.getElementById("personajes-container");
        if (!cont) return;
        cont.innerHTML = "";
        (personajes || []).forEach(function (p, index) {
            const el = document.createElement("div");
            el.className = "personaje-char " + (index === 0 ? "personaje-char-izquierda" : "personaje-char-derecha");
            el.dataset.idx = String(index);
            el.style.backgroundImage = "url('" + (p.gif_idle || "") + "')";
            cont.appendChild(el);
        });
    }

    function preloadGifs(personajes) {
        const urls = [];
        (personajes || []).forEach(function (p) {
            [p.gif_idle, p.gif_hablando].forEach(function (gif) {
                if (gif && urls.indexOf(gif) === -1) urls.push(gif);
            });
        });
        return Promise.all(urls.map(preloadUrl));
    }

    function setPersonajesVisual(activoIdx) {
        document.querySelectorAll(".personaje-char").forEach(function (el) {
            const idx = Number(el.dataset.idx);
            const cfg = (introConfig.personajes || [])[idx] || {};
            const hablando = idx === activoIdx;
            el.classList.toggle("activo", hablando);
            el.classList.toggle("inactivo", !hablando);
            el.style.backgroundImage = "url('" + (hablando ? (cfg.gif_hablando || cfg.gif_idle) : cfg.gif_idle) + "')";
        });
    }

    function resetPersonajesIdle() {
        document.querySelectorAll(".personaje-char").forEach(function (el) {
            const idx = Number(el.dataset.idx);
            const cfg = (introConfig.personajes || [])[idx] || {};
            el.classList.remove("activo", "inactivo");
            el.style.backgroundImage = "url('" + (cfg.gif_idle || "") + "')";
        });
    }

    function aplicarClaseNube(idx) {
        const nube = document.querySelector(".nube");
        if (!nube) return;
        nube.classList.remove("nube-centro", "nube-izquierda", "nube-derecha");
        nube.classList.add(idx === 0 ? "nube-izquierda" : (idx === 1 ? "nube-derecha" : "nube-centro"));
    }

    function cambiarNubeAPersonaje(idx) {
        setPersonajesVisual(idx);
        aplicarClaseNube(idx);
    }

    function fijarNubeEnPosicion() {
        const nube = document.querySelector(".nube");
        if (!nube) return;
        nube.style.bottom = "57%";
        nube.style.animationName = "none";
    }

    function maquina2(contenedor, texto, intervalo, callback) {
        let i = 0;
        const timer = setInterval(function () {
            if (conversacionCancelada || cerrardo) {
                clearInterval(timer);
                return;
            }
            if (i < texto.length) {
                $("#" + contenedor).html(texto.substr(0, i++) + "_");
            } else {
                clearInterval(timer);
                $("#" + contenedor).html(texto);
                if (callback) callback();
            }
        }, intervalo);
        introTimers.push(timer);
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    function salirPersonajes(callback, ms) {
        const chars = document.querySelectorAll(".personaje-char");
        const espera = ms != null ? ms : 2000;
        if (!chars.length) { callback(); return; }
        chars.forEach(function (el) {
            if (espera < 1600) el.style.animationDuration = (espera / 1000) + "s";
        });
        chars[0].style.animationName = "salidaIzquierda";
        if (chars[1]) chars[1].style.animationName = "salidaDerecha";
        setTimeout(callback, espera);
    }

    function mostrarNubeYConversacion() {
        if (cerrardo || conversacionCancelada) return;
        const primera = introConfig.conversacion[0];
        const idx = primera && primera.personaje != null ? primera.personaje : 0;
        let lista = false;
        setPersonajesVisual(idx);
        aplicarClaseNube(idx);
        const nube = document.querySelector(".nube");
        nube.style.animationName = "moverArriba";
        nube.style.display = "block";

        function iniciar() {
            if (lista || cerrardo || conversacionCancelada) return;
            lista = true;
            fijarNubeEnPosicion();
            reproducirConversacion();
        }
        nube.addEventListener("animationend", function (e) {
            if (e.animationName === "moverArriba") iniciar();
        });
        agendarIntro(iniciar, 2300);
    }

    function iniciarAnimacionIntro() {
        if (cerrardo || conversacionCancelada) return;
        document.querySelector(".overlay").style.display = "block";
        const chars = document.querySelectorAll(".personaje-char");
        chars[0].style.animationName = "entradaIzquierda";
        agendarIntro(function () {
            if (cerrardo || conversacionCancelada) return;
            if (chars[1]) chars[1].style.animationName = "entradaDerecha";
        }, 1000);
        agendarIntro(mostrarNubeYConversacion, 3600);
    }

    async function reproducirConversacion() {
        const cfg = introConfig.configuracion || {};
        const intervalo = cfg.intervalo || 50;
        const pausaFinal = cfg.pausaFinal || 2000;
        const lineas = introConfig.conversacion || [];
        for (let i = 0; i < lineas.length; i++) {
            if (conversacionCancelada || cerrardo) return;
            const linea = lineas[i];
            const idx = linea.personaje != null ? linea.personaje : 0;
            $("#bienvenida").html("");
            cambiarNubeAPersonaje(idx);
            const pVoz = TextoVoz.hablar(linea.texto, TextoVoz.personajeDeIndice(idx));
            await new Promise(function (resolve) {
                maquina2("bienvenida", linea.texto, intervalo, resolve);
            });
            if (conversacionCancelada || cerrardo) { TextoVoz.detener(); return; }
            await pVoz;
            if (conversacionCancelada || cerrardo) return;
        }
        if (!cerrardo && !conversacionCancelada) {
            const omitir = document.getElementById("btnomitir");
            if (omitir) omitir.style.display = "none";
            await sleep(pausaFinal);
            cerrar_anuncio();
        }
    }

    let introGifsListos = false;
    let zoomInicioListo = false;
    let introDesdeEmpecemos = false;

    function intentarLanzarIntro() {
        if (!zoomInicioListo || !introGifsListos || introDesdeEmpecemos) return;
        introDesdeEmpecemos = true;
        iniciarAnimacionIntro();
    }

    function empecemosJuego() {
        const pantalla = document.getElementById("pantalla-inicio");
        const btn = document.getElementById("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        TextoVoz.desbloquear();
        asegurarAudioFondo();
        TextoVoz.precargar();
        zoomInicioListo = true;
        pantalla.classList.add("is-out");
        intentarLanzarIntro();
        let oculto = false;
        const ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "inicioDisuelve") ocultar();
        });
        setTimeout(ocultar, 1250);
    }

    window.cerrar_anuncio = function cerrar_anuncio(opts) {
        if (cerrardo) return;
        const rapido = !!(opts && opts.rapido);
        conversacionCancelada = true;
        cerrardo = true;
        cancelarIntroPendiente();
        TextoVoz.detener();
        asegurarAudioFondo();
        TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        const nube = document.querySelector(".nube");
        nube.style.animationName = "moverabajo";
        resetPersonajesIdle();
        const esperaNube = rapido ? 400 : 1400;
        const salidaChars = rapido ? 750 : 2000;
        const fadeMs = rapido ? 350 : 700;
        setTimeout(function () {
            nube.style.display = "none";
            salirPersonajes(function () {
                document.querySelector(".overlay").style.display = "none";
                document.body.classList.remove("esperando-inicio");
                $("#principal").css("display", "flex").hide().fadeIn(fadeMs);
                elegirNivel();
            }, salidaChars);
        }, esperaNube);
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

    /* ── Edad / consignas ──────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : i === 1 ? "warning" : "primary";
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
        nivelElegido = gameConfig.niveles.find(function (n) { return n.id === id; });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        juegoTerminado = false;
        esperandoFeedback = false;
        aceptaToque = false;
        TextoVoz.detener();
        coloresRonda = (nivelElegido.colores || []).slice();
        indiceColor = 0;
        Promise.resolve(imagenesPromise).then(function () {
            iniciarConsigna(rondaGen);
        });
    };

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el) return;
        const total = coloresRonda.length;
        el.hidden = !total;
        el.innerHTML = '<i class="fa-solid fa-palette"></i> ' +
            Math.min(indiceColor + 1, total) + " / " + total;
    }

    function pintarMuestraColor(colorId) {
        const el = document.getElementById("muestra-color");
        if (!el) return;
        const meta = metaColor(colorId);
        el.hidden = false;
        el.setAttribute("aria-hidden", "false");
        el.style.backgroundColor = meta.hex || "#888";
        el.title = meta.nombre || colorId;
        el.setAttribute("aria-label", "Color " + (meta.nombre || colorId));
    }

    function iniciarConsigna(gen) {
        if (gen !== rondaGen || juegoTerminado) return;
        colorObjetivo = coloresRonda[indiceColor] || null;
        if (!colorObjetivo) {
            mostrarCierre();
            return;
        }
        actualizarProgreso();
        pintarMuestraColor(colorObjetivo);
        pintarObjetos(shuffle((nivelElegido.objetos || []).slice()));

        const meta = metaColor(colorObjetivo);
        const consigna = plantilla(
            textos().consignaPlantilla || "Encuentra el objeto de color {color}.",
            { color: meta.nombre }
        );
        const enunciado = document.getElementById("enunciado");
        if (enunciado) enunciado.textContent = consigna;
        aceptaToque = true;
        TextoVoz.hablar(consigna, "zoe");
    }

    function pintarObjetos(ids) {
        const zona = document.getElementById("zona-objetos");
        if (!zona) return;
        zona.innerHTML = "";
        const n = ids.length;
        zona.dataset.count = String(n);
        ids.forEach(function (id) {
            const m = metaObj(id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "objeto";
            btn.dataset.objeto = id;
            btn.dataset.color = m.color || "";
            btn.setAttribute("aria-label", m.nombre || id);
            btn.innerHTML =
                '<img src="' + escAttr(m.img) + '" alt="">' +
                '<span class="objeto-nombre">' + escHtml(m.nombre || id) + "</span>";
            btn.addEventListener("click", function () {
                resolverToque(id, btn);
            });
            zona.appendChild(btn);
        });
    }

    async function resolverToque(objetoId, el) {
        if (!aceptaToque || esperandoFeedback || juegoTerminado) return;
        const m = metaObj(objetoId);
        const correcto = m.color === colorObjetivo;
        if (!correcto) {
            await feedbackError();
            return;
        }
        el.classList.add("is-acierto");
        await feedbackAcierto();
        if (indiceColor + 1 < coloresRonda.length) {
            indiceColor += 1;
            await sleep(280);
            iniciarConsigna(rondaGen);
            return;
        }
        mostrarCierre();
    }

    function feedbackActivo() {
        return !gameConfig || gameConfig.mostrarFeedBack !== false;
    }

    async function feedbackAcierto() {
        esperandoFeedback = true;
        aceptaToque = false;
        const meta = metaColor(colorObjetivo);
        const texto = plantilla(
            textos().aciertoPlantilla || "¡Muy bien! Encontraste el color {color}.",
            { color: meta.nombre }
        );
        const gif = (gameConfig.feedback && gameConfig.feedback.acierto && gameConfig.feedback.acierto.gif)
            || "../../images/correcto.gif";
        const minMs = Number(gameConfig.feedback && gameConfig.feedback.duracion) || 1400;
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        const pVoz = TextoVoz.hablar(texto, "zoe");
        if (feedbackActivo()) {
            Swal.fire({
                title: texto,
                imageUrl: gif,
                imageHeight: 140,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                heightAuto: false,
                scrollbarPadding: false
            });
        }
        const topeMs = Math.max(minMs + 2500, 6000);
        try {
            await Promise.race([
                Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
                sleep(topeMs)
            ]);
        } finally {
            try { Swal.close(); } catch (e) { /* noop */ }
            esperandoFeedback = false;
            aceptaToque = !juegoTerminado;
        }
    }

    async function feedbackError() {
        esperandoFeedback = true;
        aceptaToque = false;
        const texto = textos().error || "¡Inténtalo otra vez! Observa muy bien.";
        const gif = (gameConfig.feedback && gameConfig.feedback.error && gameConfig.feedback.error.gif)
            || "../../images/incorrecto.gif";
        const minMs = Number(gameConfig.feedback && gameConfig.feedback.duracion) || 1400;
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.85, false);
        const pVoz = TextoVoz.hablar(texto, "zoe");
        if (feedbackActivo()) {
            Swal.fire({
                title: texto,
                imageUrl: gif,
                imageHeight: 140,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                heightAuto: false,
                scrollbarPadding: false
            });
        }
        const topeMs = Math.max(minMs + 2500, 6000);
        try {
            await Promise.race([
                Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
                sleep(topeMs)
            ]);
        } finally {
            try { Swal.close(); } catch (e) { /* noop */ }
            esperandoFeedback = false;
            aceptaToque = !juegoTerminado;
        }
    }

    function mostrarCierre() {
        juegoTerminado = true;
        aceptaToque = false;
        const cierre = textos().cierre || "¡Excelente! Encontraste todos los colores.";
        document.getElementById("texto_final").textContent = cierre;
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        $("#final").fadeIn(400);
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
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        document.getElementById("btn-empecemos").addEventListener("click", empecemosJuego);
        const btnOmitir = document.getElementById("btnomitir");
        if (btnOmitir) {
            btnOmitir.addEventListener("click", function () {
                cerrar_anuncio({ rapido: true });
            });
        }

        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
            }
        });

        preloadGifs(introConfig.personajes).then(function () {
            renderPersonajes(introConfig.personajes);
            introGifsListos = true;
            intentarLanzarIntro();
        });
    });
})();
