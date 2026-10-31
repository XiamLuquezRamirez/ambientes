/* Completa La Figura — Multisensorial */
(function () {
    "use strict";

    const L = window.CompletaFiguraLogica;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrardo = false;
    let introTimers = [];
    let audioFondo = null;
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;

    let nivelElegido = null;
    let retos = [];
    let indiceReto = 0;
    let retoActual = null;
    let fase = "";
    let juegoTerminado = false;
    let bloqueado = true;
    let demoActiva = false;
    let rondaGen = 0;
    let estadoReto = { errores: 0, consecutivos: 0, reglaVisible: false };
    let escala = 1;
    let tokenDialogo = 0;
    let gesto = null;
    let timersReto = [];
    let juguetes = [];
    let inventos = [];
    let dichas = Object.create(null);

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
    function pieza(id) { return (gameConfig.piezas && gameConfig.piezas[id]) || { nombre: id, img: "", w: 40, h: 40 }; }
    function reducirMovimiento() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

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
        const panel = $id("menu-vol-panel");
        const btn = $id("btn-menu-vol");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
    }

    function pintarMenuVol() {
        const pct = volumenFondoPct();
        const slider = $id("rango-volumen");
        const val = $id("vol-val");
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
    }

    function enlazarMenuVol() {
        const btn = $id("btn-menu-vol");
        const cerrar = $id("btn-cerrar-vol");
        const slider = $id("rango-volumen");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                const panel = $id("menu-vol-panel");
                setMenuVol(panel && panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) {
            slider.addEventListener("input", function () {
                const n = Number(slider.value);
                const val = $id("vol-val");
                if (val) val.textContent = String(n);
                aplicarVolumenCalibrado(n);
            });
        }
        document.addEventListener("pointerdown", function (ev) {
            const menu = $id("menu-vol");
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
            }, 1500);
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
        const urls = [
            "../../../images/zoe_normal.gif", "../../../images/zoe_hablando.gif",
            "../../../images/zeus_normal.gif", "../../../images/zeus_hablando.gif"
        ];
        Object.keys(gameConfig.piezas || {}).forEach(function (id) { urls.push(pieza(id).img); });
        const agregarReto = function (r) {
            (r.capas || []).forEach(function (c) { urls.push(c.img); });
            if (r.hueco && r.hueco.img) urls.push(r.hueco.img);
            if (r.fantasma) urls.push(r.fantasma);
        };
        if (gameConfig.demo) agregarReto(gameConfig.demo);
        (gameConfig.niveles || []).forEach(function (n) { (n.retos || []).forEach(agregarReto); });
        return urls.filter(function (u, i, a) { return u && a.indexOf(u) === i; });
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

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
        const root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        const root = $id("intro3d-root");
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
        const root = $id("intro3d-root");
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
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        TextoVoz.desbloquear();
        if (window.CompletaFiguraSfx) CompletaFiguraSfx.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        TextoVoz.precargar();
        pantalla.classList.add("is-out");
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

    /* ── Utilidades de escena ─────────────────────────────────── */

    function u(n) { return "calc(var(--s) * " + n + "px)"; }

    function posicionar(el, r) {
        el.style.left = u(r.x);
        el.style.top = u(r.y);
        if (r.w != null) el.style.width = u(r.w);
        if (r.h != null) el.style.height = u(r.h);
        return el;
    }

    function crearImg(src, clase, r) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.draggable = false;
        if (clase) img.className = clase;
        if (r) posicionar(img, r);
        return img;
    }

    function crearDiv(clase, r, padre) {
        const d = document.createElement("div");
        d.className = clase;
        if (r) posicionar(d, r);
        if (padre) padre.appendChild(d);
        return d;
    }

    function rectPantalla(r) {
        const b = $id("escenario").getBoundingClientRect();
        return { left: b.left + r.x * escala, top: b.top + r.y * escala, width: r.w * escala, height: r.h * escala };
    }

    function puntoPantalla(x, y) {
        const b = $id("escenario").getBoundingClientRect();
        return { x: b.left + x * escala, y: b.top + y * escala };
    }

    function centroRect(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    function rectDe(el) {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve(null);
        const o = Object.assign({ duration: 400, easing: "ease", fill: "forwards" }, opts || {});
        if (reducirMovimiento()) o.duration = Math.min(o.duration, 120);
        let a;
        try { a = el.animate(frames, o); } catch (e) { return Promise.resolve(null); }
        return Promise.race([
            a.finished.catch(function () {}),
            sleep(o.duration * (o.iterations && isFinite(o.iterations) ? o.iterations : 1) + (o.delay || 0) + 600)
        ]).then(function () { return a; });
    }

    /** Anima y deja el estado final como estilo en línea (sin acumular animaciones con fill). */
    function animarFijo(el, frames, opts) {
        return animar(el, frames, opts).then(function (a) {
            if (!a) return;
            try { a.commitStyles(); } catch (e) { /* noop */ }
            try { a.cancel(); } catch (e2) { /* noop */ }
        });
    }

    function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = crearImg(src, "vuelo " + (opts.clase || ""));
        el.style.left = desde.left + "px";
        el.style.top = desde.top + "px";
        el.style.width = desde.width + "px";
        el.style.height = desde.height + "px";
        $id("capa-efectos").appendChild(el);
        const frames = [{
            left: desde.left + "px", top: desde.top + "px", width: desde.width + "px", height: desde.height + "px",
            transform: "rotate(0deg)"
        }];
        if (opts.arco) {
            frames.push({
                offset: 0.5,
                left: (desde.left + hasta.left) / 2 + "px",
                top: Math.min(desde.top, hasta.top) - opts.arco + "px",
                width: (desde.width + hasta.width) / 2 + "px",
                height: (desde.height + hasta.height) / 2 + "px",
                transform: "rotate(" + ((opts.giro || 0) / 2) + "deg)"
            });
        }
        frames.push({
            left: hasta.left + "px", top: hasta.top + "px", width: hasta.width + "px", height: hasta.height + "px",
            transform: "rotate(" + (opts.giro || 0) + "deg)"
        });
        return animar(el, frames, { duration: opts.ms || 650, easing: opts.easing || "cubic-bezier(.3,.7,.3,1)" })
            .then(function () {
                if (!opts.conservar) el.remove();
                return el;
            });
    }

    const COLORES_CONFETI = ["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = o.n || 14;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            p.style.left = x + "px";
            p.style.top = y + "px";
            if (o.tipo === "confeti") p.style.background = COLORES_CONFETI[i % COLORES_CONFETI.length];
            capa.appendChild(p);
            const ang = o.angulo != null
                ? o.angulo + (Math.random() - 0.5) * (o.abanico != null ? o.abanico : 1)
                : Math.random() * Math.PI * 2;
            const dist = (o.dist || 90) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            animar(p, [
                { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(.35) rotate(" + Math.round(Math.random() * 360) + "deg)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    function programar(fn, ms) {
        const id = setTimeout(fn, ms);
        timersReto.push(id);
        return id;
    }

    function intervalo(fn, ms) {
        const id = setInterval(fn, ms);
        timersReto.push(id);
        return id;
    }

    function limpiarTimers() {
        timersReto.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        timersReto = [];
    }

    /* ── Sonido y voz ─────────────────────────────────────────── */

    function efecto(nombre) {
        if (!nombre) return;
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const ruta = efectos[nombre];
        if (ruta) {
            const a = reproducirAudio(ruta, 0.85, false);
            if (a) setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, 3000);
            return;
        }
        if (window.CompletaFiguraSfx) CompletaFiguraSfx.sonar(nombre);
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        const enunciado = $id("enunciado");
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto", "es-error");
        if (estado) dialogo.classList.add("es-" + estado);
        avatar.src = avatarDe(voz, true);
        avatar.alt = voz === "zeus" ? "Zeus" : "Zoe";
        enunciado.textContent = texto;
        dialogo.classList.remove("pop");
        void dialogo.offsetWidth;
        dialogo.classList.add("pop");
    }

    function silenciarAvatar() {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        avatar.src = avatarDe(dialogo.dataset.voz === "zeus" ? "zeus" : "zoe", false);
    }

    /**
     * Muestra el texto cuando la voz empieza de verdad (no antes) y resuelve cuando termina.
     * destino "alerta" pinta el texto en el aviso amarillo del escáner en vez del diálogo.
     */
    function decir(linea, opts) {
        opts = opts || {};
        if (!linea || !linea.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = linea.voz === "zeus" ? "zeus" : "zoe";
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            if (opts.destino === "alerta") mostrarAlerta(linea.texto);
            else pintarDialogo(voz, linea.texto, opts.estado);
        };
        const respaldo = setTimeout(mostrar, 6000);
        let p;
        try { p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 1200)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    /** Instrucciones de botones: solo la primera vez en el reto (los reintentos no repiten la consigna). */
    function decirUnaVez(clave, linea) {
        if (dichas[clave]) return Promise.resolve();
        dichas[clave] = true;
        return decir(linea);
    }

    function mostrarAlerta(texto) {
        const al = $id("alerta");
        $id("alerta-texto").textContent = texto;
        al.hidden = false;
        al.classList.remove("visible");
        void al.offsetWidth;
        al.classList.add("visible");
    }

    function ocultarAlerta() {
        const al = $id("alerta");
        al.classList.remove("visible");
        al.hidden = true;
    }

    function bloquear(si) {
        bloqueado = !!si;
        document.body.classList.toggle("juego-bloqueado", bloqueado);
    }

    /* ── Edad / nivel ─────────────────────────────────────────── */

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : "primary";
            botones +=
                '<div class="col-12 text-center mb-2">' +
                '<button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')">' +
                "<strong>" + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
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

    function lineasDelNivel(nivel) {
        const lineas = [];
        const sumar = function (l) { if (l && l.texto) lineas.push({ texto: l.texto, personaje: l.voz || "zoe" }); };
        const t = textos();
        [t.demostracion, t.demostracionAcierto, t.demostracionFin].forEach(function (x) {
            if (x) lineas.push({ texto: x, personaje: "zoe" });
        });
        (nivel.retos || []).forEach(function (r) {
            sumar(r.presentacion);
            sumar(r.acierto);
            sumar(r.descubierta);
            sumar(r.inflar);
            sumar(r.instruccionGrua);
            sumar(r.instruccionClima);
            if (r.lodo) sumar(r.lodo.ayuda);
            Object.keys(r.errores || {}).forEach(function (k) { sumar(r.errores[k]); });
        });
        if (nivel.cierre) lineas.push({ texto: nivel.cierre, personaje: "zoe" });
        return lineas;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        juegoTerminado = false;
        bloquear(true);
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        retos = (nivelElegido.retos || []).slice();
        indiceReto = 0;
        juguetes = [];
        inventos = [];
        aplicarTema();
        const gen = rondaGen;
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva() && gameConfig.demo) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    function aplicarTema() {
        const tema = nivelElegido.tema;
        document.body.classList.toggle("tema-taller", tema === "taller");
        document.body.classList.toggle("tema-ingenieria", tema === "ingenieria");
        $id("estante").hidden = tema !== "taller";
        $id("medidor").hidden = tema !== "ingenieria";
        actualizarProgreso();
    }

    function actualizarProgreso() {
        const hechos = nivelElegido && nivelElegido.tema === "taller" ? juguetes.length : inventos.length;
        const total = retos.length || 3;
        $id("barra-relleno").style.width = Math.round(hechos / total * 100) + "%";
        document.querySelectorAll("#medidor .medidor-barra span").forEach(function (s, i) {
            s.classList.toggle("lleno", i < hechos);
        });
    }

    /* ── Escala: figura y piezas comparten la misma escala ─────── */

    function usaControles(reto) {
        return reto && (reto.mecanica === "lodo" || reto.mecanica === "clima");
    }

    function calcularEscala() {
        if (!retoActual) return;
        const ids = retoActual.opciones || [];
        const n = Math.max(1, ids.length);
        let sumaW = 0;
        let maxH = 0;
        ids.forEach(function (id) {
            const p = pieza(id);
            sumaW += p.w;
            maxH = Math.max(maxH, p.h);
        });
        const W = window.innerWidth;
        const H = window.innerHeight;
        const barra = document.querySelector(".barra-superior");
        const fijo = (barra ? barra.offsetHeight : 0) + $id("dialogo").offsetHeight + 72;
        const relleno = 26;
        const hueco = 14;
        const extremos = retoActual.mesa === "cinta" ? 120 : 0;
        const arriba = retoActual.mecanica === "clima" ? 50 : 0;
        const sH = (H - fijo - relleno - 24) / (240 + arriba + maxH);
        const sStage = (W - (usaControles(retoActual) ? 240 : 24)) / 300;
        const sMesa = (W - 32 - 24 - extremos - (n - 1) * hueco - n * relleno) / Math.max(1, sumaW);
        escala = Math.max(0.45, Math.min(2.1, sH, sStage, sMesa));
        document.documentElement.style.setProperty("--s", escala.toFixed(3));
        $id("escenario").style.marginTop = u(arriba);
        $id("mesa").style.minHeight = Math.round(maxH * escala + relleno + 24) + "px";
        if (fase === "limpiar") ajustarLodo(false);
    }

    /* ── Pintar figura y piezas ───────────────────────────────── */

    function pintarFigura(reto) {
        const fig = $id("figura");
        const extras = $id("extras");
        fig.innerHTML = "";
        extras.innerHTML = "";
        fig.getAnimations().forEach(function (a) { a.cancel(); });
        fig.style.transform = "";
        fig.style.opacity = "";
        fig.className = "figura figura-" + reto.figura + " mec-" + reto.mecanica;
        $id("escenario").className = "escenario esc-" + reto.figura + " esc-" + reto.mecanica;

        (reto.capas || []).forEach(function (c) {
            const r = c.x != null ? { x: c.x, y: c.y, w: c.w, h: c.h } : { x: 0, y: 0, w: 300, h: 240 };
            fig.appendChild(crearImg(c.img, "capa " + (c.clase || ""), r));
        });

        const h = reto.hueco;
        const hu = crearDiv("hueco" + (h.forma ? " hueco-" + h.forma : ""), h, fig);
        if (h.img) hu.appendChild(crearImg(h.img, "hueco-img"));

        (reto.luces || []).forEach(function (l) { crearDiv("luz", l, fig); });

        if (reto.escape) {
            const esc = crearDiv("escape-marca", { x: reto.escape.x, y: reto.escape.y, w: 2, h: 2 }, fig);
            esc.setAttribute("aria-hidden", "true");
        }
        if (reto.charco) crearDiv("charco", reto.charco, extras);
        if (reto.mecanica === "simetria") pintarSimetria(reto);
        if (reto.mecanica === "calibrador") pintarRampa(reto);
        if (reto.mecanica === "clima") pintarPlataforma(reto);
    }

    function insertarColocada(img) {
        const fig = $id("figura");
        const esAla = /\bala\b/.test(img.className);
        const cuerpo = fig.querySelector(".capa.cuerpo");
        if (esAla && cuerpo) fig.insertBefore(img, cuerpo);
        else fig.insertBefore(img, fig.querySelector(".hueco"));
        return img;
    }

    function colocarEnFigura(id, r) {
        const img = crearImg(pieza(id).img, "colocada " + (retoActual.colocada || ""), r);
        img.dataset.pieza = id;
        return insertarColocada(img);
    }

    function pintarPiezas(ids, entrada) {
        const zona = $id("zona-piezas");
        zona.innerHTML = "";
        ids.forEach(function (id, i) {
            const m = pieza(id);
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza";
            b.dataset.pieza = id;
            b.setAttribute("aria-label", m.nombre || id);
            b.style.setProperty("--i", i);
            const img = crearImg(m.img, "pieza-img");
            img.style.width = u(m.w);
            img.style.height = u(m.h);
            b.appendChild(img);
            const tag = document.createElement("span");
            tag.className = "medida-tag";
            tag.hidden = true;
            b.appendChild(tag);
            b.addEventListener("pointerdown", function (ev) { iniciarGesto(ev, id, b); });
            b.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    elegir(id, b, null);
                }
            });
            zona.appendChild(b);
        });
        const mesa = $id("mesa");
        mesa.classList.remove("cinta-entrando");
        if (entrada === "cinta") {
            void mesa.offsetWidth;
            mesa.classList.add("cinta-entrando");
            setTimeout(function () { mesa.classList.remove("cinta-entrando"); }, 2200);
        }
    }

    function cartaDe(id) {
        return document.querySelector('#zona-piezas .pieza[data-pieza="' + id + '"]');
    }

    function rectImgCarta(card) {
        return rectDe(card.querySelector(".pieza-img"));
    }

    /* ── Gestos: tocar o arrastrar ────────────────────────────── */

    function puedeElegir() {
        return !bloqueado && !juegoTerminado && !demoActiva && !!retoActual && fase === "elegir";
    }

    function huecoPantalla() {
        return rectPantalla(retoActual.hueco);
    }

    function iniciarGesto(ev, id, card) {
        if (ev.button > 0) return;
        ev.preventDefault();
        if (!puedeElegir() || gesto) return;
        try { card.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        const r = rectImgCarta(card);
        gesto = {
            id: id, card: card, x0: ev.clientX, y0: ev.clientY, clon: null,
            offX: ev.clientX - r.left, offY: ev.clientY - r.top, w: r.width, h: r.height, imantado: false
        };
        card.addEventListener("pointermove", moverGesto);
        card.addEventListener("pointerup", soltarGesto);
        card.addEventListener("pointercancel", cancelarGesto);
    }

    function quitarEscuchasGesto(card) {
        card.removeEventListener("pointermove", moverGesto);
        card.removeEventListener("pointerup", soltarGesto);
        card.removeEventListener("pointercancel", cancelarGesto);
    }

    function moverGesto(ev) {
        if (!gesto) return;
        const dx = ev.clientX - gesto.x0;
        const dy = ev.clientY - gesto.y0;
        if (!gesto.clon) {
            if (!retoActual.arrastre || L.clasificarGesto(dx, dy) !== "arrastre") return;
            const clon = crearImg(pieza(gesto.id).img, "vuelo arrastrada");
            clon.style.width = gesto.w + "px";
            clon.style.height = gesto.h + "px";
            $id("capa-efectos").appendChild(clon);
            gesto.clon = clon;
            gesto.card.classList.add("usada");
        }
        let left = ev.clientX - gesto.offX;
        let top = ev.clientY - gesto.offY;
        const hr = huecoPantalla();
        const c = centroRect(hr);
        const imantar = !!retoActual.iman && L.cercaDe({ x: ev.clientX, y: ev.clientY }, c, Math.max(hr.width, 40) * 1.3);
        if (imantar) {
            left = c.x - gesto.w / 2;
            top = c.y - gesto.h / 2;
        }
        gesto.clon.classList.toggle("imantada", imantar);
        gesto.imantado = imantar;
        gesto.clon.style.left = left + "px";
        gesto.clon.style.top = top + "px";
    }

    function sobreHueco(x, y) {
        const hr = huecoPantalla();
        const m = Math.max(hr.width, hr.height) * 0.35 + 20;
        return x >= hr.left - m && x <= hr.left + hr.width + m && y >= hr.top - m && y <= hr.top + hr.height + m;
    }

    function soltarGesto(ev) {
        if (!gesto) return;
        const g = gesto;
        gesto = null;
        quitarEscuchasGesto(g.card);
        if (!g.clon) {
            elegir(g.id, g.card, null);
            return;
        }
        if (g.imantado || sobreHueco(ev.clientX, ev.clientY)) {
            elegir(g.id, g.card, g.clon);
            return;
        }
        devolverClon(g.clon, g.card);
    }

    function cancelarGesto() {
        if (!gesto) return;
        const g = gesto;
        gesto = null;
        quitarEscuchasGesto(g.card);
        if (g.clon) devolverClon(g.clon, g.card);
    }

    function devolverClon(clon, card) {
        const desde = rectDe(clon);
        clon.remove();
        return volar(clon.src, desde, rectImgCarta(card), { ms: 380 }).then(function () {
            card.classList.remove("usada");
        });
    }

    /** Lleva la pieza (desde la carta o desde donde se soltó) hasta un rect de la escena. */
    function llevarPieza(id, card, clon, destino, opts) {
        opts = opts || {};
        const desde = clon ? rectDe(clon) : rectImgCarta(card);
        if (clon) clon.remove();
        card.classList.add("usada");
        return volar(pieza(id).img, desde, opts.hastaPantalla || rectPantalla(destino), opts);
    }

    /** Rect en pantalla de una pieza centrada sobre un elemento (sirve aunque la figura esté rotada). */
    function rectCentradoEn(el, p) {
        const c = centroRect(rectDe(el));
        return { left: c.x - p.w * escala / 2, top: c.y - p.h * escala / 2, width: p.w * escala, height: p.h * escala };
    }

    function devolverPieza(card, el, opts) {
        opts = opts || {};
        if (!el) {
            card.classList.remove("usada");
            return Promise.resolve();
        }
        const desde = rectDe(el);
        const src = el.src;
        el.remove();
        return volar(src, desde, rectImgCarta(card), { ms: opts.ms || 520, arco: opts.arco || 40 }).then(function () {
            card.classList.remove("usada");
            animar(card, [{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }], { duration: 260, fill: "none" });
        });
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    function limpiarReto() {
        limpiarTimers();
        fase = "";
        dichas = Object.create(null);
        estadoReto = { errores: 0, consecutivos: 0, reglaVisible: false };
        ocultarAlerta();
        ["btn-bomba", "btn-grua", "btn-clima"].forEach(function (b) {
            const el = $id(b);
            el.hidden = true;
            el.classList.remove("pulso");
        });
        const lodo = $id("lodo");
        lodo.hidden = true;
        lodo.classList.remove("visible", "limpio");
        $id("capa-efectos").innerHTML = "";
        $id("zona-piezas").classList.remove("bajo-lodo");
        document.querySelectorAll(".regla-holo").forEach(function (r) { r.remove(); });
    }

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        retoActual = retos[indiceReto] || null;
        if (!retoActual) {
            granFinal(gen);
            return;
        }
        limpiarReto();
        bloquear(true);
        const reto = retoActual;
        $id("mesa").className = "mesa mesa-" + (reto.mesa || (nivelElegido.tema === "taller" ? "madera" : "banco"));
        pintarFigura(reto);
        if (reto.mecanica === "lodo") $id("zona-piezas").classList.add("bajo-lodo");
        pintarPiezas(L.barajar(reto.opciones), reto.mesa === "cinta" ? "cinta" : "");
        calcularEscala();
        animar($id("figura"), [{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1)" }], { duration: 450, fill: "none" });

        if (reto.mecanica === "lodo") {
            await introLodo(gen);
            return;
        }
        await decir(reto.presentacion);
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    async function elegir(id, card, clon) {
        if (!puedeElegir()) {
            if (clon) devolverClon(clon, card);
            return;
        }
        bloquear(true);
        const gen = rondaGen;
        const reto = retoActual;
        const ok = id === reto.correcta;
        ocultarAlerta();
        try {
            const m = MECANICAS[reto.mecanica];
            await m(id, card, clon, ok, gen);
        } catch (e) {
            console.error(e);
            if (vivo(gen)) {
                card.classList.remove("usada");
                fase = "elegir";
                bloquear(false);
            }
        }
    }

    function registrarError(id) {
        estadoReto.errores += 1;
        const e = (retoActual.errores || {})[id] || {};
        if (e.tipo === "tamano") estadoReto.consecutivos += 1;
        else if (e.tipo === "forma") estadoReto.consecutivos = 0;
        if (!estadoReto.reglaVisible && L.debeMostrarRegla(estadoReto, nivelElegido.reglas)) {
            estadoReto.reglaVisible = true;
            mostrarRegla();
        }
    }

    function lineaError(id) {
        return (retoActual.errores || {})[id] || null;
    }

    async function retoCompletado(gen) {
        if (!vivo(gen)) return;
        fase = "";
        if (nivelElegido.tema === "taller") await guardarJuguete();
        else guardarInvento();
        actualizarProgreso();
        await sleep(500);
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Martillo mágico (3-4) ────────────────────────────────── */

    function martillazo(x, y) {
        if (nivelElegido.tema !== "taller") return Promise.resolve();
        const m = document.createElement("i");
        m.className = "fa-solid fa-hammer martillo-magico";
        m.style.left = x + "px";
        m.style.top = y + "px";
        $id("capa-efectos").appendChild(m);
        return animar(m, [
            { transform: "translate(-20%,-90%) rotate(-50deg)", opacity: 0 },
            { transform: "translate(-20%,-90%) rotate(-50deg)", opacity: 1, offset: 0.15 },
            { transform: "translate(-20%,-90%) rotate(15deg)", offset: 0.35 },
            { transform: "translate(-20%,-90%) rotate(-40deg)", offset: 0.6 },
            { transform: "translate(-20%,-90%) rotate(15deg)", offset: 0.8, opacity: 1 },
            { transform: "translate(-20%,-90%) rotate(0deg)", opacity: 0 }
        ], { duration: 900 }).then(function () {
            particulas(x, y, { n: 10, tipo: "estrella", dist: 60 });
            m.remove();
        });
    }

    /* ── Mecánica 3-4: encaje (mariposa y casa) ───────────────── */

    async function encaje(id, card, clon, ok, gen) {
        const reto = retoActual;
        const p = pieza(id);
        if (ok) {
            const destino = L.rectColocacion(reto.hueco, p, "hueco");
            if (reto.figura === "casa") {
                await techoParacaidas(id, card, clon, destino, gen);
            } else {
                efecto(reto.acierto.efecto);
                await llevarPieza(id, card, clon, destino, { arco: 90, ms: 900, giro: 360 });
                colocarEnFigura(id, destino);
                $id("figura").querySelector(".hueco").classList.add("oculto");
                const c = centroRect(rectPantalla(destino));
                particulas(c.x, c.y, { n: 18, tipo: "estrella", dist: 110 });
                await martillazo(c.x - 10, c.y);
            }
            if (!vivo(gen)) return;
            await celebrar(reto, gen);
            await retoCompletado(gen);
            return;
        }

        const e = lineaError(id) || {};
        if (e.reaccion === "caeLado") await caeDeLado(id, card, clon);
        else await rebote(id, card, clon);
        registrarError(id);
        await decir(e, { estado: "error" });
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    /** La pieza intenta entrar en el hueco y rebota (¡Boing!) de vuelta a la mesa. */
    async function rebote(id, card, clon) {
        const destino = L.rectColocacion(retoActual.hueco, pieza(id), "centro");
        await llevarPieza(id, card, clon, destino, { arco: 50, ms: 520 });
        const fantasma = crearImg(pieza(id).img, "vuelo");
        const r = rectPantalla(destino);
        Object.assign(fantasma.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
        $id("capa-efectos").appendChild(fantasma);
        efecto("boing");
        await animar(fantasma, [
            { transform: "scale(1,1)" },
            { transform: "scale(1.15,.8)", offset: 0.25 },
            { transform: "translateY(-30px) scale(.9,1.1)", offset: 0.6 },
            { transform: "scale(1,1)" }
        ], { duration: 420, easing: "ease-out" });
        await devolverPieza(card, fantasma, { arco: 70, ms: 560 });
    }

    /** La pieza queda sobre las paredes y se cae hacia un lado. */
    async function caeDeLado(id, card, clon) {
        const destino = L.rectColocacion(retoActual.hueco, pieza(id), "base");
        await llevarPieza(id, card, clon, destino, { arco: 60, ms: 600 });
        const r = rectPantalla(destino);
        const el = crearImg(pieza(id).img, "vuelo");
        Object.assign(el.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", transformOrigin: "100% 100%" });
        $id("capa-efectos").appendChild(el);
        await animar(el, [
            { transform: "rotate(0deg)" },
            { transform: "rotate(-6deg)", offset: 0.3 },
            { transform: "rotate(4deg)", offset: 0.5 },
            { transform: "rotate(0deg)" }
        ], { duration: 600 });
        await animarFijo(el, [
            { transform: "rotate(0deg) translate(0,0)" },
            { transform: "rotate(80deg) translate(" + 40 * escala + "px," + 10 * escala + "px)" }
        ], { duration: 520, easing: "cubic-bezier(.5,0,.9,.5)" });
        efecto("golpe");
        await sleep(350);
        await devolverPieza(card, el, { arco: 50, ms: 560 });
    }

    /** El techo baja como paracaídas, se mece y encaja (¡Clic!). */
    async function techoParacaidas(id, card, clon, destino, gen) {
        const caida = 70;
        const arriba = { x: destino.x, y: destino.y - caida, w: destino.w, h: destino.h };
        await llevarPieza(id, card, clon, arriba, { arco: 40, ms: 700 });
        if (!vivo(gen)) return;
        const techo = colocarEnFigura(id, destino);
        techo.classList.add("bajando");
        const para = crearDiv("paracaidas", { x: destino.x + destino.w / 2 - 34, y: destino.y - 52, w: 68, h: 56 }, $id("figura"));
        const dy = -caida * escala;
        await Promise.all([
            animar(techo, [
                { transform: "translateY(" + dy + "px) rotate(-5deg)" },
                { transform: "translateY(" + dy * 0.66 + "px) rotate(5deg)", offset: 0.33 },
                { transform: "translateY(" + dy * 0.33 + "px) rotate(-4deg)", offset: 0.66 },
                { transform: "translateY(0) rotate(0deg)" }
            ], { duration: 1800, easing: "ease-in-out", fill: "none" }),
            animar(para, [
                { transform: "translateY(" + dy + "px) rotate(-5deg)", opacity: 1 },
                { transform: "translateY(" + dy * 0.66 + "px) rotate(5deg)", offset: 0.33 },
                { transform: "translateY(" + dy * 0.33 + "px) rotate(-4deg)", offset: 0.66 },
                { transform: "translateY(0) rotate(0deg)", opacity: 1, offset: 0.9 },
                { transform: "translateY(-10px) rotate(0deg)", opacity: 0 }
            ], { duration: 1800, easing: "ease-in-out" })
        ]);
        para.remove();
        techo.classList.remove("bajando");
        efecto(retoActual.acierto.efecto);
        $id("figura").querySelector(".hueco").classList.add("oculto");
        const c = centroRect(rectPantalla(destino));
        particulas(c.x, c.y + destino.h * escala * 0.3, { n: 12, tipo: "polvo", dist: 80 });
        await martillazo(c.x, c.y + destino.h * escala * 0.3);
    }

    /* ── Celebraciones ────────────────────────────────────────── */

    async function celebrar(reto, gen) {
        const tipo = reto.acierto && reto.acierto.celebracion;
        const voz = reto.acierto && reto.acierto.texto ? decir(reto.acierto, { estado: "acierto" }) : Promise.resolve();
        let anim = Promise.resolve();
        if (tipo === "mariposaVuela") anim = mariposaVuela(false);
        else if (tipo === "acrobacias") anim = mariposaVuela(true);
        else if (tipo === "casaIlumina") anim = casaIlumina();
        else if (tipo === "carroArranca") anim = carroArranca();
        else if (tipo === "pruebaAceleracion") anim = pruebaAceleracion();
        await Promise.all([voz, anim]);
        if (!vivo(gen)) return;
        const fig = $id("figura");
        fig.classList.remove("viva", "andando");
    }

    function emitirDesde(el, ms, cada, opts) {
        const fin = Date.now() + ms;
        const id = setInterval(function () {
            if (Date.now() > fin || !el.isConnected) {
                clearInterval(id);
                return;
            }
            const r = el.getBoundingClientRect();
            particulas(r.left + r.width / 2, r.top + r.height / 2, opts);
        }, cada);
        timersReto.push(id);
    }

    async function mariposaVuela(acrobatica) {
        const fig = $id("figura");
        fig.classList.add("viva");
        const W = window.innerWidth;
        const H = window.innerHeight;
        emitirDesde(fig, acrobatica ? 3600 : 4200, 140, { n: 3, tipo: "polvo", dist: 40, gravedad: 30 });
        if (acrobatica) {
            await animar(fig, [
                { transform: "translate(0,0) rotate(0deg)" },
                { transform: "translate(0," + -H * 0.18 + "px) rotate(0deg)", offset: 0.15 },
                { transform: "translate(" + -W * 0.18 + "px," + -H * 0.24 + "px) rotate(-360deg) scale(.85)", offset: 0.4 },
                { transform: "translate(0," + -H * 0.18 + "px) rotate(-360deg) scale(.85)", offset: 0.5 },
                { transform: "translate(" + W * 0.18 + "px," + -H * 0.24 + "px) rotate(0deg) scale(.85)", offset: 0.75 },
                { transform: "translate(0," + -H * 0.18 + "px) rotate(0deg) scale(.9)", offset: 0.88 },
                { transform: "translate(0,0) rotate(0deg) scale(1)" }
            ], { duration: 3600, easing: "ease-in-out", fill: "none" });
        } else {
            await animar(fig, [
                { transform: "translate(0,0) rotate(0deg)" },
                { transform: "translate(" + -W * 0.25 + "px," + -H * 0.12 + "px) rotate(-12deg) scale(.8)", offset: 0.25 },
                { transform: "translate(" + W * 0.05 + "px," + -H * 0.26 + "px) rotate(8deg) scale(.75)", offset: 0.5 },
                { transform: "translate(" + W * 0.27 + "px," + -H * 0.05 + "px) rotate(12deg) scale(.8)", offset: 0.75 },
                { transform: "translate(0,0) rotate(0deg) scale(1)" }
            ], { duration: 4200, easing: "ease-in-out", fill: "none" });
        }
    }

    async function casaIlumina() {
        const fig = $id("figura");
        fig.querySelectorAll(".luz").forEach(function (l) { l.classList.add("encendida"); });
        const reto = retoActual;
        if (reto.humo) {
            const humo = function () {
                const p = puntoPantalla(reto.humo.x, reto.humo.y);
                const b = document.createElement("span");
                b.className = "humo";
                b.style.left = p.x + "px";
                b.style.top = p.y + "px";
                $id("capa-efectos").appendChild(b);
                animar(b, [
                    { transform: "translate(-50%,-50%) scale(.4)", opacity: 0.9 },
                    { transform: "translate(calc(-50% + 18px), calc(-50% - 70px)) scale(1.6)", opacity: 0 }
                ], { duration: 1800, easing: "ease-out" }).then(function () { b.remove(); });
            };
            humo();
            intervalo(humo, 420);
        }
        if (reto.ventana) {
            const v = crearDiv("ventana-personajes", reto.ventana, fig);
            v.appendChild(crearImg("../../../images/zoe_normal.gif", "asoma asoma-zoe"));
            v.appendChild(crearImg("../../../images/zeus_normal.gif", "asoma asoma-zeus"));
            void v.offsetWidth;
            v.classList.add("saludando");
        }
        await sleep(2600);
    }

    async function carroArranca() {
        const fig = $id("figura");
        fig.classList.remove("roncando");
        fig.classList.add("andando");
        efecto("vroom");
        await sleep(450);
        efecto("vroom");
        const esc = fig.querySelector(".escape-marca");
        if (esc) emitirDesde(esc, 1500, 70, { n: 4, tipo: "confeti", angulo: Math.PI, abanico: 1.2, dist: 90 });
        await animar(fig, [
            { transform: "translateX(0)" },
            { transform: "translateX(-14px)", offset: 0.12 },
            { transform: "translateX(" + window.innerWidth * 1.1 + "px)" }
        ], { duration: 1700, easing: "cubic-bezier(.5,0,.8,.4)" });
        fig.getAnimations().forEach(function (a) { a.cancel(); });
        fig.classList.remove("andando");
        fig.querySelectorAll(".colocada").forEach(function (c) { c.classList.remove("desinflada"); });
        await animar(fig, [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 400, fill: "none" });
    }

    async function pruebaAceleracion() {
        const fig = $id("figura");
        const W = window.innerWidth;
        fig.classList.add("andando");
        efecto("vroom");
        emitirDesde(fig.querySelector(".capa.cuerpo"), 1200, 90, { n: 2, tipo: "polvo", angulo: Math.PI, abanico: 0.6, dist: 70 });
        await animar(fig, [{ transform: "translateX(0)" }, { transform: "translateX(" + W * 1.05 + "px)" }], { duration: 1300, easing: "cubic-bezier(.5,0,.9,.6)" });
        efecto("vroom");
        await animar(fig, [{ transform: "translateX(" + -W * 1.05 + "px)" }, { transform: "translateX(0)" }], { duration: 1200, easing: "cubic-bezier(.1,.5,.3,1)" });
        fig.getAnimations().forEach(function (a) { a.cancel(); });
        fig.classList.remove("andando");
    }

    /* ── Estante (3-4) e inventos (5-6) ───────────────────────── */

    function clonarFigura(s) {
        const fig = $id("figura");
        const copia = fig.cloneNode(true);
        copia.removeAttribute("id");
        copia.classList.remove("viva", "andando", "roncando");
        copia.style.transform = "";
        copia.style.opacity = "";
        copia.querySelectorAll(".hueco, .paracaidas, .escape-marca, .ventana-personajes, .eje-simetria, .fantasma, .marco-prueba, .calibrador").forEach(function (n) { n.remove(); });
        const mini = document.createElement("div");
        mini.className = "mini mini-" + retoActual.figura;
        mini.style.setProperty("--s", s);
        mini.style.width = 300 * s + "px";
        mini.style.height = 240 * s + "px";
        mini.appendChild(copia);
        return mini;
    }

    async function guardarJuguete() {
        const huecos = document.querySelectorAll("#estante .estante-hueco");
        const destino = huecos[juguetes.length];
        if (!destino) return;
        const dr = destino.getBoundingClientRect();
        const sMini = Math.min(dr.width / 300, dr.height / 240);
        const origen = $id("escenario").getBoundingClientRect();
        const volador = clonarFigura(escala);
        Object.assign(volador.style, { position: "fixed", left: origen.left + "px", top: origen.top + "px", transformOrigin: "0 0", zIndex: 60 });
        $id("capa-efectos").appendChild(volador);
        $id("figura").style.opacity = "0";
        const fx = dr.left + (dr.width - 300 * sMini) / 2;
        const fy = dr.top + (dr.height - 240 * sMini) / 2;
        await animar(volador, [
            { transform: "translate(0,0) scale(1)" },
            { transform: "translate(" + (fx - origen.left) + "px," + (fy - origen.top) + "px) scale(" + sMini / escala + ")" }
        ], { duration: 900, easing: "cubic-bezier(.4,.1,.3,1)" });
        volador.remove();
        const mini = clonarFigura(sMini);
        destino.appendChild(mini);
        destino.classList.add("ocupado");
        juguetes.push(mini);
        efecto("magia");
    }

    function guardarInvento() {
        inventos.push(clonarFigura(1));
    }

    /* ── Regla holográfica (5-6) ──────────────────────────────── */

    function mostrarRegla() {
        const reto = retoActual;
        const h = reto.hueco;
        const medida = reto.medida;
        const cm = L.medidaCm(h, medida === "alto" ? "alto" : "ancho");
        const regla = document.createElement("div");
        regla.className = "regla-holo regla-" + (medida === "alto" ? "vertical" : "horizontal");
        if (medida === "alto") posicionar(regla, { x: h.x + h.w + 6, y: h.y, w: 14, h: h.h });
        else if (medida === "diametro") posicionar(regla, { x: h.x, y: h.y + h.h + 6, w: h.w, h: 14 });
        else posicionar(regla, { x: h.x, y: h.y - 20, w: h.w, h: 14 });
        regla.style.setProperty("--marcas", cm);
        const etiqueta = document.createElement("span");
        etiqueta.className = "regla-etiqueta";
        etiqueta.textContent = cm + " cm";
        regla.appendChild(etiqueta);
        $id("extras").appendChild(regla);
        document.querySelectorAll("#zona-piezas .pieza").forEach(function (card) {
            const p = pieza(card.dataset.pieza);
            const v = L.medidaCm(p, medida === "alto" ? "alto" : "ancho");
            const tag = card.querySelector(".medida-tag");
            tag.textContent = v + " cm";
            tag.hidden = false;
        });
        efecto("escaner");
    }

    /* ── Mecánica 5-6: escáner de simetría ────────────────────── */

    function pintarSimetria(reto) {
        const fig = $id("figura");
        crearDiv("marco-prueba", reto.hueco, fig);
        const eje = crearDiv("eje-simetria", { x: reto.ejeX - 1, y: reto.hueco.y - 14, w: 2, h: reto.hueco.h + 28 }, fig);
        eje.hidden = true;
        const fantasma = crearImg(reto.fantasma, "fantasma", { x: 0, y: 0, w: 300, h: 240 });
        fantasma.hidden = true;
        fig.appendChild(fantasma);
    }

    async function simetria(id, card, clon, ok, gen) {
        const reto = retoActual;
        const p = pieza(id);
        const destino = L.rectColocacion(reto.hueco, p, "izquierda");
        await llevarPieza(id, card, clon, destino, { arco: 60, ms: 700 });
        if (!vivo(gen)) return;
        const colocada = colocarEnFigura(id, destino);
        const fig = $id("figura");
        const eje = fig.querySelector(".eje-simetria");
        const fantasma = fig.querySelector(".fantasma");
        const marco = fig.querySelector(".marco-prueba");
        marco.classList.add("escaneando");
        efecto("escaner");
        eje.hidden = false;
        fantasma.hidden = false;
        eje.classList.remove("dorado");
        await sleep(1400);
        marco.classList.remove("escaneando");

        if (ok) {
            eje.classList.add("dorado");
            efecto(reto.acierto.efecto);
            fantasma.hidden = true;
            fig.querySelector(".hueco").classList.add("oculto");
            await animar(colocada, [{ transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 300, fill: "none" });
            await sleep(500);
            eje.hidden = true;
            marco.classList.add("oculto");
            await celebrar(reto, gen);
            await retoCompletado(gen);
            return;
        }

        fantasma.hidden = true;
        eje.hidden = true;
        const e = lineaError(id) || {};
        fig.classList.add("viva");
        const vuelo = animar(fig, [
            { transform: "translateY(0) rotate(0deg)" },
            { transform: "translateY(" + -40 * escala + "px) rotate(-8deg)", offset: 0.3 },
            { transform: "translateY(" + -30 * escala + "px) rotate(22deg)", offset: 0.55 },
            { transform: "translateY(" + -36 * escala + "px) rotate(16deg)", offset: 0.75 },
            { transform: "translateY(0) rotate(0deg)" }
        ], { duration: 2400, easing: "ease-in-out", fill: "none" });
        await sleep(700);
        if (e.alerta) efecto("alerta");
        const voz = decir(e, { destino: e.alerta ? "alerta" : null, estado: "error" });
        await vuelo;
        fig.classList.remove("viva");
        registrarError(id);
        await voz;
        await devolverPieza(card, colocada);
        ocultarAlerta();
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    /* ── Mecánica 5-6: calibrador en rampa ────────────────────── */

    function pintarRampa(reto) {
        const extras = $id("extras");
        crearDiv("elevador", { x: 30, y: 214, w: 240, h: 22 }, extras);
        crearDiv("rampa", { x: 10, y: 196, w: 280, h: 10 }, extras);
        const fig = $id("figura");
        fig.style.setProperty("--rampa", -reto.rampa.grados + "deg");
        fig.classList.add("en-rampa");
        $id("escenario").style.setProperty("--rampa", -reto.rampa.grados + "deg");
        const nivel = crearDiv("nivel-burbuja", reto.nivel, fig);
        crearDiv("burbuja", null, nivel);
    }

    function pintarCalibrador(rectPieza, valorPieza, valorEje) {
        const fig = $id("figura");
        const cal = crearDiv("calibrador", { x: rectPieza.x - 14, y: rectPieza.y - 34, w: rectPieza.w + 28, h: rectPieza.h + 40 }, fig);
        crearDiv("cal-regla", null, cal);
        crearDiv("cal-mordaza cal-fija", null, cal);
        crearDiv("cal-mordaza cal-movil", null, cal);
        const pantalla = crearDiv("cal-pantalla", null, cal);
        pantalla.textContent = "Diámetro " + valorPieza + " cm · Eje " + valorEje + " cm";
        return cal;
    }

    async function calibrador(id, card, clon, ok, gen) {
        const reto = retoActual;
        const p = pieza(id);
        const destino = L.rectColocacion(reto.hueco, p, "centro");
        const hastaPantalla = rectCentradoEn($id("figura").querySelector(".hueco"), p);
        await llevarPieza(id, card, clon, destino, { arco: 50, ms: 650, hastaPantalla: hastaPantalla });
        if (!vivo(gen)) return;
        const colocada = colocarEnFigura(id, destino);
        const cal = pintarCalibrador(destino, L.medidaCm(p, "ancho"), L.medidaCm(reto.hueco, "ancho"));
        efecto("escaner");
        await sleep(1500);
        cal.remove();
        const fig = $id("figura");
        const nivel = fig.querySelector(".nivel-burbuja");

        if (ok) {
            efecto(reto.acierto.efecto);
            colocada.classList.add("ajustando");
            fig.querySelector(".hueco").classList.add("oculto");
            await sleep(800);
            colocada.classList.remove("ajustando");
            nivel.classList.add("nivelado");
            await sleep(500);
            fig.classList.add("bajando-rampa");
            $id("escenario").classList.add("rampa-abajo");
            await sleep(1100);
            await celebrar(reto, gen);
            await retoCompletado(gen);
            return;
        }

        const e = lineaError(id) || {};
        if (e.reaccion === "rebote") {
            efecto("boing");
            await animar(colocada, [
                { transform: "translateY(0) scale(1,1)" },
                { transform: "translateY(0) scale(1.15,.8)", offset: 0.25 },
                { transform: "translateY(" + -30 * escala + "px) scale(.9,1.1)", offset: 0.6 },
                { transform: "translateY(0) scale(1,1)" }
            ], { duration: 420, easing: "ease-out", fill: "none" });
            await devolverPieza(card, colocada, { arco: 70, ms: 560 });
            registrarError(id);
            await decir(e, { estado: "error" });
        } else {
            const inc = L.inclinacionRueda(reto.hueco.w, p.w);
            fig.style.setProperty("--desnivel", inc + "deg");
            fig.classList.add("desnivelado");
            nivel.classList.add("desnivel");
            const linea = crearDiv("linea-desnivel", { x: 20, y: 196, w: 260, h: 3 }, fig);
            efecto("golpe");
            registrarError(id);
            await decir(e, { estado: "error" });
            linea.remove();
            fig.classList.remove("desnivelado");
            nivel.classList.remove("desnivel");
            await devolverPieza(card, colocada);
        }
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    /* ── Mecánica 5-6: grúa y prueba de clima ─────────────────── */

    const GRUA_BRAZO_Y = -44;
    const CABLE_Y = GRUA_BRAZO_Y + 8;

    function pintarPlataforma(reto) {
        const extras = $id("extras");
        crearDiv("plataforma", { x: 55, y: 205, w: 190, h: 16 }, extras);
        const grua = crearDiv("grua", null, extras);
        crearDiv("grua-mastil", { x: 262, y: GRUA_BRAZO_Y, w: 10, h: 221 - GRUA_BRAZO_Y }, grua);
        crearDiv("grua-brazo", { x: 120, y: GRUA_BRAZO_Y, w: 152, h: 8 }, grua);
        crearDiv("grua-cable", { x: 149, y: CABLE_Y, w: 2, h: 10 }, grua);
        crearDiv("grua-gancho", { x: 143, y: CABLE_Y + 8, w: 14, h: 12 }, grua);
    }

    /** Cable desde el brazo hasta el gancho, que agarra la pieza por su borde superior. */
    function ajustarCable(yTop) {
        const cable = document.querySelector("#extras .grua-cable");
        const gancho = document.querySelector("#extras .grua-gancho");
        if (!cable || !gancho) return 4;
        const alto = Math.max(4, yTop - 10 - CABLE_Y);
        cable.style.height = u(alto);
        gancho.style.top = u(CABLE_Y + alto - 2);
        return alto;
    }

    function esperarBoton(idBtn) {
        return new Promise(function (resolve) {
            const btn = $id(idBtn);
            btn.hidden = false;
            btn.classList.add("pulso");
            const al = function () {
                if (bloqueado) return;
                btn.removeEventListener("click", al);
                btn.classList.remove("pulso");
                btn.hidden = true;
                resolve();
            };
            btn.addEventListener("click", al);
        });
    }

    async function clima(id, card, clon, ok, gen) {
        const reto = retoActual;
        const p = pieza(id);
        const final = L.rectColocacion(reto.hueco, p, "base");
        const elevMax = (reto.grua && reto.grua.elevacion) || 50;
        const elev = Math.max(18, Math.min(elevMax, final.y - CABLE_Y - 14));
        const colgado = { x: final.x, y: final.y - elev, w: final.w, h: final.h };
        await llevarPieza(id, card, clon, colgado, { arco: 40, ms: 700 });
        if (!vivo(gen)) return;
        const techo = colocarEnFigura(id, final);
        techo.style.transform = "translateY(" + u(-elev) + ")";
        const altoCable = ajustarCable(colgado.y);

        fase = "grua";
        const botonGrua = esperarBoton("btn-grua");
        await decirUnaVez("grua", reto.instruccionGrua);
        bloquear(false);
        await botonGrua;
        bloquear(true);
        efecto("grua");
        const dy = -elev * escala;
        const cable = document.querySelector("#extras .grua-cable");
        const gancho = document.querySelector("#extras .grua-gancho");
        await Promise.all([
            animarFijo(techo, [{ transform: "translateY(" + dy + "px)" }, { transform: "translateY(0)" }], { duration: 1300, easing: "ease-in-out" }),
            animarFijo(gancho, [{ transform: "translateY(0)" }, { transform: "translateY(" + -dy + "px)" }], { duration: 1300, easing: "ease-in-out" }),
            animarFijo(cable, [{ transform: "scaleY(1)" }, { transform: "scaleY(" + ((altoCable + elev) / altoCable).toFixed(3) + ")" }], { duration: 1300, easing: "ease-in-out" })
        ]);
        efecto(ok ? reto.acierto.efecto : "golpe");
        animar(techo, [{ transform: "translateY(0) scaleY(1)" }, { transform: "translateY(0) scaleY(.94)" }, { transform: "translateY(0) scaleY(1)" }], { duration: 260, fill: "none" });
        await sleep(400);
        if (!vivo(gen)) return;

        fase = "clima";
        const botonClima = esperarBoton("btn-clima");
        await decirUnaVez("clima", reto.instruccionClima);
        bloquear(false);
        await botonClima;
        bloquear(true);

        const e = ok ? null : (lineaError(id) || {});
        await pruebaClima(final, p, e ? e.reaccion : "ok", techo);
        if (!vivo(gen)) return;

        if (ok) {
            $id("figura").querySelector(".hueco").classList.add("oculto");
            $id("figura").querySelectorAll(".luz").forEach(function (l) { l.classList.add("encendida", "calida"); });
            await celebrar(reto, gen);
            reiniciarGrua();
            await retoCompletado(gen);
            return;
        }
        registrarError(id);
        await decir(e, { estado: "error" });
        document.querySelectorAll("#extras .nube, #figura .gotera").forEach(function (n) { n.remove(); });
        techo.style.transform = "";
        reiniciarGrua();
        await devolverPieza(card, techo);
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    function reiniciarGrua() {
        const cable = document.querySelector("#extras .grua-cable");
        const gancho = document.querySelector("#extras .grua-gancho");
        if (cable) { cable.style.transform = ""; cable.style.height = u(10); }
        if (gancho) { gancho.style.transform = ""; gancho.style.top = u(CABLE_Y + 8); }
    }

    async function pruebaClima(rectTecho, p, reaccion, techoEl) {
        const reto = retoActual;
        const extras = $id("extras");
        const nube = crearDiv("nube", { x: 40, y: -36, w: 220, h: 44 }, extras);
        await animar(nube, [{ opacity: 0, transform: "translateY(-20px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 500 });
        efecto("lluvia");
        const techo = { x: rectTecho.x, y: rectTecho.y, w: rectTecho.w, h: rectTecho.h, forma: p.forma || "triangulo" };
        const paredes = reto.paredes;
        const piso = paredes.y + paredes.h;
        const gotas = [];
        for (let k = 0; k < 26; k++) {
            const x = 48 + Math.random() * 204;
            gotas.push(animarGota(x, techo, paredes, piso, k * 70, reaccion));
        }
        if (reaccion === "viento") {
            efecto("viento");
            const rafagas = [];
            for (let k = 0; k < 5; k++) {
                const r = crearDiv("rafaga", { x: -30, y: 30 + k * 28, w: 70, h: 4 }, extras);
                rafagas.push(animar(r, [
                    { transform: "translateX(0)", opacity: 0 },
                    { opacity: 1, offset: 0.2 },
                    { transform: "translateX(" + 360 * escala + "px)", opacity: 0 }
                ], { duration: 1100, delay: k * 160 }).then(function () { r.remove(); }));
            }
            techoEl.style.transformOrigin = "50% 100%";
            rafagas.push(animar(techoEl, [
                { transform: "rotate(0deg)" },
                { transform: "rotate(7deg) translateX(4px)", offset: 0.25 },
                { transform: "rotate(-5deg)", offset: 0.5 },
                { transform: "rotate(9deg) translateX(6px)", offset: 0.75 },
                { transform: "rotate(0deg)" }
            ], { duration: 1900, easing: "ease-in-out", fill: "none" }));
            await Promise.all(rafagas);
        }
        await Promise.all(gotas);
        await animar(nube, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
        nube.remove();
    }

    function marcarGotera(xCae, piso, retraso) {
        const fig = $id("figura");
        const clave = String(Math.round(xCae / 10) * 10);
        programar(function () {
            if (fig.querySelector('.gotera[data-x="' + clave + '"]')) return;
            const m = crearDiv("gotera", { x: xCae - 8, y: piso - 5, w: 16, h: 4 }, fig);
            m.dataset.x = clave;
        }, retraso + 1000);
    }

    function animarGota(x, techo, paredes, piso, retraso, reaccion) {
        const fig = $id("figura");
        const g = crearDiv("gota", { x: x, y: -10, w: 4, h: 9 }, fig);
        const destino = L.destinoGota(x, techo, paredes, reaccion === "filtra");
        const yT = L.yTecho(x, techo);
        const S = escala;
        let frames;
        if (destino === "resbala") {
            const salida = x < techo.x + techo.w / 2 ? techo.x - 4 : techo.x + techo.w + 4;
            frames = [
                { transform: "translate(0,0)", opacity: 1 },
                { transform: "translate(0," + (yT + 10) * S + "px)", offset: 0.45 },
                { transform: "translate(" + (salida - x) * S + "px," + (techo.y + techo.h + 8) * S + "px)", offset: 0.75 },
                { transform: "translate(" + (salida - x) * S + "px," + (piso + 6) * S + "px)", opacity: 0 }
            ];
        } else if (destino === "gotera") {
            let xCae = x;
            if (yT != null) {
                xCae = x < techo.x + techo.w / 2 ? techo.x + 2 : techo.x + techo.w - 2;
                frames = [
                    { transform: "translate(0,0)", opacity: 1 },
                    { transform: "translate(0," + (yT + 10) * S + "px)", offset: 0.4 },
                    { transform: "translate(" + (xCae - x) * S + "px," + (techo.y + techo.h + 10) * S + "px)", offset: 0.65 },
                    { transform: "translate(" + (xCae - x) * S + "px," + (piso - 4) * S + "px)", opacity: 1, offset: 0.92 },
                    { transform: "translate(" + (xCae - x) * S + "px," + (piso - 4) * S + "px) scale(2,.3)", opacity: 0 }
                ];
            } else {
                frames = [
                    { transform: "translate(0,0)", opacity: 1 },
                    { transform: "translate(0," + (piso - 4) * S + "px)", opacity: 1, offset: 0.9 },
                    { transform: "translate(0," + (piso - 4) * S + "px) scale(2,.3)", opacity: 0 }
                ];
            }
            marcarGotera(xCae, piso, retraso);
        } else if (destino === "filtra") {
            frames = [
                { transform: "translate(0,0)", opacity: 1 },
                { transform: "translate(0," + (yT + 10) * S + "px)", offset: 0.4 },
                { transform: "translate(0," + (yT + 10) * S + "px) scale(1.4,.8)", offset: 0.55 },
                { transform: "translate(0," + (piso - 4) * S + "px)", opacity: 1, offset: 0.92 },
                { transform: "translate(0," + (piso - 4) * S + "px) scale(2,.3)", opacity: 0 }
            ];
            marcarGotera(x, piso, retraso);
        } else {
            frames = [{ transform: "translate(0,0)", opacity: 1 }, { transform: "translate(0," + (piso + 10) * S + "px)", opacity: 0 }];
        }
        return animar(g, frames, { duration: 1000, delay: retraso, easing: "ease-in" }).then(function () { g.remove(); });
    }

    /* ── Mecánica 3-4: rescate en el lodo ─────────────────────── */

    let lodoCtx = null;
    let lodoUltimoAvance = 0;
    let lodoFraccion = 0;
    let lodoMedirPendiente = false;

    function ajustarLodo(rellenar) {
        const canvas = $id("lodo");
        const mesa = $id("mesa");
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.round(mesa.clientWidth * dpr));
        const h = Math.max(1, Math.round(mesa.clientHeight * dpr));
        if (canvas.width === w && canvas.height === h && !rellenar) return;
        canvas.width = w;
        canvas.height = h;
        lodoCtx = canvas.getContext("2d");
        pintarLodo(w, h);
    }

    function pintarLodo(w, h) {
        const c = lodoCtx;
        c.globalCompositeOperation = "source-over";
        c.fillStyle = "#6b4423";
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = (10 + Math.random() * 40) * (w / 900 + 0.5);
            c.fillStyle = ["#5a3a1e", "#7a5230", "#4e3219", "#8a6038"][i % 4];
            c.beginPath();
            c.ellipse(x, y, r, r * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = "rgba(255,255,255,.08)";
        for (let i = 0; i < 40; i++) {
            c.beginPath();
            c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 0, Math.PI * 2);
            c.fill();
        }
    }

    function frotar(x, y) {
        if (!lodoCtx) return;
        const canvas = $id("lodo");
        const b = canvas.getBoundingClientRect();
        const k = canvas.width / Math.max(1, b.width);
        const radio = 46 * k;
        lodoCtx.globalCompositeOperation = "destination-out";
        const g = lodoCtx.createRadialGradient((x - b.left) * k, (y - b.top) * k, radio * 0.6, (x - b.left) * k, (y - b.top) * k, radio);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        lodoCtx.fillStyle = g;
        lodoCtx.beginPath();
        lodoCtx.arc((x - b.left) * k, (y - b.top) * k, radio, 0, Math.PI * 2);
        lodoCtx.fill();
        if (!lodoMedirPendiente) {
            lodoMedirPendiente = true;
            setTimeout(medirLodo, 180);
        }
    }

    function medirLodo() {
        lodoMedirPendiente = false;
        if (!lodoCtx || fase !== "limpiar") return;
        const canvas = $id("lodo");
        const b = canvas.getBoundingClientRect();
        const z = $id("zona-piezas").getBoundingClientRect();
        const k = canvas.width / Math.max(1, b.width);
        const x0 = Math.max(0, Math.floor((z.left - b.left) * k));
        const y0 = Math.max(0, Math.floor((z.top - b.top) * k));
        const x1 = Math.min(canvas.width, Math.ceil((z.right - b.left) * k));
        const y1 = Math.min(canvas.height, Math.ceil((z.bottom - b.top) * k));
        if (x1 - x0 < 2 || y1 - y0 < 2) return;
        let datos;
        try { datos = lodoCtx.getImageData(x0, y0, x1 - x0, y1 - y0).data; } catch (e) { return; }
        const alfas = [];
        for (let i = 3; i < datos.length; i += 4 * 7) alfas.push(datos[i]);
        const f = L.fraccionLimpia(alfas, 60);
        if (f > lodoFraccion + 0.02) {
            lodoFraccion = f;
            lodoUltimoAvance = Date.now();
        }
        if (f >= retoActual.lodo.limpiezaMinima) lodoDescubierto(rondaGen);
    }

    let swooshUltimo = 0;
    function enlazarLodo() {
        const canvas = $id("lodo");
        if (canvas.dataset.enlazado) return;
        canvas.dataset.enlazado = "1";
        let frotando = false;
        canvas.addEventListener("pointerdown", function (ev) {
            if (fase !== "limpiar" || bloqueado) return;
            ev.preventDefault();
            frotando = true;
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            frotar(ev.clientX, ev.clientY);
        });
        canvas.addEventListener("pointermove", function (ev) {
            if (!frotando || fase !== "limpiar" || bloqueado) return;
            frotar(ev.clientX, ev.clientY);
            const ahora = Date.now();
            if (ahora - swooshUltimo > 320) {
                swooshUltimo = ahora;
                efecto("swoosh");
                if (Math.random() < 0.5) particulas(ev.clientX, ev.clientY, { n: 3, tipo: "agua", dist: 30, gravedad: 20 });
            }
        });
        const fin = function () { frotando = false; };
        canvas.addEventListener("pointerup", fin);
        canvas.addEventListener("pointercancel", fin);
    }

    async function introLodo(gen) {
        const reto = retoActual;
        const fig = $id("figura");
        const hueco = fig.querySelector(".hueco");
        hueco.classList.add("oculto");
        fig.classList.add("andando");
        efecto("vroom");
        await animar(fig, [
            { transform: "translateX(" + -window.innerWidth + "px)" },
            { transform: "translateX(0)" }
        ], { duration: 1300, easing: "cubic-bezier(.2,.6,.3,1)", fill: "none" });
        if (!vivo(gen)) return;
        fig.classList.remove("andando");
        efecto("splash");
        const ch = rectPantalla(reto.charco);
        particulas(ch.left + ch.width / 2, ch.top, { n: 26, tipo: "lodo", angulo: -Math.PI / 2, abanico: 2.4, dist: 160, gravedad: 80, ms: 1100 });
        const canvas = $id("lodo");
        canvas.hidden = false;
        lodoFraccion = 0;
        ajustarLodo(true);
        enlazarLodo();
        void canvas.offsetWidth;
        canvas.classList.add("visible");
        programar(function () { $id("zona-piezas").classList.remove("bajo-lodo"); }, 550);

        const perdida = fig.querySelector(".rueda-perdida");
        if (perdida) {
            await animarFijo(perdida, [
                { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
                { transform: "translate(" + -50 * escala + "px," + 30 * escala + "px) rotate(-300deg)", opacity: 0.6, offset: 0.6 },
                { transform: "translate(" + -70 * escala + "px," + 90 * escala + "px) rotate(-420deg)", opacity: 0 }
            ], { duration: 900, easing: "ease-in" });
            perdida.remove();
        }
        hueco.classList.remove("oculto");
        fig.classList.add("roncando");
        efecto("ronquido");
        intervalo(function () { if (fig.classList.contains("roncando")) efecto("ronquido"); }, 2800);

        await decir(reto.presentacion);
        if (!vivo(gen)) return;
        fase = "limpiar";
        lodoUltimoAvance = Date.now();
        bloquear(false);
        const ayudaMs = (reto.lodo && reto.lodo.ayudaMs) || 12000;
        intervalo(function () {
            if (fase !== "limpiar" || bloqueado) return;
            if (Date.now() - lodoUltimoAvance >= ayudaMs) ayudaLodo(gen);
        }, 500);
    }

    async function ayudaLodo(gen) {
        if (fase !== "limpiar") return;
        fase = "ayudando";
        bloquear(true);
        const voz = decir(retoActual.lodo.ayuda);
        const canvas = $id("lodo");
        const b = canvas.getBoundingClientRect();
        for (let k = 0; k < 24; k++) {
            const fila = k % 3;
            const x = b.left + (Math.floor(k / 3) + 0.5) * (b.width / 8);
            const y = b.top + (fila + 0.5) * (b.height / 3);
            frotar(x, y);
            if (k % 4 === 0) efecto("swoosh");
            await sleep(60);
        }
        await voz;
        fase = "limpiar";
        lodoDescubierto(gen);
    }

    async function lodoDescubierto(gen) {
        if (fase !== "limpiar" || !vivo(gen)) return;
        fase = "descubriendo";
        bloquear(true);
        const canvas = $id("lodo");
        canvas.classList.add("limpio");
        const r = $id("mesa").getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top + r.height / 2, { n: 20, tipo: "estrella", dist: 160 });
        await sleep(600);
        canvas.hidden = true;
        canvas.classList.remove("visible", "limpio");
        await decir(retoActual.descubierta);
        if (!vivo(gen)) return;
        fase = "elegir";
        bloquear(false);
    }

    async function lodo(id, card, clon, ok, gen) {
        const reto = retoActual;
        if (!ok) {
            await rebote(id, card, clon);
            registrarError(id);
            await decir(lineaError(id), { estado: "error" });
            if (!vivo(gen)) return;
            fase = "elegir";
            bloquear(false);
            return;
        }
        const destino = L.rectColocacion(reto.hueco, pieza(id), "hueco");
        await llevarPieza(id, card, clon, destino, { arco: clon ? 0 : 60, ms: clon ? 220 : 650 });
        efecto(reto.acierto.efecto);
        const rueda = colocarEnFigura(id, destino);
        rueda.classList.add("desinflada");
        rueda.style.setProperty("--inf", "0");
        $id("figura").querySelector(".hueco").classList.add("oculto");
        const c = centroRect(rectPantalla(destino));
        particulas(c.x, c.y, { n: 10, tipo: "estrella", dist: 60 });
        await sleep(300);
        if (!vivo(gen)) return;

        fase = "inflar";
        const total = (reto.inflar && reto.inflar.bombazos) || 3;
        let hechos = 0;
        const btn = $id("btn-bomba");
        btn.hidden = false;
        btn.classList.add("pulso");
        await new Promise(function (resolve) {
            const bombear = function (ev) {
                if (ev) ev.preventDefault();
                if (bloqueado || fase !== "inflar") return;
                hechos += 1;
                efecto("puff");
                btn.classList.remove("bombeando");
                void btn.offsetWidth;
                btn.classList.add("bombeando");
                const rc = centroRect(rectDe(rueda));
                particulas(rc.x, rc.y, { n: 6, tipo: "aire", dist: 50 });
                rueda.style.setProperty("--inf", String(Math.min(1, hechos / total)));
                if (hechos >= total) {
                    btn.removeEventListener("click", bombear);
                    rueda.removeEventListener("pointerdown", bombear);
                    resolve();
                }
            };
            btn.addEventListener("click", bombear);
            rueda.addEventListener("pointerdown", bombear);
            decir(reto.inflar).then(function () {
                if (vivo(gen) && fase === "inflar") bloquear(false);
            });
        });
        bloquear(true);
        btn.hidden = true;
        btn.classList.remove("pulso");
        rueda.classList.remove("desinflada");
        await sleep(350);
        await celebrar(reto, gen);
        await retoCompletado(gen);
    }

    const MECANICAS = {
        encaje: encaje,
        lodo: lodo,
        simetria: simetria,
        calibrador: calibrador,
        clima: clima
    };

    /* ── Demostración (taza, nunca un reto real) ──────────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        document.querySelectorAll(".is-demo-target").forEach(function (el) { el.classList.remove("is-demo-target"); });
    }

    async function iniciarDemo(gen) {
        const demo = gameConfig.demo;
        demoActiva = true;
        bloquear(true);
        if (window.PedniaTutorial) await PedniaTutorial.activarDemo();
        retoActual = Object.assign({ mecanica: "encaje", colocada: "asa" }, demo);
        $id("mesa").className = "mesa mesa-" + (nivelElegido.tema === "taller" ? "madera" : "banco");
        pintarFigura(retoActual);
        pintarPiezas(demo.opciones.slice());
        calcularEscala();
        const t = textos();
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const card = cartaDe(demo.correcta);
        if (card && window.PedniaTutorial) {
            await PedniaTutorial.animarMano({
                punto: card,
                holdMs: 700,
                cancelado: function () { return !demoActiva || !vivo(gen); },
                onPresionar: function () { card.classList.add("is-demo-target"); }
            });
        }
        if (!vivo(gen) || !demoActiva) return;
        if (card) {
            card.classList.remove("is-demo-target");
            const destino = L.rectColocacion(demo.hueco, pieza(demo.correcta), "hueco");
            efecto("clic");
            await llevarPieza(demo.correcta, card, null, destino, { arco: 70, ms: 800 });
            colocarEnFigura(demo.correcta, destino);
            $id("figura").querySelector(".hueco").classList.add("oculto");
            const c = centroRect(rectPantalla(destino));
            particulas(c.x, c.y, { n: 14, tipo: "estrella", dist: 80 });
        }
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran final y cierre ──────────────────────────────────── */

    async function granFinal(gen) {
        retoActual = null;
        fase = "";
        bloquear(true);
        limpiarTimers();
        const capa = $id("gran-final");
        capa.innerHTML = "";
        capa.className = "gran-final final-" + nivelElegido.final.tipo;
        capa.hidden = false;
        const titulo = document.createElement("h2");
        titulo.className = "gran-final-titulo";
        titulo.textContent = nivelElegido.final.titulo;
        capa.appendChild(titulo);
        const escenario = crearDiv("gran-final-escena", null, capa);
        void capa.offsetWidth;
        capa.classList.add("visible");
        efecto("fanfarria");

        if (nivelElegido.final.tipo === "taller") await finalTaller(escenario);
        else await finalIngenieria(escenario);

        await new Promise(function (resolve) {
            const t = setTimeout(resolve, nivelElegido.final.autoMs || 7000);
            capa.addEventListener("pointerdown", function () { clearTimeout(t); resolve(); }, { once: true });
        });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Los 3 juguetes bajan del estante y se reúnen en el centro. */
    async function finalTaller(escenario) {
        const fila = crearDiv("fila-juguetes", null, escenario);
        const huecos = [];
        juguetes.forEach(function () { huecos.push(crearDiv("puesto-juguete", null, fila)); });
        await sleep(200);
        for (let i = 0; i < juguetes.length; i++) {
            const mini = juguetes[i];
            const desde = mini.getBoundingClientRect();
            const hasta = huecos[i].getBoundingClientRect();
            const s0 = parseFloat(mini.style.getPropertyValue("--s")) || 0.2;
            const s1 = Math.min(hasta.width / 300, hasta.height / 240);
            const grande = clonarFiguraDesde(mini, s1);
            huecos[i].appendChild(grande);
            grande.style.opacity = "0";
            const volador = mini.cloneNode(true);
            Object.assign(volador.style, { position: "fixed", left: desde.left + "px", top: desde.top + "px", transformOrigin: "0 0", zIndex: 400 });
            document.body.appendChild(volador);
            mini.style.visibility = "hidden";
            const g = grande.getBoundingClientRect();
            await animar(volador, [
                { transform: "translate(0,0) scale(1)" },
                { transform: "translate(" + (g.left - desde.left) + "px," + (g.top - desde.top) + "px) scale(" + s1 / s0 + ")" }
            ], { duration: 800, easing: "cubic-bezier(.4,.1,.3,1)" });
            volador.remove();
            grande.style.opacity = "";
            efecto("magia");
        }
        fila.classList.add("bailando");
        const r = fila.getBoundingClientRect();
        for (let k = 0; k < 3; k++) {
            particulas(r.left + r.width * (k + 0.5) / 3, r.top + r.height / 2, { n: 18, tipo: "confeti", dist: 160 });
        }
        await sleep(600);
    }

    function clonarFiguraDesde(mini, s) {
        const copia = mini.cloneNode(true);
        copia.style.setProperty("--s", s);
        copia.style.width = 300 * s + "px";
        copia.style.height = 240 * s + "px";
        copia.style.visibility = "";
        return copia;
    }

    /** Los 3 inventos pasan por el túnel de prueba final y reciben su sello verde. */
    async function finalIngenieria(escenario) {
        const tunel = crearDiv("tunel", null, escenario);
        crearDiv("tunel-arco", null, tunel);
        const pista = crearDiv("tunel-pista", null, tunel);
        const sellos = crearDiv("tunel-sellos", null, escenario);
        for (let i = 0; i < inventos.length; i++) {
            const alto = pista.clientHeight || 200;
            const s = Math.min(alto * 0.8 / 240, 1);
            const invento = clonarFiguraDesde(inventos[i], s);
            invento.classList.add("invento-pasando");
            pista.appendChild(invento);
            const ancho = pista.clientWidth;
            await animar(invento, [
                { transform: "translateX(" + -300 * s + "px)" },
                { transform: "translateX(" + (ancho / 2 - 150 * s) + "px)" }
            ], { duration: 1100, easing: "ease-out" });
            efecto("escaner");
            tunel.classList.add("escaneando");
            await sleep(700);
            tunel.classList.remove("escaneando");
            efecto("clackding");
            const sello = document.createElement("span");
            sello.className = "sello-ok";
            sello.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
            sellos.appendChild(sello);
            await animar(invento, [
                { transform: "translateX(" + (ancho / 2 - 150 * s) + "px)" },
                { transform: "translateX(" + (ancho + 20) + "px)" }
            ], { duration: 900, easing: "ease-in" });
            invento.remove();
        }
        await sleep(400);
    }

    function nombreNino() {
        const p = window.__PEDNIA_PERFIL__ || {};
        return String(p.nombre || p.nombres || p.name || "").trim();
    }

    function prepararPremio() {
        const premio = nivelElegido.premio || {};
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector(".trofeo");
        if (!trofeo) return;
        if (premio.tipo === "carnet") {
            trofeo.style.display = "none";
            const carnet = document.createElement("div");
            carnet.className = "trofeo carnet";
            const nombre = nombreNino();
            carnet.innerHTML =
                '<div class="carnet-cabeza"><i class="fa-solid fa-helmet-safety"></i> PedNia</div>' +
                '<div class="carnet-cuerpo">' +
                (premio.img ? '<img class="carnet-foto" src="' + premio.img + '" alt="">' : '<i class="fa-solid fa-user-gear carnet-foto"></i>') +
                '<div><strong class="carnet-titulo"></strong>' + (nombre ? '<span class="carnet-nombre"></span>' : "") + "</div></div>";
            carnet.querySelector(".carnet-titulo").textContent = premio.nombre;
            if (nombre) carnet.querySelector(".carnet-nombre").textContent = nombre;
            contenido.appendChild(carnet);
        } else if (premio.img) {
            trofeo.src = premio.img;
        }
    }

    function mostrarCierre() {
        juegoTerminado = true;
        bloquear(true);
        const gf = $id("gran-final");
        gf.classList.remove("visible");
        setTimeout(function () { gf.hidden = true; }, 500);
        const cierre = nivelElegido.cierre || "¡Excelente!";
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre;
        prepararPremio();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre, "zoe");
        setTimeout(function () {
            const caja = $id("final");
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
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("CompletaLaFigura: config con problemas", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = Promise.race([Promise.all(urlsImagenes().map(preloadUrl)), sleep(5000)]);

        let resizeId = null;
        window.addEventListener("resize", function () {
            clearTimeout(resizeId);
            resizeId = setTimeout(calcularEscala, 120);
        });

        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        const btnOmitirIntro = $id("btn-omitir-intro3d");
        if (btnOmitirIntro) {
            btnOmitirIntro.addEventListener("click", omitirIntro3d);
        }
        const btnContinuarIntro = $id("btn-continuar-intro3d");
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
