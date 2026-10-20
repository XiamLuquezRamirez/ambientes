/* El reto de las vocales — Multisaberes */
(function () {
    "use strict";

    var L = window.RetoVocalesLogica;
    var Sfx = window.RetoVocalesSfx;

    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var audioCache = Object.create(null);

    var nivel = null;
    var ronda = null;
    var estado = { ultimoMapa: null, ultimoObjeto: null, serieUsadas: [], serieHechas: 0 };
    var indice = 0;
    var completados = 0;
    var fallosSeguidos = 0;
    var fase = "";
    var rondaGen = 0;
    var tokenSonido = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var cerrado = false;
    var demoActiva = false;
    var introTimers = [];
    var lluviaTimers = [];
    var bloqueado = false;

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

    function esPlaneta(n) {
        return String((n && n.edad) || "").indexOf("5") === 0 || (n && n.tema) === "planeta";
    }

    function aplicarTema(n) {
        var planeta = esPlaneta(n);
        document.body.classList.toggle("tema-planeta", planeta);
        document.body.classList.toggle("tema-parque", !planeta);
        ["pantalla-inicio", "escenario"].forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.classList.toggle("tema-planeta", planeta);
            el.classList.toggle("tema-parque", !planeta);
        });
        var escenario = $id("escenario");
        if (n && escenario) {
            escenario.classList.toggle("edad-3", String(n.id) === "3");
            escenario.classList.toggle("edad-5", String(n.id) === "5");
        }
        var icono = document.querySelector("#btn-empecemos i");
        if (icono) icono.className = planeta ? "fa-solid fa-rocket" : "fa-solid fa-flag-checkered";
    }

    function temaInicial() {
        var edad = window.PedniaEdad ? PedniaEdad.edadSesion() : null;
        return {
            edad: edad != null && edad >= 5 ? "5-6 años" : "3-4 años",
            id: edad != null && edad >= 5 ? "5" : "3",
            tema: edad != null && edad >= 5 ? "planeta" : "parque"
        };
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
        var estrellas = $id("progreso");
        var energia = $id("energia");
        var total = (nivel && nivel.retos ? nivel.retos.length : 0) || 0;
        var mostrar = acc().mostrarProgreso !== false;
        if (!mostrar) {
            if (estrellas) estrellas.hidden = true;
            if (energia) energia.hidden = true;
            return;
        }
        var planeta = esPlaneta(nivel);
        var box = planeta ? energia : estrellas;
        var otra = planeta ? estrellas : energia;
        if (otra) otra.hidden = true;
        if (!box) return;
        box.hidden = false;
        box.innerHTML = "";
        var i;
        var cls = planeta ? "cristal" : "estrella";
        var done = planeta ? "activo" : "hecha";
        for (i = 0; i < total; i++) {
            var e = document.createElement("span");
            e.className = cls + (i < completados ? " " + done : "");
            box.appendChild(e);
        }
    }

    function defVocal(id) {
        return (gameConfig.vocales && gameConfig.vocales[id]) || null;
    }

    function defObjeto(id) {
        return (gameConfig.objetos && gameConfig.objetos[id]) || null;
    }

    function limpiarLluvia() {
        lluviaTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        lluviaTimers = [];
        var capa = $id("lluvia-capa");
        if (capa) {
            capa.innerHTML = "";
            capa.hidden = true;
        }
    }

    function limpiarEscena() {
        limpiarLluvia();
        var vis = $id("escena-visual");
        var ops = $id("opciones");
        var btn = $id("btn-escuchar");
        if (vis) vis.innerHTML = "";
        if (ops) {
            ops.innerHTML = "";
            ops.className = "opciones";
        }
        if (btn) {
            btn.hidden = true;
            btn.classList.remove("sonando");
            btn.disabled = false;
        }
        bloqueado = false;
        fallosSeguidos = 0;
    }

    function pronunciarObjetivo() {
        if (!ronda) return Promise.resolve();
        var token = ++tokenSonido;
        var btn = $id("btn-escuchar");
        if (btn) btn.classList.add("sonando");
        duck(true);

        var promesa;
        if (ronda.tipo === "inicial" && ronda.objeto) {
            var obj = defObjeto(ronda.objeto);
            var frase = (obj && (obj.pronuncia || obj.nombre)) || ronda.correcto;
            promesa = window.TextoVoz ? TextoVoz.hablar(frase, "zoe") : sleep(700);
        } else if (ronda.tipo === "secuencia") {
            promesa = window.TextoVoz ? TextoVoz.hablar("¿cuál sigue?", "zoe") : sleep(500);
        } else {
            var id = ronda.correcto;
            var ruta = gameConfig.audios && gameConfig.audios.sonidos && gameConfig.audios.sonidos[id];
            promesa = ruta
                ? playArchivo(ruta)
                : (window.TextoVoz ? TextoVoz.hablar(id, "zoe") : sleep(700));
        }

        return Promise.resolve(promesa).then(function () {
            if (token !== tokenSonido) return;
            if (btn) btn.classList.remove("sonando");
            duck(false);
        });
    }

    function pintarVisual(r) {
        var vis = $id("escena-visual");
        if (!vis || !r) return;
        vis.innerHTML = "";
        vis.dataset.escena = r.escena || "";

        if (r.tipo === "inicial") {
            var obj = defObjeto(r.objeto);
            if (r.escena === "imagenes" && Array.isArray((nivel.retos[indice] || {}).pool)) {
                var gal = document.createElement("div");
                gal.className = "galeria-objs";
                (nivel.retos[indice].pool || []).forEach(function (oid) {
                    var o = defObjeto(oid);
                    if (!o) return;
                    var img = document.createElement("img");
                    img.src = o.img;
                    img.alt = o.nombre || "";
                    img.draggable = false;
                    if (oid === r.objeto) img.classList.add("activa");
                    gal.appendChild(img);
                });
                vis.appendChild(gal);
            } else if (r.escena === "rueda") {
                var marco = document.createElement("div");
                marco.className = "rueda-marco";
                marco.id = "rueda-marco";
                if (obj) {
                    var imgR = document.createElement("img");
                    imgR.className = "objeto-img";
                    imgR.id = "objeto-img";
                    imgR.src = obj.img;
                    imgR.alt = obj.nombre || "";
                    imgR.draggable = false;
                    marco.appendChild(imgR);
                }
                vis.appendChild(marco);
            } else if (obj) {
                var img = document.createElement("img");
                img.className = "objeto-img";
                img.id = "objeto-img";
                img.src = obj.img;
                img.alt = obj.nombre || "";
                img.draggable = false;
                vis.appendChild(img);
            }
            return;
        }

        if (r.tipo === "puerta") {
            var wrap = document.createElement("div");
            wrap.className = "puerta-wrap";
            var modelo = defVocal(r.modelo || r.correcto);
            if (modelo) {
                var m = document.createElement("img");
                m.className = "modelo-vocal";
                m.src = modelo.img;
                m.alt = r.modelo || "";
                m.draggable = false;
                wrap.appendChild(m);
            }
            var puerta = document.createElement("div");
            puerta.className = "puerta";
            puerta.id = "puerta";
            var hueco = document.createElement("div");
            hueco.className = "hueco";
            hueco.id = "hueco";
            puerta.appendChild(hueco);
            wrap.appendChild(puerta);
            vis.appendChild(wrap);
            return;
        }

        if (r.tipo === "secuencia") {
            var patron = document.createElement("div");
            patron.className = "patron";
            (r.patron || []).forEach(function (v) {
                var chip = document.createElement("span");
                chip.className = "chip";
                var vd = defVocal(v);
                chip.style.setProperty("--vc", (vd && vd.color) || "#94a3b8");
                if (vd && vd.img) {
                    var ci = document.createElement("img");
                    ci.src = vd.img;
                    ci.alt = v;
                    ci.draggable = false;
                    chip.appendChild(ci);
                } else {
                    chip.textContent = v;
                }
                patron.appendChild(chip);
            });
            var vacio = document.createElement("span");
            vacio.className = "chip vacio";
            vacio.id = "chip-vacio";
            patron.appendChild(vacio);
            vis.appendChild(patron);
        }
    }

    function crearOpcion(vocalId, mapa) {
        var v = defVocal(vocalId);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opcion";
        btn.dataset.vocal = vocalId;
        btn.setAttribute("aria-label", "vocal " + vocalId);
        btn.style.setProperty("--vc", (v && v.color) || "#94a3b8");
        if (mapa && mapa[vocalId]) {
            btn.style.left = mapa[vocalId].x + "%";
            btn.style.top = mapa[vocalId].y + "%";
        }
        btn.innerHTML = '<span class="opcion-cuerpo" style="--vc:' + ((v && v.color) || "#94a3b8") + '">' +
            '<img src="' + ((v && v.img) || "") + '" alt="' + vocalId + '" draggable="false"></span>';
        return btn;
    }

    function pintarOpciones(r) {
        var ops = $id("opciones");
        if (!ops || !r) return;
        ops.innerHTML = "";
        if (r.tipo === "lluvia") {
            ops.className = "opciones";
            return;
        }
        if (r.tipo === "secuencia") {
            ops.className = "opciones en-fila";
            r.vocales.forEach(function (id) {
                ops.appendChild(crearOpcion(id, null));
            });
            return;
        }
        ops.className = "opciones";
        r.vocales.forEach(function (id) {
            ops.appendChild(crearOpcion(id, r.mapa));
        });
    }

    function mostrarEscuchar(on) {
        var btn = $id("btn-escuchar");
        if (!btn) return;
        var ver = acc().verBotonRepetir !== false;
        btn.hidden = !(on && ver);
        btn.disabled = !on;
    }

    function lanzarGota(vocalId, durMs) {
        var capa = $id("lluvia-capa");
        if (!capa) return;
        var v = defVocal(vocalId);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gota";
        btn.dataset.vocal = vocalId;
        btn.style.left = (12 + Math.random() * 70) + "%";
        btn.style.animationDuration = (durMs || 4200) + "ms";
        btn.style.setProperty("--vc", (v && v.color) || "#94a3b8");
        btn.innerHTML = '<span class="opcion-cuerpo" style="--vc:' + ((v && v.color) || "#94a3b8") + '">' +
            '<img src="' + ((v && v.img) || "") + '" alt="' + vocalId + '" draggable="false"></span>';
        capa.appendChild(btn);
        var tid = setTimeout(function () {
            if (btn.parentNode) btn.parentNode.removeChild(btn);
        }, (durMs || 4200) + 80);
        lluviaTimers.push(tid);
    }

    function iniciarLluvia(gen) {
        var capa = $id("lluvia-capa");
        if (!capa || !ronda) return;
        capa.hidden = false;
        capa.innerHTML = "";
        $id("opciones").innerHTML = "";
        mostrarEscuchar(true);

        function oleada() {
            if (!vivo(gen) || fase !== "jugar" || !ronda || ronda.tipo !== "lluvia") return;
            var lista = L.mezclar(ronda.vocales.slice(), Math.random);
            lista.forEach(function (id, i) {
                var tid = setTimeout(function () {
                    if (!vivo(gen) || fase !== "jugar") return;
                    lanzarGota(id, reducir() ? 2800 : 4500);
                }, i * 700);
                lluviaTimers.push(tid);
            });
            var next = setTimeout(oleada, lista.length * 700 + 1800);
            lluviaTimers.push(next);
        }
        oleada();
    }

    async function presentar(gen) {
        if (!vivo(gen) || !nivel) return;
        var retos = nivel.retos || [];
        if (indice >= retos.length) {
            granCierre(gen);
            return;
        }
        fase = "presentar";
        bloqueado = true;
        limpiarEscena();
        ronda = L.preparar(retos[indice], gameConfig, estado, Math.random);
        if (!ronda) {
            indice += 1;
            await presentar(gen);
            return;
        }
        pintarProgreso();
        pintarVisual(ronda);
        pintarOpciones(ronda);

        if (ronda.tipo === "reubicar" && ronda.mapa) {
            await sleep(reducir() ? 100 : 450);
            if (!vivo(gen)) return;
            ronda.mapa = L.ubicar(ronda.vocales, estado.ultimoMapa, Math.random);
            pintarOpciones(ronda);
            await sleep(reducir() ? 100 : 350);
        }

        if (ronda.tipo === "lluvia") {
            if (!vivo(gen)) return;
            mostrarEscuchar(true);
            await pronunciarObjetivo();
            if (!vivo(gen)) return;
            fase = "jugar";
            bloqueado = false;
            iniciarLluvia(gen);
            return;
        }

        mostrarEscuchar(true);
        await sleep(reducir() ? 80 : 200);
        if (!vivo(gen)) return;
        await pronunciarObjetivo();
        if (!vivo(gen)) return;
        fase = "jugar";
        bloqueado = false;
    }

    async function alAcertar(btn, gen) {
        bloqueado = true;
        if (btn) btn.classList.add("acierto");
        var ac = (ronda && ronda.acierto) || {};
        efecto(ac.sonido || ac.efecto || "celebracion");
        celebrarPersonajes(true);
        setTimeout(function () { celebrarPersonajes(false); }, 600);

        if (ronda.tipo === "inicial" && ronda.escena === "rueda") {
            var marco = $id("rueda-marco");
            var img = $id("objeto-img");
            if (marco) marco.classList.add("gira");
            if (img) img.classList.add("despega");
        }
        if (ronda.tipo === "puerta") {
            var puerta = $id("puerta");
            var hueco = $id("hueco");
            var vdP = defVocal(ronda.correcto);
            if (hueco && vdP) {
                hueco.classList.add("lleno");
                hueco.innerHTML = '<img src="' + vdP.img + '" alt="' + ronda.correcto + '" draggable="false">';
            }
            if (puerta) puerta.classList.add("abierta");
        }
        if (ronda.tipo === "secuencia") {
            var vacio = $id("chip-vacio");
            if (vacio) {
                vacio.classList.remove("vacio");
                var vd = defVocal(ronda.correcto);
                vacio.style.setProperty("--vc", (vd && vd.color) || "#94a3b8");
                vacio.innerHTML = "";
                if (vd && vd.img) {
                    var fill = document.createElement("img");
                    fill.src = vd.img;
                    fill.alt = ronda.correcto;
                    fill.draggable = false;
                    vacio.appendChild(fill);
                } else {
                    vacio.textContent = ronda.correcto;
                }
            }
        }

        if (ac.texto) await decir(ac, "acierto");
        if (!vivo(gen)) return;

        if (ronda.tipo === "serie") {
            estado.serieHechas = (estado.serieHechas || 0) + 1;
            estado.serieUsadas = (estado.serieUsadas || []).concat([ronda.correcto]);
            if (estado.serieHechas < ronda.rondas) {
                limpiarEscena();
                ronda = L.preparar(nivel.retos[indice], gameConfig, estado, Math.random);
                pintarVisual(ronda);
                pintarOpciones(ronda);
                mostrarEscuchar(true);
                await pronunciarObjetivo();
                if (!vivo(gen)) return;
                fase = "jugar";
                bloqueado = false;
                return;
            }
        }

        estado.ultimoMapa = ronda.mapa;
        if (ronda.objeto) estado.ultimoObjeto = ronda.objeto;
        estado.serieHechas = 0;
        estado.serieUsadas = [];
        completados += 1;
        pintarProgreso();
        limpiarLluvia();
        await sleep(reducir() ? 180 : 420);
        if (!vivo(gen)) return;
        indice += 1;
        await presentar(gen);
    }

    async function alFallar(btn, gen) {
        if (btn) {
            btn.classList.add("error");
            setTimeout(function () { btn.classList.remove("error"); }, 420);
        }
        efecto("error");
        fallosSeguidos += 1;
        bloqueado = true;
        await pronunciarObjetivo();
        if (!vivo(gen)) return;
        if (fallosSeguidos >= (ronda.pistaTrasFallos || 2) && ronda.correcto) {
            var pista = document.querySelector('.opcion[data-vocal="' + ronda.correcto + '"]')
                || document.querySelector('.gota[data-vocal="' + ronda.correcto + '"]');
            if (pista) {
                pista.classList.add("pista");
                setTimeout(function () { pista.classList.remove("pista"); }, 700);
            }
        }
        bloqueado = false;
    }

    async function intentar(btn) {
        if (demoActiva || fase !== "jugar" || bloqueado || !btn || !ronda) return;
        var elegida = btn.dataset.vocal;
        var gen = rondaGen;
        if (L.esCorrecta(ronda, elegida)) {
            if (ronda.tipo === "lluvia") {
                btn.classList.add("acertada");
                limpiarLluvia();
            }
            await alAcertar(btn, gen);
        } else {
            await alFallar(btn, gen);
        }
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
        limpiarEscena();
        completados = (nivel && nivel.retos ? nivel.retos.length : 0) || completados;
        pintarProgreso();
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
        if (!d.vocales || !d.correcto || !window.PedniaTutorial) {
            await bienvenidaYJuego(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        aplicarTema(nivel);
        pintarProgreso();
        await PedniaTutorial.activarDemo();
        var t = textos();
        ronda = L.preparar({
            tipo: d.tipo || "escuchar",
            vocales: d.vocales.slice(),
            correcto: d.correcto,
            escena: d.escena || "rocas"
        }, gameConfig, {}, Math.random);
        pintarVisual(ronda);
        pintarOpciones(ronda);
        mostrarEscuchar(true);
        await decir({ voz: "zoe", texto: t.demostracion || "¡Escucha y toca la vocal!" });
        if (!vivo(gen) || !demoActiva) return;
        var cancelado = function () { return !demoActiva || !vivo(gen); };
        var escucharBtn = $id("btn-escuchar");
        var sonando = Promise.resolve();
        if (escucharBtn) {
            await PedniaTutorial.animarMano({
                punto: escucharBtn,
                holdMs: 450,
                cancelado: cancelado,
                onPresionar: function () { sonando = pronunciarObjetivo(); }
            });
            await sonando;
        }
        if (!vivo(gen) || !demoActiva) return;
        var correcta = document.querySelector('.opcion[data-vocal="' + d.correcto + '"]');
        await PedniaTutorial.animarMano({
            punto: correcta,
            holdMs: 450,
            cancelado: cancelado,
            onPresionar: function () {
                if (correcta) correcta.classList.add("acierto");
                efecto("celebracion");
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto || "¡Así se supera el reto!" }, "acierto");
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin || "¡Ahora te toca a ti!" });
        detenerDemo();
        if (!vivo(gen)) return;
        limpiarEscena();
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
        estado = { ultimoMapa: null, ultimoObjeto: null, serieUsadas: [], serieHechas: 0 };
        limpiarEscena();
        if (window.TextoVoz && typeof TextoVoz.encolarFrases === "function") {
            var frases = [];
            (nivel.bienvenida || []).forEach(function (l) { if (l.texto) frases.push(l.texto); });
            (nivel.retos || []).forEach(function (r) {
                if (r.acierto && r.acierto.texto) frases.push(r.acierto.texto);
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
        if (errores.length) console.warn("[ElRetoDeLasVocales]", errores);
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
        $id("btn-escuchar").addEventListener("click", function () {
            if (demoActiva || fase !== "jugar") return;
            pronunciarObjetivo();
        });
        $id("opciones").addEventListener("click", function (ev) {
            if (demoActiva) return;
            var btn = ev.target.closest(".opcion");
            if (btn) intentar(btn);
        });
        $id("lluvia-capa").addEventListener("click", function (ev) {
            if (demoActiva) return;
            var btn = ev.target.closest(".gota");
            if (btn) intentar(btn);
        });
        window.addEventListener("pagehide", function () {
            if (window.TextoVoz) TextoVoz.vaciar();
            limpiarLluvia();
        });
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
