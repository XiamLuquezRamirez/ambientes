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
    let cuerpoElegido = "nina";

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

    function acc() {
        return (gameConfig && gameConfig.accesibilidad) || {};
    }

    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        if (!isFinite(n)) return 20;
        return Math.max(0, Math.min(100, n));
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
            icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
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
    
    
    function aplicarAccesibilidadInicial() {
        const a = acc();
        document.body.classList.toggle("alto-contraste", !!a.altoContraste);
        aplicarLetterSpacing();
    }

        const ACC_OPCIONES = [
        { key: "altoContraste", label: "Alto contraste" },
    ];

    function setMenuAcc(abierto) {
        const panel = document.getElementById("menu-acc-panel");
        const btn = document.getElementById("btn-menu-acc");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        if (abierto && typeof setMenuVol === "function") setMenuVol(false);
    }

    function pintarMenuAcc() {
        const ops = document.getElementById("menu-acc-ops");
        if (!ops) return;
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        ops.innerHTML = "";
        ACC_OPCIONES.forEach(function (op) {
            const lab = document.createElement("label");
            lab.className = "menu-acc-op";
            lab.innerHTML = '<input type="checkbox"> ' + op.label;
            const input = lab.querySelector("input");
            input.checked = !!acc()[op.key];
            input.addEventListener("change", function () {
                gameConfig.accesibilidad[op.key] = input.checked;
                aplicarAccesibilidadInicial();
            });
            ops.appendChild(lab);
        });
        const rango = document.createElement("label");
        rango.className = "menu-acc-op menu-acc-rango";
        const actual = Number(acc().letterSpacing);
        const valor = isFinite(actual) && actual >= 0 ? actual : 2;
        rango.innerHTML = "<span>Espaciado de letras <strong>" + valor + "</strong></span>";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "10";
        slider.step = "1";
        slider.value = String(valor);
        slider.addEventListener("input", function () {
            const n = Number(slider.value);
            gameConfig.accesibilidad.letterSpacing = n;
            rango.querySelector("strong").textContent = String(n);
            aplicarAccesibilidadInicial();
        });
        rango.appendChild(slider);
        ops.appendChild(rango);
    }

    function enlazarMenuAcc() {
        const btn = document.getElementById("btn-menu-acc");
        const cerrar = document.getElementById("btn-cerrar-acc");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                const panel = document.getElementById("menu-acc-panel");
                setMenuAcc(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuAcc(false); });
        document.addEventListener("pointerdown", function (ev) {
            const menu = document.getElementById("menu-acc");
            if (menu && !menu.contains(ev.target)) setMenuAcc(false);
        });
        pintarMenuAcc();
    }

    function enlazarMenuVol() {
        const btn = document.getElementById("btn-menu-vol");
        const cerrar = document.getElementById("btn-cerrar-vol");
        const slider = document.getElementById("rango-volumen");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                const panel = document.getElementById("menu-vol-panel");
                const open = panel && panel.hidden;
                setMenuVol(open);
                if (open && typeof setMenuAcc === "function") setMenuAcc(false);
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
            if (menu && !menu.contains(ev.target)) setMenuVol(false);
        });
        pintarMenuVol();
    }
    
    function pxCero(valor, fallback) {
        const n = Number(valor);
        if (!isFinite(n) || n < 0) return fallback;
        return n + "px";
    }
    
    function aplicarLetterSpacing() {
        document.documentElement.style.setProperty("--mc-letter-spacing", pxCero(acc().letterSpacing, "2px"));
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

    function resolverCuerpo() {
        const pedido = String((gameConfig && gameConfig.cuerpo) || "nina").toLowerCase();
        cuerpoElegido = (pedido === "nino" || pedido === "niño") ? "nino" : "nina";
        if (document.body) document.body.dataset.cuerpo = cuerpoElegido;
    }

    function carpetaCuerpo() {
        const cuerpo = ((gameConfig && gameConfig.cuerpos) || {})[cuerpoElegido] || {};
        return String(cuerpo.carpeta || ("../MemoriaCorporal/img/" + cuerpoElegido)).replace(/\/$/, "");
    }

    function movMeta(id) {
        return (gameConfig.movimientos && gameConfig.movimientos[id])
            || { nombre: id, archivo: id + ".png" };
    }

    function imgUrl(id) {
        const m = movMeta(id);
        if (m.img) return m.img;
        const archivo = m.archivo || (id + ".png");
        return carpetaCuerpo() + "/" + archivo;
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
            const url = imgUrl(id);
            if (url) urls.push(url);
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
        const porEdad = (gameConfig && gameConfig.feedbackPorEdad) || {};
        const extra = [
            { texto: textos().pregunta || "¿Qué movimiento sigue?", personaje: "zeus" },
            { texto: "¿Qué sigue?", personaje: "zoe" },
            textos().acierto,
            textos().error,
            textos().cierre
        ];
        const movs = (gameConfig && gameConfig.movimientos) || {};
        Object.keys(movs).forEach(function (id) {
            const nom = movs[id] && movs[id].nombre;
            if (nom) {
                extra.push({ texto: nom, personaje: "zoe" });
                extra.push({ texto: nom, personaje: "zeus" });
            }
        });
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

    function cerrar_anuncio() {
        empezarJuegoTrasIntro();
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
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
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
            if (rt.pregunta) frases.push({ texto: rt.pregunta, personaje: rt.preguntaQuien || "zeus" });
            (rt.prefijo || []).concat([rt.correcta]).concat(rt.distractores || []).forEach(function (id) {
                const nom = nombreMov(id);
                if (nom) {
                    frases.push({ texto: nom, personaje: "zoe" });
                    frases.push({ texto: nom, personaje: "zeus" });
                }
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
        const pausa = timings().pausaEntrePasosMs != null ? timings().pausaEntrePasosMs : 100;
        const minPaso = lento
            ? (timings().pasoLentoMs || 950)
            : (timings().pasoMs || 650);
        const slots = [];
        const quien = "zoe";

        // Todas las poses visibles de inmediato; ritmo = highlight + narración.
        secuencia.forEach(function (id) {
            const s = crearSlotPose(id, { visible: true });
            riel.appendChild(s);
            slots.push(s);
        });

        for (let i = 0; i < secuencia.length; i++) {
            if (gen !== retoGen) return;
            slots[i].classList.add("activa");
            const nombre = nombreMov(secuencia[i]);
            const t0 = Date.now();
            if (nombre) {
                try {
                    await TextoVoz.hablar(nombre, quien);
                } catch (e) { /* noop */ }
            }
            if (gen !== retoGen) return;
            const restante = minPaso - (Date.now() - t0);
            if (restante > 40) await sleep(restante);
            if (gen !== retoGen) return;
            slots[i].classList.remove("activa");
            await sleep(pausa);
        }
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

        // Narración completa: cada pose del prefijo + pregunta (sin adelantar la correcta).
        await reproducirSecuencia(retoActual.prefijo || [], gen, true);
        if (gen !== retoGen) return;
        renderRielEstatico(retoActual.prefijo || [], true);
        if (gen !== retoGen) return;

        const pregunta = retoActual.pregunta || textos().pregunta || "¿Qué movimiento sigue?";
        setEnunciado(pregunta);
        try {
            await TextoVoz.hablar(pregunta, retoActual.preguntaQuien || "zeus");
        } catch (e) { /* noop */ }
        if (gen !== retoGen) return;
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

    function feedbackDuracionMs() {
        const n = Number(gameConfig && gameConfig.feedback && gameConfig.feedback.duracion);
        return isFinite(n) && n > 0 ? n : 1200;
    }

    function feedbackConVoz(texto, opts) {
        opts = opts || {};
        const personaje = opts.personaje || "zoe";
        const gif = opts.gif || "";
        const minMs = opts.minMs != null ? opts.minMs : feedbackDuracionMs();
        const imageHeight = opts.imageHeight || 140;

        if (gameConfig && gameConfig.mostrarFeedBack === false) {
            if (texto && typeof TextoVoz !== "undefined") {
                return Promise.race([
                    TextoVoz.hablar(texto, personaje).catch(function () {}),
                    sleep(Math.max(minMs + 2500, 6000))
                ]);
            }
            return Promise.resolve();
        }

        const pVoz = (texto && typeof TextoVoz !== "undefined")
            ? TextoVoz.hablar(texto, personaje)
            : Promise.resolve();
        const swalOpts = {
            title: texto || "",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            heightAuto: false,
            scrollbarPadding: false
        };
        if (gif) {
            swalOpts.imageUrl = gif;
            swalOpts.imageHeight = imageHeight;
        }
        Swal.fire(swalOpts);
        const topeMs = Math.max(minMs + 2500, 6000);
        return Promise.race([
            Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
            sleep(topeMs)
        ]).then(function () {
            try { Swal.close(); } catch (e) { /* noop */ }
        }, function () {
            try { Swal.close(); } catch (e) { /* noop */ }
        });
    }

    async function resolverError(btnEl, gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        const fe = feedbackEdad();
        const fb = (gameConfig.feedback && gameConfig.feedback.error) || {};
        const texto = fe.error || textos().error || fb.texto || "Mira otra vez. ¡Vamos a intentarlo!";
        if (btnEl) {
            btnEl.classList.add("rechazo");
            setTimeout(function () { btnEl.classList.remove("rechazo"); }, 600);
        }
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);
        try {
            await feedbackConVoz(texto, {
                personaje: "zeus",
                gif: fb.gif || "../../images/incorrecto.gif"
            });
        } catch (e) { /* noop */ }
        if (gen !== retoGen) return;
        document.getElementById("opciones").hidden = true;
        await reproducirSecuencia(retoActual.prefijo || [], gen, true);
        if (gen !== retoGen) return;
        renderRielEstatico(retoActual.prefijo || [], true);
        const pregunta = retoActual.pregunta || textos().pregunta || "¿Qué movimiento sigue?";
        setEnunciado(pregunta);
        try {
            await TextoVoz.hablar(pregunta, retoActual.preguntaQuien || "zeus");
        } catch (e) { /* noop */ }
        if (gen !== retoGen) return;
        renderOpciones(retoActual, gen);
        esperandoFeedback = false;
        aceptaRespuesta = true;
    }

    async function resolverAcierto(valor, gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;

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
        // Sin modal/TTS por acierto: solo sonido.
        await sleep(350);
        if (gen !== retoGen) return;
        esperandoFeedback = false;
        indiceReto += 1;
        iniciarRetoActual(gen);
    }

    function mostrarCierre() {
        juegoTerminado = true;
        if (typeof aceptaArrastre !== "undefined") aceptaArrastre = false;
        if (typeof aceptaToque !== "undefined") aceptaToque = false;
        const cierre = (typeof textos === "function" ? textos().cierre : null) || "¡Excelente!";
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
        resolverCuerpo();
        aplicarLetterSpacing();

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        enlazarMenuAcc();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria(); // no bloquea el riel

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
