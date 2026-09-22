/* Lateralidad espacial — paquete Polimotor (autónomo) */
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
    let retosRuntime = [];
    let indiceReto = 0;
    let juegoTerminado = false;
    let esperandoFeedback = false;
    let aceptaRespuesta = false;
    let retoRuntime = null;
    let retoGen = 0;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let mediaLista = false;
    let imagenesPromise = null;

    const ZONA_LABEL = {
        izquierda: "Izquierda",
        centro: "Centro",
        derecha: "Derecha"
    };

    const ORDEN_ZONA = { izquierda: 0, centro: 1, derecha: 2 };

    /** Orden visual fijo: izquierda → centro → derecha. Nunca barajar lados. */
    function ordenarZonas(lista) {
        return (lista || []).slice().filter(function (z) {
            return Object.prototype.hasOwnProperty.call(ORDEN_ZONA, z);
        }).sort(function (a, b) {
            return ORDEN_ZONA[a] - ORDEN_ZONA[b];
        });
    }

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

    function pick(arr) {
        return arr[randInt(0, arr.length - 1)];
    }

    function objetoMeta(id) {
        return (gameConfig.objetos && gameConfig.objetos[id]) || { nombre: id, img: "" };
    }

    function imgUrl(id) {
        const o = objetoMeta(id);
        return o.img || "";
    }

    function nombreObj(id) {
        return objetoMeta(id).nombre || id;
    }

    /** "del celular" / "de la manzana" para consignas relacionales. */
    function prepDeObj(id) {
        const femeninos = { manzana: true, mariposa: true };
        const n = nombreObj(id);
        return femeninos[id] ? ("de la " + n) : ("del " + n);
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

    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        try {
            let base = audioCache[ruta];
            if (!base) {
                base = new Audio(ruta);
                audioCache[ruta] = base;
            }
            // SFX: clonar para no pelear con currentTime/play concurrente.
            // Fondo: reutilizar el mismo elemento en loop.
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

    function precargarImagenesCriticas() {
        const urls = [];
        const objs = (gameConfig && gameConfig.objetos) || {};
        Object.keys(objs).forEach(function (id) {
            if (objs[id].img) urls.push(objs[id].img);
        });
        return Promise.all(urls.map(preloadUrl));
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
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio))).then(function () {
            mediaLista = true;
        });
    }

    function esperarImagenesOTimeout(ms) {
        const p = imagenesPromise || Promise.resolve();
        return Promise.race([
            p,
            new Promise(function (resolve) { setTimeout(resolve, ms || 350); })
        ]);
    }

    function frasesFijasTts() {
        return [
            { texto: "Mira los lados de la pantalla.", personaje: "zoe" },
            { texto: "Mira con atención.", personaje: "zoe" },
            { texto: "Mira con atención.", personaje: "zeus" },
            { texto: "Mira cómo se mueven.", personaje: "zoe" },
            textos().acierto,
            textos().error,
            textos().cierre
        ].filter(Boolean);
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
            div.className = "personaje-char personaje-char-" + posiciones[index];
            div.style.backgroundImage = "url(" + personajeCfg.gif_idle + ")";
            div.dataset.index = index;
            container.appendChild(div);
        });
    }

    function urlsGifsPersonajes(personajes) {
        const urls = [];
        (personajes || []).forEach(function (p) {
            [p.gif_idle, p.gif_hablando].forEach(function (gif) {
                if (gif && urls.indexOf(gif) === -1) urls.push(gif);
            });
        });
        return urls;
    }

    function preloadGifsEnCSS(personajes) {
        const urls = urlsGifsPersonajes(personajes);
        const content = urls.map(function (gif) {
            return 'url("' + gif + '")';
        }).join(" ");
        let style = document.getElementById("preload-gifs-style");
        if (!style) {
            style = document.createElement("style");
            style.id = "preload-gifs-style";
            document.head.appendChild(style);
        }
        style.textContent =
            "#personajes-container::after {" +
            "position:absolute;width:0;height:0;overflow:hidden;z-index:-1;opacity:0;pointer-events:none;" +
            "content:" + content + ";" +
            "}";
    }

    function preloadGifs(personajes) {
        const urls = urlsGifsPersonajes(personajes);
        preloadGifsEnCSS(personajes);
        return Promise.all(urls.map(function (gif) {
            return new Promise(function (resolve) {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = gif;
            });
        }));
    }

    function gifPersonaje(nombre, hablando) {
        const lista = (introConfig && introConfig.personajes) || [];
        const clave = String(nombre || "").toLowerCase();
        let p = null;
        for (let i = 0; i < lista.length; i++) {
            if (String(lista[i].nombre || "").toLowerCase() === clave) {
                p = lista[i];
                break;
            }
        }
        if (!p) p = clave === "zoe" ? lista[1] : lista[0];
        if (!p) return "";
        return hablando ? p.gif_hablando : p.gif_idle;
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
        retosRuntime = retos.map(function (plantilla) {
            return instanciarReto(plantilla);
        });
        indiceReto = 0;
        window.__lateralidadNivel = nivelElegido.id;

        // Precargar TTS de consignas mientras corre la intro de lados.
        const frases = [];
        retosRuntime.forEach(function (rt) {
            if (rt.consigna) frases.push({ texto: rt.consigna, personaje: "zoe" });
            if (rt.pasos) {
                rt.pasos.forEach(function (p) {
                    if (p.consigna) frases.push({ texto: p.consigna, personaje: "zoe" });
                });
            }
        });
        if (TextoVoz.encolarFrases) TextoVoz.encolarFrases(frases);

        document.getElementById("enunciado").textContent =
            textos().enunciado || "Observa y toca el lado correcto";
        const arrancar = function () {
            if (gen !== retoGen) return;
            mostrarIntroLados(gen).then(function () {
                if (gen !== retoGen) return;
                iniciarRetoActual(gen);
            });
        };
        esperarImagenesOTimeout(350).then(arrancar).catch(arrancar);
    };

    async function mostrarIntroLados(gen) {
        const wrap = document.getElementById("intro-lados");
        const tablero = document.getElementById("tablero");
        const actor = document.getElementById("actor-area");
        const resp = document.getElementById("respuestas");
        tablero.innerHTML = "";
        actor.hidden = true;
        actor.innerHTML = "";
        resp.hidden = true;
        resp.innerHTML = "";

        // Req: siempre izquierda, centro y derecha antes de los retos.
        const orden = ["izquierda", "centro", "derecha"];
        wrap.hidden = false;
        wrap.querySelectorAll(".zona-demo").forEach(function (el) {
            el.hidden = false;
            el.classList.remove("activa");
        });

        TextoVoz.hablar("Mira los lados de la pantalla.", "zoe");
        const ms = (gameConfig.timings && gameConfig.timings.introLadoMs) || 500;
        for (let i = 0; i < orden.length; i++) {
            if (gen !== retoGen) return;
            const el = wrap.querySelector('.zona-demo[data-lado="' + orden[i] + '"]');
            if (el) el.classList.add("activa");
            await sleep(ms);
            if (el) el.classList.remove("activa");
        }
        if (gen !== retoGen) return;
        wrap.hidden = true;
    }

    /* ── UI helpers ───────────────────────────────────────────── */

    function limpiarEscena() {
        aceptaRespuesta = false;
        document.getElementById("tablero").innerHTML = "";
        document.getElementById("tablero").className = "tablero";
        const actor = document.getElementById("actor-area");
        actor.hidden = true;
        actor.innerHTML = "";
        const resp = document.getElementById("respuestas");
        resp.hidden = true;
        resp.innerHTML = "";
    }

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el || !retosRuntime.length) return;
        el.hidden = false;
        el.textContent = (indiceReto + 1) + "/" + retosRuntime.length;
    }

    function setEnunciado(texto) {
        document.getElementById("enunciado").textContent = texto;
    }

    function crearTarjeta(objId, clickable) {
        const btn = document.createElement(clickable ? "button" : "div");
        btn.type = clickable ? "button" : undefined;
        btn.className = "tarjeta-obj" + (clickable ? " seleccionable" : "");
        btn.dataset.objeto = objId;
        btn.appendChild(crearImgEl(imgUrl(objId), nombreObj(objId)));
        return btn;
    }

    function iconoZona(zona) {
        if (zona === "izquierda") {
            return '<i class="fa-solid fa-hand mano-izq" aria-hidden="true"></i>';
        }
        if (zona === "centro") {
            return '<i class="fa-solid fa-hand-point-up mano-centro" aria-hidden="true"></i>';
        }
        // derecha: mano natural de Font Awesome (derecha)
        return '<i class="fa-solid fa-hand mano-der" aria-hidden="true"></i>';
    }

    function renderZonasRespuesta(zonas, onPick) {
        const resp = document.getElementById("respuestas");
        resp.hidden = false;
        resp.innerHTML = "";
        ordenarZonas(zonas).forEach(function (z) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn-mano " + z;
            b.dataset.zona = z;
            b.setAttribute("aria-label", ZONA_LABEL[z] || z);
            b.innerHTML = iconoZona(z) + "<span>" + (ZONA_LABEL[z] || z) + "</span>";
            b.addEventListener("click", function () {
                if (!aceptaRespuesta || esperandoFeedback) return;
                onPick(z);
            });
            resp.appendChild(b);
        });
    }

    function pctParaZona(zona) {
        // Posiciones de pantalla del jugador (independiente de cuántos botones haya).
        if (zona === "izquierda") return 18;
        if (zona === "centro") return 50;
        if (zona === "derecha") return 82;
        return 50;
    }

    function pctFuera(zona) {
        return zona === "izquierda" ? -18 : 118;
    }

    function pasoMovMs() {
        return (gameConfig.timings && gameConfig.timings.pasoMovMs) || 850;
    }

    function pasoSenalMs() {
        return (gameConfig.timings && gameConfig.timings.pasoSenalMs) || 900;
    }

    function renderZonasVacias(zonas) {
        const tablero = document.getElementById("tablero");
        ordenarZonas(zonas).forEach(function (z) {
            const slot = document.createElement("div");
            slot.className = "zona-slot " + z;
            slot.dataset.zona = z;
            const lab = document.createElement("div");
            lab.className = "zona-etiqueta";
            lab.textContent = ZONA_LABEL[z] || z;
            slot.appendChild(lab);
            tablero.appendChild(slot);
        });
    }

    /* ── Instanciar retos ─────────────────────────────────────── */

    function instanciarEstatico(plantilla, zonasNivel) {
        const pool = shuffle(plantilla.pool || []);
        if (plantilla.pasos && plantilla.pasos.length) {
            // Edad 5: 4 objetos en fila + subpasos relacionales
            const items = pool.slice(0, 4);
            const soloPool = (plantilla.pool || []).slice();
            while (items.length < 4 && soloPool.length) {
                const extra = pick(soloPool);
                if (items.indexOf(extra) === -1) items.push(extra);
                else break;
            }
            while (items.length < 4) items.push(pick(["gato", "dino", "celular", "manzana"]));
            const orden = shuffle(items);
            const pasos = plantilla.pasos.map(function (p) {
                const candidatos = (p.anclaPool || orden).filter(function (id) {
                    return orden.indexOf(id) >= 0;
                });
                let ancla = pick(candidatos.length ? candidatos : orden);
                let idx = orden.indexOf(ancla);
                let respuestaId = null;
                if (p.relacion === "derecha_de") {
                    const conDerecha = (candidatos.length ? candidatos : orden).filter(function (id) {
                        return orden.indexOf(id) < orden.length - 1;
                    });
                    ancla = pick(conDerecha.length ? conDerecha : orden.slice(0, -1));
                    idx = orden.indexOf(ancla);
                    respuestaId = orden[idx + 1];
                } else {
                    const conIzq = (candidatos.length ? candidatos : orden).filter(function (id) {
                        return orden.indexOf(id) > 0;
                    });
                    ancla = pick(conIzq.length ? conIzq : orden.slice(1));
                    idx = orden.indexOf(ancla);
                    respuestaId = orden[idx - 1];
                }
                return {
                    consigna: (p.consignaPlantilla || "").replace("{ancla}", prepDeObj(ancla)),
                    respuesta: respuestaId,
                    ancla: ancla
                };
            });
            return {
                tipo: "estatico",
                modoRespuesta: "objeto",
                titulo: plantilla.titulo,
                orden: orden,
                pasos: pasos,
                pasoIdx: 0
            };
        }

        const n = zonasNivel.length >= 3 ? 3 : 2;
        // Lados fijos en pantalla; solo se barajan los objetos.
        const zonas = ordenarZonas(zonasNivel.slice(0, n));
        const objs = shuffle(pool.slice(0, n));
        while (objs.length < n) objs.push(pick(["oso", "perro", "gato"]));
        const colocacion = {};
        objs.forEach(function (id, i) {
            colocacion[zonas[i]] = id;
        });
        const objetivo = pick(plantilla.objetivoPool || objs);
        // ensure objetivo is placed
        let zonaObj = null;
        Object.keys(colocacion).forEach(function (z) {
            if (colocacion[z] === objetivo) zonaObj = z;
        });
        if (!zonaObj) {
            zonaObj = zonas[0];
            colocacion[zonaObj] = objetivo;
        }
        return {
            tipo: "estatico",
            modoRespuesta: "zona",
            titulo: plantilla.titulo,
            colocacion: colocacion,
            zonas: zonas,
            objetivo: objetivo,
            respuesta: zonaObj,
            consigna: (plantilla.consignaPlantilla || "").replace("{objetivo}", nombreObj(objetivo))
        };
    }

    function instanciarDinamico(plantilla, zonasNivel) {
        if (plantilla.actores && plantilla.actores.length >= 2) {
            // Edad 5: dos actores a lados distintos; pregunta relacional.
            const a0 = plantilla.actores[0];
            const a1 = plantilla.actores[1];
            const ancla = (plantilla.pregunta && plantilla.pregunta.ancla) || a0.id;
            const otro = a0.id === ancla ? a1.id : a0.id;
            const finales = {};
            // Para "derecha_de ancla": ancla a la izquierda, el otro a la derecha.
            if (plantilla.pregunta && plantilla.pregunta.relacion === "derecha_de") {
                finales[ancla] = "izquierda";
                finales[otro] = "derecha";
            } else {
                finales[ancla] = "derecha";
                finales[otro] = "izquierda";
            }
            return {
                tipo: "dinamico",
                modoRespuesta: "objeto",
                titulo: plantilla.titulo,
                actores: [a0.id, a1.id],
                finales: finales,
                respuesta: otro,
                consigna: plantilla.consignaPlantilla
            };
        }

        const destino = pick(plantilla.destinoPool || zonasNivel);
        let paso1 = null;
        if ((plantilla.trayectoria || []).indexOf("paso1") !== -1) {
            const pool = (plantilla.pasoPool || zonasNivel).filter(function (z) {
                return z !== destino;
            });
            paso1 = pick(pool.length ? pool : plantilla.pasoPool || zonasNivel);
        }
        const ruta = ["centro"];
        if (paso1) ruta.push(paso1);
        ruta.push(destino);
        return {
            tipo: "dinamico",
            modoRespuesta: "zona",
            titulo: plantilla.titulo,
            actor: plantilla.actor || "mariposa_movimiento",
            ruta: ruta,
            respuesta: destino,
            consigna: plantilla.consignaPlantilla,
            zonasUi: ordenarZonas(zonasNivel.filter(function (z) {
                return z === "izquierda" || z === "centro" || z === "derecha";
            })),
            salirEscena: !!plantilla.salirEscena
        };
    }

    function instanciarImitacion(plantilla, zonasNivel) {
        if (plantilla.modoRespuesta === "botones" && plantilla.fijo && plantilla.movil) {
            const lado = pick(plantilla.ladoPool || ["izquierda", "derecha"]);
            return {
                tipo: "imitacion",
                modoRespuesta: "botones",
                titulo: plantilla.titulo,
                fijo: plantilla.fijo,
                movil: plantilla.movil,
                ladoZeus: lado,
                respuesta: lado,
                consigna: plantilla.consignaPlantilla
            };
        }
        const destino = pick(plantilla.destinoPool || zonasNivel);
        let paso1 = null;
        if ((plantilla.senales || []).indexOf("paso1") !== -1) {
            const pool = (plantilla.pasoPool || zonasNivel).filter(function (z) {
                return z !== destino;
            });
            paso1 = pick(pool.length ? pool : plantilla.pasoPool || ["izquierda"]);
        }
        const senales = [];
        if (paso1) senales.push(paso1);
        senales.push(destino);
        return {
            tipo: "imitacion",
            modoRespuesta: "zona",
            titulo: plantilla.titulo,
            mascota: plantilla.mascota || "zeus",
            senales: senales,
            respuesta: destino,
            consigna: plantilla.consignaPlantilla,
            zonasUi: ordenarZonas(zonasNivel.filter(function (z) {
                return z === "izquierda" || z === "centro" || z === "derecha";
            })),
            caminaAlFinal: !!plantilla.caminaAlFinal
        };
    }

    function instanciarReto(plantilla) {
        const zonas = nivelElegido.zonas.filter(function (z) {
            return z === "izquierda" || z === "centro" || z === "derecha";
        });
        if (plantilla.tipo === "estatico") return instanciarEstatico(plantilla, zonas);
        if (plantilla.tipo === "dinamico") return instanciarDinamico(plantilla, zonas);
        return instanciarImitacion(plantilla, zonas);
    }

    /* ── Ejecutar retos ───────────────────────────────────────── */

    function iniciarRetoActual(gen) {
        if (gen == null) gen = retoGen;
        if (gen !== retoGen) return;
        if (indiceReto >= retosRuntime.length) {
            mostrarCierre();
            return;
        }
        limpiarEscena();
        actualizarProgreso();
        retoRuntime = retosRuntime[indiceReto];
        window.__lateralidadReto = retoRuntime;
        setEnunciado(retoRuntime.titulo || textos().enunciado);

        if (retoRuntime.tipo === "estatico") reproducirEstatico(retoRuntime, gen);
        else if (retoRuntime.tipo === "dinamico") reproducirDinamico(retoRuntime, gen);
        else reproducirImitacion(retoRuntime, gen);
    }

    function reproducirEstatico(rt, gen) {
        if (gen !== retoGen) return;
        const tablero = document.getElementById("tablero");
        if (rt.modoRespuesta === "objeto" && rt.orden) {
            tablero.classList.add("modo-fila");
            rt.orden.forEach(function (id, i) {
                const slot = document.createElement("div");
                slot.className = "zona-slot slot-" + i;
                const tarjeta = crearTarjeta(id, true);
                tarjeta.addEventListener("click", function () {
                    if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
                    resolverRespuesta(id, gen);
                });
                slot.appendChild(tarjeta);
                tablero.appendChild(slot);
            });
            const paso = rt.pasos[rt.pasoIdx];
            setEnunciado(paso.consigna);
            TextoVoz.hablar(paso.consigna, "zoe");
            aceptaRespuesta = true;
            return;
        }

        // Zona: toca solo las manos (amarillo / azul / verde).
        (ordenarZonas(rt.zonas || Object.keys(rt.colocacion))).forEach(function (z) {
            const slot = document.createElement("div");
            slot.className = "zona-slot " + z;
            slot.dataset.zona = z;
            const lab = document.createElement("div");
            lab.className = "zona-etiqueta";
            lab.textContent = ZONA_LABEL[z] || z;
            slot.appendChild(lab);
            slot.appendChild(crearTarjeta(rt.colocacion[z], false));
            tablero.appendChild(slot);
        });
        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        renderZonasRespuesta(rt.zonas, function (z) {
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    async function reproducirDinamico(rt, gen) {
        if (gen !== retoGen) return;
        const tablero = document.getElementById("tablero");
        const actorArea = document.getElementById("actor-area");
        actorArea.hidden = false;
        const movMs = pasoMovMs();

        if (rt.modoRespuesta === "objeto") {
            ["izquierda", "derecha"].forEach(function (z) {
                const slot = document.createElement("div");
                slot.className = "zona-slot " + z;
                slot.dataset.zona = z;
                const lab = document.createElement("div");
                lab.className = "zona-etiqueta";
                lab.textContent = ZONA_LABEL[z];
                slot.appendChild(lab);
                tablero.appendChild(slot);
            });
            const els = {};
            rt.actores.forEach(function (id) {
                const el = document.createElement("div");
                el.className = "actor-movil";
                el.dataset.actor = id;
                el.appendChild(crearImgEl(imgUrl(id), nombreObj(id)));
                el.style.left = "50%";
                el.style.top = id === rt.actores[0] ? "35%" : "55%";
                actorArea.appendChild(el);
                els[id] = el;
            });
            TextoVoz.hablar("Mira cómo se mueven.", "zoe");
            await sleep(400);
            if (gen !== retoGen) return;
            Object.keys(els).forEach(function (id) {
                els[id].classList.add("caminando");
                els[id].style.left = pctParaZona(rt.finales[id]) + "%";
            });
            await sleep(Math.max(movMs, 950));
            Object.keys(els).forEach(function (id) {
                els[id].classList.remove("caminando");
            });
            if (gen !== retoGen) return;
            setEnunciado(rt.consigna);
            TextoVoz.hablar(rt.consigna, "zoe");
            Object.keys(els).forEach(function (id) {
                els[id].classList.add("is-clickable");
                els[id].style.pointerEvents = "auto";
                els[id].style.cursor = "pointer";
                els[id].addEventListener("click", function () {
                    if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
                    resolverRespuesta(id, gen);
                });
            });
            aceptaRespuesta = true;
            return;
        }

        renderZonasVacias(rt.zonasUi || ["izquierda", "derecha"]);

        const el = document.createElement("div");
        el.className = "actor-movil";
        el.appendChild(crearImgEl(imgUrl(rt.actor), nombreObj(rt.actor)));
        el.style.left = "50%";
        actorArea.appendChild(el);

        TextoVoz.hablar("Mira con atención.", "zoe");
        await sleep(350);
        if (gen !== retoGen) return;
        el.classList.add("caminando");
        for (let i = 0; i < rt.ruta.length; i++) {
            if (gen !== retoGen) return;
            const z = rt.ruta[i];
            el.style.left = pctParaZona(z) + "%";
            await sleep(i === 0 ? 320 : Math.max(movMs, 900));
        }
        if (rt.salirEscena) {
            const destino = rt.ruta[rt.ruta.length - 1];
            el.style.left = pctFuera(destino) + "%";
            await sleep(Math.max(movMs, 900));
        }
        el.classList.remove("caminando");
        if (gen !== retoGen) return;
        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        renderZonasRespuesta(rt.zonasUi || ["izquierda", "derecha"], function (z) {
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    async function reproducirImitacion(rt, gen) {
        if (gen !== retoGen) return;
        const tablero = document.getElementById("tablero");
        const actorArea = document.getElementById("actor-area");
        actorArea.hidden = false;
        const senalMs = pasoSenalMs();

        if (rt.modoRespuesta === "botones") {
            const wrap = document.createElement("div");
            wrap.className = "pareja-fijos";
            const conejo = document.createElement("div");
            conejo.className = "tarjeta-obj";
            conejo.appendChild(crearImgEl(imgUrl(rt.fijo), nombreObj(rt.fijo)));

            const zeus = document.createElement("div");
            zeus.className = "figura";
            zeus.style.backgroundImage = "url(" + gifPersonaje("zeus") + ")";

            if (rt.ladoZeus === "izquierda") {
                wrap.appendChild(zeus);
                wrap.appendChild(conejo);
            } else {
                wrap.appendChild(conejo);
                wrap.appendChild(zeus);
            }
            tablero.appendChild(wrap);
            setEnunciado(rt.consigna);
            TextoVoz.hablar(rt.consigna, "zeus");
            renderZonasRespuesta(["izquierda", "derecha"], function (z) {
                resolverRespuesta(z, gen);
            });
            aceptaRespuesta = true;
            return;
        }

        // Imitación con zonas: mascota grande en actor-area, zonas siempre en fila L–C–R.
        actorArea.hidden = false;
        actorArea.innerHTML = "";
        renderZonasVacias(rt.zonasUi || ["izquierda", "derecha"]);
        tablero.classList.add("modo-imitacion");

        const mascota = document.createElement("div");
        mascota.className = "mascota-panel";
        const gif = gifPersonaje(rt.mascota === "zoe" ? "zoe" : "zeus");
        mascota.style.backgroundImage = "url(" + gif + ")";
        mascota.style.left = "50%";
        actorArea.appendChild(mascota);

        const voz = rt.mascota === "zoe" ? "zoe" : "zeus";
        const caminarMs = Math.max(pasoMovMs(), 900);
        TextoVoz.hablar("Mira con atención.", voz);

        for (let i = 0; i < rt.senales.length; i++) {
            if (gen !== retoGen) return;
            const lado = rt.senales[i];
            mascota.classList.remove("señala-izquierda", "señala-derecha", "señala-centro", "caminando");
            // Se acerca al lado para que se entienda la dirección.
            mascota.style.left = pctParaZona(lado) + "%";
            mascota.classList.add("señala-" + lado, "caminando");
            const slot = tablero.querySelector('.zona-slot[data-zona="' + lado + '"]');
            if (slot) slot.classList.add("resaltada");
            await sleep(Math.max(senalMs, caminarMs));
            if (slot) slot.classList.remove("resaltada");
            mascota.classList.remove("caminando");
            if (!rt.caminaAlFinal || i < rt.senales.length - 1) {
                mascota.classList.remove("señala-izquierda", "señala-derecha", "señala-centro");
                if (i < rt.senales.length - 1) {
                    mascota.style.left = "50%";
                    await sleep(280);
                }
            }
        }
        if (gen !== retoGen) return;

        // Queda en el lado final (ya caminó ahí en la última señal).
        if (rt.caminaAlFinal) {
            const destino = rt.senales[rt.senales.length - 1];
            mascota.classList.remove("señala-izquierda", "señala-derecha", "señala-centro");
            mascota.classList.add("caminando");
            mascota.style.left = pctParaZona(destino) + "%";
            const slotDest = tablero.querySelector('.zona-slot[data-zona="' + destino + '"]');
            if (slotDest) slotDest.classList.add("resaltada");
            await sleep(caminarMs);
            mascota.classList.remove("caminando");
            if (slotDest) slotDest.classList.remove("resaltada");
        }

        if (gen !== retoGen) return;
        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, voz);
        renderZonasRespuesta(rt.zonasUi || ["izquierda", "derecha"], function (z) {
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    /* ── Feedback ─────────────────────────────────────────────── */

    function respuestaCorrectaActual() {
        if (!retoRuntime) return null;
        if (retoRuntime.pasos) {
            return retoRuntime.pasos[retoRuntime.pasoIdx].respuesta;
        }
        return retoRuntime.respuesta;
    }

    function resolverRespuesta(valor, gen) {
        if (gen == null) gen = retoGen;
        if (gen !== retoGen) return;
        if (!aceptaRespuesta || esperandoFeedback || juegoTerminado) return;
        const ok = String(valor) === String(respuestaCorrectaActual());
        if (ok) resolverAcierto(gen);
        else resolverError(gen);
    }

    function feedbackDuracionMs() {
        const n = Number(gameConfig && gameConfig.feedback && gameConfig.feedback.duracion);
        return isFinite(n) && n > 0 ? n : 1200;
    }

    function limpiarSwalResidual() {
        try {
            if (typeof Swal !== "undefined") Swal.close();
        } catch (e) { /* noop */ }
        try {
            document.querySelectorAll(".swal2-container").forEach(function (el) {
                el.remove();
            });
            document.documentElement.classList.remove("swal2-shown", "swal2-height-auto");
            document.body.classList.remove("swal2-shown", "swal2-height-auto");
        } catch (e2) { /* noop */ }
    }

    /** Modal + voz: cierra siempre y limpia overlay; tope si el TTS cuelga. */
    function feedbackConVoz(texto, opts) {
        opts = opts || {};
        const personaje = opts.personaje || "zoe";
        const gif = opts.gif || "";
        const minMs = opts.minMs != null ? opts.minMs : feedbackDuracionMs();
        const imageHeight = opts.imageHeight || 140;
        const topeMs = Math.max(minMs + 2500, 6000);

        if (gameConfig && gameConfig.mostrarFeedBack === false) {
            if (texto && typeof TextoVoz !== "undefined") {
                return Promise.race([
                    TextoVoz.hablar(texto, personaje).catch(function () {}),
                    sleep(topeMs)
                ]);
            }
            return Promise.resolve();
        }

        limpiarSwalResidual();
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
        return Promise.race([
            Promise.all([pVoz.catch(function () {}), sleep(minMs)]),
            sleep(topeMs)
        ]).then(function () {
            limpiarSwalResidual();
        }, function () {
            limpiarSwalResidual();
        });
    }

    function consignActual() {
        if (!retoRuntime) return "";
        if (retoRuntime.pasos) {
            return (retoRuntime.pasos[retoRuntime.pasoIdx] || {}).consigna || "";
        }
        return retoRuntime.consigna || "";
    }

    function resolverError(gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        aceptaRespuesta = false;
        const fb = (gameConfig.feedback && gameConfig.feedback.error) || {};
        const texto = textos().error || fb.texto || "Inténtalo otra vez. ¡Tú puedes!";
        reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);
        feedbackConVoz(texto, {
            personaje: "zoe",
            gif: fb.gif || "../../images/incorrecto.gif"
        }).then(function () {
            esperandoFeedback = false;
            if (gen !== retoGen) return;
            aceptaRespuesta = true;
            const c = consignActual();
            if (c) TextoVoz.hablar(c, "zoe");
        }).catch(function () {
            esperandoFeedback = false;
            aceptaRespuesta = true;
        });
    }

    function resolverAcierto(gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        aceptaRespuesta = false;
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);

        // Sin modal/TTS por acierto: solo sonido y breve pausa visual.
        sleep(350).then(function () {
            esperandoFeedback = false;
            if (gen !== retoGen) return;
            if (retoRuntime.pasos && retoRuntime.pasoIdx < retoRuntime.pasos.length - 1) {
                retoRuntime.pasoIdx += 1;
                const paso = retoRuntime.pasos[retoRuntime.pasoIdx];
                setEnunciado(paso.consigna);
                aceptaRespuesta = true;
                TextoVoz.hablar(paso.consigna, "zoe");
                return;
            }
            indiceReto += 1;
            iniciarRetoActual(gen);
        }).catch(function () {
            esperandoFeedback = false;
            aceptaRespuesta = true;
        });
    }

    function mostrarCierre() {
        juegoTerminado = true;
        const cierre = textos().cierre || "Practicaste izquierda y derecha.";
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

        // Precarga: SVG de objetos bloquean poco; GIF/audio en segundo plano.
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
