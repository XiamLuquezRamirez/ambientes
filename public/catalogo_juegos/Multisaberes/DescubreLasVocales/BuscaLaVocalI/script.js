/* Descubre las vocales — Multisaberes */
(function () {
    "use strict";

    var L = window.DescubreVocalesLogica;
    var Sfx = window.VocalesSfx;

    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var audioCache = Object.create(null);

    var nivel = null;
    var reto = null;
    var objetivo = null;
    /** Letra que se está pidiendo en esta ronda (debe coincidir siempre con lo hablado). */
    var letraPedida = null;
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
        var escenario = $id("escenario");
        var es5 = n && String(n.id) === "5";
        if (escenario) {
            escenario.classList.toggle("edad-3", !es5);
            escenario.classList.toggle("edad-5", !!es5);
            escenario.classList.toggle("tema-isla", !es5);
            escenario.classList.toggle("tema-observatorio", !!es5);
        }
        document.body.classList.toggle("tema-isla", !es5);
        document.body.classList.toggle("tema-observatorio", !!es5);
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

    /** Una sola letra: "aaa" confundía al TTS/oído; la vocal corta es el sonido correcto. */
    function fraseVocal(id) {
        var v = String(id || "").toLowerCase();
        return ({ a: "a", e: "e", i: "i", o: "o", u: "u" })[v] || v;
    }

    function vozParaVocal() {
        return "zoe";
    }

    function precargarVocales() {
        if (!window.TextoVoz || typeof TextoVoz.encolarFrases !== "function") return;
        var voz = vozParaVocal();
        TextoVoz.encolarFrases(["a", "e", "i", "o", "u"].map(function (t) {
            return { texto: t, personaje: voz };
        }));
    }

    function pronunciar(id) {
        var letra = String(id || "").toLowerCase();
        var token = ++tokenSonido;
        var btn = $id("btn-escuchar");
        var inicio = $id("btn-empecemos");
        var voz = vozParaVocal();
        // Ancla: lo que suena ES esta letra (no el objetivo global, que puede cambiar a mitad).
        letraPedida = letra;
        if (btn) btn.classList.add("sonando");
        if (inicio && document.body.classList.contains("esperando-inicio")) inicio.classList.add("sonando");
        marcarHablando(voz, true);
        duck(true);
        var ruta = gameConfig.audios && gameConfig.audios.sonidos && gameConfig.audios.sonidos[letra];
        var sonido;
        if (ruta) {
            sonido = playArchivo(ruta);
        } else if (window.TextoVoz) {
            // Cortar cualquier frase/vocal anterior para no mezclar “a” con el reto de “e”.
            TextoVoz.detener();
            sonido = Promise.resolve(TextoVoz.hablar(fraseVocal(letra), voz, {
                esperarTtsMs: 12000,
                intentosTts: 3,
                fallbackNavegador: true
            }));
        } else {
            sonido = sleep(700);
        }
        iluminarPlataformaCentral(true);
        var hop = (reto && reto.pista && (fase === "sonando" || fase === "jugar"))
            ? animarPista(letra) : Promise.resolve();
        return Promise.all([sonido, hop]).then(function () {
            if (token !== tokenSonido) return;
            marcarHablando(voz, false);
            if (btn) btn.classList.remove("sonando");
            if (inicio) inicio.classList.remove("sonando");
            iluminarPlataformaCentral(false);
            duck(false);
        }, function () {
            marcarHablando(voz, false);
            if (btn) btn.classList.remove("sonando");
            if (inicio) inicio.classList.remove("sonando");
            iluminarPlataformaCentral(false);
            duck(false);
        });
    }

    function iluminarPlataformaCentral(si) {
        var plat = $id("plataforma-central");
        if (plat) plat.classList.toggle("ilumina", !!si);
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
        if (!nombre || !Sfx || acc().efectosSonido === false) return;
        if (nombre === "suave") return;
        Sfx.sonar(nombre);
    }

    function despertarAudio() {
        if (window.TextoVoz) TextoVoz.desbloquear();
        if (Sfx) Sfx.desbloquear();
        asegurarFondo();
    }

    /* ── Voz y diálogo ── */

    function gif(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        if (hablando) return "../../../images/" + quien + "_hablando.gif";
        return "../../../img/" + quien + "_normal.gif";
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
        var enunciado = $id("enunciado");
        if (!enunciado) return;
        enunciado.dataset.voz = voz || "";
        enunciado.classList.toggle("es-acierto", estadoDialogo === "acierto");
        enunciado.textContent = texto || "";
    }

    function limpiarDialogo() {
        var enunciado = $id("enunciado");
        if (!enunciado) return;
        enunciado.classList.remove("es-acierto");
        enunciado.textContent = "";
        enunciado.dataset.voz = "";
    }

    function decir(linea, estadoDialogo) {
        if (!linea || !linea.texto || !window.TextoVoz) return Promise.resolve();
        despertarAudio();
        var voz = "zoe";
        if (linea.voz) voz = linea.voz === "zeus" ? "zeus" : "zoe";
        else if (linea.personaje === 0) voz = "zeus";
        // Doc: sin instrucciones/títulos escritos al niño. Solo TTS (+ feedback si accesibilidad lo pide).
        var puedeCartel = !document.body.classList.contains("sin-feedback")
            && !document.body.classList.contains("esperando-inicio")
            && estadoDialogo === "acierto";
        if (puedeCartel) {
            pintarDialogo(voz, linea.texto, estadoDialogo);
        } else {
            limpiarDialogo();
        }
        marcarHablando(voz, true);
        var inicio = $id("btn-empecemos");
        var escuchar = $id("btn-escuchar");
        if (inicio && document.body.classList.contains("esperando-inicio")) inicio.classList.add("sonando");
        if (escuchar && !document.body.classList.contains("esperando-inicio")) escuchar.classList.add("sonando");
        return Promise.resolve(TextoVoz.hablar(linea.texto, voz, { esperarTtsMs: 600 })).catch(function () {}).then(function () {
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

    function crearVocal(id, opts) {
        opts = opts || {};
        var def = (gameConfig.vocales || {})[id] || {};
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vocal" + (opts.sinEntra ? "" : " entra");
        btn.dataset.vocal = id;
        btn.setAttribute("aria-label", "Vocal " + id);
        btn.disabled = true;
        btn.style.setProperty("--c", def.color || "#38bdf8");
        // Doc: vocales como personajes gráficos (SVG), no tipografía que el niño lea.
        if (def.img) {
            btn.innerHTML =
                '<span class="plat" aria-hidden="true"></span>' +
                '<span class="vocal-cuerpo"><img class="vocal-img" src="' + def.img + '" alt="" draggable="false"></span>';
        } else {
            btn.innerHTML =
                '<span class="plat" aria-hidden="true"></span>' +
                '<span class="vocal-cuerpo"><span class="letra">' + id + "</span></span>";
        }
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

    function ordenDesdeMapa(ronda, mapa) {
        var ids = (ronda.vocales || []).slice();
        var m = mapa || ronda.mapa;
        if (!m) return ids;
        return ids.sort(function (a, b) {
            var ma = m[a] || {};
            var mb = m[b] || {};
            var xa = Number(ma.x);
            var xb = Number(mb.x);
            if (isFinite(xa) && isFinite(xb) && xa !== xb) return xa - xb;
            return String(a).localeCompare(String(b));
        });
    }

    function usaLayoutMapa(ronda) {
        // Doc: las opciones cambian de plataforma/posición entre retos (2 o 5).
        return !!(ronda && ronda.mapa);
    }

    function posicionarEnMapa(btn, lugar) {
        if (!btn || !lugar) return;
        var x = Number(lugar.x);
        var y = Number(lugar.y);
        if (isFinite(x)) btn.style.left = x + "%";
        if (isFinite(y)) btn.style.top = y + "%";
        if (lugar.slot) btn.dataset.slot = lugar.slot;
    }

    function colocar(ronda, mapaOverride) {
        var cont = $id("vocales");
        if (!cont || !ronda) return Promise.resolve();
        var mapa = mapaOverride || ronda.mapa;
        var ids = ordenDesdeMapa(ronda, mapa);
        var layout = usaLayoutMapa(ronda);
        var sinEntra = !!(reto && reto.sinAnimacionPrevia);
        cont.innerHTML = "";
        cont.setAttribute("data-count", String(ids.length));
        cont.classList.toggle("layout-mapa", layout);
        ids.forEach(function (id) {
            var btn = crearVocal(id, { sinEntra: sinEntra });
            if (layout && mapa && mapa[id]) posicionarEnMapa(btn, mapa[id]);
            cont.appendChild(btn);
        });
        return Promise.resolve();
    }

    function debeMover(retoActual) {
        return !!(retoActual && retoActual.tipo === "reubicar" && !reducir());
    }

    async function animarReubicacion(ronda, gen) {
        var prev = estado.ultimoMapa;
        if (!debeMover(reto) || !prev || !ronda.mapa) {
            await colocar(ronda);
            return;
        }
        await colocar(ronda, prev);
        if (!vivo(gen)) return;
        await sleep(80);
        if (!vivo(gen)) return;
        var cont = $id("vocales");
        if (cont) cont.classList.add("reubicando");
        document.querySelectorAll("#vocales .vocal").forEach(function (btn) {
            var lugar = ronda.mapa[btn.dataset.vocal];
            if (lugar) posicionarEnMapa(btn, lugar);
        });
        await sleep(720);
        if (cont) cont.classList.remove("reubicando");
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
        // Doc 5-6: indicador visual de avance con estrellas, sin números ni palabras.
        var mostrar = String(nivel.id) === "5" && acc().mostrarProgreso !== false;
        cont.hidden = !mostrar;
        if (!mostrar) {
            cont.innerHTML = "";
            return;
        }
        cont.innerHTML = "";
        cont.classList.add("estrellas-solo");
        var i;
        for (i = 0; i < total; i++) {
            var s = document.createElement("span");
            s.className = "estrella-avance" + (i < completados ? " hecha" : "");
            s.setAttribute("aria-hidden", "true");
            cont.appendChild(s);
        }
    }

    function marcarEstrella() {
        completados += 1;
        pintarEstrellas();
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
        var letraAcertada = objetivo;
        btn.classList.add("acierto");
        var cuerpo = btn.querySelector(".vocal-cuerpo");
        if (cuerpo) cuerpo.classList.add(claseEfecto(a.efecto, a));
        if (a.efecto === "estrellas") {
            // Doc reto 5 (3-4): muchas estrellas + Zoe y Zeus celebran.
            celebrarPersonajes(true, true);
            estrellas(btn, 14);
        } else if (a.efecto === "cierre") {
            // Doc reto final (3-4): ambas vocales se iluminan + celebración.
            document.querySelectorAll("#vocales .vocal").forEach(function (v) {
                v.classList.add("acierto");
                var c = v.querySelector(".vocal-cuerpo");
                if (c) c.classList.add("ilumina");
            });
            celebrarPersonajes(true, true);
            estrellas(btn, 12);
        } else if (a.efecto === "celebra") {
            celebrarPersonajes(true);
            estrellas(btn, 8);
        } else if (a.efecto === "salta") {
            estrellas(btn, 8);
        }
        // Repetir el sonido de ESTA letra (fija), no la del próximo reto.
        if (a.repetir) await pronunciar(letraAcertada);
        efecto(a.sonido);
        if (a.texto) await decir(a, "acierto");
        else await sleep(650);
        if (!vivo(gen)) return;
        if (window.TextoVoz) TextoVoz.detener();
        marcarEstrella();
        estado.ultimoCorrecto = letraAcertada;
        await sleep(reducir() ? 80 : 280);
        if (!vivo(gen)) return;
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
        var elegida = btn.dataset.vocal;
        // Debe coincidir lo mostrado, lo pedido y lo que se oyó.
        if (!objetivo || !letraPedida || objetivo !== letraPedida) return;
        var gen = rondaGen;
        fase = "feedback";
        cancelarPista();
        habilitarVocales(false);
        btn.classList.add("elegida");
        if (elegida === objetivo) acierto(btn, gen);
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
        if (window.TextoVoz) TextoVoz.detener();
        var ronda = L.preparar(reto, estado, Math.random);
        var letra = ronda.correcto;
        objetivo = letra;
        letraPedida = letra;
        // Doc 5-6 reto 4: el movimiento termina antes de habilitar selección / audio.
        await animarReubicacion(ronda, gen);
        if (!vivo(gen)) return;
        document.querySelectorAll("#vocales .vocal").forEach(function (el) {
            var lugar = ronda.mapa[el.dataset.vocal];
            if (lugar) el.dataset.slot = lugar.slot;
        });
        estado.ultimoSlot = ronda.mapa[letra] ? ronda.mapa[letra].slot : null;
        estado.ultimoMapa = ronda.mapa;
        fase = "sonando";
        // Hablar la letra de ESTA ronda (local), no una variable global que pueda mutar.
        await pronunciar(letra);
        if (!vivo(gen)) return;
        if (objetivo !== letra || letraPedida !== letra) {
            // Carrera rara: re-sincronizar en lugar de dejar jugar con audio viejo.
            objetivo = letra;
            letraPedida = letra;
            await pronunciar(letra);
            if (!vivo(gen)) return;
        }
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
        if (window.TextoVoz) TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe", { esperarTtsMs: 600 });
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
        // Precargar vocales con el gesto de Empezar (desbloquea audio + calienta TTS de Zoe).
        precargarVocales();
        sincronizarDialogoIntro3d();
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
        await colocar(ronda);
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
        if (window.TextoVoz) TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe", { esperarTtsMs: 600 });
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
            precargarVocales();
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
        try { introConfig = JSON.parse(readText("../../../intro.json")); } catch (e) { introConfig = {}; }
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
