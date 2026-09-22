/* Arrastrar y soltar objetos — paquete Polimotor */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceRonda = 0;
    let totalRondas = 1;
    let objetosPendientes = [];
    let colocados = Object.create(null);
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaArrastre = false;
    let rondaGen = 0;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;
    let dragState = null;

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
        return (gameConfig.objetos && gameConfig.objetos[id]) || { nombre: id, img: "" };
    }

    function metaDest(id) {
        return (gameConfig.destinos && gameConfig.destinos[id]) || { nombre: id, img: "" };
    }

    function destinoCorrecto(objetoId) {
        return (gameConfig.pares && gameConfig.pares[objetoId]) || null;
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
        Object.keys(gameConfig.objetos || {}).forEach(function (id) {
            if (metaObj(id).img) urls.push(metaObj(id).img);
        });
        Object.keys(gameConfig.destinos || {}).forEach(function (id) {
            if (metaDest(id).img) urls.push(metaDest(id).img);
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
            t.acierto, t.error, t.cierre, t.enunciado, t.eligeNivel,
            "¡Muy bien! Colocaste el objeto en su lugar.",
            "¡Inténtalo otra vez! Observa dónde corresponde.",
            "¡Excelente! Ubicaste todos los objetos correctamente."
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

    /* ── Edad / rondas ─────────────────────────────────────────── */

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
        rondaGen += 1;
        juegoTerminado = false;
        esperandoFeedback = false;
        aceptaArrastre = false;
        TextoVoz.detener();
        indiceRonda = 0;
        totalRondas = Math.max(1, Number(nivelElegido.rondas) || 1);
        document.getElementById("enunciado").textContent = textos().enunciado || "Arrastra cada objeto hasta su lugar";
        Promise.resolve(imagenesPromise).then(function () {
            iniciarRonda(rondaGen);
        });
    };

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el) return;
        el.hidden = false;
        el.textContent = (indiceRonda + 1) + "/" + totalRondas;
    }

    function iniciarRonda(gen) {
        if (gen !== rondaGen || juegoTerminado) return;
        cancelarDrag();
        colocados = Object.create(null);
        const objs = (nivelElegido.objetos || []).slice();
        const dests = (nivelElegido.destinos || []).slice();
        objetosPendientes = nivelElegido.barajarObjetos ? shuffle(objs) : objs;
        const destinosRonda = nivelElegido.barajarDestinos ? shuffle(dests) : dests;
        actualizarProgreso();
        pintarTablero(objetosPendientes, destinosRonda);
        aceptaArrastre = true;
        TextoVoz.hablar(textos().enunciado || "Arrastra cada objeto hasta su lugar", "zoe");
    }

    function pintarTablero(objetos, destinos) {
        const $dest = document.getElementById("zona-destinos");
        const $objs = document.getElementById("zona-objetos");
        $dest.innerHTML = "";
        $objs.innerHTML = "";

        destinos.forEach(function (id) {
            const m = metaDest(id);
            const el = document.createElement("div");
            el.className = "destino";
            el.dataset.destino = id;
            el.innerHTML =
                '<img class="destino-img" src="' + escAttr(m.img) + '" alt="' + escAttr(m.nombre) + '">' +
                '<p class="destino-nombre">' + escHtml(m.nombre) + "</p>";
            $dest.appendChild(el);
        });

        objetos.forEach(function (id) {
            const m = metaObj(id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "objeto";
            btn.dataset.objeto = id;
            btn.setAttribute("aria-label", m.nombre || id);
            btn.innerHTML = '<img src="' + escAttr(m.img) + '" alt="">';
            enlazarDrag(btn);
            $objs.appendChild(btn);
        });
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

    /* ── Arrastre (pointer events / tablet) ─────────────────────── */

    function enlazarDrag(el) {
        el.addEventListener("pointerdown", onPointerDown);
    }

    function onPointerDown(ev) {
        if (!aceptaArrastre || esperandoFeedback || juegoTerminado) return;
        const el = ev.currentTarget;
        if (!el || el.classList.contains("is-colocado")) return;
        if (ev.button != null && ev.button !== 0) return;
        ev.preventDefault();
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }

        const proxy = document.createElement("div");
        proxy.className = "objeto-drag-proxy";
        proxy.innerHTML = el.innerHTML;
        document.body.appendChild(proxy);
        moverProxy(proxy, ev.clientX, ev.clientY);

        el.classList.add("is-dragging", "is-ghost");
        dragState = {
            pointerId: ev.pointerId,
            objetoId: el.dataset.objeto,
            el: el,
            proxy: proxy,
            over: null
        };

        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", onPointerUp);
        el.addEventListener("pointercancel", onPointerUp);
    }

    function moverProxy(proxy, x, y) {
        proxy.style.left = x + "px";
        proxy.style.top = y + "px";
    }

    function onPointerMove(ev) {
        if (!dragState || ev.pointerId !== dragState.pointerId) return;
        ev.preventDefault();
        moverProxy(dragState.proxy, ev.clientX, ev.clientY);
        const dest = destinoBajoPunto(ev.clientX, ev.clientY);
        if (dragState.over && dragState.over !== dest) {
            dragState.over.classList.remove("is-over");
        }
        if (dest) dest.classList.add("is-over");
        dragState.over = dest;
    }

    function destinoBajoPunto(x, y) {
        const nodos = document.elementsFromPoint(x, y) || [];
        for (let i = 0; i < nodos.length; i++) {
            const n = nodos[i];
            if (n && n.classList && n.classList.contains("destino") && !n.classList.contains("is-lleno")) {
                return n;
            }
            if (n && n.closest) {
                const d = n.closest(".destino");
                if (d && !d.classList.contains("is-lleno")) return d;
            }
        }
        return null;
    }

    function onPointerUp(ev) {
        if (!dragState || ev.pointerId !== dragState.pointerId) return;
        ev.preventDefault();
        const state = dragState;
        const dest = state.over || destinoBajoPunto(ev.clientX, ev.clientY);
        limpiarListenersDrag(state.el);
        if (state.over) state.over.classList.remove("is-over");
        if (state.proxy && state.proxy.parentNode) state.proxy.parentNode.removeChild(state.proxy);
        state.el.classList.remove("is-dragging", "is-ghost");
        dragState = null;

        if (!dest) return;
        resolverSoltar(state.objetoId, dest.dataset.destino, state.el, dest);
    }

    function limpiarListenersDrag(el) {
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerup", onPointerUp);
        el.removeEventListener("pointercancel", onPointerUp);
    }

    function cancelarDrag() {
        if (!dragState) return;
        const state = dragState;
        limpiarListenersDrag(state.el);
        if (state.over) state.over.classList.remove("is-over");
        if (state.proxy && state.proxy.parentNode) state.proxy.parentNode.removeChild(state.proxy);
        state.el.classList.remove("is-dragging", "is-ghost");
        dragState = null;
    }

    async function resolverSoltar(objetoId, destinoId, elObjeto, elDestino) {
        if (!aceptaArrastre || esperandoFeedback || juegoTerminado) return;
        const correcto = destinoCorrecto(objetoId);
        if (!correcto || destinoId !== correcto) {
            await feedbackError();
            return;
        }
        if (colocados[objetoId]) return;

        colocados[objetoId] = destinoId;
        elObjeto.classList.add("is-colocado");
        elDestino.classList.add("is-lleno");
        const img = document.createElement("img");
        img.className = "objeto-colocado";
        img.src = metaObj(objetoId).img || "";
        img.alt = metaObj(objetoId).nombre || "";
        elDestino.appendChild(img);

        await feedbackAcierto();

        const quedan = objetosPendientes.some(function (id) { return !colocados[id]; });
        if (quedan) return;

        if (indiceRonda + 1 < totalRondas) {
            indiceRonda += 1;
            await sleep(350);
            iniciarRonda(rondaGen);
            return;
        }
        mostrarCierre();
    }

    async function feedbackAcierto() {
        esperandoFeedback = true;
        aceptaArrastre = false;
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        // Sin modal/TTS por acierto: solo sonido (evita carga en cada colocación).
        try {
            await sleep(350);
        } finally {
            esperandoFeedback = false;
            aceptaArrastre = !juegoTerminado;
        }
    }

    async function feedbackError() {
        esperandoFeedback = true;
        aceptaArrastre = false;
        const texto = textos().error || "¡Inténtalo otra vez! Observa dónde corresponde.";
        const gif = (gameConfig.feedback && gameConfig.feedback.error && gameConfig.feedback.error.gif)
            || "../../images/incorrecto.gif";
        const minMs = Number(gameConfig.feedback && gameConfig.feedback.duracion) || 1300;
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.85, false);
        const pVoz = TextoVoz.hablar(texto, "zeus");
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
        const topeMs = Math.max(minMs + 2500, 6000);
        try {
            await Promise.race([
                Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
                sleep(topeMs)
            ]);
        } finally {
            try { Swal.close(); } catch (e) { /* noop */ }
            esperandoFeedback = false;
            aceptaArrastre = !juegoTerminado;
        }
    }

    function mostrarCierre() {
        juegoTerminado = true;
        aceptaArrastre = false;
        const cierre = textos().cierre || "¡Excelente! Ubicaste todos los objetos correctamente.";
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
        enlazarMenuAcc();
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
