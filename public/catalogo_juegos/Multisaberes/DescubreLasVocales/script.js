/* Descubre las vocales — Multisaberes */
(function () {
    "use strict";

    var L = window.DescubreVocalesLogica;
    function Sfx() { return window.VocalesSfx || null; }

    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var audioCache = Object.create(null);

    var nivel = null;
    var reto = null;
    var objetivo = null;
    var estado = { ultimoSlot: null, ultimoCorrecto: null, ultimoMapa: null, ronda: 0 };
    var indice = 0;
    var completados = 0;
    var fase = "";
    var rondaGen = 0;
    var tokenSonido = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var cerrado = false;
    var demoActiva = false;
    var pistaTimer = null;
    var introTimers = [];

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

    function esObservatorio(n) {
        return String((n && n.edad) || "").indexOf("5") === 0;
    }

    function aplicarTema(n) {
        var observatorio = esObservatorio(n);
        document.body.classList.toggle("tema-observatorio", observatorio);
        document.body.classList.toggle("tema-isla", !observatorio);
        ["pantalla-inicio", "escenario"].forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.classList.toggle("tema-observatorio", observatorio);
            el.classList.toggle("tema-isla", !observatorio);
        });
        var escenario = $id("escenario");
        if (n && escenario) {
            escenario.classList.toggle("edad-3", String(n.id) === "3");
            escenario.classList.toggle("edad-5", String(n.id) === "5");
        }
        var icono = document.querySelector("#btn-empecemos i");
        if (icono) icono.className = observatorio ? "fa-solid fa-ear-listen" : "fa-solid fa-play";
    }

    function temaInicial() {
        var edad = window.PedniaEdad ? PedniaEdad.edadSesion() : null;
        return { edad: edad != null && edad >= 5 ? "5-6 años" : "3-4 años", id: edad != null && edad >= 5 ? "5" : "3" };
    }

    /* ── Audio ── */

    function asegurarFondo() {
        var ruta = gameConfig.audios && gameConfig.audios.fondo;
        if (!ruta) return;
        if (!audioFondo) {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
            audioFondo.preload = "auto";
        }
        audioFondo.volume = volumenPct() / 100;
        if (window.TextoVoz && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(audioFondo.volume);
        }
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

    function pronunciar(id) {
        var token = ++tokenSonido;
        var btn = $id("btn-escuchar");
        var inicio = $id("btn-empecemos");
        if (btn) btn.classList.add("sonando");
        if (inicio && document.body.classList.contains("esperando-inicio")) inicio.classList.add("sonando");
        duck(true);
        var ruta = gameConfig.audios && gameConfig.audios.sonidos && gameConfig.audios.sonidos[id];
        var sfx = Sfx();
        var sonido;
        if (ruta) {
            sonido = playArchivo(ruta);
        } else if (sfx) {
            // WebAudio (+ WAV HTML si el contexto sigue suspended tras la intro).
            sonido = sfx.vocal(id);
        } else if (window.TextoVoz) {
            // Una letra suelta suele salir muda; alargar fonética.
            var fon = ({ a: "aaa", e: "eee", i: "iii", o: "ooo", u: "uuu" })[id] || id;
            sonido = TextoVoz.hablar(fon, "zoe");
        } else {
            sonido = sleep(700);
        }
        var hop = (reto && reto.pista && (fase === "sonando" || fase === "jugar"))
            ? animarPista(id) : Promise.resolve();
        return Promise.all([sonido, hop]).then(function () {
            if (token !== tokenSonido) return;
            if (btn) btn.classList.remove("sonando");
            if (inicio) inicio.classList.remove("sonando");
            duck(false);
        });
    }

    function animarPista(id) {
        var el = document.querySelector('.vocal[data-vocal="' + id + '"] .vocal-cuerpo');
        if (!el || reducir()) return Promise.resolve();
        el.classList.remove("pista");
        void el.offsetWidth;
        el.classList.add("pista");
        return sleep(620).then(function () { el.classList.remove("pista"); });
    }

    function efecto(nombre) {
        var sfx = Sfx();
        if (!nombre || !sfx) return;
        sfx.sonar(nombre);
    }

    function despertarAudio() {
        var sfx = Sfx();
        if (sfx) sfx.desbloquear();
        if (window.TextoVoz) TextoVoz.desbloquear();
        asegurarFondo();
    }

    /* ── Voz y diálogo ── */

    function gif(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        if (hablando) return "../../images/" + quien + "_hablando.gif";
        return "../../img/" + quien + "_normal.gif";
    }

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
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
        dialogo.classList.remove("es-acierto");
        if (estadoDialogo) dialogo.classList.add("es-" + estadoDialogo);
        dialogo.classList.add("visible");
        $id("dialogo-avatar").src = gif(voz, true);
        $id("enunciado").textContent = texto;
    }

    function limpiarDialogo() {
        var dialogo = $id("dialogo");
        dialogo.classList.remove("visible", "es-acierto");
        $id("enunciado").textContent = "";
    }

    function decir(linea, estadoDialogo) {
        if (!linea || !linea.texto || !window.TextoVoz) return Promise.resolve();
        despertarAudio();
        var voz = "zoe";
        if (linea.voz) voz = linea.voz === "zeus" ? "zeus" : "zoe";
        else if (linea.personaje === 0) voz = "zeus";
        // El documento pide voz, no un texto que el niño tenga que leer.
        if (!document.body.classList.contains("sin-feedback") && !document.body.classList.contains("esperando-inicio")) {
            pintarDialogo(voz, linea.texto, estadoDialogo);
        }
        marcarHablando(voz, true);
        var inicio = $id("btn-empecemos");
        var escuchar = $id("btn-escuchar");
        if (inicio && document.body.classList.contains("esperando-inicio")) inicio.classList.add("sonando");
        if (escuchar && !document.body.classList.contains("esperando-inicio")) escuchar.classList.add("sonando");
        return Promise.resolve(TextoVoz.hablar(linea.texto, voz)).catch(function () {}).then(function () {
            marcarHablando(voz, false);
            if (inicio) inicio.classList.remove("sonando");
            if (escuchar) escuchar.classList.remove("sonando");
        });
    }

    function lineasDelNivel(n) {
        var lineas = [];
        (n.bienvenida || []).forEach(function (l) {
            lineas.push({ texto: l.texto, personaje: l.personaje === 1 ? "zoe" : "zeus" });
        });
        (n.retos || []).forEach(function (r) {
            if (r.acierto && r.acierto.texto) lineas.push({ texto: r.acierto.texto, personaje: r.acierto.voz || "zoe" });
            if (r.error && r.error.texto) lineas.push({ texto: r.error.texto, personaje: r.error.voz || "zeus" });
        });
        if (n.cierre) lineas.push({ texto: n.cierre.texto, personaje: n.cierre.voz || "zoe" });
        return lineas;
    }

    /* ── Vocales en escena ── */

    function crearVocal(id, lugar) {
        var def = (gameConfig.vocales || {})[id] || {};
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vocal entra";
        btn.dataset.vocal = id;
        btn.setAttribute("aria-label", "Opción");
        btn.disabled = true;
        btn.style.setProperty("--c", def.color || "#38bdf8");
        if (lugar) {
            btn.style.left = lugar.x + "%";
            btn.style.top = lugar.y + "%";
        }
        // Fredoka, no el svg: la e dibujada se leía como g o como E.
        // Cuando llegue el arte final, aquí se cambia el texto por la imagen.
        btn.innerHTML = '<span class="pedestal" aria-hidden="true"><i class="fa-solid fa-star"></i></span><span class="vocal-cuerpo"><span class="letra">' + id + '</span></span>';
        return btn;
    }

    function vocalEl(id) {
        return document.querySelector('#vocales .vocal[data-vocal="' + id + '"]');
    }

    function habilitarVocales(si) {
        document.querySelectorAll("#vocales .vocal").forEach(function (b) { b.disabled = !si; });
        var escuchar = $id("btn-escuchar");
        if (escuchar) escuchar.disabled = !si;
    }

    function limpiarClases() {
        document.querySelectorAll("#vocales .vocal").forEach(function (v) {
            v.classList.remove("acierto", "vuelve", "entra", "elegida");
            var cuerpo = v.querySelector(".vocal-cuerpo");
            if (cuerpo) cuerpo.className = "vocal-cuerpo";
        });
        celebrarPersonajes(false);
    }

    function esperaTransicion(el) {
        return new Promise(function (resolve) {
            var listo = false;
            var fin = function () {
                if (listo) return;
                listo = true;
                el.removeEventListener("transitionend", onEnd);
                resolve();
            };
            var onEnd = function (ev) {
                if (ev.target !== el) return;
                if (ev.propertyName !== "left" && ev.propertyName !== "top") return;
                fin();
            };
            el.addEventListener("transitionend", onEnd);
            setTimeout(fin, reducir() ? 40 : 1000);
        });
    }

    function colocar(ronda, mover) {
        var cont = $id("vocales");
        var ids = ronda.vocales;
        Array.prototype.forEach.call(cont.querySelectorAll(".vocal"), function (el) {
            if (ids.indexOf(el.dataset.vocal) === -1) el.remove();
        });
        ids.forEach(function (id) {
            if (vocalEl(id)) return;
            cont.appendChild(crearVocal(id, ronda.mapa[id]));
        });
        var escenario = $id("escenario");
        var cambios = [];
        ids.forEach(function (id) {
            var el = vocalEl(id);
            var left = ronda.mapa[id].x + "%";
            var top = ronda.mapa[id].y + "%";
            if (el.style.left !== left || el.style.top !== top) cambios.push(el);
        });
        if (!mover || reducir() || !cambios.length) {
            escenario.classList.remove("en-movimiento");
            ids.forEach(function (id) {
                var el = vocalEl(id);
                el.style.left = ronda.mapa[id].x + "%";
                el.style.top = ronda.mapa[id].y + "%";
            });
            return Promise.resolve();
        }
        escenario.classList.add("en-movimiento");
        void escenario.offsetWidth;
        ids.forEach(function (id) {
            var el = vocalEl(id);
            el.style.left = ronda.mapa[id].x + "%";
            el.style.top = ronda.mapa[id].y + "%";
        });
        return Promise.all(cambios.map(esperaTransicion)).then(function () {
            escenario.classList.remove("en-movimiento");
        });
    }

    function debeMover(r) {
        if (!r || r.sinAnimacionPrevia) return false;
        if (r.tipo === "reubicar" || r.tipo === "serie") return true;
        return String(nivel.id) === "5" && !!document.querySelector("#vocales .vocal");
    }

    function celebrarPersonajes(si, aparecer) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.classList.toggle("celebra", !!si);
            el.classList.toggle("aparece", !!(si && aparecer));
            if (!si) el.classList.remove("aparece");
        });
    }

    function estrellas(el, n) {
        if (!el || reducir()) return;
        var capa = $id("capa-efectos");
        if (!capa) return;
        // Cap y limpieza: WAAPI por partícula + filter en vocales costaba frames.
        n = Math.min(Math.max(Number(n) || 8, 1), 10);
        while (capa.childNodes.length > 16) capa.removeChild(capa.firstChild);
        var rect = el.getBoundingClientRect();
        var x = rect.left + rect.width / 2;
        var y = rect.top + rect.height / 2;
        var colores = ["#fbbf24", "#fff", "#fb7185", "#38bdf8", "#4ade80"];
        var i;
        for (i = 0; i < n; i++) {
            var p = document.createElement("span");
            var ang = Math.random() * Math.PI * 2;
            var dist = 36 + Math.random() * 90;
            p.className = "particula";
            p.style.left = x + "px";
            p.style.top = y + "px";
            p.style.background = colores[i % 5];
            p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
            p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
            capa.appendChild(p);
            setTimeout(function (nodo) {
                if (nodo && nodo.parentNode) nodo.parentNode.removeChild(nodo);
            }, 850, p);
        }
    }

    function pintarEstrellas() {
        var cont = $id("progreso");
        if (!cont) return;
        var total = L.totalEstrellas(nivel);
        cont.hidden = String(nivel.id) !== "5";
        cont.innerHTML = "";
        var i;
        for (i = 0; i < total; i++) {
            var s = document.createElement("span");
            s.className = "estrella" + (i < completados ? " hecha" : "");
            cont.appendChild(s);
        }
    }

    function marcarEstrella() {
        completados += 1;
        var estrellasNodos = document.querySelectorAll("#progreso .estrella");
        if (estrellasNodos[completados - 1]) estrellasNodos[completados - 1].classList.add("hecha");
    }

    /* ── Flujo ── */

    function cancelarPista() {
        clearTimeout(pistaTimer);
        pistaTimer = null;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarPista() {
        cancelarPista();
        if (!window.PedniaTutorial || document.body.classList.contains("sin-repetir")) return;
        var gen = rondaGen;
        pistaTimer = setTimeout(function () {
            if (!vivo(gen) || fase !== "jugar") return;
            var btn = $id("btn-escuchar");
            PedniaTutorial.animarMano({
                punto: btn,
                holdMs: 450,
                cancelado: function () { return fase !== "jugar" || !vivo(gen); },
                onPresionar: function () { escuchar(); }
            });
        }, 10000);
    }

    function escuchar() {
        if (fase !== "jugar" || !objetivo) return;
        despertarAudio();
        pronunciar(objetivo);
    }

    function claseEfecto(nombre, extras) {
        // Una sola animación compuesta: no apilar ilumina+salta/mueve (pelean por transform).
        if (nombre === "salta") return "ilumina-salta";
        if (nombre === "mueve") return "ilumina-mueve";
        if (nombre === "ilumina" && extras && extras.animar) return "ilumina-mueve";
        if (nombre === "gira") return "gira";
        if (nombre === "ilumina") return "ilumina";
        if (nombre === "celebra") return "ilumina";
        if (nombre === "estrellas" || nombre === "cierre") return "ilumina";
        return "ilumina-salta";
    }

    async function acierto(btn, gen) {
        var a = reto.acierto || {};
        btn.classList.add("acierto");
        var cuerpo = btn.querySelector(".vocal-cuerpo");
        if (cuerpo) cuerpo.classList.add(claseEfecto(a.efecto, a));
        if (a.efecto === "cierre") {
            document.querySelectorAll("#vocales .vocal").forEach(function (v) { v.classList.add("acierto"); });
        }
        if (a.efecto === "estrellas") {
            celebrarPersonajes(true, true);
            estrellas(btn, 10);
        } else if (a.efecto === "cierre" || a.efecto === "celebra") {
            celebrarPersonajes(true);
            estrellas(btn, a.efecto === "celebra" ? 8 : 10);
        } else if (a.efecto === "salta") {
            estrellas(btn, 8);
        }
        if (a.repetir) await pronunciar(objetivo);
        efecto(a.sonido);
        if (a.texto) await decir(a, "acierto");
        else await sleep(650);
        if (!vivo(gen)) return;
        marcarEstrella();
        estado.ultimoCorrecto = objetivo;
        siguiente(gen);
    }

    async function fallo(btn, gen) {
        btn.classList.add("vuelve");
        var e = reto.error;
        if (e && e.texto) await decir(e);
        else {
            efecto("suave");
            await sleep(450);
        }
        btn.classList.remove("vuelve", "elegida");
        if (!vivo(gen)) return;
        fase = "jugar";
        habilitarVocales(true);
        programarPista();
    }

    function intentar(btn) {
        if (fase !== "jugar" || juegoTerminado || !btn || btn.disabled) return;
        var gen = rondaGen;
        fase = "feedback";
        cancelarPista();
        habilitarVocales(false);
        btn.classList.add("elegida");
        if (btn.dataset.vocal === objetivo) acierto(btn, gen);
        else fallo(btn, gen);
    }

    function siguiente(gen) {
        if (!vivo(gen)) return;
        if (reto.tipo === "serie" && estado.ronda + 1 < (Number(reto.rondas) || 1)) {
            estado.ronda += 1;
            presentar(gen);
            return;
        }
        estado.ronda = 0;
        indice += 1;
        if (!nivel.retos[indice]) granCierre(gen);
        else presentar(gen);
    }

    async function presentar(gen) {
        if (!vivo(gen)) return;
        reto = nivel.retos[indice];
        if (!reto) { granCierre(gen); return; }
        fase = reto.tipo === "reubicar" || reto.tipo === "serie" ? "moviendo" : "presentacion";
        cancelarPista();
        limpiarDialogo();
        limpiarClases();
        habilitarVocales(false);
        var ronda = L.preparar(reto, estado, Math.random);
        objetivo = ronda.correcto;
        await colocar(ronda, debeMover(reto));
        if (!vivo(gen)) return;
        document.querySelectorAll("#vocales .vocal").forEach(function (el) {
            var lugar = ronda.mapa[el.dataset.vocal];
            if (lugar) el.dataset.slot = lugar.slot;
        });
        estado.ultimoSlot = ronda.mapa[objetivo] ? ronda.mapa[objetivo].slot : null;
        estado.ultimoMapa = ronda.mapa;
        fase = "sonando";
        await pronunciar(objetivo);
        if (!vivo(gen)) return;
        fase = "jugar";
        habilitarVocales(true);
        programarPista();
    }

    function prepararInsignia() {
        var ins = nivel.insignia || {};
        var trofeo = document.querySelector("#victoria img.trofeo");
        if (!trofeo || !ins.img) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre || "";
        trofeo.classList.add("insignia");
    }

    function granCierre(gen) {
        if (!vivo(gen) && juegoTerminado) return;
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        habilitarVocales(false);
        celebrarPersonajes(true);
        var cierre = nivel.cierre || { voz: "zoe", texto: "¡Descubriste las vocales!" };
        var texto = $id("texto_final");
        if (texto) texto.textContent = cierre.texto;
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
            var indice = Number(linea.personaje);
            var def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            var id = def.id || (indice === 1 ? "zoe" : "zeus");
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
        despertarAudio();
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
        // Nuevo gesto (Omitir / Continuar): reabrir AudioContext tras la intro.
        despertarAudio();
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
        despertarAudio();
        // Keep-alive + tono de prueba: si el gesto se “gasta” en la intro, el contexto sigue vivo.
        var sfx = Sfx();
        if (sfx) {
            sfx.desbloquear().then(function () {
                // Beep corto de confirmación (también valida que el audio del dispositivo funciona).
                return sfx.sonar("recompensa");
            });
        }
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
        if (!d.vocales || !d.correcto || !window.PedniaTutorial) {
            await bienvenidaYJuego(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        aplicarTema(nivel);
        pintarEstrellas();
        await PedniaTutorial.activarDemo();
        var t = textos();
        var ronda = {
            vocales: d.vocales.slice(),
            correcto: d.correcto,
            mapa: L.ubicar(d.vocales, d.correcto, null, Math.random, null)
        };
        objetivo = d.correcto;
        await colocar(ronda, false);
        habilitarVocales(false);
        var escucharBtn = $id("btn-escuchar");
        if (escucharBtn) escucharBtn.disabled = false;
        await decir({ voz: "zoe", texto: t.demostracion || "¡Escucha y toca la vocal!" });
        if (!vivo(gen) || !demoActiva) return;
        var cancelado = function () { return !demoActiva || !vivo(gen); };
        var sonando = Promise.resolve();
        await PedniaTutorial.animarMano({
            punto: escucharBtn,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                sonando = pronunciar(d.correcto);
            }
        });
        await sonando;
        if (!vivo(gen) || !demoActiva) return;
        var correcta = vocalEl(d.correcto);
        await PedniaTutorial.animarMano({
            punto: correcta,
            holdMs: 500,
            cancelado: cancelado,
            onPresionar: function () {
                if (!correcta) return;
                correcta.classList.add("acierto", "elegida");
                var cuerpo = correcta.querySelector(".vocal-cuerpo");
                if (cuerpo) cuerpo.classList.add("salta");
                estrellas(correcta, 12);
                efecto("recompensa");
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto || "¡Así se juega!" }, "acierto");
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin || "¡Ahora te toca a ti!" });
        detenerDemo();
        if (!vivo(gen)) return;
        $id("vocales").innerHTML = "";
        limpiarClases();
        estado = { ultimoSlot: null, ultimoCorrecto: null, ultimoMapa: null, ronda: 0 };
        await bienvenidaYJuego(gen);
    }

    async function bienvenidaYJuego(gen) {
        aplicarTema(nivel);
        pintarEstrellas();
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
        estado = { ultimoSlot: null, ultimoCorrecto: null, ultimoMapa: null, ronda: 0 };
        $id("vocales").innerHTML = "";
        if (window.TextoVoz && typeof TextoVoz.encolarFrases === "function") {
            TextoVoz.encolarFrases(lineasDelNivel(nivel));
        }
        aplicarTema(nivel);
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
        var crudo = readText("config.json?v=20261020m");
        gameConfig = JSON.parse(crudo);
        try { introConfig = JSON.parse(readText("../../intro.json")); } catch (e) { introConfig = {}; }
        var errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[DescubreLasVocales]", errores);
        aplicarLetterSpacing();
        aplicarTema(temaInicial());
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
        $id("btn-escuchar").addEventListener("click", escuchar);
        $id("vocales").addEventListener("click", function (ev) {
            if (demoActiva) return;
            var btn = ev.target.closest(".vocal");
            if (btn) {
                despertarAudio();
                intentar(btn);
            }
        });
        // Cualquier toque durante el juego reabre el contexto (Chrome lo suspende tras la intro).
        document.addEventListener("pointerdown", function () {
            if (document.body.classList.contains("esperando-inicio")) return;
            despertarAudio();
        }, { passive: true });
        window.addEventListener("pagehide", function () {
            if (window.TextoVoz) TextoVoz.vaciar();
        });
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
