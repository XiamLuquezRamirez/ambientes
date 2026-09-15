/* Secuencia de movimiento — paquete Polimotor (autónomo) */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let retos = [];
    let indiceReto = 0;
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaRespuesta = false;
    let retoActual = null;
    let retoGen = 0;
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
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
    }

    function feedbackEdad() {
        const id = nivelElegido && nivelElegido.id;
        const map = (gameConfig && gameConfig.feedbackPorEdad) || {};
        return map[id] || {};
    }

    function timings() {
        return (gameConfig && gameConfig.timings) || {};
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

    function movMeta(id) {
        return (gameConfig.movimientos && gameConfig.movimientos[id]) || { nombre: id, img: "" };
    }

    function imgUrl(id) {
        return movMeta(id).img || "";
    }

    function nombreMov(id) {
        return movMeta(id).nombre || id;
    }

    function preloadUrl(url) {
        return new Promise(function (resolve) {
            if (!url) {
                resolve();
                return;
            }
            if (imgCache[url] && imgCache[url].complete) {
                resolve(imgCache[url]);
                return;
            }
            const img = new Image();
            const done = function () {
                imgCache[url] = img;
                resolve(img);
            };
            img.onload = done;
            img.onerror = function () { resolve(null); };
            img.src = url;
            // No colgar el juego si el evento tarda.
            setTimeout(function () {
                if (!imgCache[url]) {
                    imgCache[url] = img;
                    resolve(img);
                }
            }, 600);
        });
    }

    function preloadAudio(ruta) {
        return new Promise(function (resolve) {
            if (!ruta) {
                resolve();
                return;
            }
            if (audioCache[ruta]) {
                resolve(audioCache[ruta]);
                return;
            }
            try {
                const audio = new Audio();
                audio.preload = "auto";
                const done = function () {
                    audioCache[ruta] = audio;
                    resolve(audio);
                };
                audio.addEventListener("canplaythrough", done, { once: true });
                audio.addEventListener("error", function () { resolve(null); }, { once: true });
                audio.src = ruta;
                setTimeout(function () {
                    if (!audioCache[ruta]) {
                        audioCache[ruta] = audio;
                        resolve(audio);
                    }
                }, 400);
            } catch (e) {
                resolve(null);
            }
        });
    }

    function crearImgEl(url, alt) {
        const img = document.createElement("img");
        img.alt = alt || "";
        img.decoding = "async";
        const cached = imgCache[url];
        if (cached && cached.src) {
            img.src = cached.currentSrc || cached.src;
        } else {
            img.src = url || "";
        }
        return img;
    }

    function urlsImagenesCriticas() {
        const urls = [];
        const movs = (gameConfig && gameConfig.movimientos) || {};
        Object.keys(movs).forEach(function (id) {
            if (movs[id].img) urls.push(movs[id].img);
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
            "../../images/nube.png",
            "../../images/normal1.gif",
            "../../images/normal2.gif",
            "../../images/ciencia/normal1.gif",
            "../../images/ciencia/normal2.gif"
        ];
        const audios = [
            gameConfig.audios && gameConfig.audios.acierto,
            gameConfig.audios && gameConfig.audios.error,
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ];
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function esperarImagenesOTimeout(ms) {
        const p = imagenesPromise || Promise.resolve();
        return Promise.race([
            p,
            new Promise(function (resolve) { setTimeout(resolve, ms || 350); })
        ]);
    }

    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        try {
            let base = audioCache[ruta];
            if (!base) {
                base = new Audio(ruta);
                audioCache[ruta] = base;
            }
            const audio = loop ? base : (base.cloneNode ? base.cloneNode(true) : new Audio(ruta));
            audio.loop = !!loop;
            audio.volume = volumen != null ? volumen : 1;
            if (loop) {
                try { audio.currentTime = 0; } catch (e) { /* noop */ }
            }
            const p = audio.play();
            if (p && p.catch) p.catch(function () {});
            if (loop) audioFondo = audio;
            return audio;
        } catch (e) {
            return null;
        }
    }

    function frasesFijasTts() {
        const fb = (gameConfig && gameConfig.feedback) || {};
        const porEdad = (gameConfig && gameConfig.feedbackPorEdad) || {};
        const extra = [
            { texto: textos().pregunta || "¿Qué movimiento sigue?", personaje: "zeus" },
            { texto: "¿Qué sigue?", personaje: "zoe" },
            fb.acierto && fb.acierto.texto,
            fb.error && fb.error.texto,
            textos().cierre
        ];
        Object.keys(porEdad).forEach(function (k) {
            const p = porEdad[k];
            if (p.acierto) extra.push({ texto: p.acierto, personaje: "zoe" });
            if (p.error) extra.push({ texto: p.error, personaje: "zeus" });
            if (p.cierre) extra.push({ texto: p.cierre, personaje: "zoe" });
        });
        return extra.filter(Boolean);
    }

    /* ── Intro Zoe/Zeus ───────────────────────────────────────── */

    let nubePersonajeActual = 0;

    function agendarIntro(fn, ms) {
        const id = setTimeout(fn, ms);
        introTimers.push(id);
        return id;
    }

    function renderPersonajes(personajes) {
        const container = document.getElementById("personajes-container");
        container.innerHTML = "";
        const posiciones = personajes.length === 1 ? ["uno"] : ["izquierda", "derecha"];
        personajes.forEach(function (personajeCfg, index) {
            const div = document.createElement("div");
            div.className = "personaje-char " + posiciones[index];
            div.style.backgroundImage = "url(" + personajeCfg.gif_idle + ")";
            div.dataset.index = index;
            container.appendChild(div);
        });
    }

    function preloadGifs(personajes) {
        const urls = [];
        personajes.forEach(function (p) {
            [p.gif_idle, p.gif_hablando].forEach(function (gif) {
                if (gif && urls.indexOf(gif) === -1) urls.push(gif);
            });
        });
        return Promise.all(urls.map(function (gif) {
            return new Promise(function (resolve) {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = gif;
            });
        }));
    }

    function setPersonajesVisual(index) {
        const personajes = introConfig.personajes;
        document.querySelectorAll(".personaje-char").forEach(function (el, i) {
            if (i === index) {
                el.style.backgroundImage = "url(" + personajes[i].gif_hablando + ")";
                el.classList.add("activo");
                el.classList.remove("inactivo");
            } else {
                el.style.backgroundImage = "url(" + personajes[i].gif_idle + ")";
                el.classList.add("inactivo");
                el.classList.remove("activo");
            }
        });
    }

    function resetPersonajesIdle() {
        const personajes = introConfig.personajes;
        document.querySelectorAll(".personaje-char").forEach(function (el, i) {
            el.style.backgroundImage = "url(" + personajes[i].gif_idle + ")";
            el.classList.remove("activo", "inactivo");
        });
    }

    function aplicarClaseNube(index) {
        const nube = document.querySelector(".nube");
        nube.classList.remove("nube-centro", "nube-izquierda", "nube-derecha");
        if (index === 0) nube.classList.add("nube-izquierda");
        else nube.classList.add("nube-derecha");
    }

    function fijarNubeEnPosicion() {
        if (cerrardo || conversacionCancelada) return;
        const nube = document.querySelector(".nube");
        nube.style.animationName = "none";
        nube.style.bottom = "38%";
    }

    function cambiarNubeAPersonaje(index) {
        if (cerrardo || conversacionCancelada) return;
        setPersonajesVisual(index);
        aplicarClaseNube(index);
        nubePersonajeActual = index;
        fijarNubeEnPosicion();
        const nube = document.querySelector(".nube");
        if (nube) nube.style.opacity = "1";
    }

    function maquina2(contenedor, texto, intervalo, callback) {
        if (!texto) {
            if (callback) callback();
            return;
        }
        let i = 1;
        $("#" + contenedor).html(texto.substr(0, 1) + "_");
        const timer = setInterval(function () {
            if (conversacionCancelada || cerrardo) {
                clearInterval(timer);
                if (callback) callback();
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
        if (!chars.length) {
            callback();
            return;
        }
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
            if (conversacionCancelada || cerrardo) {
                TextoVoz.detener();
                return;
            }
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

    /* ── Edad ─────────────────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : i === 1 ? "warning" : "primary";
            botones +=
                '<div class="col-12 text-center mb-2">' +
                '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
                "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
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
        retoGen += 1;
        const gen = retoGen;
        esperandoFeedback = false;
        aceptaRespuesta = false;
        juegoTerminado = false;
        TextoVoz.detener();

        retos = (nivelElegido.retos || []).map(function (r) {
            return Object.assign({}, r);
        });
        indiceReto = 0;
        window.__secuenciaNivel = nivelElegido.id;

        const frases = [];
        retos.forEach(function (rt) {
            if (rt.pregunta) frases.push({ texto: rt.pregunta, personaje: rt.preguntaQuien || "zoe" });
            (rt.demoNarracion || []).forEach(function (n) {
                if (n.texto) frases.push({ texto: n.texto, personaje: n.quien || "zoe" });
            });
        });
        const fe = feedbackEdad();
        if (fe.acierto) frases.push({ texto: fe.acierto, personaje: "zoe" });
        if (fe.error) frases.push({ texto: fe.error, personaje: "zeus" });
        if (fe.cierre) frases.push({ texto: fe.cierre, personaje: "zoe" });
        if (TextoVoz.encolarFrases) TextoVoz.encolarFrases(frases);

        const arrancar = function () {
            if (gen !== retoGen) return;
            iniciarRetoActual(gen);
        };
        // Solo esperar SVGs de poses (máx ~350ms). Audio/GIF van en segundo plano.
        esperarImagenesOTimeout(350).then(arrancar).catch(arrancar);
    };

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el || !retos.length) return;
        el.hidden = false;
        el.textContent = (indiceReto + 1) + "/" + retos.length;
    }

    function setEnunciado(texto) {
        document.getElementById("enunciado").textContent = texto;
    }

    function limpiarEscena() {
        aceptaRespuesta = false;
        document.getElementById("riel").innerHTML = "";
        const ops = document.getElementById("opciones");
        ops.hidden = true;
        ops.innerHTML = "";
    }

    function crearSlotPose(movId, opts) {
        opts = opts || {};
        const slot = document.createElement("div");
        slot.className = "slot-pose" + (opts.visible ? " visible" : "") + (opts.hueco ? " hueco" : "");
        if (opts.hueco) {
            slot.textContent = "?";
            return slot;
        }
        if (movId) {
            slot.appendChild(crearImgEl(imgUrl(movId), nombreMov(movId)));
            slot.dataset.mov = movId;
        }
        return slot;
    }

    function renderRielEstatico(secuencia, mostrarHueco) {
        const riel = document.getElementById("riel");
        riel.innerHTML = "";
        secuencia.forEach(function (id) {
            riel.appendChild(crearSlotPose(id, { visible: true }));
        });
        if (mostrarHueco) riel.appendChild(crearSlotPose(null, { hueco: true }));
    }

    async function reproducirSecuencia(secuencia, gen, lento) {
        const riel = document.getElementById("riel");
        riel.innerHTML = "";
        const pasoMs = lento
            ? (timings().pasoLentoMs || 950)
            : (timings().pasoMs || 650);
        const pausa = timings().pausaEntrePasosMs != null ? timings().pausaEntrePasosMs : 100;
        const slots = [];

        // Todas las poses visibles de inmediato; el ritmo es solo highlight.
        secuencia.forEach(function (id) {
            const s = crearSlotPose(id, { visible: true });
            riel.appendChild(s);
            slots.push(s);
        });

        for (let i = 0; i < secuencia.length; i++) {
            if (gen !== retoGen) return;
            slots[i].classList.add("activa");
            await sleep(pasoMs);
            if (gen !== retoGen) return;
            slots[i].classList.remove("activa");
            await sleep(pausa);
        }
    }

    async function narrarDemo(reto, gen) {
        const narracion = reto.demoNarracion || [];
        if (!narracion.length) return;
        const demoFull = (reto.prefijo || []).concat([reto.correcta]);
        const pasoMs = timings().pasoMs || 650;
        // Toda la demo visible ya; solo se resalta el paso narrado.
        renderRielEstatico(demoFull, false);
        const slots = document.querySelectorAll("#riel .slot-pose");
        for (let i = 0; i < narracion.length; i++) {
            if (gen !== retoGen) return;
            const n = narracion[i];
            if (n.texto) TextoVoz.hablar(n.texto, n.quien || "zoe");
            if (slots[i]) slots[i].classList.add("activa");
            await sleep(pasoMs);
            if (slots[i]) slots[i].classList.remove("activa");
        }
        await sleep(150);
        if (gen !== retoGen) return;
        renderRielEstatico(reto.prefijo || [], true);
    }

    function renderOpciones(reto, gen) {
        const ops = document.getElementById("opciones");
        ops.hidden = false;
        ops.innerHTML = "";
        const ids = shuffle([reto.correcta].concat(reto.distractores || []));
        ids.forEach(function (id) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "tarjeta-opcion";
            btn.dataset.mov = id;
            btn.appendChild(crearImgEl(imgUrl(id), nombreMov(id)));
            const span = document.createElement("span");
            span.textContent = nombreMov(id);
            btn.appendChild(span);
            btn.addEventListener("click", function () {
                if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
                resolverRespuesta(id, btn, gen);
            });
            ops.appendChild(btn);
        });
    }

    async function iniciarRetoActual(gen) {
        if (gen == null) gen = retoGen;
        if (gen !== retoGen) return;
        if (indiceReto >= retos.length) {
            mostrarCierre();
            return;
        }
        limpiarEscena();
        actualizarProgreso();
        retoActual = retos[indiceReto];
        window.__secuenciaReto = retoActual;
        setEnunciado(retoActual.titulo || textos().enunciado);

        if (retoActual.demoNarracion && retoActual.demoNarracion.length) {
            await narrarDemo(retoActual, gen);
        } else {
            await reproducirSecuencia(retoActual.prefijo || [], gen, false);
            if (gen !== retoGen) return;
            renderRielEstatico(retoActual.prefijo || [], true);
        }
        if (gen !== retoGen) return;

        const pregunta = retoActual.pregunta || textos().pregunta || "¿Qué movimiento sigue?";
        setEnunciado(pregunta);
        TextoVoz.hablar(pregunta, retoActual.preguntaQuien || "zoe");
        renderOpciones(retoActual, gen);
        aceptaRespuesta = true;
    }

    async function resolverRespuesta(valor, btnEl, gen) {
        if (gen !== retoGen) return;
        if (!aceptaRespuesta || esperandoFeedback || juegoTerminado) return;
        aceptaRespuesta = false;
        const ok = String(valor) === String(retoActual.correcta);
        if (ok) await resolverAcierto(valor, gen);
        else await resolverError(btnEl, gen);
    }

    async function resolverError(btnEl, gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        const fe = feedbackEdad();
        const fb = (gameConfig.feedback && gameConfig.feedback.error) || {};
        const texto = fe.error || fb.texto || "Mira otra vez. ¡Vamos a intentarlo!";
        if (btnEl) {
            btnEl.classList.add("rechazo");
            setTimeout(function () { btnEl.classList.remove("rechazo"); }, 600);
        }
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);
        TextoVoz.hablar(texto, "zeus");
        await Swal.fire({
            title: texto,
            imageUrl: fb.gif || "../../images/incorrecto.gif",
            imageHeight: 140,
            timer: (gameConfig.feedback && gameConfig.feedback.duracion) || 1200,
            showConfirmButton: false,
            heightAuto: false,
            scrollbarPadding: false
        });
        if (gen !== retoGen) return;
        TextoVoz.detener();
        document.getElementById("opciones").hidden = true;
        await reproducirSecuencia(retoActual.prefijo || [], gen, true);
        if (gen !== retoGen) return;
        renderRielEstatico(retoActual.prefijo || [], true);
        const pregunta = retoActual.pregunta || textos().pregunta || "¿Qué movimiento sigue?";
        setEnunciado(pregunta);
        TextoVoz.hablar(pregunta, retoActual.preguntaQuien || "zeus");
        renderOpciones(retoActual, gen);
        esperandoFeedback = false;
        aceptaRespuesta = true;
    }

    async function resolverAcierto(valor, gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        const fe = feedbackEdad();
        const fb = (gameConfig.feedback && gameConfig.feedback.acierto) || {};
        const texto = fe.acierto || fb.texto || "¡Muy bien!";

        // Incorporar al riel
        const completa = (retoActual.prefijo || []).concat([valor]);
        renderRielEstatico(completa, false);
        const last = document.querySelector(".slot-pose:last-child");
        if (last) last.classList.add("entrando", "activa");
        document.getElementById("opciones").hidden = true;

        await sleep(280);
        if (gen !== retoGen) return;
        await reproducirSecuencia(completa, gen, false);
        if (gen !== retoGen) return;

        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        TextoVoz.hablar(texto, "zoe");
        await Swal.fire({
            title: texto,
            imageUrl: fb.gif || "../../images/correcto.gif",
            imageHeight: 140,
            timer: (gameConfig.feedback && gameConfig.feedback.duracion) || 1200,
            showConfirmButton: false,
            heightAuto: false,
            scrollbarPadding: false
        });
        if (gen !== retoGen) return;
        TextoVoz.detener();
        esperandoFeedback = false;
        indiceReto += 1;
        iniciarRetoActual(gen);
    }

    function mostrarCierre() {
        juegoTerminado = true;
        const fe = feedbackEdad();
        const cierre = fe.cierre || textos().cierre || "¡Excelente! ¡Completaste las secuencias!";
        document.getElementById("texto_final").textContent = cierre;
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        $("#final").fadeIn(400);
    }

    /* ── Boot ─────────────────────────────────────────────────── */

    $(document).ready(function () {
        introConfig = JSON.parse(readText("intro.json"));
        gameConfig = JSON.parse(readText("config.json"));

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            frasesExtra: frasesFijasTts()
        });
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria(); // no bloquea el riel

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
