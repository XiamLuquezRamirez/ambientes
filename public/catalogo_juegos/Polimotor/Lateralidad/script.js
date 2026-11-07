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
    let senderoEscena = null;
    let nivelEscena = null;
    /* Cada nivel se juega varias veces seguidas: ronda que va y cuántas son. */
    let rondaActual = 0;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let mediaLista = false;
    let imagenesPromise = null;

    const ZONA_LABEL = {
        izquierda: "Izquierda",
        centro: "Centro",
        derecha: "Derecha"
    };

    function gifPersonaje(id) {
        if (id === "zoe") return "../../images/zoe_normal.gif";
        return "../../images/zeus_normal.gif";
    }

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

    // Capa de animación GSAP + partículas Phaser 4 (lateralidad-anim.js). Solo visual:
    // si no está disponible se usa el comportamiento original.
    function anim() {
        return (window.LateralidadAnim && window.LateralidadAnim.activo) ? window.LateralidadAnim : null;
    }

    // Audio compartido con Howler (../../shared/pednia-audio.js), tema del ambiente.
    // Si no está, se usa el audio original (new Audio).
    function sonido() {
        return (window.PedniaAudio && window.PedniaAudio.activo) ? window.PedniaAudio : null;
    }

    /** Evento sonoro del tema; false si el tema no lo cubre. */
    function sonarEvento(nombre, opts) {
        return !!(sonido() && sonido().tieneTema() && sonido().evento(nombre, opts));
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
        { key: "mostrarIntro", label: "Mostrar intro (demostración)" },
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
            const lista = imgCache[url];
            if (lista && lista.complete && lista.naturalWidth) {
                resolve(lista);
                return;
            }
            const img = new Image();
            let settled = false;
            const finish = function () {
                if (settled) return;
                settled = true;
                resolve(imgCache[url] || null);
            };
            img.onload = function () {
                imgCache[url] = img;
                const dec = (img.decode ? img.decode() : Promise.resolve());
                Promise.resolve(dec).then(finish, finish);
            };
            img.onerror = function () { finish(); };
            img.src = url;
            /* Si el archivo no responde, no lo damos por cargado. */
            setTimeout(finish, 12000);
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
        if (sonido()) {
            const vol = volumen != null ? volumen : 1;
            if (loop) {
                // Música de fondo: la del tema (si la trae) con fundidos; TextoVoz la sigue manejando.
                const musica = sonido().musica(ruta);
                if (musica) {
                    musica.volume = vol;
                    musica.play();
                    audioFondo = musica;
                    return musica;
                }
            } else if (sonido().archivo(ruta, vol)) {
                return null;
            }
        }
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
        img.draggable = false;
        const cached = imgCache[url];
        const lista = cached && cached.complete && cached.naturalWidth;
        img.decoding = lista ? "sync" : "auto";
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
        urls.push(
            "../../images/zeus_normal.gif",
            "../../images/zoe_normal.gif",
            "../../images/correcto.gif",
            "../../images/incorrecto.gif"
        );
        return Promise.all(urls.map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
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
                texto: TextoVoz.textoPlano(linea.texto)
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
        retosRuntime = retos.map(function (plantilla) {
            return instanciarReto(plantilla);
        });
        indiceReto = 0;
        rondaActual = 0;
        ponerEscena("general");
        /* Partida nueva: el recorrido del sendero empieza vacío. */
        if (window.LateralidadSendero) window.LateralidadSendero.reiniciar();
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
            if (acc().mostrarIntro && window.PedniaTutorial) {
                const prog = document.getElementById("progreso");
                if (prog) prog.hidden = true;
                PedniaTutorial.correr({
                    texto: textos().demostracion,
                    textoFin: textos().demostracionFin,
                    cancelado: function () { return gen !== retoGen; },
                    onTexto: function (t) {
                        const en = document.getElementById("enunciado");
                        if (en && t) en.textContent = t;
                    },
                    jugar: function () { return correrPaseTutorial(gen); }
                }).then(function () {
                    if (gen !== retoGen) return;
                    iniciarRetoActual(gen);
                });
                return;
            }
            iniciarRetoActual(gen);
        };
        esperarImagenesOTimeout(8000).then(arrancar).catch(arrancar);
    };

    function ladoContrarioAlReto(respuesta) {
        if (respuesta === "izquierda") return "derecha";
        if (respuesta === "derecha") return "izquierda";
        return "izquierda";
    }

    function limpiarTableroTutorial() {
        const tablero = document.getElementById("tablero");
        const actor = document.getElementById("actor-area");
        const resp = document.getElementById("respuestas");
        if (tablero) tablero.innerHTML = "";
        if (actor) {
            actor.hidden = true;
            actor.innerHTML = "";
        }
        if (resp) {
            resp.hidden = true;
            resp.innerHTML = "";
        }
    }

    function apagarZonasDemo() {
        document.querySelectorAll("#intro-lados .zona-demo").forEach(function (el) {
            el.classList.remove("activa", "is-demo-target", "pasando");
        });
    }

    async function decirLado(gen, lado) {
        if (gen !== retoGen) return;
        const en = document.getElementById("enunciado");
        if (en) en.textContent = ZONA_LABEL[lado] || lado;
        const t0 = Date.now();
        if (typeof TextoVoz !== "undefined" && TextoVoz.hablar) {
            try { await TextoVoz.hablar(lado, "zoe"); } catch (e) { /* noop */ }
        }
        if (gen !== retoGen) return;
        const minimo = 1400;
        const resta = minimo - (Date.now() - t0);
        if (resta > 40) await sleep(resta);
    }

    function marcarPasando(wrap, activo) {
        wrap.querySelectorAll(".zona-demo").forEach(function (el) {
            el.classList.toggle("pasando", !!(activo && el !== activo));
            if (el !== activo) el.classList.remove("activa", "is-demo-target");
        });
    }

    function reducirMotionLat() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            || document.body.classList.contains("sin-animaciones");
    }

    async function mostrarIntroLadosAnimado(wrap) {
        wrap.classList.remove("is-saliendo", "is-visible", "is-entrando");
        wrap.hidden = false;
        wrap.setAttribute("aria-hidden", "false");
        wrap.querySelectorAll(".zona-demo").forEach(function (el) {
            el.hidden = false;
            el.classList.remove("activa", "is-demo-target", "pasando");
        });
        void wrap.offsetWidth;
        wrap.classList.add("is-visible", "is-entrando");
        await sleep(reducirMotionLat() ? 80 : 560);
        wrap.classList.remove("is-entrando");
    }

    async function ocultarIntroLadosAnimado(wrap) {
        wrap.classList.add("is-saliendo");
        wrap.classList.remove("is-visible", "is-entrando");
        await sleep(reducirMotionLat() ? 40 : 300);
        wrap.classList.remove("is-saliendo");
        wrap.hidden = true;
        wrap.setAttribute("aria-hidden", "true");
        apagarZonasDemo();
    }

    function animarEntradaEjercicio() {
        const esc = document.getElementById("escena-wrap");
        if (!esc) return;
        esc.classList.remove("is-ej-entrando");
        void esc.offsetWidth;
        esc.classList.add("is-ej-entrando");
    }

    async function correrPaseTutorial(gen) {
        const wrap = document.getElementById("intro-lados");
        try {
            limpiarTableroTutorial();
            await mostrarIntroLadosAnimado(wrap);
            if (gen !== retoGen) return;

            const orden = ["izquierda", "centro", "derecha"];
            for (let i = 0; i < orden.length; i++) {
                if (gen !== retoGen) break;
                const el = wrap.querySelector('.zona-demo[data-lado="' + orden[i] + '"]');
                marcarPasando(wrap, el);
                if (el) el.classList.add("activa");
                await decirLado(gen, orden[i]);
                if (gen !== retoGen) break;
                if (el) el.classList.remove("activa");
                await sleep(280);
            }

            if (gen !== retoGen) return;

            const ejemplo = ladoContrarioAlReto((retosRuntime[0] && retosRuntime[0].respuesta) || "");
            const elegido = wrap.querySelector('.zona-demo[data-lado="' + ejemplo + '"]');
            marcarPasando(wrap, elegido);
            if (elegido) elegido.classList.add("activa");
            await decirLado(gen, ejemplo);
            if (gen === retoGen) await sleep(700);
        } finally {
            await ocultarIntroLadosAnimado(wrap);
        }
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
        const total = rondasDelReto();
        /* "2/5" es el nivel; si tiene varias rondas se añade "· 1 de 3". */
        el.textContent = (indiceReto + 1) + "/" + retosRuntime.length
            + (total > 1 ? " · " + (rondaActual + 1) + " de " + total : "");
        if (anim()) anim().progreso(el);
    }

    function ponerEscena(tipo) {
        const capas = document.querySelectorAll("#escena-fondo .escena-capa");
        let hay = false;
        capas.forEach(function (c) { if (c.dataset.escena === tipo) hay = true; });
        const destino = hay ? tipo : "general";
        capas.forEach(function (c) {
            c.classList.toggle("activa", c.dataset.escena === destino);
        });
        document.body.dataset.escena = destino;
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
            b.addEventListener("click", function () {
                if (!aceptaRespuesta || esperandoFeedback) return;
                onPick(z);
            });
            resp.appendChild(b);
        });
        if (anim()) anim().opciones(resp);
        sonarEvento("aparece");
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

    /** Objetos cuyo nombre lleva artículo femenino en las consignas. */
    const FEMENINOS = ["manzana", "mariposa", "tortuga", "pelota"];

    function esFem(id) { return FEMENINOS.indexOf(id) >= 0; }

    /** "el perro" / "la manzana". */
    function conArticulo(id) {
        return (esFem(id) ? "la " : "el ") + nombreObj(id);
    }

    /** Contrae "a el" en "al" y "de el" en "del" tras armar la frase. */
    function limpiarArticulos(texto) {
        return texto
            .replace(/\ba el\b/g, "al")
            .replace(/\bde el\b/g, "del")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    /** "del perro" / "de la manzana". */
    function conDe(id) {
        return (esFem(id) ? "de la " : "del ") + nombreObj(id);
    }

    /** "la Izquierda" / "el Centro". */
    function ladoConArticulo(z) {
        return (z === "centro" ? "el " : "la ") + (ZONA_LABEL[z] || z);
    }

    /**
     * Nivel 1 — El Sendero: una bifurcación por tramo. El lado correcto se
     * sortea y el premio de ese ramal es el que el niño se lleva.
     */
    function instanciarSendero(plantilla, zonasNivel) {
        const zonas = ordenarZonas(
            (plantilla.zonas && plantilla.zonas.length ? plantilla.zonas : zonasNivel)
        );
        const correcta = pick(zonas);
        const pool = shuffle(plantilla.pool || []);
        const objetivo = pool[0] || "oso";
        /* Las otras puertas guardan otra cosa: nunca el objeto que se busca. */
        const otros = [];
        pool.forEach(function (id) {
            if (id !== objetivo && otros.indexOf(id) < 0) otros.push(id);
        });
        Object.keys((gameConfig && gameConfig.objetos) || {}).forEach(function (id) {
            if (id === objetivo || id === "mariposa_movimiento") return;
            if (otros.indexOf(id) < 0) otros.push(id);
        });
        const premios = {};
        let k = 0;
        zonas.forEach(function (z) {
            if (z === correcta) {
                premios[z] = objetivo;
                return;
            }
            premios[z] = otros.length ? otros[k % otros.length] : "perro";
            k += 1;
        });
        const consigna = limpiarArticulos(
            (plantilla.consignaPlantilla || "Toca el camino de {lado}.")
                .replace("{lado}", ladoConArticulo(correcta))
                .replace("{objetivo}", conArticulo(objetivo)));
        return {
            tipo: "sendero",
            titulo: plantilla.titulo,
            personaje: plantilla.personaje || "zeus",
            zonas: zonas,
            premios: premios,
            respuesta: correcta,
            consigna: consigna,
            modoRespuesta: "zona"
        };
    }

    /** Nivel 2 — Atrapa: el objeto cae por un lado y hay que llevar la cesta. */
    function instanciarAtrapa(plantilla, zonasNivel) {
        const zonas = ordenarZonas(
            (plantilla.zonas && plantilla.zonas.length ? plantilla.zonas : zonasNivel)
        );
        const origen = pick(zonas);
        const objeto = pick(plantilla.pool || ["manzana"]);
        const consigna = limpiarArticulos(
            (plantilla.consignaPlantilla || "¡Cae por {lado}! Lleva la cesta.")
                .replace("{lado}", ladoConArticulo(origen))
                .replace("{objetivo}", conArticulo(objeto)));
        return {
            tipo: "atrapa",
            titulo: plantilla.titulo,
            zonas: zonas,
            objeto: objeto,
            origen: origen,
            respuesta: origen,
            consigna: consigna,
            modoRespuesta: "zona"
        };
    }

    /**
     * Nivel 3 — Parejas: una fila de amigos. Se señala a uno y el niño toca
     * al que está a su derecha o a su izquierda dentro de la fila.
     */
    function instanciarParejas(plantilla) {
        const cuantos = Math.max(3, Math.min(4, Number(plantilla.cuantos) || 3));
        const orden = shuffle(plantilla.pool || []).slice(0, cuantos);
        const lado = pick(["izquierda", "derecha"]);

        /* El ancla no puede ser el del extremo hacia el que se pregunta. */
        const posibles = [];
        orden.forEach(function (id, i) {
            const vecino = lado === "izquierda" ? i - 1 : i + 1;
            if (vecino >= 0 && vecino < orden.length) posibles.push(i);
        });
        const iAncla = pick(posibles);
        const iResp = lado === "izquierda" ? iAncla - 1 : iAncla + 1;

        const consigna = limpiarArticulos(
            (plantilla.consignaPlantilla || "¿Quién está a la {lado} {ancla}?")
                .replace("{lado}", ZONA_LABEL[lado] || lado)
                .replace("{ancla}", conDe(orden[iAncla])));

        return {
            tipo: "parejas",
            titulo: plantilla.titulo,
            orden: orden,
            ancla: orden[iAncla],
            lado: lado,
            respuesta: orden[iResp],
            consigna: consigna,
            modoRespuesta: "objeto"
        };
    }

    /** Nivel 4 — Estante: colocar la pieza a un lado del objeto ancla. */
    function instanciarEstante(plantilla) {
        const pool = shuffle(plantilla.pool || []);
        const ancla = pool[0];
        const piezaId = pool[1] || pool[0];
        const lado = pick(["izquierda", "derecha"]);
        const consigna = limpiarArticulos(
            (plantilla.consignaPlantilla || "Pon {objetivo} a la {lado} {ancla}.")
                .replace("{objetivo}", conArticulo(piezaId))
                .replace("{lado}", ZONA_LABEL[lado] || lado)
                .replace("{ancla}", conDe(ancla)));
        return {
            tipo: "estante",
            titulo: plantilla.titulo,
            ancla: ancla,
            pieza: piezaId,
            respuesta: lado,
            consigna: consigna,
            modoRespuesta: "zona"
        };
    }

    function instanciarReto(plantilla) {
        const zonas = nivelElegido.zonas.filter(function (z) {
            return z === "izquierda" || z === "centro" || z === "derecha";
        });
        if (plantilla.tipo === "sendero") return instanciarSendero(plantilla, zonas);
        if (plantilla.tipo === "atrapa") return instanciarAtrapa(plantilla, zonas);
        if (plantilla.tipo === "parejas") return instanciarParejas(plantilla);
        if (plantilla.tipo === "estante") return instanciarEstante(plantilla);
        if (plantilla.tipo === "estatico") return instanciarEstatico(plantilla, zonas);
        if (plantilla.tipo === "dinamico") return instanciarDinamico(plantilla, zonas);
        return instanciarImitacion(plantilla, zonas);
    }

    /* ── Ejecutar retos ───────────────────────────────────────── */

    /** Cuántas veces se repite el nivel que se está jugando. */
    function rondasDelReto() {
        const p = retos[indiceReto];
        const n = p && Number(p.rondas);
        return isFinite(n) && n > 0 ? n : 1;
    }

    function despacharReto(rt, gen) {
        if (rt.tipo === "sendero") reproducirSendero(rt, gen);
        else if (rt.tipo === "atrapa") reproducirAtrapa(rt, gen);
        else if (rt.tipo === "parejas") reproducirParejas(rt, gen);
        else if (rt.tipo === "estante") reproducirEstante(rt, gen);
        else if (rt.tipo === "estatico") reproducirEstatico(rt, gen);
        else if (rt.tipo === "dinamico") reproducirDinamico(rt, gen);
        else reproducirImitacion(rt, gen);

        /* Las piezas del nivel entran escalonadas, no todas de golpe. */
        if (anim() && anim().entrada) {
            requestAnimationFrame(function () {
                if (gen === retoGen) anim().entrada(document.getElementById("tablero"));
            });
        }
    }

    /**
     * Siguiente ejercicio del mismo reto. La vista se queda: solo cambian
     * la consigna y lo que hay que resolver. Si no se puede, se arma de nuevo
     * sin la entrada que parece una recarga.
     */
    function reinstanciarRonda(gen) {
        if (gen !== retoGen) return;
        aceptaRespuesta = false;
        actualizarProgreso();
        retoRuntime = instanciarReto(retos[indiceReto]);
        retosRuntime[indiceReto] = retoRuntime;
        window.__lateralidadReto = retoRuntime;
        if (continuarRonda(retoRuntime, gen)) return;
        limpiarEscena();
        despacharReto(retoRuntime, gen);
    }

    function apiReto() {
        return { imgUrl: imgUrl, nombreObj: nombreObj };
    }

    /** true si la ronda nueva cabe en la escena que ya está en pantalla. */
    function continuarRonda(rt, gen) {
        let hecho = false;
        if (rt.tipo === "sendero" && senderoEscena && window.LateralidadSendero) {
            const S = window.LateralidadSendero;
            S.iniciar({
                total: retosRuntime.length,
                hecho: indiceReto,
                api: apiReto()
            });
            hecho = S.renovar(senderoEscena, {
                zonas: rt.zonas,
                premios: rt.premios
            });
        } else if (rt.tipo === "atrapa" && nivelEscena && window.LateralidadAtrapa) {
            hecho = window.LateralidadAtrapa.renovar(nivelEscena, {
                zonas: rt.zonas,
                objeto: rt.objeto,
                origen: rt.origen,
                api: apiReto()
            });
        } else if (rt.tipo === "parejas" && nivelEscena && window.LateralidadParejas) {
            const P = window.LateralidadParejas;
            if (P.renovar(nivelEscena, { orden: rt.orden, ancla: rt.ancla, api: apiReto() })) {
                P.esperarEleccion(nivelEscena, function (id) {
                    if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
                    P.congelar(nivelEscena);
                    resolverRespuesta(id, gen);
                });
                hecho = Promise.resolve();
            }
        } else if (rt.tipo === "estante" && nivelEscena && window.LateralidadEstante) {
            hecho = window.LateralidadEstante.renovar(nivelEscena, {
                ancla: rt.ancla,
                pieza: rt.pieza,
                api: apiReto()
            });
        }
        if (!hecho) return false;
        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        aceptaRespuesta = false;
        Promise.resolve(hecho).then(function () {
            if (gen !== retoGen) return;
            aceptaRespuesta = true;
        });
        return true;
    }

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
        ponerEscena(retoRuntime.tipo);
        setEnunciado(retoRuntime.titulo || textos().enunciado);

        despacharReto(retoRuntime, gen);

        /* Animar cuando el DOM del reto ya tiene nodos (no esperar animaciones largas del reto). */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (gen === retoGen) animarEntradaEjercicio();
            });
        });
    }

    /**
     * Nivel 1 — El Sendero. El niño toca un ramal, el personaje camina hasta
     * allá y recoge el premio si acertó; si no, vuelve al tronco. El feedback
     * y el avance de reto los sigue manejando resolverRespuesta.
     */
    function reproducirSendero(rt, gen) {
        if (gen !== retoGen) return;
        const S = window.LateralidadSendero;
        const tablero = document.getElementById("tablero");
        if (!S) {
            console.warn("Lateralidad: falta sendero.js");
            return;
        }

        /* El mapa refleja el avance del juego completo, no solo del sendero. */
        S.iniciar({
            total: retosRuntime.length,
            hecho: indiceReto,
            api: { imgUrl: imgUrl, nombreObj: nombreObj }
        });

        const escena = S.bifurcacion(tablero, {
            zonas: rt.zonas,
            premios: rt.premios,
            personaje: rt.personaje || "zeus",
            personajeImg: gifPersonaje(rt.personaje || "zeus")
        });
        senderoEscena = escena;

        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        sonarEvento("aparece");

        S.esperarEleccion(escena, function (z) {
            if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
            S.congelar(escena);
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    /** Nivel 2 — Atrapa en el Aire. */
    async function reproducirAtrapa(rt, gen) {
        if (gen !== retoGen) return;
        const A = window.LateralidadAtrapa;
        if (!A) {
            console.warn("Lateralidad: falta atrapa.js");
            return;
        }
        const escena = A.montar(document.getElementById("tablero"), {
            zonas: rt.zonas,
            objeto: rt.objeto,
            origen: rt.origen,
            api: { imgUrl: imgUrl, nombreObj: nombreObj }
        });
        nivelEscena = escena;

        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        sonarEvento("aparece");
        await A.anunciar(escena);
        if (gen !== retoGen) return;

        A.esperarEleccion(escena, function (z) {
            if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
            A.congelar(escena);
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    /** Nivel 3 — ¿Quién está al lado? */
    function reproducirParejas(rt, gen) {
        if (gen !== retoGen) return;
        const P = window.LateralidadParejas;
        if (!P) {
            console.warn("Lateralidad: falta parejas.js");
            return;
        }
        const escena = P.montar(document.getElementById("tablero"), {
            orden: rt.orden,
            ancla: rt.ancla,
            api: { imgUrl: imgUrl, nombreObj: nombreObj }
        });
        nivelEscena = escena;

        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        sonarEvento("aparece");

        P.esperarEleccion(escena, function (id) {
            if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
            P.congelar(escena);
            resolverRespuesta(id, gen);
        });
        aceptaRespuesta = true;
    }

    /** Nivel 4 — Ordena el Estante. */
    function reproducirEstante(rt, gen) {
        if (gen !== retoGen) return;
        const T = window.LateralidadEstante;
        if (!T) {
            console.warn("Lateralidad: falta estante.js");
            return;
        }
        const escena = T.montar(document.getElementById("tablero"), {
            ancla: rt.ancla,
            pieza: rt.pieza,
            api: { imgUrl: imgUrl, nombreObj: nombreObj }
        });
        nivelEscena = escena;

        setEnunciado(rt.consigna);
        TextoVoz.hablar(rt.consigna, "zoe");
        sonarEvento("aparece");

        T.esperarEleccion(escena, function (z) {
            if (!aceptaRespuesta || esperandoFeedback || gen !== retoGen) return;
            T.congelar(escena);
            resolverRespuesta(z, gen);
        });
        aceptaRespuesta = true;
    }

    /**
     * Anima la respuesta de los niveles 2-4 antes del feedback: la acción
     * (cesta, mano, pieza) ocurre en la escena, no en un botón.
     */
    function animarNivelRespuesta(tipo, zona, ok) {
        const esc = nivelEscena;
        if (!esc) return Promise.resolve();

        if (tipo === "atrapa") {
            const A = window.LateralidadAtrapa;
            /* La cesta se coloca y recién entonces cae algo por ese tubo. */
            return A.moverCesta(esc, zona)
                .then(function () { return A.caer(esc, zona, ok); })
                .then(function () { if (!ok) A.reactivar(esc); });
        }
        if (tipo === "parejas") {
            const P = window.LateralidadParejas;
            if (ok) return P.acertar(esc, zona);
            return P.fallar(esc, zona).then(function () { P.reactivar(esc); });
        }
        if (tipo === "estante") {
            const T = window.LateralidadEstante;
            if (ok) return T.colocar(esc, zona);
            return T.devolver(esc, zona).then(function () { T.reactivar(esc); });
        }
        return Promise.resolve();
    }

    /**
     * Camina hasta el ramal tocado antes de que salga el feedback, para que
     * la respuesta se vea como un recorrido y no como un botón.
     */
    function animarSenderoRespuesta(zona, ok) {
        const S = window.LateralidadSendero;
        if (!S || !senderoEscena) return Promise.resolve();
        const escena = senderoEscena;
        if (!ok) {
            return S.caminarA(escena, zona)
                .then(function () { return S.mostrarOtro(escena, zona); })
                .then(function () { return S.volver(escena, zona); })
                .then(function () { S.reactivar(escena); });
        }
        return S.caminarA(escena, zona)
            .then(function () { return S.recoger(escena, zona); })
            .then(function () { return S.avanzar(escena); });
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
            if (anim()) anim().tarjetas(tablero);
            sonarEvento("aparece");
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
        if (anim()) anim().tarjetas(tablero);
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
                if (anim()) anim().actor(el);
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
        if (anim()) anim().actor(el);

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
            zeus.appendChild(crearImgEl(gifPersonaje("zeus"), "Zeus"));

            if (rt.ladoZeus === "izquierda") {
                wrap.appendChild(zeus);
                wrap.appendChild(conejo);
            } else {
                wrap.appendChild(conejo);
                wrap.appendChild(zeus);
            }
            tablero.appendChild(wrap);
            if (anim()) anim().tarjetas(tablero);
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
        mascota.appendChild(crearImgEl(gif, rt.mascota === "zoe" ? "Zoe" : "Zeus"));
        mascota.style.left = "50%";
        actorArea.appendChild(mascota);
        if (anim()) anim().actor(mascota);

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
        if (anim()) anim().toque(valor);
        sonarEvento("agarrar");

        /* Los niveles nuevos animan la acción en la escena antes del feedback. */
        const tipo = retoRuntime && retoRuntime.tipo;
        if (tipo === "sendero" || tipo === "atrapa" || tipo === "parejas" || tipo === "estante") {
            esperandoFeedback = true;
            const animacion = tipo === "sendero"
                ? animarSenderoRespuesta(valor, ok)
                : animarNivelRespuesta(tipo, valor, ok);
            animacion.then(function () {
                esperandoFeedback = false;
                if (gen !== retoGen) return;
                if (ok) resolverAcierto(gen);
                else resolverError(gen);
            });
            return;
        }

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
        if (!sonarEvento("error")) {
            reproducirAudio(gameConfig.audios && gameConfig.audios.error, 0.8, false);
        }
        if (anim()) anim().error();
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

    /** Último acierto de un nivel, o del juego entero: se festeja más fuerte. */
    function gradoCelebracion() {
        const ultimaRonda = rondaActual >= rondasDelReto() - 1;
        if (!ultimaRonda) return "ronda";
        return indiceReto >= retosRuntime.length - 1 ? "final" : "nivel";
    }

    function celebrarAcierto(valor) {
        const v = String(valor);
        const sel = '.btn-mano[data-zona="' + v + '"], .zona-slot[data-zona="' + v + '"], .tarjeta-obj[data-objeto="' + v + '"]'
            + ', .sendero-ramal[data-zona="' + v + '"], .atrapa-carril[data-zona="' + v + '"]'
            + ', .estante-hueco[data-zona="' + v + '"], .parejas-puesto[data-objeto="' + v + '"]';
        const nodos = document.querySelectorAll(sel);
        nodos.forEach(function (el) { el.classList.add("acerto"); });

        /* Los niveles nuevos tienen su propio festejo, con intensidad creciente. */
        const color = (gameConfig.coloresZona || {})[v];
        if (anim() && anim().festejar) {
            anim().festejar(v, gradoCelebracion(), color);
        }
        if (window.LateralidadPersonaje && window.LateralidadPersonaje.festejar) {
            window.LateralidadPersonaje.festejar();
        }

        const ancla = document.querySelector('.btn-mano[data-zona="' + v + '"]')
            || document.querySelector('.tarjeta-obj[data-objeto="' + v + '"]')
            || (nodos.length ? nodos[0] : null);
        if (!ancla) return;
        // Con la capa de animación: estrellas y anillo de PedniaFx en vez de las estrellitas CSS.
        if (anim() && anim().acierto(ancla, (gameConfig.coloresZona || {})[v])) return;
        const colores = ["#ffd43b", "#ff6b6b", "#4dabf7", "#51cf66", "#ff922b"];
        for (let i = 0; i < 8; i++) {
            const s = document.createElement("span");
            s.className = "estrella-pop";
            s.textContent = i % 2 ? "★" : "✦";
            const ang = (Math.PI * 2 * i) / 8;
            s.style.color = colores[i % colores.length];
            s.style.setProperty("--dx", Math.round(Math.cos(ang) * 78) + "px");
            s.style.setProperty("--dy", Math.round(Math.sin(ang) * 64) + "px");
            ancla.appendChild(s);
            setTimeout(function () {
                if (s.parentNode) s.parentNode.removeChild(s);
            }, 720);
        }
    }

    function resolverAcierto(gen) {
        if (gen !== retoGen) return;
        esperandoFeedback = true;
        aceptaRespuesta = false;
        if (!sonarEvento("correcto")) {
            reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        }
        celebrarAcierto(respuestaCorrectaActual());

        sleep(720).then(function () {
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
            /* Un nivel se juega en varias rondas: se sortea otra situación
               con la misma mecánica hasta completarlas todas. */
            if (rondaActual < rondasDelReto() - 1) {
                rondaActual += 1;
                reinstanciarRonda(gen);
                return;
            }
            rondaActual = 0;
            indiceReto += 1;
            iniciarRetoActual(gen);
        }).catch(function () {
            esperandoFeedback = false;
            aceptaRespuesta = true;
        });
    }

    function mostrarCierre() {
        juegoTerminado = true;
        if (typeof aceptaArrastre !== "undefined") aceptaArrastre = false;
        if (typeof aceptaToque !== "undefined") aceptaToque = false;
        const cierre = (typeof textos === "function" ? textos().cierre : null) || "¡Excelente!";
        const texto = document.getElementById("texto_final");
        if (texto) texto.textContent = cierre;
        if (sonarEvento("victoria")) {
            // Redoble + ovación del tema, con la música más baja. Sin victory.mp3: su
            // fanfarria son tonos puros agudos (se oía como "pitido").
            sonido().agacharMusica(0.35);
        } else {
            reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        }
        TextoVoz.hablar(cierre, "zoe");
        if (anim()) anim().celebrar();
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
        gameConfig = JSON.parse(readText("config.json?v=20261107d"));
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        if (sonido()) sonido().usarTema(gameConfig.audios && gameConfig.audios.tema);
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        enlazarMenuAcc();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });

        // Precarga objetos y GIF antes de mostrar el tablero. El tope evita bloquear si un archivo no responde.
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
