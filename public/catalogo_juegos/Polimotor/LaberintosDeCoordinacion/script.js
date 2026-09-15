/* Laberintos de coordinación — paquete Polimotor */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
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
    let pelotaAnim = 0;
    let pelotaVictoria = false;
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

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
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
            div.className = "personaje-char " + posiciones[index];
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
            if (p && p.catch) p.catch(function () {});
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

    function cargarAvatar() {
        return new Promise(function (resolve) {
            const src = (gameConfig && gameConfig.avatar) || "../Reconocimiento/img/nino/7/cabeza.png";
            if (avatarImg && avatarImg.src && avatarImg.complete && avatarImg.naturalWidth) {
                resolve(avatarImg);
                return;
            }
            avatarImg = new Image();
            avatarImg.onload = function () {
                if (nivelElegido) redibujar();
                resolve(avatarImg);
            };
            avatarImg.onerror = function () { resolve(null); };
            avatarImg.src = src;
        });
    }

    function precargarImagenesCriticas() {
        const avatar = (gameConfig && gameConfig.avatar) || "../Reconocimiento/img/nino/7/cabeza.png";
        return Promise.all([cargarAvatar(), preloadUrl(avatar)]);
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
        laberintos = generarLaberintosNivel(nivelElegido);
        window.__laberintosActuales = laberintos;
        indiceLaberinto = 0;
        juegoTerminado = false;
        document.getElementById("enunciado").textContent =
            textos().enunciado || "Lleva al niño hasta la pelota";
        const arrancar = function () {
            iniciarLaberintoActual();
        };
        esperarImagenesOTimeout(400).then(arrancar).catch(arrancar);
    };

    /* ── Generación aleatoria (dificultad por edad) ───────────── */

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randChoice(arr) {
        return arr[randInt(0, arr.length - 1)];
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function snap(v) {
        return Math.round(v);
    }

    function contarGirosPath(path) {
        if (!path || path.length < 3) return 0;
        let giros = 0;
        for (let i = 1; i < path.length - 1; i++) {
            const ax = path[i][0] - path[i - 1][0];
            const ay = path[i][1] - path[i - 1][1];
            const bx = path[i + 1][0] - path[i][0];
            const by = path[i + 1][1] - path[i][1];
            if (Math.abs(ax * by - ay * bx) > 0.01) giros++;
        }
        return giros;
    }

    function colapsarColineales(path) {
        if (!path || path.length < 3) return path ? path.slice() : [];
        const out = [path[0]];
        for (let i = 1; i < path.length - 1; i++) {
            const a = out[out.length - 1];
            const b = path[i];
            const c = path[i + 1];
            const ax = b[0] - a[0];
            const ay = b[1] - a[1];
            const bx = c[0] - b[0];
            const by = c[1] - b[1];
            if (Math.abs(ax * by - ay * bx) > 0.01) out.push(b);
        }
        out.push(path[path.length - 1]);
        return out;
    }

    function segmentoCruza(a1, a2, b1, b2) {
        // Solo segmentos ortogonales; cruza si se intersectan en un tramo (no solo extremo compartido).
        const aH = a1[1] === a2[1];
        const bH = b1[1] === b2[1];
        if (aH === bH) {
            if (aH) {
                if (a1[1] !== b1[1]) return false;
                const a0 = Math.min(a1[0], a2[0]);
                const a1x = Math.max(a1[0], a2[0]);
                const b0 = Math.min(b1[0], b2[0]);
                const b1x = Math.max(b1[0], b2[0]);
                return Math.min(a1x, b1x) - Math.max(a0, b0) > 1;
            }
            if (a1[0] !== b1[0]) return false;
            const a0 = Math.min(a1[1], a2[1]);
            const a1y = Math.max(a1[1], a2[1]);
            const b0 = Math.min(b1[1], b2[1]);
            const b1y = Math.max(b1[1], b2[1]);
            return Math.min(a1y, b1y) - Math.max(a0, b0) > 1;
        }
        const h = aH ? [a1, a2] : [b1, b2];
        const v = aH ? [b1, b2] : [a1, a2];
        const y = h[0][1];
        const x = v[0][0];
        const h0 = Math.min(h[0][0], h[1][0]);
        const h1 = Math.max(h[0][0], h[1][0]);
        const v0 = Math.min(v[0][1], v[1][1]);
        const v1 = Math.max(v[0][1], v[1][1]);
        if (x <= h0 + 0.5 || x >= h1 - 0.5) return false;
        if (y <= v0 + 0.5 || y >= v1 - 0.5) return false;
        return true;
    }

    function pathSeCruza(path) {
        for (let i = 0; i < path.length - 1; i++) {
            for (let j = i + 2; j < path.length - 1; j++) {
                if (i === 0 && j === path.length - 2) continue;
                if (segmentoCruza(path[i], path[i + 1], path[j], path[j + 1])) return true;
            }
        }
        return false;
    }

    function generarCaminoOrtogonal(gen) {
        const margen = Number(gen.margen != null ? gen.margen : 10);
        const segMin = Number(gen.segMin != null ? gen.segMin : 14);
        const segMax = Number(gen.segMax != null ? gen.segMax : 36);
        const girosObjetivo = randInt(Number(gen.girosMin || 2), Number(gen.girosMax || 4));

        const start = [margen, snap(randInt(margen + 5, 100 - margen - 5))];
        const end = [100 - margen, snap(randInt(margen + 5, 100 - margen - 5))];
        // Evitar inicio y meta demasiado alineados en Y (laberinto trivial).
        if (Math.abs(start[1] - end[1]) < segMin) {
            end[1] = snap(clamp(start[1] + (Math.random() < 0.5 ? segMin : -segMin) * randInt(1, 2), margen + 5, 100 - margen - 5));
        }

        const path = [start.slice()];
        let x = start[0];
        let y = start[1];
        // Alternar H/V; priorizar avance en X hacia la meta.
        let horizontal = true;
        let turnsLeft = girosObjetivo;

        while (turnsLeft > 0) {
            if (horizontal) {
                const room = end[0] - x;
                const maxStep = Math.max(segMin, Math.min(segMax, room - turnsLeft * (segMin * 0.35)));
                let nx;
                if (room > segMin * 1.2 && Math.random() < 0.75) {
                    nx = snap(x + randInt(segMin, Math.max(segMin, Math.floor(maxStep))));
                } else {
                    // ocasional retroceso leve para variedad (solo si hay espacio)
                    const back = Math.min(segMin, x - margen - 4);
                    nx = back > 8 && Math.random() < 0.25
                        ? snap(x - randInt(8, back))
                        : snap(x + randInt(segMin, Math.max(segMin, Math.min(segMax, room))));
                }
                nx = snap(clamp(nx, margen, end[0] - 4));
                if (Math.abs(nx - x) < 6) nx = snap(clamp(x + segMin, margen, 100 - margen));
                x = nx;
                path.push([x, y]);
            } else {
                const toward = end[1] >= y ? 1 : -1;
                const alt = Math.random() < 0.35 ? -toward : toward;
                let ny = snap(y + alt * randInt(segMin, segMax));
                ny = snap(clamp(ny, margen, 100 - margen));
                if (Math.abs(ny - y) < 6) {
                    ny = snap(clamp(y + toward * segMin, margen, 100 - margen));
                }
                y = ny;
                path.push([x, y]);
            }
            horizontal = !horizontal;
            turnsLeft -= 1;
        }

        // Cierre a la meta con 1–2 segmentos ortogonales.
        if (x !== end[0] && y !== end[1]) {
            if (Math.random() < 0.5) {
                path.push([end[0], y]);
                path.push(end.slice());
            } else {
                path.push([x, end[1]]);
                path.push(end.slice());
            }
        } else if (x !== end[0] || y !== end[1]) {
            path.push(end.slice());
        }

        return colapsarColineales(path);
    }

    function puntoEnCaminoVertices(path, p) {
        return path.some(function (q) {
            return Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01;
        });
    }

    function generarDistractores(path, gen) {
        const minD = Number(gen.distractoresMin || 0);
        const maxD = Number(gen.distractoresMax || 0);
        if (maxD <= 0) return [];
        const cantidad = randInt(minD, maxD);
        if (cantidad <= 0 || path.length < 4) return [];

        const margen = Number(gen.margen != null ? gen.margen : 10);
        const segMin = Math.max(10, Math.floor(Number(gen.segMin || 14) * 0.7));
        const candidatos = [];
        for (let i = 1; i < path.length - 1; i++) candidatos.push(i);
        // Mezclar
        for (let i = candidatos.length - 1; i > 0; i--) {
            const j = randInt(0, i);
            const tmp = candidatos[i];
            candidatos[i] = candidatos[j];
            candidatos[j] = tmp;
        }

        const out = [];
        for (let c = 0; c < candidatos.length && out.length < cantidad; c++) {
            const idx = candidatos[c];
            const ancla = path[idx];
            const prev = path[idx - 1];
            const next = path[idx + 1];
            const alongH = Math.abs(next[0] - prev[0]) >= Math.abs(next[1] - prev[1]);
            // Rama perpendicular al tramo local
            const dirs = alongH
                ? [[0, 1], [0, -1]]
                : [[1, 0], [-1, 0]];
            const dir = randChoice(dirs);
            const len1 = randInt(segMin, segMin + 14);
            const p1 = [
                snap(clamp(ancla[0] + dir[0] * len1, margen, 100 - margen)),
                snap(clamp(ancla[1] + dir[1] * len1, margen, 100 - margen))
            ];
            if (Math.abs(p1[0] - ancla[0]) + Math.abs(p1[1] - ancla[1]) < 8) continue;
            // Segundo tramo en ángulo (callejón sin salida)
            const dir2 = dir[0] === 0 ? randChoice([[1, 0], [-1, 0]]) : randChoice([[0, 1], [0, -1]]);
            const len2 = randInt(segMin, segMin + 12);
            const p2 = [
                snap(clamp(p1[0] + dir2[0] * len2, margen, 100 - margen)),
                snap(clamp(p1[1] + dir2[1] * len2, margen, 100 - margen))
            ];
            const rama = colapsarColineales([ancla.slice(), p1, p2]);
            if (rama.length < 2) continue;
            // No terminar encima de un vértice del camino principal
            const punta = rama[rama.length - 1];
            if (puntoEnCaminoVertices(path, punta)) continue;
            out.push(rama);
        }
        return out;
    }

    function caminoValido(path, gen) {
        if (!path || path.length < 3) return false;
        const margen = Number(gen.margen != null ? gen.margen : 8);
        for (let i = 0; i < path.length; i++) {
            const p = path[i];
            if (p[0] < 0 || p[0] > 100 || p[1] < 0 || p[1] > 100) return false;
        }
        if (path[0][0] > margen + 6) return false;
        if (path[path.length - 1][0] < 100 - margen - 6) return false;
        if (Math.abs(path[0][0] - path[path.length - 1][0]) < 30) return false;
        const giros = contarGirosPath(path);
        if (giros < Number(gen.girosMin || 1)) return false;
        if (giros > Number(gen.girosMax || 12) + 2) return false; // cierre puede sumar 1–2
        if (pathSeCruza(path)) return false;
        // Segmentos mínimos
        for (let i = 0; i < path.length - 1; i++) {
            const dx = Math.abs(path[i + 1][0] - path[i][0]);
            const dy = Math.abs(path[i + 1][1] - path[i][1]);
            if (dx + dy < 8) return false;
            if (dx > 0.01 && dy > 0.01) return false; // no diagonal
        }
        return true;
    }

    function generarUnLaberinto(nivel, indice) {
        const gen = Object.assign({
            girosMin: 2,
            girosMax: 4,
            distractoresMin: 0,
            distractoresMax: 0,
            margen: 10,
            segMin: 14,
            segMax: 36
        }, nivel.generacion || {});

        let path = null;
        for (let intento = 0; intento < 40; intento++) {
            const candidato = generarCaminoOrtogonal(gen);
            if (caminoValido(candidato, gen)) {
                path = candidato;
                break;
            }
        }
        if (!path) {
            // Respaldo seguro (siempre jugable)
            path = [[12, 50], [40, 50], [40, 28], [70, 28], [70, 65], [88, 65]];
        }

        let distractores = [];
        for (let intento = 0; intento < 20; intento++) {
            distractores = generarDistractores(path, gen);
            if (distractores.length >= Number(gen.distractoresMin || 0) &&
                distractores.length <= Number(gen.distractoresMax || 0)) {
                break;
            }
            if (Number(gen.distractoresMax || 0) === 0) {
                distractores = [];
                break;
            }
        }
        if (distractores.length > Number(gen.distractoresMax || 0)) {
            distractores = distractores.slice(0, Number(gen.distractoresMax || 0));
        }

        return {
            id: "n" + nivel.id + "-" + (indice + 1) + "-" + Date.now().toString(36).slice(-4),
            path: path,
            distractores: distractores
        };
    }

    function generarLaberintosNivel(nivel) {
        const cantidad = Number(
            nivel.cantidad != null
                ? nivel.cantidad
                : (nivel.laberintos && nivel.laberintos.length) || 3
        );
        const lista = [];
        for (let i = 0; i < cantidad; i++) {
            lista.push(generarUnLaberinto(nivel, i));
        }
        return lista;
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
        return Number(gameConfig.metaRadio != null ? gameConfig.metaRadio : 6);
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
        return {
            x: (punto.x / 100) * s.w,
            y: (punto.y / 100) * s.h
        };
    }

    function aNorm(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100
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

        const bg = capaCtx.createLinearGradient(0, 0, 0, s.h);
        bg.addColorStop(0, "#2d6a4f");
        bg.addColorStop(1, "#1b4332");
        capaCtx.fillStyle = bg;
        capaCtx.fillRect(0, 0, s.w, s.h);

        capaCtx.fillStyle = "rgba(255,255,255,0.04)";
        for (let i = 0; i < 12; i++) {
            capaCtx.beginPath();
            capaCtx.arc((i * 97) % s.w, (i * 53) % s.h, 40 + (i % 5) * 8, 0, Math.PI * 2);
            capaCtx.fill();
        }

        const anchoPx = (anchoCamino() / 100) * s.w;
        const geo = inicioMeta(lab);
        (lab.distractores || []).forEach(function (d) {
            dibujarPolilineaEn(capaCtx, puntosPath(d), "#95d5b2", anchoPx, false);
        });
        dibujarPolilineaEn(capaCtx, geo.pts, "#d8f3dc", anchoPx, false);
        dibujarPolilineaEn(capaCtx, geo.pts, "#52b788", Math.max(4, anchoPx * 0.18), true);
    }

    function dibujarPelota(meta, anim) {
        const p = aPixel(meta);
        const r = (metaRadio() / 100) * tamañoLogico().w * 0.55;
        const bounce = pelotaVictoria ? Math.sin(anim * 0.25) * 10 : 0;

        ctx.save();
        ctx.translate(p.x, p.y - bounce);
        ctx.beginPath();
        ctx.ellipse(0, r * 0.85, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fill();
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g.addColorStop(0, "#ffe082");
        g.addColorStop(0.55, "#ff9800");
        g.addColorStop(1, "#e65100");
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
        ctx.restore();
    }

    function dibujarNinoFallback(p, size) {
        const r = size / 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + r * 0.55, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#42a5f5";
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
        ctx.strokeStyle = "#e65100";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function dibujarNino() {
        const p = aPixel(personaje);
        const size = (anchoCamino() / 100) * tamañoLogico().w * 1.35;
        if (avatarImg && avatarImg.complete && avatarImg.naturalWidth) {
            ctx.drawImage(avatarImg, p.x - size / 2, p.y - size / 2, size, size);
        } else {
            dibujarNinoFallback(p, size);
        }
    }

    function redibujar() {
        if (!ctx || !nivelElegido) return;
        const lab = laberintoActual();
        if (!lab) return;

        asegurarCapaEstatica(lab);
        const s = tamañoLogico();
        ctx.clearRect(0, 0, s.w, s.h);
        ctx.drawImage(capaEstatica, 0, 0);

        const geo = inicioMeta(lab);
        dibujarPelota(geo.meta, pelotaAnim);
        dibujarNino();

        if (pelotaVictoria) {
            pelotaAnim += 1;
            rafId = requestAnimationFrame(redibujar);
        }
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
        const texto = mensaje || fb.texto || "¡Inténtalo otra vez! Sigue el camino con cuidado.";
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);
        TextoVoz.hablar(texto, "zoe");

        if (gameConfig.mostrarFeedBack === false) {
            esperandoFeedback = false;
            return;
        }

        Swal.fire({
            title: texto,
            imageUrl: fb.gif || "../../images/incorrecto.gif",
            imageHeight: 160,
            timer: (gameConfig.feedback && gameConfig.feedback.duracion) || 1100,
            showConfirmButton: false,
            heightAuto: false,
            scrollbarPadding: false
        }).then(function () {
            esperandoFeedback = false;
            TextoVoz.detener();
        });
    }

    function exitoMeta() {
        if (esperandoFeedback || juegoTerminado) return;
        esperandoFeedback = true;
        arrastrando = false;
        pointerId = null;
        canvas.classList.remove("arrastrando");
        pelotaVictoria = true;
        redibujar();

        const fb = (gameConfig.feedback && gameConfig.feedback.acierto) || {};
        const texto = fb.texto || "¡Muy bien! Llegaste hasta la pelota.";
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        TextoVoz.hablar(texto, "zoe");

        const dur = (gameConfig.feedback && gameConfig.feedback.duracion) || 1100;
        Swal.fire({
            title: texto,
            imageUrl: fb.gif || "../../images/correcto.gif",
            imageHeight: 160,
            timer: dur,
            showConfirmButton: false,
            heightAuto: false,
            scrollbarPadding: false
        }).then(function () {
            TextoVoz.detener();
            pelotaVictoria = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            indiceLaberinto += 1;
            esperandoFeedback = false;
            if (indiceLaberinto >= laberintos.length) {
                mostrarCierre();
            } else {
                iniciarLaberintoActual();
            }
        });
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
        // Ligera holgura extra para saltos entre eventos en pantallas táctiles.
        const radio = (anchoCamino() / 2) * 1.15;

        if (!dentroDelCamino(p, geo.pts, radio)) {
            falloCamino();
            return;
        }

        const proy = proyectarEnPath(p, geo.pts);
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
        introConfig = JSON.parse(readText("intro.json"));
        gameConfig = JSON.parse(readText("config.json"));

        enlazarCanvas();
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

        if (window.speechSynthesis) {
            try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        }

        const fb = (gameConfig && gameConfig.feedback) || {};
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            frasesExtra: [
                fb.acierto && fb.acierto.texto,
                fb.error && fb.error.texto,
                textos().cierre,
                textos().enunciado
            ].filter(Boolean)
        });
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

        document.getElementById("btn-empecemos").addEventListener("click", empecemosJuego);

        const btnOmitir = document.getElementById("btnomitir");
        if (btnOmitir) {
            btnOmitir.removeAttribute("onclick");
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
