/* Juegos de precisión — paquete Polimotor */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceRuta = 0;
    let totalRutas = 1;
    let rutaActual = null;
    let metaRuntime = null;
    let arosPasados = 0;
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaArrastre = false;
    let rutaGen = 0;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;
    let dragState = null;
    let coheteEl = null;
    let aroNodes = [];
    let stageRect = null;
    let lastPointer = null;

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
        if (gameConfig.fondo) urls.push(gameConfig.fondo);
        if (gameConfig.cohete && gameConfig.cohete.img) urls.push(gameConfig.cohete.img);
        if (gameConfig.estrella && gameConfig.estrella.img) urls.push(gameConfig.estrella.img);
        Object.keys(gameConfig.aros || {}).forEach(function (color) {
            const a = gameConfig.aros[color];
            if (a.trasera) urls.push(a.trasera);
            if (a.frontal) urls.push(a.frontal);
        });
        (gameConfig.planetas || []).forEach(function (p) {
            if (p.img) urls.push(p.img);
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
        return [
            t.aciertoAro, t.aciertoRecorrido, t.error, t.cierre, t.enunciado, t.eligeNivel,
            "¡Muy bien! Sigue avanzando.",
            "¡Inténtalo otra vez! Mueve el cohete con cuidado.",
            "¡Excelente! Completaste el recorrido de precisión."
        ].filter(Boolean);
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

    /* ── Escena / geometría ─────────────────────────────────────── */

    function refrescarStageRect() {
        const wrap = document.getElementById("escena-wrap");
        stageRect = wrap ? wrap.getBoundingClientRect() : null;
        return stageRect;
    }

    function pctToPx(pxFrac, pyFrac) {
        const r = stageRect || refrescarStageRect();
        if (!r) return { x: 0, y: 0 };
        return { x: pxFrac * r.width, y: pyFrac * r.height };
    }

    function sizePx(frac) {
        const r = stageRect || refrescarStageRect();
        if (!r) return 80;
        return Math.max(40, Math.min(r.width, r.height) * frac);
    }

    function colorAro(i) {
        const colores = gameConfig.coloresAro || ["azul", "amarillo", "rosado", "morado"];
        return colores[i % colores.length];
    }

    function metaAro(color) {
        return (gameConfig.aros && gameConfig.aros[color]) || {};
    }

    function limpiarEscena() {
        cancelarDrag();
        ["capa-decoro", "capa-aros", "capa-meta", "capa-cohete"].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = "";
        });
        coheteEl = null;
        aroNodes = [];
        arosPasados = 0;
        rutaActual = null;
        metaRuntime = null;
    }

    function metaConSeparacion(ruta, tamAroFrac, tamEstrellaFrac) {
        const r = stageRect || refrescarStageRect();
        const meta = (ruta.meta || [0.92, 0.5]).slice();
        const aros = ruta.aros || [];
        if (!r || !aros.length) return meta;

        const last = aros[aros.length - 1];
        const minDim = Math.min(r.width, r.height);
        // Radio visual aprox. + holgura para que no se vean apilados.
        const gapPx = (tamAroFrac * 0.52 + tamEstrellaFrac * 0.55 + 0.06) * minDim;

        let dx = (meta[0] - last[0]) * r.width;
        let dy = (meta[1] - last[1]) * r.height;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
            dx = Math.max(r.width * 0.12, 1);
            dy = 0;
            dist = dx;
        }
        if (dist < gapPx) {
            const scale = gapPx / dist;
            meta[0] = last[0] + (dx * scale) / r.width;
            meta[1] = last[1] + (dy * scale) / r.height;
        }
        meta[0] = Math.max(0.1, Math.min(0.94, meta[0]));
        meta[1] = Math.max(0.14, Math.min(0.86, meta[1]));

        // Si el clamp volvió a acercarlos, empuja solo en X hacia el borde libre.
        dx = (meta[0] - last[0]) * r.width;
        dy = (meta[1] - last[1]) * r.height;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gapPx) {
            const need = (gapPx - dist) / r.width;
            if (last[0] <= 0.5) meta[0] = Math.min(0.94, meta[0] + need);
            else meta[0] = Math.max(0.1, meta[0] - need);
        }
        return meta;
    }

    function pintarDecoracion() {
        const capa = document.getElementById("capa-decoro");
        const fondo = document.getElementById("capa-fondo");
        if (fondo && gameConfig.fondo) {
            fondo.style.backgroundImage = "url('" + gameConfig.fondo + "')";
        }
        (gameConfig.planetas || []).forEach(function (p) {
            const el = document.createElement("div");
            el.className = "planeta-deco";
            const s = sizePx(p.size || 0.1);
            el.style.width = s + "px";
            el.style.height = s + "px";
            el.style.left = (p.x * 100) + "%";
            el.style.top = (p.y * 100) + "%";
            const img = document.createElement("img");
            img.src = p.img || "";
            img.alt = "";
            img.draggable = false;
            el.appendChild(img);
            capa.appendChild(el);
        });
    }

    function pintarRuta(ruta) {
        limpiarEscena();
        refrescarStageRect();
        rutaActual = ruta;
        arosPasados = 0;
        pintarDecoracion();

        const capaAros = document.getElementById("capa-aros");
        const capaMeta = document.getElementById("capa-meta");
        const capaCohete = document.getElementById("capa-cohete");
        const capaDecoro = document.getElementById("capa-decoro");
        const tamAro = sizePx(nivelElegido.tamanoAro || 0.22);
        const tamCohete = sizePx(nivelElegido.tamanoCohete || 0.12);
        const tamEstrella = sizePx(nivelElegido.tamanoEstrella || 0.11);
        const tamAroFrac = Number(nivelElegido.tamanoAro) || 0.22;
        const tamEstrellaFrac = Number(nivelElegido.tamanoEstrella) || 0.11;
        const metaPos = metaConSeparacion(ruta, tamAroFrac, tamEstrellaFrac);
        metaRuntime = metaPos;

        // Plataforma de despegue (detrás del cohete).
        const inicio = document.createElement("div");
        inicio.className = "punto-inicio";
        inicio.style.left = (ruta.inicio[0] * 100) + "%";
        inicio.style.top = (ruta.inicio[1] * 100) + "%";
        capaDecoro.appendChild(inicio);

        const estrella = document.createElement("div");
        estrella.className = "meta-estrella";
        estrella.id = "meta-estrella";
        estrella.style.width = tamEstrella + "px";
        estrella.style.height = tamEstrella + "px";
        estrella.style.left = (metaPos[0] * 100) + "%";
        estrella.style.top = (metaPos[1] * 100) + "%";
        const imgEstrella = document.createElement("img");
        imgEstrella.src = (gameConfig.estrella && gameConfig.estrella.img) || "";
        imgEstrella.alt = "Estrella";
        imgEstrella.draggable = false;
        estrella.appendChild(imgEstrella);
        capaMeta.appendChild(estrella);

        aroNodes = [];
        (ruta.aros || []).forEach(function (pos, i) {
            const color = colorAro(i);
            const assets = metaAro(color);

            // Un solo contenedor: posición [x,y] + tamaño. Las capas heredan el mismo box.
            const wrap = document.createElement("div");
            wrap.className = "aro";
            wrap.dataset.idx = String(i);
            wrap.style.width = tamAro + "px";
            wrap.style.height = tamAro + "px";
            wrap.style.left = (pos[0] * 100) + "%";
            wrap.style.top = (pos[1] * 100) + "%";
            // Centrado sin transform (evita stacking context que rompería trasera/cohete/frontal).
            wrap.style.marginLeft = (-tamAro / 2) + "px";
            wrap.style.marginTop = (-tamAro / 2) + "px";

            const back = document.createElement("img");
            back.className = "aro-capa aro-trasera";
            back.src = assets.trasera || "";
            back.alt = "";
            back.draggable = false;

            const front = document.createElement("img");
            front.className = "aro-capa aro-frontal";
            front.src = assets.frontal || "";
            front.alt = "";
            front.draggable = false;

            wrap.appendChild(back);
            wrap.appendChild(front);
            capaAros.appendChild(wrap);

            aroNodes.push({
                idx: i,
                x: pos[0],
                y: pos[1],
                el: wrap,
                back: back,
                front: front,
                // Radio del hueco interior del aro (~32% del sprite). Centro lógico = [x,y].
                radioPx: tamAro * 0.32
            });
        });

        coheteEl = document.createElement("div");
        coheteEl.className = "cohete";
        coheteEl.id = "cohete";
        coheteEl.setAttribute("role", "button");
        coheteEl.setAttribute("aria-label", "Cohete");
        coheteEl.style.width = tamCohete + "px";
        coheteEl.style.height = (tamCohete * 1.36) + "px";
        const imgCohete = document.createElement("img");
        imgCohete.src = (gameConfig.cohete && gameConfig.cohete.img) || "";
        imgCohete.alt = "Cohete";
        imgCohete.draggable = false;
        coheteEl.appendChild(imgCohete);
        colocarCohete(ruta.inicio[0], ruta.inicio[1], 90);
        capaCohete.appendChild(coheteEl);
        enlazarDragCohete(coheteEl);
        actualizarEstilosAros();
    }

    function colocarCohete(fx, fy, angDeg) {
        if (!coheteEl) return;
        coheteEl.style.left = (fx * 100) + "%";
        coheteEl.style.top = (fy * 100) + "%";
        // Asset apunta arriba; 90° = hacia la derecha (recorrido típico).
        const ang = (angDeg != null && isFinite(angDeg)) ? angDeg : 90;
        coheteEl.style.transform = "translate(-50%, -50%) rotate(" + ang + "deg)";
        coheteEl.dataset.fx = String(fx);
        coheteEl.dataset.fy = String(fy);
        coheteEl.dataset.ang = String(ang);
    }

    function actualizarEstilosAros() {
        aroNodes.forEach(function (n) {
            const pasado = n.idx < arosPasados;
            const siguiente = n.idx === arosPasados;
            n.el.classList.toggle("is-pasado", pasado);
            n.el.classList.toggle("is-siguiente", siguiente);
            n.el.classList.toggle("is-bloqueado", !pasado && !siguiente);
        });
        const estrella = document.getElementById("meta-estrella");
        if (estrella) {
            estrella.classList.toggle("is-lista", arosPasados >= aroNodes.length);
        }
    }

    function clientToFrac(clientX, clientY) {
        const r = stageRect || refrescarStageRect();
        if (!r || r.width <= 0 || r.height <= 0) return { x: 0.5, y: 0.5 };
        return {
            x: Math.max(0.03, Math.min(0.97, (clientX - r.left) / r.width)),
            y: Math.max(0.05, Math.min(0.95, (clientY - r.top) / r.height))
        };
    }

    function distanciaPx(fx, fy, ax, ay) {
        const a = pctToPx(fx, fy);
        const b = pctToPx(ax, ay);
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function anguloDesdeMovimiento(prev, next) {
        if (!prev) return 90;
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        if (Math.abs(dx) + Math.abs(dy) < 0.003) return null;
        // 0° = arriba en el asset → +90 para alinear con atan2 (0 = derecha).
        return (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    }

    /* ── Arrastre ─────────────────────────────────────────────── */

    function enlazarDragCohete(el) {
        el.addEventListener("pointerdown", onPointerDown);
    }

    function onPointerDown(ev) {
        if (!aceptaArrastre || esperandoFeedback || juegoTerminado) return;
        if (ev.button != null && ev.button !== 0) return;
        ev.preventDefault();
        refrescarStageRect();
        try { coheteEl.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        const frac = clientToFrac(ev.clientX, ev.clientY);
        dragState = { pointerId: ev.pointerId };
        lastPointer = frac;
        coheteEl.classList.add("is-dragging");
        colocarCohete(frac.x, frac.y, 0);
        coheteEl.addEventListener("pointermove", onPointerMove);
        coheteEl.addEventListener("pointerup", onPointerUp);
        coheteEl.addEventListener("pointercancel", onPointerUp);
    }

    function onPointerMove(ev) {
        if (!dragState || ev.pointerId !== dragState.pointerId) return;
        if (!aceptaArrastre || esperandoFeedback) return;
        ev.preventDefault();
        const frac = clientToFrac(ev.clientX, ev.clientY);
        const ang = anguloDesdeMovimiento(lastPointer, frac);
        colocarCohete(frac.x, frac.y, ang != null ? ang : Number(coheteEl.dataset.ang) || 90);
        lastPointer = frac;
        evaluarPaso(frac.x, frac.y);
    }

    function onPointerUp(ev) {
        if (!dragState || ev.pointerId !== dragState.pointerId) return;
        ev.preventDefault();
        const frac = clientToFrac(ev.clientX, ev.clientY);
        colocarCohete(frac.x, frac.y, Number(coheteEl.dataset.ang) || 90);
        limpiarListenersDrag();
        dragState = null;
        if (coheteEl) coheteEl.classList.remove("is-dragging");
        // Si soltó sobre la estrella sin completar aros → error.
        if (arosPasados < aroNodes.length && tocaMeta(frac.x, frac.y)) {
            fallarYReiniciar();
        }
    }

    function limpiarListenersDrag() {
        if (!coheteEl) return;
        coheteEl.removeEventListener("pointermove", onPointerMove);
        coheteEl.removeEventListener("pointerup", onPointerUp);
        coheteEl.removeEventListener("pointercancel", onPointerUp);
    }

    function cancelarDrag() {
        if (!dragState) return;
        limpiarListenersDrag();
        dragState = null;
        if (coheteEl) coheteEl.classList.remove("is-dragging");
    }

    function radioHit(aro) {
        const tol = Number(nivelElegido.tolerancia);
        const factor = isFinite(tol) ? tol : 0.5;
        return aro.radioPx * factor;
    }

    function tocaMeta(fx, fy) {
        if (!rutaActual) return false;
        const m = metaRuntime || rutaActual.meta;
        if (!m) return false;
        const r = sizePx(nivelElegido.tamanoEstrella || 0.11) * 0.55;
        return distanciaPx(fx, fy, m[0], m[1]) <= r;
    }

    function evaluarPaso(fx, fy) {
        if (!rutaActual || esperandoFeedback || juegoTerminado) return;

        // Aro fuera de orden → fallo.
        for (let i = arosPasados + 1; i < aroNodes.length; i++) {
            const n = aroNodes[i];
            if (distanciaPx(fx, fy, n.x, n.y) <= radioHit(n) * 0.85) {
                fallarYReiniciar();
                return;
            }
        }

        if (arosPasados < aroNodes.length) {
            const next = aroNodes[arosPasados];
            if (distanciaPx(fx, fy, next.x, next.y) <= radioHit(next)) {
                arosPasados += 1;
                actualizarEstilosAros();
                reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.7, false);
            }
        }

        if (arosPasados >= aroNodes.length && tocaMeta(fx, fy)) {
            completarRecorrido();
        }
    }

    async function fallarYReiniciar() {
        if (esperandoFeedback || juegoTerminado) return;
        cancelarDrag();
        esperandoFeedback = true;
        aceptaArrastre = false;
        if (coheteEl) coheteEl.classList.add("is-bloqueado");
        await feedbackError();
        if (juegoTerminado) return;
        arosPasados = 0;
        actualizarEstilosAros();
        if (rutaActual) colocarCohete(rutaActual.inicio[0], rutaActual.inicio[1], 0);
        if (coheteEl) coheteEl.classList.remove("is-bloqueado");
        esperandoFeedback = false;
        aceptaArrastre = true;
    }

    async function completarRecorrido() {
        if (esperandoFeedback || juegoTerminado) return;
        cancelarDrag();
        esperandoFeedback = true;
        aceptaArrastre = false;
        if (coheteEl) coheteEl.classList.add("is-bloqueado");
        const gen = rutaGen;
        await feedbackAciertoRecorrido();
        if (gen !== rutaGen || juegoTerminado) return;
        if (indiceRuta + 1 < totalRutas) {
            indiceRuta += 1;
            iniciarRuta(gen);
            return;
        }
        mostrarCierre();
    }

    function limpiarSwalResidual() {
        try {
            if (typeof Swal !== "undefined") Swal.close();
        } catch (e) { /* noop */ }
        try {
            document.querySelectorAll(".swal2-container").forEach(function (el) { el.remove(); });
            document.documentElement.classList.remove("swal2-shown", "swal2-height-auto");
            document.body.classList.remove("swal2-shown", "swal2-height-auto");
        } catch (e2) { /* noop */ }
    }

    async function feedbackAciertoRecorrido() {
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        limpiarSwalResidual();
        // Sin modal/TTS por acierto de recorrido: solo sonido.
        try {
            await sleep(400);
        } finally {
            esperandoFeedback = false;
        }
    }

    async function feedbackError() {
        const texto = textos().error || "¡Inténtalo otra vez! Mueve el cohete con cuidado.";
        const gif = (gameConfig.feedback && gameConfig.feedback.error && gameConfig.feedback.error.gif)
            || "../../images/incorrecto.gif";
        const minMs = Number(gameConfig.feedback && gameConfig.feedback.duracion) || 1200;
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.85, false);
        limpiarSwalResidual();
        const pVoz = TextoVoz.hablar(texto, "zeus");
        if (gameConfig.mostrarFeedBack !== false) {
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
            limpiarSwalResidual();
        }
    }

    function mostrarCierre() {
        juegoTerminado = true;
        aceptaArrastre = false;
        const cierre = textos().cierre || "¡Excelente! Completaste el recorrido de precisión.";
        document.getElementById("texto_final").textContent = cierre;
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        $("#final").fadeIn(400);
    }

    /* ── Niveles ──────────────────────────────────────────────── */

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
        rutaGen += 1;
        juegoTerminado = false;
        esperandoFeedback = false;
        aceptaArrastre = false;
        TextoVoz.detener();
        indiceRuta = 0;
        totalRutas = (nivelElegido.rutas || []).length;
        document.getElementById("enunciado").textContent = textos().enunciado || "Lleva el cohete por cada aro hasta la estrella";
        Promise.resolve(imagenesPromise).then(function () {
            iniciarRuta(rutaGen);
        });
    };

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el) return;
        el.hidden = false;
        el.textContent = (indiceRuta + 1) + "/" + totalRutas;
    }

    function iniciarRuta(gen) {
        if (gen !== rutaGen || juegoTerminado) return;
        const rutas = nivelElegido.rutas || [];
        if (indiceRuta >= rutas.length) {
            mostrarCierre();
            return;
        }
        actualizarProgreso();
        pintarRuta(rutas[indiceRuta]);
        aceptaArrastre = true;
        esperandoFeedback = false;
        TextoVoz.hablar(textos().enunciado || "Lleva el cohete por cada aro hasta la estrella", "zoe");
    }

    /* ── Boot ─────────────────────────────────────────────────── */

    function boot() {
        try {
            const rawIntro = readText("../../intro.json");
            const rawGame = readText("config.json");
            if (!rawIntro || !rawGame) throw new Error("No se pudo leer intro/config");
            introConfig = JSON.parse(rawIntro);
            gameConfig = JSON.parse(rawGame);
            introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        } catch (e) {
            console.error(e);
            document.body.innerHTML = "<p style='padding:24px;font-family:sans-serif'>No se pudo cargar el juego.</p>";
            return;
        }

        aplicarLetterSpacing();
        enlazarMenuVol();
        enlazarMenuAcc();
        renderPersonajes(introConfig.personajes || []);

        const btn = document.getElementById("btn-empecemos");
        if (btn) btn.addEventListener("click", empecemosJuego);
        const omitir = document.getElementById("btnomitir");
        if (omitir) {
            omitir.addEventListener("click", function () {
                cerrar_anuncio({ rapido: true });
            });
        }

        window.addEventListener("resize", function () {
            if (!rutaActual || !nivelElegido) return;
            const fx = Number(coheteEl && coheteEl.dataset.fx);
            const fy = Number(coheteEl && coheteEl.dataset.fy);
            const guardados = arosPasados;
            pintarRuta(rutaActual);
            arosPasados = guardados;
            actualizarEstilosAros();
            if (isFinite(fx) && isFinite(fy)) colocarCohete(fx, fy, 0);
        });

        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();
        preloadGifs(introConfig.personajes || []).then(function () {
            introGifsListos = true;
            intentarLanzarIntro();
        });

        if (typeof TextoVoz !== "undefined") {
            TextoVoz.configurar({
                rate: (acc().rate != null ? acc().rate : 5),
                frases: frasesFijasTts()
            });
        }

        try {
            window.parent.postMessage({ type: "pednia:perfil", juego: "juegos-de-precision" }, "*");
        } catch (e) { /* noop */ }
    }

    $(document).ready(boot);
})();
