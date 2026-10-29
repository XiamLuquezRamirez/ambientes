/* Memoria musical — Expresión Artística */
(function () {
    "use strict";

    const L = window.MemoriaMusicalLogica;
    const COLORES = ["#ef5350", "#ffca28", "#66bb6a", "#42a5f5", "#ab47bc", "#ffb74d"];
    const VOLUMEN_FONDO_ESCUCHA = 0;

    let introConfig = null;
    let gameConfig = null;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;
    let nivelElegido = null;
    let indiceReto = 0;
    let juegoTerminado = false;
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let ayuda = { timer: null, fn: null };
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;
    let atacar = null;

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function escenaUrl(id) { return (gameConfig.escenas || {})[id] || ""; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.MemoriaMusicalSfx || null; }

    function asset(url) {
        if (!url || url.indexOf("?v=") !== -1) return url;
        return url + "?v=20261023a";
    }

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
        } else if (audioFondo) audioFondo.volume = vol;
        const icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function setMenuVol(abierto) {
        const panel = $id("menu-vol-panel");
        const btn = $id("btn-menu-vol");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    }

    function enlazarMenuVol() {
        const btn = $id("btn-menu-vol");
        const cerrar = $id("btn-cerrar-vol");
        const slider = $id("rango-volumen");
        const pct = volumenFondoPct();
        if (slider) slider.value = String(pct);
        const val = $id("vol-val");
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
        if (btn) btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = $id("menu-vol-panel");
            setMenuVol(panel && panel.hidden);
        });
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) slider.addEventListener("input", function () {
            const n = Number(slider.value);
            if (val) val.textContent = String(n);
            aplicarVolumenCalibrado(n);
        });
        document.addEventListener("pointerdown", function (ev) {
            const menu = $id("menu-vol");
            if (!menu || menu.contains(ev.target)) return;
            setMenuVol(false);
        });
    }

    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    }

    function preloadUrl(url) {
        return new Promise(function (resolve) {
            if (!url) { resolve(); return; }
            const src = asset(url);
            if (imgCache[src] && imgCache[src].complete && imgCache[src].naturalWidth) { resolve(imgCache[src]); return; }
            const img = new Image();
            img.onload = function () { imgCache[src] = img; resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = src;
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

    function urlsImagenes() {
        const urls = ["img/puerta.svg"];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) { urls.push(gameConfig.elementos[id].img); });
        Object.keys(gameConfig.escenas || {}).forEach(function (id) { urls.push(gameConfig.escenas[id]); });
        (gameConfig.niveles || []).forEach(function (n) { if (n.insignia) urls.push(n.insignia.img); });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin].filter(Boolean);
    }

    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        const edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }

    function conversacionInicial() {
        const nivel = nivelDeSesion();
        return (nivel && nivel.bienvenida) || textos().conversacion || [];
    }

    function aplicarTema(tema) {
        document.body.classList.toggle("tema-estudio", tema === "estudio");
        document.body.classList.toggle("tema-bosque", tema !== "estudio");
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        introTimers = [];
    }

    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        const conversacion = conversacionInicial();
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            const indice = Number(linea.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            return {
                personaje: id,
                nombre: id === "zoe" ? "Zoe" : "Zeus",
                color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
                texto: String(linea.texto || "")
            };
        });
    }

    function mostrarIntro3d() {
        const root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        const root = $id("intro3d-root");
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
        const root = $id("intro3d-root");
        if (!root || root.hidden) { empezarJuegoTrasIntro(); return; }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        cancelarIntroPendiente();
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        asegurarAudioFondo();
        if (typeof TextoVoz !== "undefined") TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(800);
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: (gameConfig && gameConfig.niveles) || [],
                elegirManual: elegirNivel,
                onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
            });
        } else elegirNivel();
    }

    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        let oculto = false;
        const ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "inicioDisuelve") ocultar();
        });
        setTimeout(ocultar, 1250);
    }

    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    function asegurarAudioFondo() {
        if (audioFondo) {
            const p = audioFondo.play();
            if (p && p.catch) p.catch(function () {});
            return audioFondo;
        }
        const vol = (typeof TextoVoz !== "undefined" && TextoVoz.VOLUMEN_FONDO != null) ? TextoVoz.VOLUMEN_FONDO : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, vol, true);
    }

    function atenuarFondo(si) {
        if (typeof TextoVoz === "undefined") {
            if (audioFondo) audioFondo.volume = si ? VOLUMEN_FONDO_ESCUCHA : volumenFondoPct() / 100;
            return;
        }
        TextoVoz.volumenFondo(si ? VOLUMEN_FONDO_ESCUCHA : TextoVoz.VOLUMEN_FONDO);
    }

    function reducirMovimiento() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve(null);
        const o = Object.assign({ duration: 400, easing: "ease", fill: "forwards" }, opts || {});
        if (reducirMovimiento()) o.duration = Math.min(o.duration, 120);
        let a;
        try { a = el.animate(frames, o); } catch (e) { return Promise.resolve(null); }
        return Promise.race([
            a.finished.catch(function () {}),
            sleep(o.duration + 500)
        ]).then(function () { return a; });
    }

    function crearImg(src, clase) {
        const img = document.createElement("img");
        img.src = asset(src);
        img.alt = "";
        img.draggable = false;
        if (clase) img.className = clase;
        return img;
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function reiniciarClase(el, clase, ms) {
        if (!el) return;
        el.classList.remove(clase);
        void el.offsetWidth;
        el.classList.add(clase);
        clearTimeout(el["_t_" + clase]);
        el["_t_" + clase] = setTimeout(function () { el.classList.remove(clase); }, ms || 600);
    }

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        if (!capa) return;
        const n = o.n || 10;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            const color = COLORES[i % COLORES.length];
            if (o.tipo === "nota") {
                p.innerHTML = '<i class="fa-solid fa-music" aria-hidden="true"></i>';
                p.style.color = color;
            } else if (o.tipo === "confeti") p.style.background = color;
            p.style.left = x + "px";
            p.style.top = y + "px";
            capa.appendChild(p);
            const ang = Math.random() * Math.PI * 2;
            const dist = (o.dist || 100) * (0.5 + Math.random());
            animar(p, [
                { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + Math.cos(ang) * dist + "px), calc(-50% + " + (Math.sin(ang) * dist + (o.gravedad || 0)) + "px)) scale(.4)", opacity: 0 }
            ], { duration: 800 + Math.random() * 400 }).then(function () { p.remove(); });
        }
    }

    function cambiarEscena(id) {
        const url = escenaUrl(id);
        const imgs = Array.prototype.slice.call(document.querySelectorAll("#escena-fondo .escena-capa"));
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        const destino = asset(url);
        if (!url || !actual) return;
        if (actual.getAttribute("src") === destino && actual.classList.contains("activa")) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        if (!sig) return;
        let hecho = false;
        const mostrar = function () {
            if (hecho) return;
            hecho = true;
            sig.classList.add("activa");
            actual.classList.remove("activa");
        };
        sig.onload = mostrar;
        sig.onerror = mostrar;
        sig.src = destino;
        setTimeout(mostrar, 600);
    }

    function efecto(nombre) { if (sfx()) sfx().sonar(nombre); }

    function tocarEl(id) {
        const el = elemento(id);
        const rutas = (gameConfig.audios && gameConfig.audios.sonidos) || {};
        if (el.sonido && rutas[el.sonido]) {
            reproducirAudio(rutas[el.sonido], 0.9, false);
            return;
        }
        if (sfx() && el.sonido) sfx().tocar(el.sonido, el.nota);
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        if (!dialogo || !avatar) return;
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto");
        if (estado) dialogo.classList.add("es-" + estado);
        avatar.src = avatarDe(voz, true);
        avatar.alt = voz === "zeus" ? "Zeus" : "Zoe";
        $id("enunciado").textContent = texto;
        dialogo.classList.remove("pop");
        void dialogo.offsetWidth;
        dialogo.classList.add("pop");
    }

    function silenciarAvatar() {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        if (!dialogo || !avatar) return;
        avatar.src = avatarDe(dialogo.dataset.voz === "zeus" ? "zeus" : "zoe", false);
    }

    function decir(linea, opts) {
        opts = opts || {};
        if (!linea || !linea.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = linea.voz === "zeus" ? "zeus" : "zoe";
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, linea.texto, opts.estado);
        };
        const respaldo = setTimeout(mostrar, 4000);
        let p = null;
        try {
            if (typeof TextoVoz !== "undefined") p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar });
        } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 800)]),
            sleep(12000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    function callar() {
        tokenDialogo += 1;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
    }

    async function decirLineas(x, opts) {
        const lista = L.lineas(x);
        for (let i = 0; i < lista.length; i++) await decir(lista[i], opts);
    }

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        if (typeof TextoVoz !== "undefined") TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false,
            heightAuto: false, scrollbarPadding: false, width: 420
        });
    }

    function lineasDelNivel(nivel) {
        const lista = [];
        const sumar = function (x) { L.lineas(x).forEach(function (l) { lista.push({ texto: l.texto, personaje: l.voz }); }); };
        (nivel.retos || []).forEach(function (r) { sumar(r.consigna); sumar(r.turno); sumar(r.acierto); sumar(r.error); });
        sumar(nivel.cierre);
        return lista;
    }

    function mostrarIntroActiva() {
        return window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        atacar = null;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        if (sfx()) sfx().detener();
        if (typeof TextoVoz !== "undefined" && TextoVoz.encolarFrases) TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        aplicarTema(nivelElegido.tema);
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("estacion").innerHTML = "";
        $id("estacion").style.visibility = "";
        cambiarEscena(nivelElegido.escena);
        pintarProgreso(-1);
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = (nivelElegido.retos || []).length;
        if (cont.children.length !== total) {
            cont.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const p = document.createElement("span");
                p.className = "progreso-punto";
                p.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }

    function celebrarPersonajes(si) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            const pj = $id(id);
            if (pj) pj.classList.toggle("celebra", !!si);
        });
    }

    function botonesDe(r) {
        if (r.botones && r.botones.length) return r.botones.slice();
        const ids = [];
        (r.pasos || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
        return ids;
    }

    function clasePads(r) {
        if (r.clasePads) return " " + r.clasePads;
        const n = botonesDe(r).length;
        if (n <= 2) return " pads-dos";
        if (n >= 4) return " pads-cuatro";
        return "";
    }

    function crearPad(id) {
        const el = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pad";
        b.dataset.id = id;
        b.setAttribute("aria-label", el.nombre || id);
        b.appendChild(crearImg(el.img));
        return b;
    }

    function enlazarPad(boton) {
        let ultimo = 0;
        boton.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            const ahora = performance.now();
            if (ahora - ultimo < 180) return;
            ultimo = ahora;
            if (demoActiva || !atacar) return;
            atacar(boton.dataset.id, boton);
        });
    }

    function cancelarAyuda() {
        clearTimeout(ayuda.timer);
        ayuda = { timer: null, fn: null };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function vigilarInactividad(fn, ms) {
        clearTimeout(ayuda.timer);
        ayuda.fn = fn;
        ayuda.timer = setTimeout(function () {
            if (ayuda.fn !== fn) return;
            Promise.resolve(fn());
        }, ms || 7000);
    }

    function manoTocar(el) {
        if (!window.PedniaTutorial || !el) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: el,
            holdMs: 420,
            cancelado: function () { return ayuda.fn !== fn; }
        });
    }

    function limpiarPads(pads) {
        Object.keys(pads).forEach(function (id) {
            pads[id].classList.remove("brilla", "ok", "falla", "falla-roja");
        });
    }

    async function reproducir(pasos, pads, gen, pasoMs) {
        atacar = null;
        atenuarFondo(true);
        for (let i = 0; i < pasos.length; i++) {
            if (!vivo(gen)) break;
            const boton = pads[pasos[i]];
            if (boton) boton.classList.add("brilla");
            tocarEl(pasos[i]);
            await sleep(Math.max(280, pasoMs - 140));
            if (boton) boton.classList.remove("brilla");
            await sleep(140);
        }
        atenuarFondo(false);
    }

    function marcarHechos(nodos, n) {
        Array.prototype.forEach.call(nodos, function (el, i) { el.classList.toggle("hecho", i < n); });
    }

    function esperarOrden(respuesta, gen, pads, onBien) {
        return new Promise(function (resolve) {
            let hechos = 0;
            let cerradoLocal = false;
            const fin = function (ok) {
                if (cerradoLocal) return;
                cerradoLocal = true;
                atacar = null;
                cancelarAyuda();
                resolve(!!ok && vivo(gen));
            };
            const ayudaTurno = function () { return manoTocar(pads[respuesta[hechos]]); };
            atacar = function (id, boton) {
                if (cerradoLocal || !vivo(gen)) return;
                callar();
                const res = L.evaluarOrden(respuesta, hechos, id);
                if (res.estado === "mal") {
                    boton.classList.add(onBien.fallo === "rojo" ? "falla-roja" : "falla");
                    efecto("suave");
                    fin(false);
                    return;
                }
                hechos += 1;
                boton.classList.add("ok");
                reiniciarClase(boton, "toca", 280);
                tocarEl(id);
                const c = centroDe(boton);
                particulas(c.x, c.y - 10, { n: 8, tipo: "estrella", dist: 110 });
                if (onBien.fn) onBien.fn(id, hechos);
                if (res.estado === "completo") fin(true);
                else vigilarInactividad(ayudaTurno, 6500);
            };
            vigilarInactividad(ayudaTurno, 4500);
        });
    }

    async function retoMemoria(r, gen) {
        const est = $id("estacion");
        const caja = document.createElement("div");
        caja.className = "est-mem";
        if (r.acompanante) caja.appendChild(crearImg(elemento(r.acompanante).img, "mascota"));
        if (r.festejo === "puente") caja.appendChild(crearImg("img/puerta.svg", "puerta"));
        const arco = document.createElement("div");
        arco.className = "arco";
        caja.appendChild(arco);
        const marcas = document.createElement("div");
        marcas.className = "marcas";
        const respuesta = L.respuestaDe(r);
        respuesta.forEach(function () { marcas.appendChild(document.createElement("span")); });
        const fila = document.createElement("div");
        fila.className = "pads" + clasePads(r);
        const pads = {};
        botonesDe(r).forEach(function (id) {
            const b = crearPad(id);
            fila.appendChild(b);
            pads[id] = b;
            enlazarPad(b);
        });
        caja.appendChild(marcas);
        caja.appendChild(fila);
        est.appendChild(caja);
        const mascota = caja.querySelector(".mascota");
        const puerta = caja.querySelector(".puerta");

        await decirLineas(r.consigna);
        if (!vivo(gen)) return;

        while (vivo(gen)) {
            limpiarPads(pads);
            marcarHechos(marcas.children, 0);
            await reproducir(r.pasos, pads, gen, r.pasoMs || 720);
            if (!vivo(gen)) return;
            if (r.turno) decir(r.turno);
            const ok = await esperarOrden(respuesta, gen, pads, {
                fallo: r.falloVisual,
                fn: function (id, n) {
                    marcarHechos(marcas.children, n);
                    if (mascota) reiniciarClase(mascota, "salta", 500);
                    if (r.festejo === "estrellas") {
                        const c = centroDe(pads[id]);
                        particulas(c.x, c.y - 30, { n: 6, tipo: "nota", dist: 90 });
                    }
                }
            });
            if (!vivo(gen)) return;
            if (ok) break;
            callar();
            limpiarPads(pads);
            await decir(r.error);
            await sleep(280);
        }
        if (!vivo(gen)) return;
        callar();
        if (r.festejo === "puente" && puerta) {
            puerta.classList.add("abierta");
            arco.classList.add("vivo");
            efecto("puente");
        } else if (r.festejo === "acorde") efecto("acorde");
        else if (r.festejo === "arcoiris") {
            arco.classList.add("vivo");
            efecto("arcoiris");
        } else if (r.festejo === "espejo") efecto("invertido");
        else if (r.festejo === "fanfarria") efecto("fanfarria");
        else efecto("recompensa");
        if (mascota) reiniciarClase(mascota, "salta", 700);
        celebrarPersonajes(true);
        const c = centroDe(fila);
        particulas(c.x, c.y, { n: 18, tipo: "confeti", dist: 160, gravedad: 30 });
        await sleep(400);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function iniciarReto(gen) {
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        const r = nivelElegido.retos[indiceReto];
        if (!r) { granCierre(gen); return; }
        cancelarAyuda();
        atacar = null;
        celebrarPersonajes(false);
        pintarProgreso(indiceReto);
        const est = $id("estacion");
        est.className = "estacion reto-" + r.tipo;
        est.innerHTML = "";
        est.style.opacity = "";
        await sleep(280);
        if (!vivo(gen)) return;
        await retoMemoria(r, gen);
        if (!vivo(gen)) return;
        cancelarAyuda();
        pintarProgreso(indiceReto + 1);
        await sleep(500);
        if (!vivo(gen)) return;
        await animar(est, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 });
        est.innerHTML = "";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        est.style.opacity = "";
        indiceReto += 1;
        iniciarReto(gen);
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const el = elemento(d.elemento);
        if (!el.img || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        await PedniaTutorial.activarDemo();
        const t = textos();
        const est = $id("estacion");
        est.className = "estacion reto-demo";
        const boton = crearPad(d.elemento);
        boton.id = "demo-pad";
        est.appendChild(boton);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1600 });
        if (!vivo(gen) || !demoActiva) return;
        boton.classList.add("brilla");
        tocarEl(d.elemento);
        await PedniaTutorial.animarMano({
            punto: boton,
            holdMs: 480,
            cancelado: function () { return !demoActiva || !vivo(gen); },
            onPresionar: function () {
                reiniciarClase(boton, "toca", 400);
                tocarEl(d.elemento);
                const c = centroDe(boton);
                particulas(c.x, c.y, { n: 10, tipo: "nota", dist: 120 });
            }
        });
        boton.classList.remove("brilla");
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 900 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 900 });
        detenerDemo();
        if (!vivo(gen)) return;
        est.innerHTML = "";
        iniciarReto(gen);
    }

    async function concierto(gen) {
        const bosque = nivelElegido.tema === "bosque";
        const ids = bosque
            ? ["conejo", "oso", "pajaro", "campana_rosa", "campana_celeste"]
            : ["violin", "flauta", "trompeta", "tambor"];
        $id("estacion").style.visibility = "hidden";
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        const items = {};
        ids.forEach(function (id) {
            const d = document.createElement("div");
            d.className = "concierto-item";
            d.appendChild(crearImg(elemento(id).img));
            tarima.appendChild(d);
            items[id] = d;
        });
        const caja = $id("concierto");
        caja.hidden = false;
        caja.setAttribute("aria-hidden", "false");
        await sleep(400);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        atenuarFondo(true);
        if (bosque) {
            for (let i = 0; i < ids.length; i++) {
                if (gen !== rondaGen) break;
                tocarEl(ids[i]);
                reiniciarClase(items[ids[i]], "baila", 500);
                await sleep(420);
            }
            efecto("puente");
        } else {
            ids.forEach(function (id) { tocarEl(id); reiniciarClase(items[id], "baila", 700); });
            await sleep(900);
            efecto("fanfarria");
        }
        atenuarFondo(false);
        const r = tarima.getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top, { n: 22, tipo: "confeti", dist: 220, gravedad: 40 });
        await sleep(600);
    }

    async function granCierre(gen) {
        juegoTerminado = true;
        cancelarAyuda();
        atacar = null;
        await sleep(240);
        if (gen !== rondaGen) return;
        await concierto(gen);
        if (gen !== rondaGen) return;
        await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 900 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    function prepararInsignia() {
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (!ins || !trofeo) return;
        trofeo.src = asset(ins.img);
        trofeo.alt = ins.nombre;
        trofeo.classList.add("insignia");
        trofeo.addEventListener("click", function () {
            const c = centroDe(trofeo);
            trofeo.classList.add("quieta");
            reiniciarClase(trofeo, "gira", 1000);
            efecto("chispas");
            particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 120 });
        });
    }

    function mostrarCierre() {
        const primera = (nivelElegido.cierre || [])[0] || { texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = primera.texto;
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        const ins = nivelElegido.insignia || {};
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 2600);
        setTimeout(function () {
            const cajaFinal = $id("final");
            if (cajaFinal) {
                cajaFinal.hidden = false;
                cajaFinal.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
            else if (typeof iniciarVictoria === "function") iniciarVictoria();
        }, 400);
    }

    $(document).ready(function () {
        const bruto = readText("config.json");
        const introBruto = readText("../../../intro.json");
        if (!bruto || !introBruto) {
            console.error("[MemoriaMusical] no se pudo leer config.json o intro.json");
            return;
        }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelSesion = nivelDeSesion();
        if (nivelSesion) aplicarTema(nivelSesion.tema);
        cambiarEscena((nivelSesion || gameConfig.niveles[0] || {}).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[MemoriaMusical] config:", errores);
        const btn = $id("btn-empecemos");
        if (btn) btn.addEventListener("click", empecemosJuego);
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: frasesFijasTts()
            });
        } catch (e) { console.warn("[MemoriaMusical] voz:", e); }
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        window.addEventListener("pagehide", function () {
            if (typeof TextoVoz !== "undefined" && TextoVoz.vaciar) TextoVoz.vaciar();
        });
        imagenesPromise = Promise.all(urlsImagenes().map(preloadUrl));
        sincronizarDialogoIntro3d();
        const btnOmitir = $id("btn-omitir-intro3d");
        if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
        const btnContinuar = $id("btn-continuar-intro3d");
        if (btnContinuar) btnContinuar.addEventListener("click", function (ev) {
            ev.preventDefault();
            empezarJuegoTrasIntro();
        });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
