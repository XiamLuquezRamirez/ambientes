/* Laberintos de coordinación — paquete Polimotor */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let laberintosFijos = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let laberintos = [];
    let indiceLaberinto = 0;
    let juegoTerminado = false;
    let esperandoFeedback = false;

    let canvas = null;
    let ctx = null;
    let capaEstatica = null;
    let capaCtx = null;
    let labCapaId = null;
    let redrawPendiente = false;
    let avatarImg = null;
    let avatarVictoriaImg = null;
    let escenarioImg = null;
    let coheteImg = null;
    let generoElegido = "nino";
    let modoVictoria = false;
    let pelotaAnim = 0;
    let pelotaVictoria = false;
    let coheteVuelo = null;
    let audioCache = Object.create(null);
    let imagenesPromise = null;

    let personaje = { x: 0, y: 0 };
    let ultimoValido = { x: 0, y: 0 };
    let arrastrando = false;
    let pointerId = null;
    let rafId = null;

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


    function textos() {
        return (gameConfig && gameConfig.textos) || {};
    }

    function assetUrl(ruta) {
        if (!ruta) return "";
        return String(ruta).split("/").map(function (seg) {
            return encodeURIComponent(seg);
        }).join("/");
    }

    function normalizarGenero(valor) {
        const s = String(valor || "").trim().toLowerCase();
        if (s === "femenino" || s === "f" || s === "niña" || s === "nina" ||
            s === "mujer" || s === "girl" || s === "female") {
            return "nina";
        }
        return "nino";
    }

    function leerSexoDesdeHost() {
        try {
            const perfil = window.__PEDNIA_PERFIL__;
            if (perfil) {
                if (perfil.sexo) return perfil.sexo;
                if (perfil.estudiante_sexo) return perfil.estudiante_sexo;
                if (perfil.genero) return perfil.genero;
                if (perfil.valores) {
                    if (perfil.valores.sexo) return perfil.valores.sexo;
                    if (perfil.valores.estudiante_sexo) return perfil.valores.estudiante_sexo;
                }
            }
        } catch (e) { /* noop */ }

        try {
            if (window.parent && window.parent !== window) {
                const doc = window.parent.document;
                const el = doc.querySelector("[data-estudiante-sexo]");
                if (el) {
                    return el.getAttribute("data-estudiante-sexo") ||
                        (el.dataset && el.dataset.estudianteSexo) || null;
                }
            }
        } catch (e) { /* iframe cruzado */ }

        try {
            const params = new URLSearchParams(window.location.search || "");
            if (params.get("sexo")) return params.get("sexo");
            if (params.get("genero")) return params.get("genero");
        } catch (e) { /* noop */ }

        return null;
    }

    function resolverGenero() {
        const desdeConfig = gameConfig && (gameConfig.cuerpo || gameConfig.sexo || gameConfig.genero);
        return normalizarGenero(leerSexoDesdeHost() || desdeConfig || "nino");
    }

    function assetsPersonaje(genero) {
        const mapa = (gameConfig && gameConfig.personajes) || {};
        const cfg = mapa[genero] || mapa.nino || {};
        return {
            comienzo: cfg.comienzo || (genero === "nina" ? "img/NIÑA_COMIENZO.png" : "img/NIÑO_COMIENZO.png"),
            victoria: cfg.victoria || (genero === "nina" ? "img/NIÑA_VICTORIA_META.png" : "img/NIÑO_VICTORIA_META.png")
        };
    }

    function enunciadoActual() {
        const t = textos();
        if (generoElegido === "nina") {
            return t.enunciadoNina || t.enunciado || "Lleva a la niña hasta el cohete";
        }
        return t.enunciadoNino || t.enunciado || "Lleva al niño hasta el cohete";
    }

    function zonaJuego() {
        const z = (gameConfig && gameConfig.escenario && gameConfig.escenario.zona) || {};
        return {
            x: Number(z.x != null ? z.x : 8),
            y: Number(z.y != null ? z.y : 15),
            w: Number(z.w != null ? z.w : 84),
            h: Number(z.h != null ? z.h : 70)
        };
    }

    function coloresCamino() {
        const c = (gameConfig && gameConfig.coloresCamino) || {};
        return {
            pasillo: c.pasillo || c.principal || "#e0e7ff",
            pared: c.pared || c.guia || "#312e81",
            borde: c.borde || "#1e1b4b"
        };
    }

    /* ── Intro personajes (mismo flujo que Rompecabezas) ─────── */

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
            div.className = "personaje-char personaje-char-" + posiciones[index];
            div.style.backgroundImage = "url(" + personajeCfg.gif_idle + ")";
            div.dataset.index = index;
            container.appendChild(div);
        });
    }

    function preloadGifsEnCSS(personajes) {
        const urls = [];
        personajes.forEach(function (p) {
            [p.gif_idle, p.gif_hablando].forEach(function (gif) {
                if (gif && urls.indexOf(gif) === -1) urls.push(gif);
            });
        });
        let style = document.getElementById("preload-personajes-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "preload-personajes-style";
            document.head.appendChild(style);
        }
        style.textContent = "#personajes-container::after{content:" +
            urls.map(function (u) { return 'url("' + u + '")'; }).join(" ") +
            ";position:absolute;width:0;height:0;overflow:hidden;opacity:0;}";
    }

    function preloadGifs(personajes) {
        preloadGifsEnCSS(personajes);
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
        const n = introConfig.personajes.length;
        nube.classList.remove("nube-centro", "nube-izquierda", "nube-derecha");
        if (n === 1) nube.classList.add("nube-centro");
        else if (index === 0) nube.classList.add("nube-izquierda");
        else nube.classList.add("nube-derecha");
    }

    function fijarNubeEnPosicion() {
        if (cerrardo || conversacionCancelada) return;
        const nube = document.querySelector(".nube");
        nube.style.animationName = "none";
        nube.style.bottom = "57%";
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
        if (chars.length === 1) {
            chars[0].style.animationName = "salidaIzquierda";
            setTimeout(callback, espera);
            return;
        }
        chars[0].style.animationName = "salidaIzquierda";
        chars[1].style.animationName = "salidaDerecha";
        setTimeout(callback, espera);
    }

    function mostrarNubeYConversacion() {
        if (cerrardo || conversacionCancelada) return;
        const primeraLinea = introConfig.conversacion[0];
        const indiceInicial = primeraLinea && primeraLinea.personaje != null ? primeraLinea.personaje : 0;
        let conversacionLista = false;

        setPersonajesVisual(indiceInicial);
        aplicarClaseNube(indiceInicial);
        nubePersonajeActual = indiceInicial;

        const nube = document.querySelector(".nube");
        nube.style.animationName = "moverArriba";
        nube.style.animationDirection = "normal";
        nube.style.display = "block";

        function iniciarConversacion() {
            if (conversacionLista || cerrardo || conversacionCancelada) return;
            conversacionLista = true;
            fijarNubeEnPosicion();
            if (cerrardo || conversacionCancelada) return;
            document.querySelector(".nube").style.opacity = "1";
            reproducirConversacion();
        }

        nube.addEventListener("animationend", function (e) {
            if (cerrardo || conversacionCancelada) return;
            if (e.animationName === "moverArriba") iniciarConversacion();
        });

        agendarIntro(iniciarConversacion, 2300);
    }

    function iniciarAnimacionIntro() {
        if (cerrardo || conversacionCancelada) return;
        const overlay = document.querySelector(".overlay");
        const chars = document.querySelectorAll(".personaje-char");
        const cantidad = introConfig.personajes.length;

        overlay.style.display = "block";

        if (cantidad === 1) {
            chars[0].style.animationName = "entradaIzquierda";
            agendarIntro(mostrarNubeYConversacion, 2800);
            return;
        }

        chars[0].style.animationName = "entradaIzquierda";
        agendarIntro(function () {
            if (cerrardo || conversacionCancelada) return;
            chars[1].style.animationName = "entradaDerecha";
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
            // No quitar esperando-inicio aquí: el canvas oscuro no debe verse bajo la intro.
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "inicioDisuelve") ocultar();
        });
        setTimeout(ocultar, 1250);
    }

    /** Omitir: salida corta. Fin natural: salida completa (como hermanos). */
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
        $("#fondo_blanco").stop(true, true).hide();

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
            if (p && p.catch) p.catch(function () { });
            if (loop) audioFondo = audio;
            return audio;
        } catch (e) {
            return null;
        }
    }

    function preloadUrl(url) {
        return new Promise(function (resolve) {
            if (!url) {
                resolve();
                return;
            }
            const img = new Image();
            let done = false;
            const finish = function () {
                if (done) return;
                done = true;
                resolve(img);
            };
            img.onload = finish;
            img.onerror = finish;
            img.src = url;
            setTimeout(finish, 600);
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

    function cargarImagen(ruta) {
        return new Promise(function (resolve) {
            if (!ruta) {
                resolve(null);
                return;
            }
            const img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = assetUrl(ruta);
            setTimeout(function () {
                if (img.complete) resolve(img);
            }, 800);
        });
    }

    function cargarAvatar() {
        const assets = assetsPersonaje(generoElegido);
        return Promise.all([
            cargarImagen(assets.comienzo),
            cargarImagen(assets.victoria)
        ]).then(function (imgs) {
            avatarImg = imgs[0];
            avatarVictoriaImg = imgs[1];
            if (nivelElegido) redibujar();
            return avatarImg;
        });
    }

    function precargarImagenesCriticas() {
        generoElegido = resolverGenero();
        const assets = assetsPersonaje(generoElegido);
        const fondo = (gameConfig && gameConfig.escenario && gameConfig.escenario.fondo) || "img/ESCENARIO.png";
        const meta = (gameConfig && gameConfig.meta && gameConfig.meta.imagen) || "img/COHETE_SIN-SOMBRA.png";
        return Promise.all([
            cargarAvatar(),
            cargarImagen(fondo).then(function (img) {
                escenarioImg = img;
                labCapaId = null;
                if (nivelElegido) redibujar();
                return img;
            }),
            cargarImagen(meta).then(function (img) {
                coheteImg = img;
                if (nivelElegido) redibujar();
                return img;
            }),
            preloadUrl(assetUrl(assets.comienzo)),
            preloadUrl(assetUrl(fondo)),
            preloadUrl(assetUrl(meta))
        ]);
    }

    function precargarMediaSecundaria() {
        const assetsNino = assetsPersonaje("nino");
        const assetsNina = assetsPersonaje("nina");
        const urls = [
            "../../images/correcto.gif",
            "../../images/incorrecto.gif",
            "../../images/victoria.gif",
            "../../images/nube.png",
            assetUrl(assetsNino.comienzo),
            assetUrl(assetsNino.victoria),
            assetUrl(assetsNina.comienzo),
            assetUrl(assetsNina.victoria)
        ];
        const fb = (gameConfig && gameConfig.feedback) || {};
        if (fb.acierto && fb.acierto.gif) urls.push(fb.acierto.gif);
        if (fb.error && fb.error.gif) urls.push(fb.error.gif);
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
            new Promise(function (resolve) { setTimeout(resolve, ms || 400); })
        ]);
    }

    function asegurarAudioFondo() {
        if (audioFondo) {
            const p = audioFondo.play();
            if (p && typeof p.catch === "function") p.catch(function () { /* noop */ });
            return audioFondo;
        }
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, TextoVoz.VOLUMEN_FONDO, true);
    }

    /* ── Selección de edad ────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : i === 1 ? "warning" : "primary";
            botones +=
                '<div class="col-12 text-center mb-2">' +
                '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
                '<strong>' + nivel.edad + '</strong><br><small>' + nivel.titulo + "</small></button></div>";
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
        generoElegido = resolverGenero();
        cargarAvatar();
        laberintos = generarLaberintosNivel(nivelElegido);
        window.__laberintosActuales = laberintos;
        indiceLaberinto = 0;
        juegoTerminado = false;
        document.getElementById("enunciado").textContent = enunciadoActual();
        const arrancar = function () {
            iniciarLaberintoActual();
        };
        esperarImagenesOTimeout(400).then(arrancar).catch(arrancar);
    };

    /* ── Laberintos fijos (selección aleatoria sin repetir) ───── */

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function barajar(lista) {
        const out = (lista || []).slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            const tmp = out[i];
            out[i] = out[j];
            out[j] = tmp;
        }
        return out;
    }

    function clonarLaberinto(lab, indice) {
        return {
            id: (lab && lab.id) ? String(lab.id) : ("lab-" + (indice + 1)),
            path: (lab.path || []).map(function (p) { return [Number(p[0]), Number(p[1])]; }),
            distractores: (lab.distractores || []).map(function (rama) {
                return (rama || []).map(function (p) { return [Number(p[0]), Number(p[1])]; });
            })
        };
    }

    function poolLaberintosNivel(nivel) {
        if (nivel && Array.isArray(nivel.laberintos) && nivel.laberintos.length) {
            return nivel.laberintos;
        }
        const id = String((nivel && nivel.id) || "");
        if (laberintosFijos && Array.isArray(laberintosFijos[id])) {
            return laberintosFijos[id];
        }
        return [];
    }

    /** Elige N laberintos al azar del pool fijo de la edad, sin repetir. */
    function generarLaberintosNivel(nivel) {
        const cantidad = Number(
            nivel.cantidad != null
                ? nivel.cantidad
                : 3
        );
        const pool = poolLaberintosNivel(nivel);
        if (!pool.length) {
            console.warn("[Laberintos] Sin pool fijo para edad", nivel && nivel.id);
            return [];
        }
        const elegidos = barajar(pool).slice(0, Math.min(cantidad, pool.length));
        return elegidos.map(clonarLaberinto);
    }

    /* ── Geometría del camino ─────────────────────────────────── */

    function laberintoActual() {
        return laberintos[indiceLaberinto] || null;
    }

    function anchoCamino() {
        return Number(nivelElegido && nivelElegido.anchoCamino != null
            ? nivelElegido.anchoCamino
            : 8);
    }

    function metaRadio() {
        const metaCfg = (gameConfig && gameConfig.meta) || {};
        if (metaCfg.radio != null) return Number(metaCfg.radio);
        return Number(gameConfig.metaRadio != null ? gameConfig.metaRadio : 7);
    }

    function puntosPath(path) {
        return (path || []).map(function (p) {
            return { x: Number(p[0]), y: Number(p[1]) };
        });
    }

    function dist(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function distPuntoSegmento(p, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return { dist: dist(p, a), punto: { x: a.x, y: a.y } };
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: a.x + t * dx, y: a.y + t * dy };
        return { dist: dist(p, proj), punto: proj };
    }

    function proyectarEnPath(p, pathPts) {
        let mejor = null;
        for (let i = 0; i < pathPts.length - 1; i++) {
            const r = distPuntoSegmento(p, pathPts[i], pathPts[i + 1]);
            if (!mejor || r.dist < mejor.dist) {
                mejor = r;
            }
        }
        return mejor;
    }

    function dentroDelCamino(p, pathPts, radio) {
        const proy = proyectarEnPath(p, pathPts);
        if (!proy) return false;
        return proy.dist <= radio;
    }

    function redDePasillos(lab) {
        const red = [puntosPath(lab && lab.path)];
        (lab && lab.distractores || []).forEach(function (d) {
            red.push(puntosPath(d));
        });
        return red;
    }

    function proyectarEnRed(p, red) {
        let mejor = null;
        for (let i = 0; i < red.length; i++) {
            const r = proyectarEnPath(p, red[i]);
            if (r && (!mejor || r.dist < mejor.dist)) mejor = r;
        }
        return mejor;
    }

    function dentroDeRed(p, red, radio) {
        const proy = proyectarEnRed(p, red);
        return !!(proy && proy.dist <= radio);
    }

    function inicioMeta(lab) {
        const pts = puntosPath(lab && lab.path);
        if (pts.length < 2) {
            return {
                inicio: { x: 10, y: 50 },
                meta: { x: 90, y: 50 },
                pts: [{ x: 10, y: 50 }, { x: 90, y: 50 }]
            };
        }
        return {
            inicio: pts[0],
            meta: pts[pts.length - 1],
            pts: pts
        };
    }

    /* ── Canvas ───────────────────────────────────────────────── */

    function tamañoLogico() {
        return { w: canvas.width, h: canvas.height };
    }

    function aPixel(punto) {
        const s = tamañoLogico();
        const z = zonaJuego();
        return {
            x: ((z.x + (punto.x / 100) * z.w) / 100) * s.w,
            y: ((z.y + (punto.y / 100) * z.h) / 100) * s.h
        };
    }

    function aNorm(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const z = zonaJuego();
        const xCanvas = ((clientX - rect.left) / rect.width) * 100;
        const yCanvas = ((clientY - rect.top) / rect.height) * 100;
        return {
            x: ((xCanvas - z.x) / z.w) * 100,
            y: ((yCanvas - z.y) / z.h) * 100
        };
    }

    function dibujarPolilineaEn(targetCtx, pts, color, anchoPx, dashed) {
        if (!pts || pts.length < 2) return;
        targetCtx.save();
        targetCtx.strokeStyle = color;
        targetCtx.lineWidth = anchoPx;
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";
        if (dashed) targetCtx.setLineDash([14, 12]);
        targetCtx.beginPath();
        const p0 = aPixel(pts[0]);
        targetCtx.moveTo(p0.x, p0.y);
        for (let i = 1; i < pts.length; i++) {
            const p = aPixel(pts[i]);
            targetCtx.lineTo(p.x, p.y);
        }
        targetCtx.stroke();
        targetCtx.restore();
    }

    function asegurarCapaEstatica(lab) {
        const s = tamañoLogico();
        const id = (lab && lab.id) || "?";
        if (capaEstatica && labCapaId === id &&
            capaEstatica.width === s.w && capaEstatica.height === s.h) {
            return;
        }
        if (!capaEstatica) {
            capaEstatica = document.createElement("canvas");
            capaCtx = capaEstatica.getContext("2d");
        }
        capaEstatica.width = s.w;
        capaEstatica.height = s.h;
        labCapaId = id;

        if (escenarioImg && escenarioImg.complete && escenarioImg.naturalWidth) {
            capaCtx.drawImage(escenarioImg, 0, 0, s.w, s.h);
        } else {
            const bg = capaCtx.createLinearGradient(0, 0, 0, s.h);
            bg.addColorStop(0, "#6d28d9");
            bg.addColorStop(0.45, "#5b6ff7");
            bg.addColorStop(1, "#4c1d95");
            capaCtx.fillStyle = bg;
            capaCtx.fillRect(0, 0, s.w, s.h);
        }

        const colores = coloresCamino();
        const z = zonaJuego();
        const anchoPx = (anchoCamino() / 100) * ((z.w / 100) * s.w);
        const geo = inicioMeta(lab);
        const red = [geo.pts].concat((lab.distractores || []).map(puntosPath));

        // Mismo estilo en todas las ramas. Primero paredes, luego pasillos (cruces limpios).
        red.forEach(function (pts) {
            dibujarPolilineaEn(capaCtx, pts, colores.borde, anchoPx * 1.42, false);
        });
        red.forEach(function (pts) {
            dibujarPolilineaEn(capaCtx, pts, colores.pared, anchoPx * 1.18, false);
        });
        red.forEach(function (pts) {
            dibujarPolilineaEn(capaCtx, pts, colores.pasillo, anchoPx, false);
        });
    }

    function dibujarEstelaCohete(p, size, t) {
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const f = (i + 1) / 5;
            const yy = p.y + size * (0.35 + f * 0.55) + Math.sin(t * 0.4 + i) * 2;
            const rr = size * (0.12 + (1 - f) * 0.1);
            const g = ctx.createRadialGradient(p.x, yy, 0, p.x, yy, rr);
            g.addColorStop(0, "rgba(255, 220, 120, " + (0.75 * (1 - f * 0.5)) + ")");
            g.addColorStop(0.55, "rgba(255, 120, 40, " + (0.45 * (1 - f)) + ")");
            g.addColorStop(1, "rgba(255, 80, 20, 0)");
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(t * 0.5 + i) * 3, yy, rr, 0, Math.PI * 2);
            ctx.fillStyle = g;
            ctx.fill();
        }
        ctx.restore();
    }

    function dibujarCohete(meta, anim) {
        const metaCfg = (gameConfig && gameConfig.meta) || {};
        const escala = Number(metaCfg.escala != null ? metaCfg.escala : 1.35);
        let size = (metaRadio() / 100) * tamañoLogico().w * escala;
        let p;
        let rot = 0;

        if (coheteVuelo && coheteVuelo.activo) {
            p = { x: coheteVuelo.x, y: coheteVuelo.y };
            size *= coheteVuelo.escala;
            rot = coheteVuelo.rot || 0;
            if (coheteVuelo.fase !== "bajada") {
                dibujarEstelaCohete(p, size, coheteVuelo.t);
            }
        } else {
            p = aPixel(meta);
            const bounce = pelotaVictoria ? Math.sin(anim * 0.25) * 8 : 0;
            p = { x: p.x, y: p.y - bounce };
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (rot) ctx.rotate(rot);
        if (coheteImg && coheteImg.complete && coheteImg.naturalWidth) {
            const ratio = coheteImg.naturalHeight / coheteImg.naturalWidth;
            const w = size;
            const h = size * ratio;
            ctx.drawImage(coheteImg, -w / 2, -h / 2, w, h);
        } else {
            const r = size * 0.35;
            ctx.beginPath();
            ctx.moveTo(0, -r * 1.4);
            ctx.quadraticCurveTo(r * 0.7, -r * 0.2, r * 0.55, r);
            ctx.lineTo(-r * 0.55, r);
            ctx.quadraticCurveTo(-r * 0.7, -r * 0.2, 0, -r * 1.4);
            ctx.fillStyle = "#f8fafc";
            ctx.fill();
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.arc(0, -r * 0.15, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function dibujarNinoFallback(p, size) {
        const r = size / 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + r * 0.55, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#7c3aed";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 0.15, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe0b2";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.fillStyle = "#263238";
        ctx.beginPath();
        ctx.arc(p.x - r * 0.18, p.y - r * 0.25, r * 0.08, 0, Math.PI * 2);
        ctx.arc(p.x + r * 0.18, p.y - r * 0.25, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 0.05, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function dibujarNino() {
        const p = aPixel(personaje);
        const z = zonaJuego();
        // Más pequeña que el ancho del pasillo para que no “se salga” visualmente
        // y el niño no sienta que falla por el tamaño de la carita.
        const size = (anchoCamino() / 100) * ((z.w / 100) * tamañoLogico().w) * 1.0;
        const sprite = (modoVictoria && avatarVictoriaImg && avatarVictoriaImg.complete && avatarVictoriaImg.naturalWidth)
            ? avatarVictoriaImg
            : avatarImg;
        if (sprite && sprite.complete && sprite.naturalWidth) {
            ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        } else {
            dibujarNinoFallback(p, size);
        }
    }

    function redibujar() {
        if (!ctx || !nivelElegido) return;
        const lab = laberintoActual();
        if (!lab && !(coheteVuelo && coheteVuelo.activo)) return;

        if (lab) {
            asegurarCapaEstatica(lab);
            const s = tamañoLogico();
            ctx.clearRect(0, 0, s.w, s.h);
            ctx.drawImage(capaEstatica, 0, 0);

            const geo = inicioMeta(lab);
            if (!(coheteVuelo && coheteVuelo.activo && coheteVuelo.fase === "subida" && coheteVuelo.ocultarNino)) {
                dibujarNino();
            }
            dibujarCohete(geo.meta, pelotaAnim);
        }

        if (coheteVuelo && coheteVuelo.activo) {
            avanzarVueloCohete();
            rafId = requestAnimationFrame(redibujar);
        } else if (pelotaVictoria) {
            pelotaAnim += 1;
            rafId = requestAnimationFrame(redibujar);
        }
    }

    function prepararLaberintoTrasVuelo() {
        const lab = laberintoActual();
        if (!lab) return null;
        pelotaVictoria = false;
        modoVictoria = false;
        pelotaAnim = 0;
        labCapaId = null;
        const geo = inicioMeta(lab);
        personaje = { x: geo.inicio.x, y: geo.inicio.y };
        ultimoValido = { x: geo.inicio.x, y: geo.inicio.y };
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        actualizarProgreso();
        return geo;
    }

    function avanzarVueloCohete() {
        if (!coheteVuelo || !coheteVuelo.activo) return;
        coheteVuelo.t += 1;

        if (coheteVuelo.fase === "prep") {
            coheteVuelo.x = coheteVuelo.origenX + Math.sin(coheteVuelo.t * 0.9) * 2.2;
            coheteVuelo.y = coheteVuelo.origenY + Math.cos(coheteVuelo.t * 1.1) * 1.4;
            if (coheteVuelo.t >= coheteVuelo.prepFrames) {
                coheteVuelo.fase = "subida";
                coheteVuelo.tVuelo = 0;
            }
            return;
        }

        if (coheteVuelo.fase === "subida") {
            coheteVuelo.tVuelo += 1;
            const vuelo = coheteVuelo.tVuelo;
            const accel = 0.12 + Math.min(0.35, vuelo * 0.004);
            coheteVuelo.vy -= accel;
            coheteVuelo.x += coheteVuelo.vx + Math.sin(vuelo * 0.05) * 0.25;
            coheteVuelo.y += coheteVuelo.vy;
            coheteVuelo.escala = Math.max(0.35, 1 - vuelo * 0.003);
            coheteVuelo.rot = Math.sin(vuelo * 0.035) * 0.1;
            coheteVuelo.ocultarNino = vuelo > 18;

            if (coheteVuelo.y < -140 || vuelo > coheteVuelo.maxSubida) {
                if (!coheteVuelo.haySiguiente) {
                    finalizarVueloCohete({ cierre: true });
                    return;
                }
                // Trae el siguiente laberinto: cambia el escenario y baja a la nueva meta.
                indiceLaberinto += 1;
                const geo = prepararLaberintoTrasVuelo();
                if (!geo) {
                    finalizarVueloCohete({ cierre: true });
                    return;
                }
                const destino = aPixel(geo.meta);
                coheteVuelo.fase = "bajada";
                coheteVuelo.tVuelo = 0;
                coheteVuelo.x = destino.x + (Math.random() < 0.5 ? -40 : 40);
                coheteVuelo.y = -120;
                coheteVuelo.destinoX = destino.x;
                coheteVuelo.destinoY = destino.y;
                coheteVuelo.vx = 0;
                coheteVuelo.vy = 3.2;
                coheteVuelo.escala = 0.45;
                coheteVuelo.rot = 0;
                coheteVuelo.ocultarNino = false;
            }
            return;
        }

        if (coheteVuelo.fase === "bajada") {
            coheteVuelo.tVuelo += 1;
            const destX = coheteVuelo.destinoX;
            const destY = coheteVuelo.destinoY;
            const dx = destX - coheteVuelo.x;
            const dy = destY - coheteVuelo.y;
            const distRest = Math.sqrt(dx * dx + dy * dy) || 1;
            // Suaviza al acercarse.
            const paso = Math.min(6.5, Math.max(2.2, distRest * 0.08));
            coheteVuelo.x += (dx / distRest) * paso;
            coheteVuelo.y += (dy / distRest) * paso;
            coheteVuelo.escala = Math.min(1, coheteVuelo.escala + 0.012);
            coheteVuelo.rot = Math.sin(coheteVuelo.tVuelo * 0.05) * 0.06;

            if (distRest < 8 || coheteVuelo.tVuelo > coheteVuelo.maxBajada) {
                coheteVuelo.x = destX;
                coheteVuelo.y = destY;
                coheteVuelo.escala = 1;
                finalizarVueloCohete({ cierre: false });
            }
        }
    }

    function iniciarVueloCohete(meta) {
        const p = aPixel(meta);
        const haySiguiente = (indiceLaberinto + 1) < laberintos.length;
        coheteVuelo = {
            activo: true,
            fase: "prep",
            origenX: p.x,
            origenY: p.y,
            x: p.x,
            y: p.y,
            destinoX: p.x,
            destinoY: p.y,
            vx: (Math.random() < 0.5 ? -1 : 1) * 0.18,
            vy: -0.6,
            escala: 1,
            rot: 0,
            t: 0,
            tVuelo: 0,
            prepFrames: 28,
            maxSubida: 130,
            maxBajada: 160,
            haySiguiente: haySiguiente,
            ocultarNino: false
        };
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        rafId = requestAnimationFrame(redibujar);
    }

    function finalizarVueloCohete(opts) {
        opts = opts || {};
        coheteVuelo = null;
        pelotaVictoria = false;
        modoVictoria = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        if (opts.cierre) {
            indiceLaberinto = laberintos.length;
            esperandoFeedback = false;
            mostrarCierre();
            return;
        }

        // Siguiente laberinto ya preparado: listo para jugar, sin feedback intermedio.
        esperandoFeedback = false;
        redibujar();
    }

    function programarRedibujo() {
        if (redrawPendiente) return;
        redrawPendiente = true;
        requestAnimationFrame(function () {
            redrawPendiente = false;
            redibujar();
        });
    }

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el || !laberintos.length) return;
        el.hidden = false;
        el.textContent = (indiceLaberinto + 1) + "/" + laberintos.length;
    }

    function iniciarLaberintoActual() {
        const lab = laberintoActual();
        if (!lab) {
            mostrarCierre();
            return;
        }
        pelotaVictoria = false;
        modoVictoria = false;
        coheteVuelo = null;
        pelotaAnim = 0;
        labCapaId = null;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        const geo = inicioMeta(lab);
        personaje = { x: geo.inicio.x, y: geo.inicio.y };
        ultimoValido = { x: geo.inicio.x, y: geo.inicio.y };
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        esperandoFeedback = false;
        actualizarProgreso();
        redibujar();
    }

    /* ── Interacción ──────────────────────────────────────────── */

    function cercaDelNino(p) {
        const radio = Math.max(anchoCamino() * 1.2, 8);
        return dist(p, personaje) <= radio;
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
        const imageHeight = opts.imageHeight || 160;

        if (gameConfig && gameConfig.mostrarFeedBack === false) {
            if (texto && typeof TextoVoz !== "undefined") {
                return Promise.race([
                    TextoVoz.hablar(texto, personaje).catch(function () { }),
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
            Promise.all([pVoz.catch(function () { }), sleep(minMs)]),
            sleep(topeMs)
        ]).then(function () {
            try { Swal.close(); } catch (e) { /* noop */ }
        }, function () {
            try { Swal.close(); } catch (e) { /* noop */ }
        });
    }

    function falloCamino(mensaje) {
        if (esperandoFeedback || juegoTerminado) return;
        esperandoFeedback = true;
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");

        const soltarInicio = !!(nivelElegido && nivelElegido.soltarEsFallo);
        if (soltarInicio) {
            const geo = inicioMeta(laberintoActual());
            personaje = { x: geo.inicio.x, y: geo.inicio.y };
            ultimoValido = { x: geo.inicio.x, y: geo.inicio.y };
        } else {
            personaje = { x: ultimoValido.x, y: ultimoValido.y };
        }
        redibujar();

        const fb = (gameConfig.feedback && gameConfig.feedback.error) || {};
        const texto = mensaje || textos().error || fb.texto || "¡Te saliste del laberinto! Vuelve al pasillo.";
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);

        feedbackConVoz(texto, {
            personaje: "zoe",
            gif: fb.gif || "../../images/incorrecto.gif"
        }).then(function () {
            esperandoFeedback = false;
        }).catch(function () {
            esperandoFeedback = false;
        });
    }

    function exitoMeta() {
        if (esperandoFeedback || juegoTerminado) return;
        esperandoFeedback = true;
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        pelotaVictoria = true;
        modoVictoria = true;

        const lab = laberintoActual();
        const geo = inicioMeta(lab);
        // Cara de victoria a la izquierda mientras el cohete despega.
        personaje = {
            x: Math.max(4, geo.meta.x - Math.max(metaRadio() * 1.6, 10)),
            y: geo.meta.y
        };

        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        iniciarVueloCohete(geo.meta);
    }

    function mostrarCierre() {
        juegoTerminado = true;
        const cierre = textos().cierre || "¡Excelente! Completaste los laberintos.";
        document.getElementById("texto_final").textContent = cierre;
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        $("#final").fadeIn(400);
    }

    function onPointerDown(ev) {
        if (esperandoFeedback || juegoTerminado) return;
        const lab = laberintoActual();
        if (!lab) return;
        const p = aNorm(ev.clientX, ev.clientY);
        if (!cercaDelNino(p)) return;
        arrastrando = true;
        pointerId = ev.pointerId;
        canvas.setPointerCapture(ev.pointerId);
        canvas.classList.add("arrastrando");
        ev.preventDefault();
    }

    function onPointerMove(ev) {
        if (!arrastrando || ev.pointerId !== pointerId) return;
        if (esperandoFeedback || juegoTerminado) return;
        const lab = laberintoActual();
        if (!lab) return;

        const p = aNorm(ev.clientX, ev.clientY);
        const geo = inicioMeta(lab);
        const red = redDePasillos(lab);
        // Ligera holgura extra para saltos entre eventos en pantallas táctiles.
        const radio = (anchoCamino() / 2) * 1.15;

        if (!dentroDeRed(p, red, radio)) {
            falloCamino();
            return;
        }

        const proy = proyectarEnRed(p, red);
        personaje = { x: proy.punto.x, y: proy.punto.y };
        ultimoValido = { x: personaje.x, y: personaje.y };
        programarRedibujo();

        if (dist(personaje, geo.meta) <= metaRadio()) {
            exitoMeta();
        }
        ev.preventDefault();
    }

    function onPointerUp(ev) {
        if (ev.pointerId !== pointerId) return;
        const estaba = arrastrando;
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }

        if (!estaba || esperandoFeedback || juegoTerminado) return;

        // Si ya está sobre la meta al soltar, cuenta como éxito (edad 5).
        const lab = laberintoActual();
        if (lab) {
            const geo = inicioMeta(lab);
            if (dist(personaje, geo.meta) <= metaRadio()) {
                exitoMeta();
                return;
            }
        }

        if (nivelElegido && nivelElegido.soltarEsFallo) {
            falloCamino("¡No sueltes! Sigue el camino sin levantar el dedo.");
        }
    }

    function enlazarCanvas() {
        canvas = document.getElementById("lienzo");
        ctx = canvas.getContext("2d");
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        window.addEventListener("resize", function () {
            if (nivelElegido) redibujar();
        });
    }

    /* ── Boot ─────────────────────────────────────────────────── */

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();
        try {
            laberintosFijos = JSON.parse(readText("laberintos-fijos.json"));
        } catch (e) {
            laberintosFijos = null;
        }

        enlazarCanvas();

        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
                const nuevo = resolverGenero();
                if (nuevo !== generoElegido) {
                    generoElegido = nuevo;
                    cargarAvatar();
                    const enunciado = document.getElementById("enunciado");
                    if (enunciado && nivelElegido) enunciado.textContent = enunciadoActual();
                }
            }
        });

        generoElegido = resolverGenero();
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        if (window.speechSynthesis) {
            try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        }

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: [
                textos().acierto,
                textos().error,
                textos().cierre,
                textos().enunciado,
                textos().enunciadoNino,
                textos().enunciadoNina
            ].filter(Boolean)
        });
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        enlazarMenuVol();
        enlazarMenuAcc();

        document.getElementById("btn-empecemos").addEventListener("click", empecemosJuego);

        const btnOmitir = document.getElementById("btnomitir");
        if (btnOmitir) {
            btnOmitir.removeAttribute("onclick");
            btnOmitir.addEventListener("click", function () {
                cerrar_anuncio({ rapido: true });
            });
        }

        preloadGifs(introConfig.personajes).then(function () {
            renderPersonajes(introConfig.personajes);
            introGifsListos = true;
            intentarLanzarIntro();
        });
    });
})();
