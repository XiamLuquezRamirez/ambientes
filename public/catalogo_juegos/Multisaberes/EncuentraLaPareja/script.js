/* Encuentra la pareja — Multisaberes */
(function () {
    "use strict";

    var L = window.EncuentraParejaLogica;
    var Sfx = window.ParejaSfx;

    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var audioCache = Object.create(null);

    var nivel = null;
    var ronda = null;
    var estado = { ultimaHuella: null };
    var indice = 0;
    var completados = 0;
    var parejasHechas = 0;
    var fase = "";
    var rondaGen = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var cerrado = false;
    var demoActiva = false;
    var introTimers = [];
    var primera = null;
    var bloqueado = false;
    var PAUSA_ERROR_MS = 900;

    function $id(id) { return document.getElementById(id); }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function readText(ruta) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }

    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function reducir() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            || document.body.classList.contains("sin-animaciones");
    }

    function volumenPct() {
        var n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }

    function aplicarVolumen(pct) {
        var n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        var vol = n / 100;
        if (window.TextoVoz && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(vol);
        } else if (audioFondo) {
            audioFondo.volume = vol;
        }
        var icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0
                ? "fa-solid fa-volume-xmark"
                : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function duck(bajo) {
        if (!window.TextoVoz) return;
        var base = volumenPct() / 100;
        TextoVoz.volumenFondo(bajo ? Math.min(0.04, base) : base);
    }

    function aplicarLetterSpacing() {
        var n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    }

    function esCastillo(n) {
        return String((n && n.edad) || "").indexOf("5") === 0 || (n && n.tema) === "castillo";
    }

    function aplicarTema(n) {
        var castillo = esCastillo(n);
        document.body.classList.toggle("tema-castillo", castillo);
        document.body.classList.toggle("tema-jardin", !castillo);
        ["pantalla-inicio", "escenario"].forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.classList.toggle("tema-castillo", castillo);
            el.classList.toggle("tema-jardin", !castillo);
        });
        var escenario = $id("escenario");
        if (n && escenario) {
            escenario.classList.toggle("edad-3", String(n.id) === "3");
            escenario.classList.toggle("edad-5", String(n.id) === "5");
        }
        var icono = document.querySelector("#btn-empecemos i");
        if (icono) icono.className = castillo ? "fa-solid fa-key" : "fa-solid fa-leaf";
    }

    function temaInicial() {
        var edad = window.PedniaEdad ? PedniaEdad.edadSesion() : null;
        return { edad: edad != null && edad >= 5 ? "5-6 años" : "3-4 años", id: edad != null && edad >= 5 ? "5" : "3", tema: edad != null && edad >= 5 ? "castillo" : "jardin" };
    }

    function asegurarFondo() {
        var ruta = gameConfig.audios && gameConfig.audios.fondo;
        if (!ruta) return;
        if (!audioFondo) {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
        }
        audioFondo.volume = volumenPct() / 100;
        var p = audioFondo.play();
        if (p && p.catch) p.catch(function () {});
    }

    function playArchivo(ruta) {
        return new Promise(function (resolve) {
            if (!ruta) { resolve(); return; }
            var audio = audioCache[ruta] || new Audio(ruta);
            audioCache[ruta] = audio;
            var fin = function () { resolve(); };
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
            audio.onended = fin;
            audio.onerror = fin;
            var p = audio.play();
            if (p && p.catch) p.catch(fin);
            setTimeout(fin, 12000);
        });
    }

    function efecto(nombre) {
        if (!nombre || !Sfx || acc().efectosSonido === false) return;
        Sfx.sonar(nombre);
    }

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
    }

    function gif(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        if (hablando) return "../../images/" + quien + "_hablando.gif";
        return "../../img/" + quien + "_normal.gif";
    }

    function marcarHablando(voz, hablando) {
        var id = voz === "zeus" ? "pj-zeus-img" : "pj-zoe-img";
        var inicioId = voz === "zeus" ? "inicio-zeus" : "inicio-zoe";
        var img = $id(id);
        var inicio = $id(inicioId);
        if (img) img.src = gif(voz, hablando);
        if (inicio) inicio.src = gif(voz, hablando);
        var avatar = $id("dialogo-avatar");
        if (avatar && $id("dialogo").classList.contains("visible")) avatar.src = gif(voz, hablando);
    }

    function pintarDialogo(voz, texto, estadoDialogo) {
        var dialogo = $id("dialogo");
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto", "es-error");
        if (estadoDialogo) dialogo.classList.add("es-" + estadoDialogo);
        dialogo.classList.add("visible");
        $id("dialogo-avatar").src = gif(voz, true);
        $id("enunciado").textContent = texto;
    }

    function limpiarDialogo() {
        var dialogo = $id("dialogo");
        if (!dialogo) return;
        dialogo.classList.remove("visible", "es-acierto", "es-error");
        $id("enunciado").textContent = "";
    }

    function decir(linea, estadoDialogo) {
        if (!linea) return Promise.resolve();
        var voz = "zoe";
        if (linea.voz) voz = linea.voz === "zeus" ? "zeus" : "zoe";
        else if (linea.personaje === 0) voz = "zeus";
        var texto = String(linea.texto || "").trim();
        if (!texto) return Promise.resolve();
        if (!document.body.classList.contains("sin-feedback")
            && !document.body.classList.contains("esperando-inicio")) {
            pintarDialogo(voz, texto, estadoDialogo);
        }
        marcarHablando(voz, true);
        duck(true);
        var promesa = window.TextoVoz
            ? Promise.resolve(TextoVoz.hablar(texto, voz))
            : sleep(900);
        return Promise.resolve(promesa).then(function () {
            marcarHablando(voz, false);
            duck(false);
            limpiarDialogo();
        });
    }

    function celebrarPersonajes(on) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            var el = $id(id);
            if (el) el.classList.toggle("celebra", !!on);
        });
    }

    function pintarProgreso() {
        var flores = $id("progreso");
        var luces = $id("luces");
        var total = (nivel && nivel.retos ? nivel.retos.length : 0) || 0;
        var mostrar = acc().mostrarProgreso !== false;
        if (!mostrar) {
            if (flores) flores.hidden = true;
            if (luces) luces.hidden = true;
            return;
        }
        var castillo = esCastillo(nivel);
        var box = castillo ? luces : flores;
        var otra = castillo ? flores : luces;
        if (otra) otra.hidden = true;
        if (!box) return;
        box.hidden = false;
        box.innerHTML = "";
        var i;
        var cls = castillo ? "luz" : "flor";
        var done = castillo ? "encendida" : "abierta";
        for (i = 0; i < total; i++) {
            var e = document.createElement("span");
            e.className = cls + (i < completados ? " " + done : "");
            box.appendChild(e);
        }
    }

    function abrirTodoProgreso() {
        var total = (nivel && nivel.retos ? nivel.retos.length : 0) || 0;
        completados = total;
        pintarProgreso();
    }

    function pulsarProgresoActual() {
        var castillo = esCastillo(nivel);
        var box = castillo ? $id("luces") : $id("progreso");
        if (!box) return;
        var items = box.querySelectorAll(castillo ? ".luz" : ".flor");
        var idx = Math.min(completados, items.length - 1);
        if (idx < 0 || !items[idx]) return;
        items[idx].classList.remove("pulso");
        void items[idx].offsetWidth;
        items[idx].classList.add("pulso");
    }

    function aplicarEfectoPareja(ac, completa) {
        var fx = (ac && ac.efecto) || "";
        var escenario = $id("escenario");
        if (!escenario) return;
        if (fx === "flor" || fx === "luz") {
            escenario.classList.add("pareja-" + fx);
            setTimeout(function () { escenario.classList.remove("pareja-flor", "pareja-luz"); }, 700);
        }
        if (!completa) return;
        if (fx === "jardin") {
            document.querySelectorAll("#progreso .flor").forEach(function (f) {
                f.classList.add("abierta", "celebrar");
            });
            escenario.classList.add("jardin-celebra");
            setTimeout(function () { escenario.classList.remove("jardin-celebra"); }, 1200);
        }
        if (fx === "castillo") {
            document.querySelectorAll("#luces .luz").forEach(function (l) {
                l.classList.add("encendida", "celebrar");
            });
            escenario.classList.add("castillo-abre");
            setTimeout(function () { escenario.classList.remove("castillo-abre"); }, 1400);
        }
    }

    function rutaReverso() {
        var key = (nivel && nivel.reverso) || "hoja";
        return (gameConfig.reversos && gameConfig.reversos[key]) || "img/reverso_hoja.svg";
    }

    function defVocal(id) {
        return (gameConfig.vocales && gameConfig.vocales[id]) || null;
    }

    function limpiarTablero() {
        var tab = $id("tablero");
        if (tab) tab.innerHTML = "";
        primera = null;
        bloqueado = false;
        parejasHechas = 0;
    }

    function pintarTablero(r) {
        var tab = $id("tablero");
        if (!tab || !r) return;
        tab.innerHTML = "";
        tab.className = "tablero cols-" + (r.columnas || 2);
        var reverso = rutaReverso();
        r.cartas.forEach(function (c) {
            var v = defVocal(c.vocal);
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "carta";
            btn.dataset.id = c.id;
            btn.dataset.vocal = c.vocal;
            btn.setAttribute("aria-label", "vocal " + c.vocal);
            btn.innerHTML =
                '<span class="carta-inner">' +
                '<span class="carta-cara carta-atras"><img src="' + reverso + '" alt="" draggable="false"></span>' +
                '<span class="carta-cara carta-frente" style="--vc:' + ((v && v.color) || "#94a3b8") + '">' +
                '<img src="' + ((v && v.img) || "") + '" alt="' + c.vocal + '" draggable="false">' +
                "</span></span>";
            tab.appendChild(btn);
        });
    }

    function voltear(el, on) {
        if (!el) return;
        el.classList.toggle("volteada", !!on);
    }

    function chispas(el, n, mariposas) {
        var capa = $id("capa-efectos");
        if (!capa || !el || reducir()) return;
        var rect = el.getBoundingClientRect();
        var i;
        for (i = 0; i < (n || 8); i++) {
            var s = document.createElement("span");
            s.className = mariposas ? "mariposa" : "chispa";
            s.style.left = (rect.left + rect.width / 2) + "px";
            s.style.top = (rect.top + rect.height / 2) + "px";
            s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
            s.style.setProperty("--dy", (-40 - Math.random() * 80) + "px");
            capa.appendChild(s);
            setTimeout(function (node) {
                return function () { if (node.parentNode) node.parentNode.removeChild(node); };
            }(s), 950);
        }
    }

    async function presentar(gen) {
        if (!vivo(gen) || !nivel) return;
        var retos = nivel.retos || [];
        if (indice >= retos.length) {
            await victoria(gen);
            return;
        }
        fase = "presentar";
        primera = null;
        bloqueado = true;
        parejasHechas = 0;
        ronda = L.preparar(retos[indice], gameConfig, estado, Math.random);
        if (!ronda) {
            indice += 1;
            await presentar(gen);
            return;
        }
        estado.ultimaHuella = ronda.huella;
        pintarProgreso();
        pintarTablero(ronda);
        await sleep(reducir() ? 120 : 280);
        if (!vivo(gen)) return;
        fase = "jugar";
        bloqueado = false;
    }

    async function alTocarCarta(btn) {
        if (demoActiva || fase !== "jugar" || bloqueado || !btn || !ronda) return;
        if (btn.classList.contains("pareja") || btn.classList.contains("volteada")) return;

        voltear(btn, true);
        efecto("volteo");

        if (!primera) {
            primera = btn;
            return;
        }

        if (primera === btn) return;

        bloqueado = true;
        var a = { id: primera.dataset.id, vocal: primera.dataset.vocal };
        var b = { id: btn.dataset.id, vocal: btn.dataset.vocal };
        var gen = rondaGen;

        if (L.esPareja(a, b)) {
            primera.classList.add("pareja");
            btn.classList.add("pareja");
            primera.disabled = true;
            btn.disabled = true;
            var ac = ronda.acierto || {};
            efecto(ac.sonido || "pareja");
            chispas(btn, 10, !!ac.mariposas);
            chispas(primera, 8, !!ac.mariposas);
            celebrarPersonajes(true);
            setTimeout(function () { celebrarPersonajes(false); }, 600);
            parejasHechas += 1;
            primera = null;
            aplicarEfectoPareja(ac, false);
            pulsarProgresoActual();
            var completa = parejasHechas >= ronda.totalParejas;
            // Frases de acierto no deben congelar el tablero entre parejas.
            if (ac.texto) {
                var pSay = decir(ac, "acierto");
                if (completa) await pSay;
            }
            if (!vivo(gen)) return;
            if (completa) {
                completados += 1;
                if (indice >= (nivel.retos || []).length - 1) abrirTodoProgreso();
                else pintarProgreso();
                aplicarEfectoPareja(ac, true);
                if (ac.efecto === "jardin" || ac.efecto === "castillo") efecto("celebracion");
                await sleep(reducir() ? 200 : 480);
                if (!vivo(gen)) return;
                indice += 1;
                await presentar(gen);
                return;
            }
            bloqueado = false;
            return;
        }

        await sleep(reducir() ? 400 : PAUSA_ERROR_MS);
        if (!vivo(gen)) return;
        voltear(primera, false);
        voltear(btn, false);
        efecto("error");
        primera = null;
        bloqueado = false;
        var err = ronda.error;
        // Zeus habla sin bloquear el siguiente intento.
        if (err && err.texto) decir(err, "error");
    }

    function prepararInsignia() {
        var ins = (nivel && nivel.insignia) || {};
        var trofeo = document.querySelector("#victoria img.trofeo");
        if (!trofeo || !ins.img) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre || "";
        trofeo.classList.add("insignia");
    }

    function granCierre(gen) {
        if (!vivo(gen) && juegoTerminado) return;
        fase = "victoria";
        juegoTerminado = true;
        limpiarTablero();
        abrirTodoProgreso();
        celebrarPersonajes(true);
        var cierre = (nivel && nivel.cierre) || { voz: "zoe", texto: "¡Muy bien!" };
        var texto = $id("texto_final");
        if (texto) texto.textContent = cierre.texto || "";
        prepararInsignia();
        if (gameConfig.audios && gameConfig.audios.cierre) playArchivo(gameConfig.audios.cierre);
        if (window.TextoVoz) TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe");
        setTimeout(function () {
            var caja = $id("final");
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
            else if (typeof iniciarVictoria === "function") iniciarVictoria();
        }, 500);
    }

    async function victoria(gen) {
        if (!vivo(gen) && juegoTerminado) return;
        granCierre(gen);
    }

    function conversacionInicial() {
        var n = null;
        if (window.PedniaEdad && !PedniaEdad.esPreviewCatalogo()) {
            var edad = PedniaEdad.edadSesion();
            if (edad != null) n = PedniaEdad.resolverNivel(gameConfig.niveles || [], edad);
        }
        return (n && n.bienvenida) || [];
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        var conversacion = conversacionInicial();
        var personajesCfg = window.INTRO_CONFIG.personajes || [];
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            var idx = Number(linea.personaje);
            var def = personajesCfg[isFinite(idx) ? idx : 0] || personajesCfg[0] || {};
            var id = def.id || (idx === 1 ? "zoe" : "zeus");
            return {
                personaje: id,
                nombre: id === "zoe" ? "Zoe" : "Zeus",
                color: (window.INTRO_CONFIG.dialogo.colores && window.INTRO_CONFIG.dialogo.colores[id]) || "#fff",
                texto: String(linea.texto || "").trim()
            };
        });
    }

    function mostrarIntro3d() {
        var root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        var root = $id("intro3d-root");
        if (!root) return;
        root.classList.add("is-closing");
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) {
                try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                window.__introPhaser = null;
            }
            if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
            root.remove();
        }, 450);
    }

    function omitirIntro3d() {
        if (cerrado) return;
        var root = $id("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        cancelarIntroPendiente();
        if (window.TextoVoz) TextoVoz.detener();
        asegurarFondo();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        var principal = $id("principal");
        if (principal) {
            principal.style.display = "flex";
            if (window.jQuery) jQuery(principal).hide().fadeIn(800);
        }
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: (gameConfig && gameConfig.niveles) || [],
                elegirManual: elegirNivel,
                onElegido: function (n) {
                    if (n) window.confirmarNivel(n.id);
                }
            });
        } else {
            window.confirmarNivel(gameConfig.niveles[0].id);
        }
    }

    function empecemosJuego() {
        var pantalla = $id("pantalla-inicio");
        var btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (window.TextoVoz) TextoVoz.desbloquear();
        if (Sfx) Sfx.desbloquear();
        asegurarFondo();
        sincronizarDialogoIntro3d();
        if (window.TextoVoz && typeof TextoVoz.precargar === "function") TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            pantalla.style.display = "none";
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "sale" || ev.animationName === "inicioDisuelve") ocultar();
        });
        setTimeout(ocultar, 1250);
    }

    window.cerrar_anuncio = function cerrar_anuncio() {
        empezarJuegoTrasIntro();
    };

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        var d = gameConfig.demo || {};
        if (!d.parejas || !window.PedniaTutorial) {
            await bienvenidaYJuego(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        aplicarTema(nivel);
        pintarProgreso();
        await PedniaTutorial.activarDemo();
        var t = textos();
        var retoDemo = { id: "demo", parejas: d.parejas.slice(), acierto: { sonido: "pareja" } };
        ronda = L.preparar(retoDemo, gameConfig, {}, Math.random);
        pintarTablero(ronda);
        await decir({ voz: "zoe", texto: t.demostracion || "¡Toca una tarjeta y busca su pareja!" });
        if (!vivo(gen) || !demoActiva) return;
        var cancelado = function () { return !demoActiva || !vivo(gen); };
        var cartas = Array.prototype.slice.call(document.querySelectorAll(".carta"));
        var primeraDemo = cartas[0];
        var segundaDemo = cartas.find(function (c) {
            return c !== primeraDemo && c.dataset.vocal === primeraDemo.dataset.vocal;
        }) || cartas[1];
        if (primeraDemo && window.PedniaTutorial) {
            await PedniaTutorial.animarMano({
                punto: primeraDemo,
                holdMs: 450,
                cancelado: cancelado,
                onPresionar: function () {
                    voltear(primeraDemo, true);
                    efecto("volteo");
                }
            });
        }
        if (!vivo(gen) || !demoActiva) return;
        if (segundaDemo && window.PedniaTutorial) {
            await PedniaTutorial.animarMano({
                punto: segundaDemo,
                holdMs: 450,
                cancelado: cancelado,
                onPresionar: function () {
                    voltear(segundaDemo, true);
                    primeraDemo.classList.add("pareja");
                    segundaDemo.classList.add("pareja");
                    efecto("pareja");
                    chispas(segundaDemo, 10, false);
                }
            });
        }
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto || "¡Así se encuentra la pareja!" }, "acierto");
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin || "¡Ahora te toca a ti!" });
        detenerDemo();
        if (!vivo(gen)) return;
        limpiarTablero();
        await bienvenidaYJuego(gen);
    }

    async function bienvenidaYJuego(gen) {
        aplicarTema(nivel);
        pintarProgreso();
        var lineas = nivel.bienvenida || [];
        var i;
        for (i = 0; i < lineas.length; i++) {
            if (!vivo(gen)) return;
            await decir(lineas[i]);
        }
        if (!vivo(gen)) return;
        presentar(gen);
    }

    function elegirNivel() {
        var botones = "";
        gameConfig.niveles.forEach(function (n, i) {
            var color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + n.id + '\')"><strong>' + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
        });
        if (window.TextoVoz) TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        if (!window.Swal) {
            window.confirmarNivel(gameConfig.niveles[0].id);
            return;
        }
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            heightAuto: false,
            scrollbarPadding: false,
            width: 460
        });
    }

    window.confirmarNivel = function confirmarNivel(id) {
        if (arrancado) return;
        nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
        if (!nivel) return;
        arrancado = true;
        if (window.Swal) Swal.close();
        if (window.TextoVoz) TextoVoz.detener();
        rondaGen += 1;
        juegoTerminado = false;
        indice = 0;
        completados = 0;
        estado = { ultimaHuella: null };
        limpiarTablero();
        if (window.TextoVoz && typeof TextoVoz.encolarFrases === "function") {
            var frases = [];
            (nivel.bienvenida || []).forEach(function (l) { if (l.texto) frases.push(l.texto); });
            (nivel.retos || []).forEach(function (r) {
                if (r.acierto && r.acierto.texto) frases.push(r.acierto.texto);
                if (r.error && r.error.texto) frases.push(r.error.texto);
            });
            if (nivel.cierre && nivel.cierre.texto) frases.push(nivel.cierre.texto);
            TextoVoz.encolarFrases(frases);
        }
        aplicarTema(nivel);
        document.body.classList.toggle("sin-feedback", acc().mostrarFeedBack === false);
        if (mostrarIntroActiva()) iniciarDemo(rondaGen);
        else bienvenidaYJuego(rondaGen);
    };

    function enlazarVolumen() {
        var btn = $id("btn-menu-vol");
        var cerrar = $id("btn-cerrar-vol");
        var slider = $id("rango-volumen");
        var panel = $id("menu-vol-panel");
        function setAbierto(abierto) {
            if (!panel || !btn) return;
            panel.hidden = !abierto;
            btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        }
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                setAbierto(panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setAbierto(false); });
        if (slider) {
            slider.value = String(volumenPct());
            var val = $id("vol-val");
            if (val) val.textContent = slider.value;
            slider.addEventListener("input", function () {
                if (val) val.textContent = slider.value;
                aplicarVolumen(slider.value);
            });
        }
        document.addEventListener("pointerdown", function (ev) {
            var menu = $id("menu-vol");
            if (!menu || menu.contains(ev.target)) return;
            setAbierto(false);
        });
        aplicarVolumen(volumenPct());
    }

    document.addEventListener("DOMContentLoaded", function () {
        var crudo = readText("config.json?v=20261020b");
        gameConfig = JSON.parse(crudo);
        try { introConfig = JSON.parse(readText("../../intro.json")); } catch (e) { introConfig = {}; }
        var errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EncuentraLaPareja]", errores);
        aplicarLetterSpacing();
        aplicarTema(temaInicial());
        document.body.classList.toggle("sin-feedback", acc().mostrarFeedBack === false);
        if (window.TextoVoz) {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenPct() / 100,
                frasesExtra: [textos().eligeNivel, textos().demostracion, textos().demostracionAcierto, textos().demostracionFin].filter(Boolean)
            });
        }
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarVolumen();
        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        var btnOmitir = $id("btn-omitir-intro3d");
        if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
        var btnContinuar = $id("btn-continuar-intro3d");
        if (btnContinuar) {
            btnContinuar.addEventListener("click", function (ev) {
                ev.preventDefault();
                empezarJuegoTrasIntro();
            });
        }
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        $id("tablero").addEventListener("click", function (ev) {
            if (demoActiva) return;
            var btn = ev.target.closest(".carta");
            if (btn) alTocarCarta(btn);
        });
        window.addEventListener("pagehide", function () {
            if (window.TextoVoz) TextoVoz.vaciar();
        });
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
