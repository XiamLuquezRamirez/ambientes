/* Relaciona iguales — Multisensorial */
(function () {
    "use strict";

    const L = window.RelacionaIgualesLogica;
    const PARTICULAS_TACTO = {
        suave: [{ n: 3, tipo: "nube", dist: 55, gravedad: -25, ms: 900 }, { n: 2, tipo: "brillo", dist: 40, ms: 600 }],
        aspero: [{ n: 6, tipo: "polvo", dist: 45, gravedad: 30, ms: 650 }],
        liso: [{ n: 4, tipo: "brillo", dist: 55, ms: 650 }],
        rugoso: [{ n: 5, tipo: "migas", dist: 45, gravedad: 40, ms: 700 }],
        duro: [{ n: 4, tipo: "gris", dist: 35, gravedad: 35, ms: 550 }],
        frio: [{ n: 5, tipo: "copo", dist: 55, gravedad: 20, ms: 900 }],
        poroso: [{ n: 5, tipo: "burbuja", dist: 50, gravedad: -30, ms: 900 }]
    };
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const MICRO_ZOOM = 5;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let erroresReto = 0;
    let demoActiva = false;
    let arrastre = null;
    let pista = { timer: null, fn: null, ms: 0 };
    let audioCache = Object.create(null);
    let imgCache = Object.create(null);
    let imagenesPromise = null;

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function $id(id) {
        return document.getElementById(id);
    }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function material(id) { return (gameConfig.materiales || {})[id] || {}; }
    function esLab() { return !!nivelElegido && nivelElegido.escenario === "laboratorio"; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function nombreDe(mat, r) { return L.nombreEn(r === undefined ? reto : r, mat, gameConfig.materiales); }

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
        const urls = Object.keys(gameConfig.materiales || {}).map(function (id) { return gameConfig.materiales[id].img; });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../../images/zoe_hablando.gif",
            "../../../images/zeus_hablando.gif",
            "../../../img/zoe_normal.gif",
            "../../../img/zeus_normal.gif"
        ];
        const audios = [
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ];
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin].filter(Boolean);
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
        if (cerrado) return;
        const root = $id("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
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
        if (window.RelacionaIgualesSfx) RelacionaIgualesSfx.desbloquear();
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

    /* ── Animación y efectos ─────────────────────────────────── */

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
            sleep(o.duration * (o.iterations && isFinite(o.iterations) ? o.iterations : 1) + (o.delay || 0) + 600)
        ]).then(function () { return a; });
    }

    function crearImg(src, clase) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.draggable = false;
        img.className = clase;
        return img;
    }

    function rectDe(el) {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function cajaEn(c, lado) {
        return { left: c.x - lado / 2, top: c.y - lado / 2, width: lado, height: lado };
    }

    function caja(r, extra) {
        return Object.assign({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }, extra || {});
    }

    function volar(src, desde, hasta, opts) {
        opts = opts || {};
        const el = crearImg(src, "vuelo");
        $id("capa-efectos").appendChild(el);
        const frames = [caja(desde, { opacity: 1, transform: "rotate(0deg)" })];
        if (opts.arco) {
            frames.push({
                offset: 0.5,
                left: (desde.left + hasta.left) / 2 + "px",
                top: Math.min(desde.top, hasta.top) - opts.arco + "px",
                width: (desde.width + hasta.width) / 2 + "px",
                height: (desde.height + hasta.height) / 2 + "px",
                opacity: 1,
                transform: "rotate(" + ((opts.giro || 0) / 2) + "deg)"
            });
        }
        frames.push(caja(hasta, {
            opacity: opts.opacidadFinal != null ? opts.opacidadFinal : 1,
            transform: "rotate(" + (opts.giro || 0) + "deg)"
        }));
        return animar(el, frames, { duration: opts.ms || 650, easing: opts.easing || "cubic-bezier(.3,.7,.3,1)" })
            .then(function () {
                if (opts.conservar) return el;
                el.remove();
                return null;
            });
    }

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = o.n || 14;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            if (o.colores) p.style.background = o.colores[i % o.colores.length];
            p.style.left = x + (o.dispersionX ? (Math.random() - 0.5) * o.dispersionX : 0) + "px";
            p.style.top = y + (o.dispersionY ? (Math.random() - 0.5) * o.dispersionY : 0) + "px";
            capa.appendChild(p);
            const ang = o.angulo != null
                ? o.angulo + (Math.random() - 0.5) * (o.abanico != null ? o.abanico : 1)
                : Math.random() * Math.PI * 2;
            const dist = (o.dist || 90) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            const rot = Math.round(Math.random() * 360);
            animar(p, [
                { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) rotate(" + rot + "deg) scale(.35)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    function particulasTacto(tacto, x, y, multiplicar) {
        (PARTICULAS_TACTO[tacto] || []).forEach(function (pc) {
            particulas(x, y, Object.assign({}, pc, { n: Math.max(1, Math.round(pc.n * (multiplicar || 1))) }));
        });
    }

    function reiniciarClase(el, clase, ms) {
        el.classList.remove(clase);
        void el.offsetWidth;
        el.classList.add(clase);
        clearTimeout(el["_t_" + clase]);
        el["_t_" + clase] = setTimeout(function () { el.classList.remove(clase); }, ms || 600);
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
        if (window.RelacionaIgualesSfx) RelacionaIgualesSfx.sonar(nombre);
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        dialogo.dataset.voz = voz;
        dialogo.classList.remove("es-acierto", "es-error");
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
        $id("dialogo-avatar").src = avatarDe(dialogo.dataset.voz === "zeus" ? "zeus" : "zoe", false);
    }

    /** Muestra el texto cuando la voz empieza de verdad (no antes) y resuelve cuando termina. */
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

    /* ── Edad ─────────────────────────────────────────────────── */

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
        (nivel.retos || []).forEach(function (r) {
            L.lineas(r.presentacion).forEach(sumar);
            sumar(r.acierto);
            (r.errores || []).forEach(sumar);
            sumar(r.errorOtro);
        });
        sumar(nivel.cierre);
        return lineas;
    }

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        montarEscenario();
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    /* ── Escenario ────────────────────────────────────────────── */

    function montarEscenario() {
        const lab = esLab();
        $id("escenario").className = "escenario nivel-" + nivelElegido.escenario;
        $id(lab ? "bandeja" : "opciones").appendChild($id("piezas"));
        $id("piezas").innerHTML = "";
        vaciarModelo();
        vaciarPareja();
    }

    /** Zona que se ilumina al acercar el objeto: el portal (3-4) o la ranura junto al modelo (5-6). */
    function zonaDestino() {
        return esLab() ? $id("ranura-muestra") : $id("portal");
    }

    /** ¿El dedo soltó el objeto junto al modelo? En 3-4 vale el portal o el marco; en 5-6, todo el panel. */
    function sueltaEnZona(p) {
        if (esLab()) return L.dentro(p, $id("panel").getBoundingClientRect(), 10);
        return L.dentro(p, $id("portal").getBoundingClientRect(), 30) || L.dentro(p, $id("marco").getBoundingClientRect(), 10);
    }

    function contenedorModelo() { return $id(esLab() ? "modelo-lab" : "modelo-espejo"); }

    function vaciarModelo() {
        ["modelo-espejo", "modelo-lab"].forEach(function (id) { $id(id).innerHTML = ""; });
        ["modelo-espejo-nombre", "modelo-lab-nombre"].forEach(function (id) { $id(id).textContent = ""; });
        detenerEscaner();
    }

    function vaciarPareja() {
        $id("portal-pareja").innerHTML = "";
        $id("portal-pareja").className = "portal-pareja";
        $id("portal").classList.remove("ilumina");
        const m = $id("muestra-lab");
        m.innerHTML = '<i class="fa-solid fa-plus muestra-vacia" aria-hidden="true"></i>';
        $id("muestra-lab-nombre").textContent = "";
        limpiarPantalla();
    }

    /** El objeto modelo aparece en el marco dorado (3-4) o en el panel y el escáner lo analiza (5-6). */
    async function mostrarModelo(mat, nombre) {
        const cont = contenedorModelo();
        cont.innerHTML = "";
        const img = crearImg(material(mat).img, "modelo-img");
        cont.appendChild(img);
        $id(esLab() ? "modelo-lab-nombre" : "modelo-espejo-nombre").textContent = nombre;
        efecto("magia");
        await animar(img, [
            { transform: "perspective(400px) rotateY(-90deg) scale(.4)", opacity: 0 },
            { transform: "perspective(400px) rotateY(20deg) scale(1.08)", opacity: 1, offset: 0.7 },
            { transform: "none", opacity: 1 }
        ], { duration: 700, easing: "ease-out", fill: "none" });
        if (esLab()) await escanearModelo(mat);
    }

    /* ── Escáner táctil (5-6) ─────────────────────────────────── */

    function pantalla() { return $id("escaner-pantalla"); }

    /** El escáner muestra en grande las partículas e hilachas del material modelo. */
    async function escanearModelo(mat) {
        const zoom = $id("escaner-zoom");
        zoom.style.backgroundImage = 'url("' + material(mat).img + '")';
        zoom.className = "escaner-zoom trama-" + material(mat).tacto + " visible";
        const esc = $id("escaner");
        esc.classList.add("escaneando");
        efecto("escaneo");
        const c = centroDe(pantalla());
        for (let i = 0; i < 3; i++) {
            particulasTacto(material(mat).tacto, c.x + (Math.random() - 0.5) * 140, c.y + (Math.random() - 0.5) * 60, 1.2);
            await sleep(330);
        }
        esc.classList.remove("escaneando");
    }

    function detenerEscaner() {
        const zoom = $id("escaner-zoom");
        zoom.className = "escaner-zoom";
        zoom.style.backgroundImage = "";
        $id("escaner").classList.remove("escaneando");
        limpiarPantalla();
    }

    function limpiarPantalla() {
        $id("escaner-capa").innerHTML = "";
        $id("escaner-grafica").innerHTML = "";
        $id("escaner-luz").className = "escaner-luz";
        $id("escaner-zoom").classList.remove("atenuado");
        $id("ranura-muestra").classList.remove("sobre", "rechaza");
    }

    function luzEscaner(color) {
        $id("escaner-luz").className = "escaner-luz" + (color ? " luz-" + color : "");
    }

    /* ── Opciones (espejo) / bandeja (laboratorio) ────────────── */

    function piezas() {
        return Array.prototype.slice.call($id("piezas").querySelectorAll(".pieza"));
    }

    function piezaDe(mat) {
        return $id("piezas").querySelector('.pieza[data-mat="' + mat + '"]');
    }

    function piezasLibres() {
        return piezas().filter(function (p) { return !p.classList.contains("colocada"); });
    }

    function crearPieza(mat, nombre) {
        const m = material(mat);
        const p = document.createElement("div");
        p.className = "pieza t-" + m.tacto;
        p.dataset.mat = mat;
        p.setAttribute("role", "button");
        p.setAttribute("aria-label", nombre);
        p.innerHTML = '<span class="pieza-marco"><img class="pieza-img" alt="" draggable="false"></span><span class="pieza-nombre"></span>';
        p.querySelector(".pieza-img").src = m.img;
        p.querySelector(".pieza-nombre").textContent = nombre;
        return p;
    }

    async function llegarPiezas(lista, r) {
        const cont = $id("piezas");
        cont.innerHTML = "";
        cont.dataset.n = String(lista.length);
        const lab = esLab();
        const els = lista.map(function (mat) {
            const p = crearPieza(mat, nombreDe(mat, r));
            cont.appendChild(p);
            return p;
        });
        await Promise.all(els.map(function (p, i) {
            const frames = lab
                ? [{ transform: "translateY(120px)", opacity: 0 }, { transform: "translateY(-6px)", opacity: 1, offset: 0.75 }, { transform: "none", opacity: 1 }]
                : [{ transform: "translateX(80px) scale(.6)", opacity: 0 }, { transform: "translateX(-4px) scale(1.04)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }];
            return animar(p, frames, { duration: 520, delay: i * 120, easing: "ease-out", fill: "backwards" });
        }));
    }

    async function retirarPiezas() {
        await Promise.all(piezasLibres().map(function (p) {
            return animar(p, [{ opacity: 1 }, { opacity: 0, transform: "scale(.6)" }], { duration: 360 });
        }));
        $id("piezas").innerHTML = "";
    }

    /** Toque: el objeto muestra un pequeño efecto de su textura. */
    function tocarPieza(el, x, y, fuerte) {
        const m = material(el.dataset.mat);
        const img = el.querySelector(".pieza-img");
        reiniciarClase(el, "toca", 550);
        const ahora = performance.now();
        if (fuerte || !el._sonidoT || ahora - el._sonidoT > 380) {
            el._sonidoT = ahora;
            efecto(m.sonido);
        }
        const r = img.getBoundingClientRect();
        particulasTacto(m.tacto, x != null ? x : r.left + r.width / 2, y != null ? y : r.top + r.height / 2, fuerte ? 1.5 : 1);
    }

    /* ── Arrastre ─────────────────────────────────────────────── */

    function puedeJugar() {
        return !juegoTerminado && !demoActiva && fase === "jugar" && !!reto;
    }

    function crearAgarre(el) {
        const ag = document.createElement("div");
        ag.className = "agarre";
        ag.appendChild(crearImg(material(el.dataset.mat).img, "agarre-img"));
        $id("capa-efectos").appendChild(ag);
        return ag;
    }

    function posicionarAgarre(ag, x, y) {
        ag.style.left = x + "px";
        ag.style.top = y + "px";
    }

    function marcarSobre(sobre) {
        const zona = zonaDestino();
        if (sobre && !zona.classList.contains("sobre") && !esLab()) {
            const c = centroDe(zona);
            particulas(c.x, c.y, { n: 5, tipo: "brillo", dist: 80, ms: 700 });
        }
        zona.classList.toggle("sobre", !!sobre);
    }

    function iniciarArrastre(st) {
        st.activo = true;
        cancelarPista();
        st.el.classList.add("levantada");
        st.ag = crearAgarre(st.el);
        posicionarAgarre(st.ag, st.x, st.y);
    }

    function moverArrastre(st, x, y) {
        const mov = Math.hypot(x - st.xUlt, y - st.yUlt);
        st.xUlt = x;
        st.yUlt = y;
        posicionarAgarre(st.ag, x, y);
        const ahora = performance.now();
        if (mov > 1 && ahora - st.estelaT > 140) {
            st.estelaT = ahora;
            particulasTacto(material(st.mat).tacto, x, y + 20, 0.5);
        }
        marcarSobre(sueltaEnZona({ x: x, y: y }));
    }

    async function soltarArrastre(st, x, y) {
        const dentro = sueltaEnZona({ x: x, y: y });
        marcarSobre(false);
        const desde = rectDe(st.ag.querySelector(".agarre-img"));
        st.ag.remove();
        if (dentro && fase === "jugar") {
            intentar(st.el, desde);
            return;
        }
        await volar(material(st.mat).img, desde, rectDe(st.el.querySelector(".pieza-img")), { ms: 380 });
        st.el.classList.remove("levantada");
    }

    function enlazarPiezas() {
        const cont = $id("piezas");
        cont.addEventListener("pointerdown", function (ev) {
            const el = ev.target.closest(".pieza");
            if (!el || arrastre || demoActiva || juegoTerminado || !reto) return;
            if (el.classList.contains("colocada") || el.classList.contains("levantada")) return;
            ev.preventDefault();
            arrastre = { id: ev.pointerId, el: el, mat: el.dataset.mat, x: ev.clientX, y: ev.clientY, xUlt: ev.clientX, yUlt: ev.clientY, activo: false, estelaT: 0 };
            try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            reprogramarPista();
            tocarPieza(el, ev.clientX, ev.clientY, true);
        });
        cont.addEventListener("pointermove", function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            if (!st.activo) {
                if (L.clasificarGesto(ev.clientX - st.x, ev.clientY - st.y) !== "arrastre" || !puedeJugar()) return;
                iniciarArrastre(st);
            }
            moverArrastre(st, ev.clientX, ev.clientY);
        });
        const fin = function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            arrastre = null;
            if (!st.activo) {
                // 3-4: "el niño arrastra o toca las opciones hacia el portal".
                if (ev.type === "pointerup" && !esLab() && puedeJugar()) {
                    st.el.classList.add("levantada");
                    intentar(st.el, rectDe(st.el.querySelector(".pieza-img")));
                }
                return;
            }
            if (ev.type === "pointercancel") {
                st.ag.remove();
                marcarSobre(false);
                st.el.classList.remove("levantada");
                return;
            }
            soltarArrastre(st, ev.clientX, ev.clientY);
        };
        cont.addEventListener("pointerup", fin);
        cont.addEventListener("pointercancel", fin);
    }

    /* ── Pista sin voz tras inactividad ───────────────────────── */

    function cancelarPista() {
        clearTimeout(pista.timer);
        pista = { timer: null, fn: null, ms: 0 };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarPista(fn, ms) {
        clearTimeout(pista.timer);
        pista.fn = fn;
        pista.ms = ms;
        pista.timer = setTimeout(function () {
            if (pista.fn !== fn) return;
            Promise.resolve(fn()).then(function () {
                if (pista.fn === fn) programarPista(fn, Math.max(ms, 6000) + 2000);
            });
        }, ms);
    }

    function reprogramarPista() {
        if (!pista.fn) return;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
        programarPista(pista.fn, Math.max(pista.ms, 7000));
    }

    /** La mano toca una opción (sin decir cuál es la pareja): invita a explorar. */
    function pistaTocar() {
        const libres = piezasLibres().filter(function (p) { return !p.classList.contains("levantada"); });
        if (!window.PedniaTutorial || fase !== "jugar" || !libres.length || arrastre) return Promise.resolve();
        const fn = pista.fn;
        const el = libres[Math.floor(Math.random() * libres.length)];
        return PedniaTutorial.animarMano({
            punto: centroDe(el.querySelector(".pieza-img")),
            holdMs: 600,
            cancelado: function () { return pista.fn !== fn || fase !== "jugar" || !!arrastre; },
            onPresionar: function () { tocarPieza(el, null, null, true); }
        });
    }

    /* ── Flujo de retos ───────────────────────────────────────── */

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) {
            granCierre(gen);
            return;
        }
        fase = "presentacion";
        erroresReto = 0;
        cancelarPista();
        $id("reto-titulo").textContent = reto.titulo;
        await mostrarModelo(reto.modelo, nombreDe(reto.modelo));
        if (!vivo(gen)) return;
        await llegarPiezas(L.mezclar(reto.opciones), reto);
        if (!vivo(gen)) return;
        const ls = L.lineas(reto.presentacion);
        for (let i = 0; i < ls.length; i++) {
            await decir(ls[i]);
            if (!vivo(gen)) return;
        }
        fase = "jugar";
        programarPista(pistaTocar, 7000);
    }

    async function intentar(el, desde) {
        const gen = rondaGen;
        const mat = el.dataset.mat;
        fase = "animando";
        cancelarPista();
        if (L.esCorrecto(reto, mat)) {
            el.classList.remove("pista");
            el.classList.add("colocada");
            if (esLab()) await unirLab(mat, desde);
            else await unirEspejo(mat, desde);
            if (!vivo(gen)) return;
            await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }
        erroresReto += 1;
        fase = "error";
        const e = L.errorPara(reto, mat);
        efecto(e.sonido);
        const voz = decir(e, { estado: "error" });
        await rechazar(e.efecto, el, desde);
        if (!vivo(gen)) return;
        await voz;
        if (!vivo(gen)) return;
        if (erroresReto >= 3) {
            const p = piezaDe(reto.correcto);
            if (p) p.classList.add("pista");
        }
        fase = "jugar";
        programarPista(pistaTocar, 7000);
    }

    async function completarReto(gen) {
        fase = "completo";
        await sleep(500);
        if (!vivo(gen)) return;
        await retirarPiezas();
        const pareja = $id("portal-pareja");
        await animar(esLab() ? $id("panel") : pareja, [{ opacity: 1 }, { opacity: esLab() ? 1 : 0 }], { duration: 300, fill: "none" });
        vaciarPareja();
        vaciarModelo();
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Espejo mágico: portal de fusión (3-4) ────────────────── */

    function imgModelo() {
        return contenedorModelo().querySelector(".modelo-img");
    }

    /** Ambos objetos giran juntos dentro del portal y se fusionan en la pareja. */
    async function unirEspejo(mat, desde, forzarEfecto) {
        const portal = $id("portal");
        const c = centroDe(portal);
        const lado = 92;
        const r = 50;
        const modelo = imgModelo();
        portal.classList.add("ilumina");
        efecto("armonia");
        const [va, vb] = await Promise.all([
            volar(modelo.getAttribute("src"), rectDe(modelo), cajaEn({ x: c.x - r, y: c.y }, lado), { arco: 50, ms: 600, conservar: true }),
            volar(material(mat).img, desde, cajaEn({ x: c.x + r, y: c.y }, lado), { arco: 50, ms: 600, conservar: true })
        ]);
        const orbita = function (fase0) {
            const frames = [];
            for (let k = 0; k <= 12; k++) {
                const a = fase0 + (k / 12) * Math.PI * 2;
                const rk = r * (1 - 0.6 * Math.sin((k / 12) * Math.PI));
                frames.push(caja(cajaEn({ x: c.x + Math.cos(a) * rk, y: c.y + Math.sin(a) * rk * 0.6 }, lado), { transform: "rotate(" + k * 30 + "deg)" }));
            }
            return frames;
        };
        await Promise.all([
            animar(va, orbita(Math.PI), { duration: 1000, easing: "ease-in-out" }),
            animar(vb, orbita(0), { duration: 1000, easing: "ease-in-out" })
        ]);
        va.remove();
        vb.remove();
        particulas(c.x, c.y, { n: 10, tipo: "brillo", dist: 110 });
        efecto((reto && reto.unir.sonido) || "estrellitas");
        mostrarPareja(modelo.getAttribute("src"), material(mat).img, forzarEfecto || reto.unir.efecto, c);
        await sleep(900);
    }

    function mostrarPareja(srcA, srcB, efectoUnir, c) {
        const cont = $id("portal-pareja");
        cont.innerHTML = "";
        cont.className = "portal-pareja efecto-" + efectoUnir;
        [srcA, srcB].forEach(function (src, i) {
            const img = crearImg(src, "pareja-img pareja-" + (i ? "b" : "a"));
            cont.appendChild(img);
            animar(img, [{ transform: "scale(.2)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }], { duration: 480, easing: "ease-out", fill: "none" });
        });
        if (efectoUnir === "estrellitas") {
            particulas(c.x, c.y, { n: 20, tipo: "estrella", dist: 150, colores: COLORES_FIESTA });
        } else if (efectoUnir === "polvillo") {
            particulas(c.x, c.y, { n: 22, tipo: "polvillo", dist: 120, gravedad: 50, ms: 1100 });
            particulas(c.x, c.y, { n: 8, tipo: "brillo", dist: 100 });
        } else if (efectoUnir === "brillan") {
            particulas(c.x, c.y, { n: 12, tipo: "brillo", dist: 130, ms: 1100 });
        } else {
            particulas(c.x, c.y, { n: 8, tipo: "nube", dist: 100, gravedad: -20 });
        }
    }

    function rectPortal() {
        return cajaEn(centroDe($id("portal")), 92);
    }

    async function volverASitio(el, desde, opts) {
        opts = opts || {};
        await volar(material(el.dataset.mat).img, desde, rectDe(el.querySelector(".pieza-img")), { arco: opts.arco || 70, ms: opts.ms || 600, easing: opts.easing });
        el.classList.remove("levantada");
    }

    function rechazar(efectoRech, el, desde) {
        switch (efectoRech) {
            case "timbreDesafinado": return rechTimbre(el, desde);
            case "vibraDetiene": return rechVibraDetiene(el, desde);
            case "rebotaSinDeslizar": return rechRebota(el, desde);
            case "luzAmarilla": return rechLuzAmarilla(el, desde);
            default: return esLab() ? rechDevolverLab(el, desde) : rechDevolver(el, desde);
        }
    }

    /** Reto 1: el espejo suena como un timbre desafinado y el objeto regresa. */
    async function rechTimbre(el, desde) {
        const meta = rectPortal();
        const vuelo = await volar(material(el.dataset.mat).img, desde, meta, { ms: 380, conservar: true });
        reiniciarClase($id("portal"), "desafina", 800);
        reiniciarClase($id("marco"), "tiembla", 600);
        await animar(vuelo, [{ transform: "none" }, { transform: "translateX(-8px) rotate(-6deg)" }, { transform: "translateX(8px) rotate(6deg)" }, { transform: "none" }], { duration: 420 });
        await sleep(250);
        vuelo.remove();
        await volverASitio(el, meta, { arco: 110, easing: "cubic-bezier(.2,.9,.3,1.1)" });
    }

    /** Reto 3: el espejo vibra y detiene el objeto a medio camino. */
    async function rechVibraDetiene(el, desde) {
        const p = centroDe($id("portal"));
        const medio = cajaEn({ x: (desde.left + desde.width / 2 + p.x) / 2, y: (desde.top + desde.height / 2 + p.y) / 2 }, 92);
        const vuelo = await volar(material(el.dataset.mat).img, desde, medio, { ms: 320, easing: "ease-out", conservar: true });
        reiniciarClase($id("espejo"), "vibra", 700);
        if (navigator.vibrate) {
            try { navigator.vibrate([60, 40, 60, 40, 60]); } catch (e) { /* noop */ }
        }
        await animar(vuelo, [{ transform: "translate(-3px, 1px)" }, { transform: "translate(3px, -1px)" }], { duration: 70, iterations: 9, direction: "alternate", fill: "none" });
        await sleep(250);
        vuelo.remove();
        await volverASitio(el, medio, { arco: 40, ms: 520 });
    }

    /** Reto 4: el objeto blando rebota en el portal sin deslizar. */
    async function rechRebota(el, desde) {
        const meta = rectPortal();
        const vuelo = await volar(material(el.dataset.mat).img, desde, meta, { ms: 380, easing: "ease-in", conservar: true });
        await animar(vuelo, [
            { transform: "none" },
            { transform: "translateY(10px) scale(1.25, .65)", offset: 0.2 },
            { transform: "translateY(-50px) scale(.9, 1.1)", offset: 0.5 },
            { transform: "translateY(6px) scale(1.15, .8)", offset: 0.75 },
            { transform: "none" }
        ], { duration: 800, easing: "ease-in-out" });
        vuelo.remove();
        await volverASitio(el, meta, { arco: 90 });
    }

    /** Objeto que no es pareja (sin reacción propia en el documento): se sacude y vuelve. */
    async function rechDevolver(el, desde) {
        const meta = rectPortal();
        const vuelo = await volar(material(el.dataset.mat).img, desde, meta, { ms: 380, conservar: true });
        await animar(vuelo, [{ transform: "none" }, { transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "translateX(-6px)" }, { transform: "none" }], { duration: 420 });
        vuelo.remove();
        await volverASitio(el, meta, { arco: 80 });
    }

    /* ── Laboratorio: colocar junto al modelo (5-6) ───────────── */

    function rectMuestra() {
        return rectDe($id("muestra-lab"));
    }

    async function colocarMuestra(mat, desde) {
        const meta = rectMuestra();
        const lado = Math.min(meta.width, meta.height) * 0.8;
        const destino = cajaEn({ x: meta.left + meta.width / 2, y: meta.top + meta.height / 2 }, lado);
        await volar(material(mat).img, desde, destino, { ms: 420 });
        const cont = $id("muestra-lab");
        cont.innerHTML = "";
        cont.appendChild(crearImg(material(mat).img, "modelo-img"));
        $id("muestra-lab-nombre").textContent = nombreDe(mat);
        efecto("colocar");
        return destino;
    }

    async function unirLab(mat, desde, forzarEfecto) {
        await colocarMuestra(mat, desde);
        const esc = $id("escaner");
        esc.classList.add("escaneando");
        efecto("escaneo");
        await sleep(800);
        esc.classList.remove("escaneando");
        const ef = forzarEfecto || reto.unir.efecto;
        efecto(forzarEfecto ? "ding" : reto.unir.sonido);
        const srcModelo = imgModelo().getAttribute("src");
        switch (ef) {
            case "ondasSuaves": return grafOndas();
            case "crestas": return grafCrestas();
            case "deslizarTelas": return pantallaDeslizar(srcModelo, material(mat).img);
            case "prisma": return pantallaPrisma();
            case "compresion": return pantallaCompresion(srcModelo, material(mat).img);
            default:
                luzEscaner("verde");
                await sleep(600);
        }
    }

    function trazo(d, clase) {
        const ns = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", clase);
        $id("escaner-grafica").appendChild(path);
        return path;
    }

    async function dibujar(path, ms) {
        const largo = path.getTotalLength ? path.getTotalLength() : 600;
        path.style.strokeDasharray = largo;
        await animar(path, [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }], { duration: ms, easing: "ease-in-out" });
    }

    /** Reto 1: luz verde y ondas de frecuencia suave. */
    async function grafOndas() {
        luzEscaner("verde");
        $id("escaner-zoom").classList.add("atenuado");
        let d1 = "M0 75";
        let d2 = "M0 75";
        for (let x = 0; x <= 300; x += 6) {
            d1 += " L" + x + " " + (75 + Math.sin(x / 300 * Math.PI * 4) * 32).toFixed(1);
            d2 += " L" + x + " " + (75 + Math.sin(x / 300 * Math.PI * 4 + 0.9) * 22).toFixed(1);
        }
        await Promise.all([dibujar(trazo(d1, "onda onda-a"), 1300), dibujar(trazo(d2, "onda onda-b"), 1500)]);
    }

    /** Reto 2: el escáner grafica una textura de crestas rugosas. */
    async function grafCrestas() {
        luzEscaner("verde");
        $id("escaner-zoom").classList.add("atenuado");
        let d = "M0 110";
        for (let x = 10; x <= 300; x += 10) {
            d += " L" + x + " " + (x % 20 === 0 ? 112 - Math.random() * 15 : 30 + Math.random() * 45).toFixed(1);
        }
        await dibujar(trazo(d, "cresta"), 1200);
        const r = pantalla().getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top + r.height / 2, { n: 10, tipo: "polvo", dist: 90, gravedad: 30 });
    }

    function imgsEnPantalla(srcA, srcB) {
        const capa = $id("escaner-capa");
        capa.innerHTML = "";
        $id("escaner-zoom").classList.add("atenuado");
        return [srcA, srcB].map(function (src, i) {
            const img = crearImg(src, "capa-img capa-" + (i ? "b" : "a"));
            capa.appendChild(img);
            return img;
        });
    }

    /** Reto 3: las telas se deslizan una sobre otra sin tropezar. */
    async function pantallaDeslizar(srcA, srcB) {
        luzEscaner("verde");
        const [a, b] = imgsEnPantalla(srcA, srcB);
        await Promise.all([
            animar(a, [{ transform: "translateX(-70px) skewX(0deg)" }, { transform: "translateX(70px) skewX(-8deg)" }, { transform: "translateX(-20px) skewX(0deg)" }], { duration: 1600, easing: "ease-in-out" }),
            animar(b, [{ transform: "translateX(70px) skewX(0deg)" }, { transform: "translateX(-70px) skewX(8deg)" }, { transform: "translateX(20px) skewX(0deg)" }], { duration: 1600, easing: "ease-in-out" })
        ]);
    }

    /** Reto 4: destello de prisma reflectante. */
    async function pantallaPrisma() {
        luzEscaner("verde");
        $id("escaner-zoom").classList.add("atenuado");
        const capa = $id("escaner-capa");
        const prisma = document.createElement("span");
        prisma.className = "prisma";
        capa.appendChild(prisma);
        const r = pantalla().getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top + r.height / 2, { n: 14, tipo: "brillo", dist: 160, ms: 1100 });
        await animar(prisma, [{ transform: "translateX(-120%) skewX(-20deg)", opacity: 0.2 }, { opacity: 1, offset: 0.5 }, { transform: "translateX(120%) skewX(-20deg)", opacity: 0.3 }], { duration: 1300, easing: "ease-in-out" });
    }

    /** Reto 5: compresión y expansión de ambos materiales al ritmo de una pulsación azul. */
    async function pantallaCompresion(srcA, srcB) {
        luzEscaner("azul");
        const imgs = imgsEnPantalla(srcA, srcB);
        $id("escaner-capa").classList.add("lado-a-lado");
        await Promise.all(imgs.map(function (img) {
            return animar(img, [
                { transform: "scale(1, 1)" },
                { transform: "scale(1.15, .6)", offset: 0.3 },
                { transform: "scale(.95, 1.1)", offset: 0.65 },
                { transform: "scale(1, 1)" }
            ], { duration: 500, iterations: 3, easing: "ease-in-out", fill: "none" });
        }));
        $id("escaner-capa").classList.remove("lado-a-lado");
    }

    async function quitarMuestra(el, desde) {
        const cont = $id("muestra-lab");
        cont.innerHTML = '<i class="fa-solid fa-plus muestra-vacia" aria-hidden="true"></i>';
        $id("muestra-lab-nombre").textContent = "";
        await volverASitio(el, desde, { arco: 60 });
    }

    /** Reto 1 (5-6): el escáner emite luz amarilla. */
    async function rechLuzAmarilla(el, desde) {
        const meta = await colocarMuestra(el.dataset.mat, desde);
        luzEscaner("amarilla");
        $id("ranura-muestra").classList.add("rechaza");
        await sleep(1100);
        luzEscaner("");
        $id("ranura-muestra").classList.remove("rechaza");
        await quitarMuestra(el, meta);
    }

    async function rechDevolverLab(el, desde) {
        const meta = await colocarMuestra(el.dataset.mat, desde);
        reiniciarClase($id("ranura-muestra"), "sacude", 500);
        await sleep(650);
        await quitarMuestra(el, meta);
    }

    /* ── Demostración (pareja que no es un reto real) ─────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!material(d.modelo).img || !material(d.pareja).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        $id("reto-titulo").textContent = "";
        reto = null;
        await mostrarModelo(d.modelo, material(d.modelo).nombre);
        await llegarPiezas([d.pareja], null);
        const t = textos();
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const el = piezaDe(d.pareja);
        const img = el.querySelector(".pieza-img");
        const c = centroDe(img);
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 700,
            cancelado: cancelado,
            onPresionar: function () { tocarPieza(el, c.x, c.y, true); }
        });
        if (cancelado()) return;
        const zona = zonaDestino();
        const cd = centroDe(esLab() ? $id("muestra-lab") : zona);
        let desde = rectDe(img);
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 300,
            arrastre: { dx: cd.x - c.x, dy: cd.y - c.y, durMs: 1200, soltarEnDestino: true },
            cancelado: cancelado,
            onDuranteArrastre: function () {
                el.classList.add("levantada");
                zona.classList.add("is-demo-target");
                volar(img.getAttribute("src"), rectDe(img), cajaEn(cd, 80), { ms: 1200, easing: "ease" });
                desde = cajaEn(cd, 80);
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        zona.classList.remove("is-demo-target");
        el.classList.add("colocada");
        if (esLab()) await unirLab(d.pareja, desde, "verde");
        else await unirEspejo(d.pareja, desde, "brillan");
        if (!vivo(gen) || !demoActiva) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        $id("piezas").innerHTML = "";
        vaciarPareja();
        vaciarModelo();
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        const ce = nivelElegido.cierreEscena || {};
        if (ce.tipo === "mural") await muralParejas(ce);
        else if (ce.tipo === "tabla") await tablaPeriodica(ce);
        else await sleep(600);
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    function abrirCapaFinal(clase, titulo) {
        const capa = $id("gran-final");
        capa.innerHTML = "";
        capa.className = "gran-final " + clase;
        capa.hidden = false;
        const h = document.createElement("h2");
        h.className = "gran-final-titulo";
        h.textContent = titulo;
        capa.appendChild(h);
        void capa.offsetWidth;
        capa.classList.add("visible");
        return capa;
    }

    function objetoFinal(mat, nombre) {
        const fig = document.createElement("figure");
        fig.className = "gf-objeto";
        const img = crearImg(material(mat).img, "gf-objeto-img");
        img.setAttribute("aria-label", nombre);
        fig.appendChild(img);
        const cap = document.createElement("figcaption");
        cap.textContent = nombre;
        fig.appendChild(cap);
        fig.addEventListener("pointerdown", function (ev) {
            ev.stopPropagation();
            efecto(material(mat).sonido);
            const cc = centroDe(img);
            particulasTacto(material(mat).tacto, cc.x, cc.y, 1.5);
            reiniciarClase(fig, "toca", 500);
        });
        return fig;
    }

    function esperarToque(capa, ms) {
        return new Promise(function (resolve) {
            const t = setTimeout(resolve, ms);
            capa.addEventListener("pointerdown", function (ev) {
                if (ev.target.closest(".gf-objeto")) return;
                clearTimeout(t);
                resolve();
            });
        });
    }

    /** 3-4: pantalla dividida en 4 cuadrantes; cada pareja semejante baila coordinada. */
    async function muralParejas(ce) {
        const capa = abrirCapaFinal("final-mural", ce.titulo);
        const mural = document.createElement("div");
        mural.className = "mural";
        capa.appendChild(mural);
        efecto("fanfarria");
        const retos = nivelElegido.retos;
        for (let i = 0; i < retos.length; i++) {
            const r = retos[i];
            const cuad = document.createElement("div");
            cuad.className = "cuadrante cuadrante-" + (i + 1);
            cuad.style.setProperty("--retraso", (i * 0.15) + "s");
            const a = objetoFinal(r.modelo, nombreDe(r.modelo, r));
            const b = objetoFinal(r.correcto, nombreDe(r.correcto, r));
            a.classList.add("baila-a");
            b.classList.add("baila-b");
            cuad.appendChild(a);
            cuad.appendChild(b);
            mural.appendChild(cuad);
            efecto("ding");
            animar(cuad, [{ transform: "scale(.4)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "backwards" });
            await sleep(300);
        }
        mural.classList.add("bailando");
        await esperarToque(capa, 6000);
    }

    /** 5-6: panel clasificatorio con cada pareja bajo su categoría formal. */
    async function tablaPeriodica(ce) {
        const capa = abrirCapaFinal("final-tabla", ce.titulo);
        const tabla = document.createElement("div");
        tabla.className = "tabla";
        capa.appendChild(tabla);
        efecto("fanfarria");
        const retos = nivelElegido.retos;
        for (let i = 0; i < retos.length; i++) {
            const r = retos[i];
            const celda = document.createElement("div");
            celda.className = "celda celda-" + (i + 1);
            const cat = document.createElement("span");
            cat.className = "celda-categoria";
            cat.textContent = r.categoria;
            const par = document.createElement("div");
            par.className = "celda-par";
            par.appendChild(objetoFinal(r.modelo, nombreDe(r.modelo, r)));
            par.appendChild(objetoFinal(r.correcto, nombreDe(r.correcto, r)));
            celda.appendChild(cat);
            celda.appendChild(par);
            tabla.appendChild(celda);
            efecto("ding");
            animar(celda, [{ transform: "translateY(40px) scale(.7)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" });
            await sleep(320);
        }
        await esperarToque(capa, 7000);
    }

    /** Medalla (3-4) o diploma (5-6): al tocarlo reacciona (gira o se sella). */
    function prepararPremio() {
        const premio = nivelElegido.premio || {};
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector("img.trofeo");
        if (!trofeo) return;
        trofeo.style.display = "none";
        const cajaPremio = document.createElement("button");
        cajaPremio.type = "button";
        cajaPremio.className = "trofeo premio premio-" + (premio.tipo || "medalla");
        cajaPremio.innerHTML =
            '<i class="premio-icono fa-solid ' + (premio.icono || "fa-medal") + '"></i>' +
            '<span class="premio-textos"><span class="premio-titulo"></span><strong class="premio-nombre"></strong></span>' +
            '<span class="premio-sello" aria-hidden="true"><i class="fa-solid fa-star"></i></span>';
        cajaPremio.querySelector(".premio-titulo").textContent = premio.titulo;
        cajaPremio.querySelector(".premio-nombre").textContent = premio.nombre;
        cajaPremio.setAttribute("aria-label", premio.titulo + ": " + premio.nombre);
        cajaPremio.addEventListener("click", function () {
            const c = centroDe(cajaPremio);
            if (premio.tipo === "diploma") {
                cajaPremio.classList.add("sellado");
                reiniciarClase(cajaPremio, "sellando", 600);
                efecto("sello");
            } else {
                reiniciarClase(cajaPremio, "gira", 1000);
                efecto("chispas");
            }
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        });
        contenido.appendChild(cajaPremio);
    }

    /* ── Microscopio virtual (5-6) ────────────────────────────── */

    function prepararMicroscopio() {
        if (!nivelElegido.microscopio) return;
        const contenido = $id("victoria");
        if (!contenido || contenido.querySelector(".btn-microscopio")) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-microscopio";
        btn.setAttribute("aria-label", "Microscopio");
        btn.innerHTML = '<i class="fa-solid fa-microscope"></i>';
        btn.addEventListener("click", abrirMicroscopio);
        contenido.appendChild(btn);
    }

    function objetosMicroscopio() {
        const lista = [];
        L.parejas(nivelElegido).forEach(function (p) {
            [p.modelo, p.pareja].forEach(function (m) { if (lista.indexOf(m) === -1) lista.push(m); });
        });
        return lista;
    }

    function verEnMicroscopio(mat, nombre) {
        const zoom = $id("micro-zoom");
        const lente = $id("micro-lente");
        const lado = lente.clientWidth || 300;
        zoom.style.backgroundImage = 'url("' + material(mat).img + '")';
        zoom.style.backgroundSize = lado * MICRO_ZOOM + "px " + lado * MICRO_ZOOM + "px";
        zoom.dataset.x = String(-(lado * MICRO_ZOOM - lado) / 2);
        zoom.dataset.y = String(-(lado * MICRO_ZOOM - lado) / 2);
        zoom.style.backgroundPosition = zoom.dataset.x + "px " + zoom.dataset.y + "px";
        $id("micro-trama").className = "micro-trama trama-" + material(mat).tacto;
        $id("micro-nombre").textContent = nombre;
        Array.prototype.forEach.call($id("micro-objetos").children, function (b) { b.classList.toggle("activo", b.dataset.mat === mat); });
        efecto("microscopio");
        reiniciarClase(lente, "enfoca", 500);
    }

    function abrirMicroscopio() {
        const caja = $id("microscopio");
        const lista = $id("micro-objetos");
        lista.innerHTML = "";
        const retos = nivelElegido.retos;
        const nombres = {};
        retos.forEach(function (r) {
            [r.modelo, r.correcto].forEach(function (m) { if (!nombres[m]) nombres[m] = nombreDe(m, r); });
        });
        objetosMicroscopio().forEach(function (m) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "micro-objeto";
            b.dataset.mat = m;
            b.setAttribute("aria-label", nombres[m]);
            b.appendChild(crearImg(material(m).img, ""));
            b.addEventListener("click", function () { verEnMicroscopio(m, nombres[m]); });
            lista.appendChild(b);
        });
        caja.hidden = false;
        const primero = objetosMicroscopio()[0];
        requestAnimationFrame(function () { verEnMicroscopio(primero, nombres[primero]); });
    }

    /** Arrastrar dentro del lente recorre la imagen ampliada (poros y fibras en superzoom). */
    function enlazarMicroscopio() {
        $id("btn-cerrar-micro").addEventListener("click", function () { $id("microscopio").hidden = true; });
        const lente = $id("micro-lente");
        const zoom = $id("micro-zoom");
        let st = null;
        lente.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            st = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, bx: Number(zoom.dataset.x) || 0, by: Number(zoom.dataset.y) || 0 };
            try { lente.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });
        lente.addEventListener("pointermove", function (ev) {
            if (!st || st.id !== ev.pointerId) return;
            const lado = lente.clientWidth;
            const min = -(lado * MICRO_ZOOM - lado);
            const x = Math.max(min, Math.min(0, st.bx + ev.clientX - st.x));
            const y = Math.max(min, Math.min(0, st.by + ev.clientY - st.y));
            zoom.dataset.x = String(x);
            zoom.dataset.y = String(y);
            zoom.style.backgroundPosition = x + "px " + y + "px";
        });
        const fin = function () { st = null; };
        lente.addEventListener("pointerup", fin);
        lente.addEventListener("pointercancel", fin);
    }

    function mostrarCierre() {
        const cierre = nivelElegido.cierre || { voz: "zoe", texto: "¡Excelente!" };
        const capa = $id("gran-final");
        if (capa && !capa.hidden) {
            capa.classList.remove("visible");
            setTimeout(function () { capa.hidden = true; }, 500);
        }
        const texto = $id("texto_final");
        if (texto) {
            texto.textContent = cierre.texto;
            texto.classList.toggle("largo", cierre.texto.length > 60);
        }
        prepararPremio();
        prepararMicroscopio();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe");
        setTimeout(function () {
            const cajaFinal = $id("final");
            if (cajaFinal) {
                cajaFinal.hidden = false;
                cajaFinal.style.display = "block";
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
        if (errores.length) console.warn("[RelacionaIguales] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarPiezas();
        enlazarMicroscopio();
        window.addEventListener("pagehide", function () { TextoVoz.vaciar(); });
        imagenesPromise = precargarImagenesCriticas();
        precargarMediaSecundaria();

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
