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
    let usadosObjetos = [];
    let phaserListo = null;

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
            "Ubicaste todos los objetos correctamente."
        ].filter(Boolean);
    }

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

    function ensurePhaserMontado() {
        if (window.PedniaArrastrePhaser && PedniaArrastrePhaser.listo()) {
            return Promise.resolve();
        }
        if (phaserListo) return phaserListo;
        phaserListo = PedniaArrastrePhaser.montar({
            parent: "phaser-juego",
            gameConfig: gameConfig,
            callbacks: {
                puedeInteractuar: function () {
                    return aceptaArrastre && !esperandoFeedback && !juegoTerminado;
                },
                onDrop: onPhaserDrop
            }
        }).catch(function (err) {
            phaserListo = null;
            console.error("[ArrastrarYSoltar] Phaser:", err);
            throw err;
        });
        return phaserListo;
    }

    function onPhaserDrop(objetoId, destinoId, correcto) {
        if (!aceptaArrastre || esperandoFeedback || juegoTerminado) {
            return Promise.resolve({ ok: false });
        }
        if (!correcto) {
            aceptaArrastre = false;
            PedniaArrastrePhaser.setInteractivo(false);
            return feedbackError().then(function () {
                return { ok: false };
            });
        }
        if (colocados[objetoId]) {
            return Promise.resolve({ ok: false });
        }

        colocados[objetoId] = destinoId;
        aceptaArrastre = false;
        PedniaArrastrePhaser.setInteractivo(false);

        return feedbackAcierto().then(function () {
            const quedan = objetosPendientes.some(function (id) { return !colocados[id]; });
            if (quedan) {
                aceptaArrastre = !juegoTerminado;
                PedniaArrastrePhaser.setInteractivo(aceptaArrastre);
                return { ok: true };
            }

            // Dejar que Phaser asiente el sprite antes de limpiar el tablero.
            setTimeout(function () {
                if (juegoTerminado) return;
                if (indiceRonda + 1 < totalRondas) {
                    indiceRonda += 1;
                    sleep(480).then(function () { iniciarRonda(rondaGen); });
                } else {
                    mostrarCierre();
                }
            }, 40);
            return { ok: true };
        });
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        juegoTerminado = false;
        esperandoFeedback = false;
        aceptaArrastre = false;
        TextoVoz.detener();
        indiceRonda = 0;
        usadosObjetos = [];
        totalRondas = Math.max(1, Number(nivelElegido.rondas) || 1);
        document.getElementById("enunciado").textContent = textos().enunciado || "Arrastra cada objeto hasta su lugar";
        Promise.resolve(imagenesPromise)
            .then(function () { return ensurePhaserMontado(); })
            .then(function () {
                if (acc().mostrarIntro && window.PedniaTutorial) {
                    const prog = document.getElementById("progreso");
                    if (prog) prog.hidden = true;
                    aceptaArrastre = false;
                    PedniaArrastrePhaser.setInteractivo(false);
                    return PedniaArrastrePhaser.cargarRonda(["manzana"], ["caja_manzana"]).then(function () {
                        return PedniaTutorial.correr({
                            texto: textos().demostracion,
                            textoFin: textos().demostracionFin,
                            cancelado: function () { return juegoTerminado; },
                            onTexto: function (t) {
                                const en = document.getElementById("enunciado");
                                if (en && t) en.textContent = t;
                            },
                            jugar: function () {
                                return demoArrastrePhaser("manzana", "caja_manzana");
                            }
                        });
                    }).then(function () {
                        iniciarRonda(rondaGen);
                    });
                }
                iniciarRonda(rondaGen);
            })
            .catch(function (err) {
                console.error(err);
                Swal.fire({
                    icon: "error",
                    title: "No se pudo iniciar el tablero",
                    text: "Recarga e inténtalo de nuevo.",
                    confirmButtonText: "Ok"
                });
            });
    };

    function demoArrastrePhaser(objetoId, destinoId) {
        if (!window.PedniaArrastrePhaser) return Promise.resolve();
        // Tween Phaser (sin GSAP). La mano tutorial DOM no mueve el canvas;
        // el movimiento visible es demoLlevar.
        return PedniaArrastrePhaser.demoLlevar(objetoId, destinoId);
    }

    function actualizarProgreso() {
        const el = document.getElementById("progreso");
        if (!el) return;
        el.hidden = false;
        el.textContent = (indiceRonda + 1) + "/" + totalRondas;
    }

    function iniciarRonda(gen) {
        if (gen !== rondaGen || juegoTerminado) return;
        if (window.PedniaArrastrePhaser) PedniaArrastrePhaser.cancelarDrag();
        colocados = Object.create(null);
        const ronda = armarRondaAleatoria(nivelElegido);
        objetosPendientes = ronda.objetos;
        const destinosRonda = ronda.destinos;
        actualizarProgreso();
        const frase = textos().enunciado || "Arrastra cada objeto hasta su lugar";
        aceptaArrastre = false;
        if (window.PedniaArrastrePhaser) PedniaArrastrePhaser.setInteractivo(false);

        ensurePhaserMontado()
            .then(function () {
                return PedniaArrastrePhaser.cargarRonda(objetosPendientes, destinosRonda);
            })
            .then(function () {
                if (gen !== rondaGen || juegoTerminado) return;
                const en = document.getElementById("enunciado");
                if (en) en.textContent = frase;
                aceptaArrastre = true;
                PedniaArrastrePhaser.setInteractivo(true);
                TextoVoz.hablar(frase, "zoe");
            });
    }

    function armarRondaAleatoria(nivel) {
        const porCaja = Object.create(null);
        Object.keys(gameConfig.pares || {}).forEach(function (id) {
            const caja = gameConfig.pares[id];
            if (!porCaja[caja]) porCaja[caja] = [];
            porCaja[caja].push(id);
        });
        const cajas = Object.keys(porCaja);
        const nObj = Math.min(cajas.length, Math.max(1, Number(nivel.objetosPorRonda) || 3));
        const nLug = Math.min(cajas.length, Math.max(nObj, Number(nivel.lugares) || nObj));
        const conLibre = [];
        const sinLibre = [];
        shuffle(cajas).forEach(function (caja) {
            const libre = porCaja[caja].some(function (id) { return usadosObjetos.indexOf(id) === -1; });
            (libre ? conLibre : sinLibre).push(caja);
        });
        const elegidas = conLibre.concat(sinLibre).slice(0, nObj);
        const objetos = elegidas.map(function (caja) {
            const libres = porCaja[caja].filter(function (id) { return usadosObjetos.indexOf(id) === -1; });
            const pool = libres.length ? libres : porCaja[caja];
            const id = pool[randInt(0, pool.length - 1)];
            usadosObjetos.push(id);
            return id;
        });
        const destinos = elegidas.slice();
        const resto = shuffle(cajas.filter(function (caja) { return destinos.indexOf(caja) === -1; }));
        while (destinos.length < nLug && resto.length) destinos.push(resto.shift());
        return { objetos: shuffle(objetos), destinos: shuffle(destinos) };
    }

    async function feedbackAcierto() {
        esperandoFeedback = true;
        aceptaArrastre = false;
        if (window.PedniaArrastrePhaser) PedniaArrastrePhaser.setInteractivo(false);
        reproducirAudio(gameConfig.audios && gameConfig.audios.acierto, 0.85, false);
        try {
            await sleep(350);
        } finally {
            esperandoFeedback = false;
            // onPhaserDrop decide si se reactiva el arrastre (quedan objetos o no).
        }
    }

    async function feedbackError() {
        esperandoFeedback = true;
        aceptaArrastre = false;
        if (window.PedniaArrastrePhaser) PedniaArrastrePhaser.setInteractivo(false);
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
            if (window.PedniaArrastrePhaser) PedniaArrastrePhaser.setInteractivo(aceptaArrastre);
        }
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
