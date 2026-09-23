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
    let demoActiva = false;
    let demoTimers = [];
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
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
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

        colorObjetivo = coloresRonda[0] || null;
        if (!colorObjetivo) {
            detenerDemo();
            iniciarConsigna(gen);
            return;
        }

        const prog = document.getElementById("progreso");
        if (prog) prog.hidden = true;

        pintarMuestraColor(colorObjetivo);
        pintarObjetos(shuffle((nivelElegido.objetos || []).slice()));

        const metaDemo = metaColor(colorObjetivo);
        const msg = plantilla(
            textos().demostracion ||
                "¡Vamos con un ejemplo! Mira cómo se hace: toca el objeto de color {color}.",
            { color: metaDemo.nombre }
        );
        const enunciado = document.getElementById("enunciado");
        if (enunciado) enunciado.textContent = msg;
        await hablarDemo(msg, 3000);

        const targetId = (nivelElegido.objetos || []).find(function (oid) {
            return metaObj(oid).color === colorObjetivo;
        });
        const targetBtn = targetId
            ? Array.prototype.find.call(document.querySelectorAll(".objeto"), function (btn) {
                return btn.dataset.objeto === targetId;
            })
            : null;

        if (gen !== rondaGen || !demoActiva) return;

        if (targetBtn) {
            targetBtn.classList.add("is-demo-target");
            await sleep(3800);
            if (gen !== rondaGen || !demoActiva) return;
            targetBtn.classList.remove("is-demo-target");
            targetBtn.classList.add("is-acierto");
            await sleep(1400);
        }

        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        const metaAcierto = metaColor(colorObjetivo);
        const textoAcierto = plantilla(
            textos().aciertoPlantilla || "¡Muy bien! Encontraste el color {color}.",
            { color: metaAcierto.nombre }
        );
        if (enunciado) enunciado.textContent = textoAcierto;
        await hablarDemo(textoAcierto, 2200);

        if (gen !== rondaGen) return;
        detenerDemo();
        const fin = textos().demostracionFin || "¡Ahora te toca a ti! Encuentra el color que te digamos.";
        if (enunciado) enunciado.textContent = fin;
        await hablarDemo(fin, 2800);
        if (gen !== rondaGen || juegoTerminado) return;
        indiceColor = 0;
        iniciarConsigna(gen);
    }

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
        if (demoActiva || !aceptaToque || esperandoFeedback || juegoTerminado) return;
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
        const cierre = textos().cierre || "¡Excelente!";
        const texto = document.getElementById("texto_final");
        if (texto) texto.textContent = cierre;
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
