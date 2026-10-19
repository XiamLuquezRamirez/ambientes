/* Clasifica por textura — Multisensorial */
(function () {
    "use strict";

    const L = window.ClasificaTexturaLogica;
    const PARTICULAS_TACTO = {
        suave: [{ n: 3, tipo: "nube", dist: 55, gravedad: -25, ms: 900 }, { n: 2, tipo: "brillo", dist: 40, ms: 600 }],
        aspero: [{ n: 6, tipo: "polvo", dist: 45, gravedad: 30, ms: 650 }],
        liso: [{ n: 4, tipo: "brillo", dist: 55, ms: 650 }],
        rugoso: [{ n: 5, tipo: "migas", dist: 45, gravedad: 40, ms: 700 }]
    };
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const LUPA_ZOOM = 3;

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
    let colocados = [];
    let contenidoGrupo = {};
    let cestaActual = null;
    let arrastre = null;
    let pista = { timer: null, fn: null, ms: 0 };
    let confetiTimer = null;
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
    function esEstacion() { return !!nivelElegido && nivelElegido.escenario === "estacion"; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function grupo(id) {
        return ((nivelElegido && nivelElegido.grupos) || []).find(function (g) { return g.id === id; }) || {};
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
        const urls = [];
        Object.keys(gameConfig.materiales || {}).forEach(function (id) { urls.push(gameConfig.materiales[id].img); });
        (gameConfig.niveles || []).forEach(function (n) {
            (n.grupos || []).forEach(function (g) { if (g.img) urls.push(g.img); });
        });
        return urls.filter(function (u, i) { return u && urls.indexOf(u) === i; });
    }

    function precargarImagenesCriticas() {
        return Promise.all(urlsImagenesCriticas().map(preloadUrl));
    }

    function precargarMediaSecundaria() {
        const urls = [
            "../../images/zoe_hablando.gif",
            "../../images/zeus_hablando.gif",
            "../../img/zoe_normal.gif",
            "../../img/zeus_normal.gif"
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
        if (window.ClasificaTexturaSfx) ClasificaTexturaSfx.desbloquear();
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
        if (window.ClasificaTexturaSfx) ClasificaTexturaSfx.sonar(nombre);
    }

    function avatarDe(voz, hablando) {
        return "../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
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
            sumar(r.completo);
            sumar(r.error);
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
        const est = esEstacion();
        $id("escenario").className = "escenario nivel-" + nivelElegido.escenario;
        $id("mesa-rotulo").textContent = est ? "Cinta de selección" : "Mesa de objetos";
        contenidoGrupo = {};
        nivelElegido.grupos.forEach(function (g) { contenidoGrupo[g.id] = []; });
        cestaActual = null;
        $id("cesta-escena").innerHTML = "";
        $id("descarte-fila").innerHTML = "";
        $id("piezas").innerHTML = "";
        if (est) pintarModulos();
        else $id("modulos").innerHTML = "";
    }

    function maquinaDe(id) {
        if (id === "suave") return '<span class="cojin"><span class="aire"></span><span class="aire"></span><span class="aire"></span></span>';
        if (id === "aspero") return '<span class="tolva"></span><span class="indicador"><span class="aguja"></span></span>';
        if (id === "liso") return '<span class="rampa"><span class="rampa-reflejo"></span></span>';
        return '<span class="trituradora"><span class="engrane e1"></span><span class="engrane e2"></span><span class="engrane e3"></span></span><span class="escaner-3d"></span>';
    }

    function pintarModulos() {
        const cont = $id("modulos");
        cont.innerHTML = "";
        nivelElegido.grupos.forEach(function (g) {
            const m = document.createElement("div");
            m.className = "modulo modulo-" + g.id + " en-espera";
            m.dataset.id = g.id;
            m.setAttribute("aria-label", g.nombre);
            m.innerHTML =
                '<span class="modulo-led"></span>' +
                '<span class="modulo-maquina">' + maquinaDe(g.id) + "</span>" +
                '<span class="modulo-barrera"></span>' +
                '<span class="modulo-contenido"></span>' +
                '<span class="modulo-nombre"></span>' +
                '<span class="modulo-detalle"></span>';
            m.querySelector(".modulo-nombre").textContent = g.nombre;
            m.querySelector(".modulo-detalle").textContent = g.detalle || "";
            cont.appendChild(m);
        });
    }

    function moduloDe(id) {
        return $id("modulos").querySelector('.modulo[data-id="' + id + '"]');
    }

    function activarModulo(id) {
        Array.prototype.forEach.call($id("modulos").querySelectorAll(".modulo"), function (m) {
            const activo = m.dataset.id === id;
            m.classList.toggle("activo", activo);
            m.classList.toggle("en-espera", !activo);
            m.classList.remove("ok");
        });
    }

    /** Zona que recibe el objeto en este reto: la cesta (3-4) o el módulo activo (5-6). */
    function zonaActiva() {
        if (esEstacion()) return reto || demoActiva ? moduloDe(demoActiva ? grupoDemo().id : reto.grupo) : null;
        return $id("cesta-escena").querySelector(".cesta");
    }

    function grupoDemo() {
        const m = material((gameConfig.demo || {}).material);
        return nivelElegido.grupos.find(function (g) { return (m.texturas || []).indexOf(g.textura) !== -1; }) || nivelElegido.grupos[0];
    }

    function crearCesta(id) {
        const g = grupo(id);
        const c = document.createElement("div");
        c.className = "cesta cesta-" + id;
        c.dataset.id = id;
        c.setAttribute("aria-label", g.nombre);
        c.innerHTML = '<div class="cesta-contenido"></div><img class="cesta-img" alt="" draggable="false"><span class="cesta-nombre"></span>';
        c.querySelector(".cesta-img").src = g.img;
        c.querySelector(".cesta-nombre").textContent = g.nombre;
        (contenidoGrupo[id] || []).forEach(function (mat) {
            c.querySelector(".cesta-contenido").appendChild(crearImg(material(mat).img, "cesta-item"));
        });
        return c;
    }

    /** Aparece (o regresa) la cesta del reto en el centro. */
    async function mostrarCesta(id) {
        const escena = $id("cesta-escena");
        const vieja = escena.querySelector(".cesta");
        if (vieja && cestaActual === id) return;
        if (vieja) {
            await animar(vieja, [{ transform: "none", opacity: 1 }, { transform: "translateX(-140%) rotate(-8deg)", opacity: 0 }], { duration: 450, easing: "ease-in" });
            vieja.remove();
        }
        const c = crearCesta(id);
        escena.appendChild(c);
        cestaActual = id;
        efecto("cesta");
        await animar(c, [
            { transform: "translateX(140%) rotate(8deg)", opacity: 0 },
            { transform: "translateX(-4%) rotate(-2deg)", opacity: 1, offset: 0.75 },
            { transform: "none", opacity: 1 }
        ], { duration: 700, easing: "ease-out", fill: "none" });
    }

    function agregarACesta(mat) {
        const c = $id("cesta-escena").querySelector(".cesta");
        if (!c) return null;
        const item = crearImg(material(mat).img, "cesta-item");
        c.querySelector(".cesta-contenido").appendChild(item);
        animar(item, [
            { transform: "translateY(-50px) scale(.6)" },
            { transform: "translateY(8px) scale(1.05)", offset: 0.6 },
            { transform: "none" }
        ], { duration: 520, easing: "ease-out", fill: "none" });
        return item;
    }

    function agregarAModulo(mat) {
        const m = moduloDe(reto.grupo);
        if (!m) return;
        const item = crearImg(material(mat).img, "modulo-item");
        m.querySelector(".modulo-contenido").appendChild(item);
        animar(item, [{ transform: "scale(.2)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "none" });
    }

    /* ── Objetos en la mesa / cinta ──────────────────────────── */

    function piezas() {
        return Array.prototype.slice.call($id("piezas").querySelectorAll(".pieza"));
    }

    function piezaDe(mat) {
        return $id("piezas").querySelector('.pieza[data-mat="' + mat + '"]');
    }

    function piezasLibres() {
        return piezas().filter(function (p) { return !p.classList.contains("colocada") && !p.classList.contains("descartada"); });
    }

    function crearPieza(mat) {
        const m = material(mat);
        const p = document.createElement("div");
        p.className = "pieza t-" + m.tacto;
        p.dataset.mat = mat;
        p.setAttribute("role", "button");
        p.setAttribute("aria-label", m.nombre);
        p.innerHTML = '<span class="pieza-marco"><img class="pieza-img" alt="" draggable="false"></span><span class="pieza-nombre"></span>';
        p.querySelector(".pieza-img").src = m.img;
        p.querySelector(".pieza-nombre").textContent = m.nombre;
        return p;
    }

    /** Llegan los objetos: caen sobre la mesa (3-4) o entran por la cinta mecánica (5-6). */
    async function llegarPiezas(lista) {
        const cont = $id("piezas");
        cont.innerHTML = "";
        const est = esEstacion();
        const els = lista.map(function (mat) {
            const p = crearPieza(mat);
            cont.appendChild(p);
            return p;
        });
        if (est) {
            $id("mesa").classList.add("andando");
            efecto("cinta");
        }
        await Promise.all(els.map(function (p, i) {
            const frames = est
                ? [{ transform: "translateX(-" + (900 - i * 60) + "px)", opacity: 0 }, { transform: "none", opacity: 1 }]
                : [{ transform: "translateY(-60px) scale(.6)", opacity: 0 }, { transform: "translateY(6px) scale(1.04)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }];
            return animar(p, frames, { duration: est ? 1100 : 520, delay: est ? 0 : i * 140, easing: est ? "cubic-bezier(.25,.8,.3,1)" : "ease-out", fill: "backwards" });
        }));
        $id("mesa").classList.remove("andando");
    }

    async function retirarPiezas() {
        const libres = piezasLibres();
        await Promise.all(libres.map(function (p) {
            return animar(p, [{ opacity: 1 }, { opacity: 0, transform: esEstacion() ? "translateX(300px)" : "scale(.6)" }], { duration: 380 });
        }));
        $id("piezas").innerHTML = "";
    }

    /** Toque: el objeto muestra un pequeño efecto de su textura (y en 5-6 la lupa revela el micro-relieve). */
    function tocarPieza(el, x, y, fuerte) {
        const mat = el.dataset.mat;
        const m = material(mat);
        const img = el.querySelector(".pieza-img");
        reiniciarClase(el, "toca", 550);
        const ahora = performance.now();
        if (fuerte || !el._sonidoT || ahora - el._sonidoT > 380) {
            el._sonidoT = ahora;
            efecto(m.sonido);
        }
        const r = img.getBoundingClientRect();
        const px = x != null ? x : r.left + r.width / 2;
        const py = y != null ? y : r.top + r.height / 2;
        particulasTacto(m.tacto, px, py, fuerte ? 1.5 : 1);
        if (esEstacion()) mostrarLupa(img, px, py);
    }

    function mostrarLupa(img, x, y) {
        const lupa = $id("lupa");
        const r = img.getBoundingClientRect();
        const tam = lupa.offsetWidth || 128;
        lupa.hidden = false;
        lupa.style.backgroundImage = 'url("' + img.getAttribute("src") + '")';
        lupa.style.backgroundSize = r.width * LUPA_ZOOM + "px " + r.height * LUPA_ZOOM + "px";
        const lx = Math.max(r.left, Math.min(r.right, x));
        const ly = Math.max(r.top, Math.min(r.bottom, y));
        lupa.style.backgroundPosition = -((lx - r.left) * LUPA_ZOOM - tam / 2) + "px " + -((ly - r.top) * LUPA_ZOOM - tam / 2) + "px";
        const w = window.innerWidth;
        lupa.style.left = Math.max(8, Math.min(w - tam - 8, r.left + r.width / 2 - tam / 2)) + "px";
        lupa.style.top = r.bottom + 14 + "px";
    }

    function ocultarLupa() {
        $id("lupa").hidden = true;
    }

    /* ── Arrastre (dedo o pinza electromagnética) ─────────────── */

    function puedeArrastrar() {
        return !juegoTerminado && !demoActiva && fase === "jugar" && !!reto;
    }

    function crearAgarre(el) {
        const mat = el.dataset.mat;
        const ag = document.createElement("div");
        ag.className = "agarre" + (esEstacion() ? " con-pinza" : "");
        ag.style.setProperty("--vib", L.amplitudVibracion(L.friccionDe(material(mat))) + "px");
        ag.innerHTML = esEstacion() ? '<span class="pinza"></span>' : "";
        ag.appendChild(crearImg(material(mat).img, "agarre-img"));
        $id("capa-efectos").appendChild(ag);
        if (esEstacion()) {
            const carro = document.createElement("div");
            carro.className = "carro-vivo";
            const cable = document.createElement("div");
            cable.className = "cable-vivo";
            $id("capa-efectos").appendChild(cable);
            $id("capa-efectos").appendChild(carro);
            $id("carro-reposo").classList.add("oculto");
            return { agarre: ag, carro: carro, cable: cable };
        }
        return { agarre: ag };
    }

    function posicionarAgarre(a, x, y) {
        a.agarre.style.left = x + "px";
        a.agarre.style.top = y + "px";
        if (!a.carro) return;
        const riel = $id("riel").getBoundingClientRect();
        const cx = Math.max(riel.left + 20, Math.min(riel.right - 20, x));
        a.carro.style.left = cx + "px";
        a.carro.style.top = riel.top + riel.height / 2 + "px";
        const pinzaY = y - a.agarre.offsetHeight / 2 - 18;
        const y0 = riel.top + riel.height / 2;
        a.cable.style.left = x + "px";
        a.cable.style.top = Math.min(y0, pinzaY) + "px";
        a.cable.style.height = Math.abs(pinzaY - y0) + "px";
    }

    function quitarAgarre(a) {
        if (!a) return;
        ["agarre", "carro", "cable"].forEach(function (k) { if (a[k]) a[k].remove(); });
        $id("carro-reposo").classList.remove("oculto");
    }

    function marcarSobre(zona, sobre) {
        if (!zona) return;
        if (sobre && !zona.classList.contains("sobre")) {
            if (!esEstacion()) {
                const g = grupo(zona.dataset.id);
                efecto(g.reaccion);
                const c = centroDe(zona);
                particulas(c.x, c.y - 30, { n: 6, tipo: g.textura === "suave" ? "brillo" : "verde", dist: 70, ms: 700 });
            }
        }
        zona.classList.toggle("sobre", !!sobre);
    }

    /** Efecto sensorial de fricción mientras se arrastra (estela, sonido y vibración según la textura). */
    function friccionArrastre(st, x, y, mov) {
        const m = material(st.mat);
        const ahora = performance.now();
        if (mov > 1 && ahora - st.estelaT > 130) {
            st.estelaT = ahora;
            particulasTacto(m.tacto, x, y + 20, 0.5);
        }
        if (!esEstacion()) return;
        if (mov > 1) {
            st.ag.agarre.classList.add("vibrando");
            clearTimeout(st.vibT);
            st.vibT = setTimeout(function () { if (st.ag) st.ag.agarre.classList.remove("vibrando"); }, 180);
        }
        if (mov > 2 && ahora - st.sonidoT > 480) {
            st.sonidoT = ahora;
            efecto(m.sonido);
        }
        const pulso = L.pulsoVibracion(L.friccionDe(m));
        if (pulso && mov > 2 && ahora - st.vibraT > 220 && navigator.vibrate) {
            st.vibraT = ahora;
            try { navigator.vibrate(pulso); } catch (e) { /* noop */ }
        }
    }

    function iniciarArrastre(st) {
        st.activo = true;
        cancelarPista();
        ocultarLupa();
        st.el.classList.add("levantada");
        st.ag = crearAgarre(st.el);
        st.pos = { x: st.x, y: st.y };
        st.acumulado = 0;
        if (esEstacion()) efecto("pinza");
        posicionarAgarre(st.ag, st.x, st.y);
    }

    function moverArrastre(st, x, y) {
        const mov = Math.hypot(x - st.xUlt, y - st.yUlt);
        st.xUlt = x;
        st.yUlt = y;
        const tramo = esEstacion() && reto && reto.deslizamiento ? L.tramoTropiezo(L.friccionDe(material(st.mat))) : 0;
        if (tramo) {
            if (Math.hypot(x - st.pos.x, y - st.pos.y) >= tramo) {
                st.pos = { x: x, y: y };
                reiniciarClase(st.ag.agarre, "tropieza", 220);
                if (performance.now() - st.tropiezoT > 160) {
                    st.tropiezoT = performance.now();
                    efecto("tropiezo");
                }
            }
        } else {
            st.pos = { x: x, y: y };
        }
        posicionarAgarre(st.ag, st.pos.x, st.pos.y);
        if (!tramo && esEstacion() && reto && reto.deslizamiento && mov > 3) {
            particulas(st.pos.x, st.pos.y, { n: 1, tipo: "brillo", dist: 20, ms: 500 });
        }
        friccionArrastre(st, st.pos.x, st.pos.y, mov);
        const zona = zonaActiva();
        marcarSobre(zona, zona && L.dentro({ x: x, y: y }, zona.getBoundingClientRect(), 16));
    }

    async function soltarArrastre(st, x, y) {
        const zona = zonaActiva();
        const p = { x: x, y: y };
        const dentro = zona && L.dentro(p, zona.getBoundingClientRect(), 16);
        if (zona) zona.classList.remove("sobre");
        const desde = rectDe(st.ag.agarre.querySelector(".agarre-img"));
        quitarAgarre(st.ag);
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
            if (el.classList.contains("colocada") || el.classList.contains("descartada") || el.classList.contains("levantada")) return;
            ev.preventDefault();
            arrastre = {
                id: ev.pointerId, el: el, mat: el.dataset.mat,
                x: ev.clientX, y: ev.clientY, xUlt: ev.clientX, yUlt: ev.clientY,
                activo: false, estelaT: 0, sonidoT: 0, vibraT: 0, tropiezoT: 0
            };
            try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            reprogramarPista();
            tocarPieza(el, ev.clientX, ev.clientY, true);
        });
        cont.addEventListener("pointermove", function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            if (!st.activo) {
                const lejos = L.clasificarGesto(ev.clientX - st.x, ev.clientY - st.y) === "arrastre";
                if (lejos && puedeArrastrar()) {
                    iniciarArrastre(st);
                } else {
                    if (esEstacion()) mostrarLupa(st.el.querySelector(".pieza-img"), ev.clientX, ev.clientY);
                    return;
                }
            }
            moverArrastre(st, ev.clientX, ev.clientY);
        });
        const fin = function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            arrastre = null;
            ocultarLupa();
            if (!st.activo) return;
            clearTimeout(st.vibT);
            if (ev.type === "pointercancel") {
                quitarAgarre(st.ag);
                const zona = zonaActiva();
                if (zona) zona.classList.remove("sobre");
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

    /** La mano toca un objeto (sin decir si es del grupo): invita a explorar y arrastrar. */
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
        colocados = [];
        cancelarPista();
        $id("capa-escena").innerHTML = "";
        $id("reto-titulo").textContent = reto.titulo;
        if (esEstacion()) activarModulo(reto.grupo);
        else await mostrarCesta(reto.grupo);
        if (!vivo(gen)) return;
        await llegarPiezas(L.mezclar(reto.objetos));
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
            el.classList.remove("levantada", "pista");
            el.classList.add("colocada");
            colocados.push(mat);
            contenidoGrupo[reto.grupo].push(mat);
            await responderColocar(mat, desde);
            if (!vivo(gen)) return;
            if (L.completo(reto, colocados)) {
                await completarReto(gen);
                return;
            }
            fase = "jugar";
            programarPista(pistaTocar, 7000);
            return;
        }
        erroresReto += 1;
        fase = "error";
        const voz = decir(L.lineaError(reto, mat), { estado: "error" });
        await rechazar(el, desde);
        if (!vivo(gen)) return;
        await voz;
        if (!vivo(gen)) return;
        if (erroresReto >= 3) {
            L.pendientes(reto, colocados).forEach(function (m) {
                const p = piezaDe(m);
                if (p) p.classList.add("pista");
            });
        }
        fase = "jugar";
        programarPista(pistaTocar, 7000);
    }

    async function completarReto(gen) {
        fase = "completo";
        if (!esEstacion()) {
            await Promise.all(piezasLibres().map(function (p) { return mandarADescarte(p, rectDe(p.querySelector(".pieza-img")), { arco: 40, ms: 600 }); }));
        }
        efecto("chispas");
        const z = zonaActiva();
        if (z) {
            const c = centroDe(z);
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140 });
        }
        await decir(reto.completo, { estado: "acierto" });
        if (!vivo(gen)) return;
        await sleep(500);
        if (!vivo(gen)) return;
        await retirarPiezas();
        if (!esEstacion()) {
            const fila = $id("descarte-fila");
            await animar(fila, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "none" });
            fila.innerHTML = "";
        }
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Descartes (3-4) ──────────────────────────────────────── */

    /** El objeto rechazado (o no elegido) vuela a la zona de descartes y queda allí. */
    async function mandarADescarte(el, desde, opts) {
        opts = opts || {};
        const mat = el.dataset.mat;
        el.classList.remove("levantada", "pista");
        el.classList.add("descartada");
        const lugar = crearImg(material(mat).img, "descarte-item");
        lugar.style.visibility = "hidden";
        $id("descarte-fila").appendChild(lugar);
        await volar(material(mat).img, desde, rectDe(lugar), { arco: opts.arco || 60, ms: opts.ms || 650, easing: opts.easing });
        lugar.style.visibility = "";
    }

    /* ── Respuestas al colocar ────────────────────────────────── */

    function responderColocar(mat, desde) {
        efecto(reto.colocar.sonido);
        switch (reto.colocar.efecto) {
            case "brillaSalta": return colocarEnCesta(mat, desde, { brillo: true, particula: { n: 10, tipo: "brillo", dist: 90 } });
            case "destellosVerdes": return colocarEnCesta(mat, desde, { sacude: true, particula: { n: 14, tipo: "verde", dist: 100 } });
            case "estrellasMulticolor": return colocarEnCesta(mat, desde, { particula: { n: 18, tipo: "estrella", dist: 130, colores: COLORES_FIESTA } });
            case "absorber": return colAbsorber(mat, desde);
            case "triturar": return colTriturar(mat, desde);
            case "rampa": return colRampa(mat, desde);
            case "escanear3d": return colEscanear(mat, desde);
            default: return Promise.resolve();
        }
    }

    /** 3-4: la cesta brilla / se sacude, el objeto salta dentro y suelta sus destellos. */
    async function colocarEnCesta(mat, desde, o) {
        const cesta = zonaActiva();
        const r = cesta.getBoundingClientRect();
        const boca = cajaEn({ x: r.left + r.width / 2, y: r.top + r.height * 0.18 }, 80);
        if (o.brillo) reiniciarClase(cesta, "brilla", 1000);
        await volar(material(mat).img, desde, boca, { arco: 90, ms: 520 });
        if (o.sacude) reiniciarClase(cesta, "sacude", 500);
        agregarACesta(mat);
        const c = { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
        particulas(c.x, c.y, o.particula);
        await sleep(450);
    }

    function encenderModulo(m) {
        m.classList.add("ok");
        reiniciarClase(m, "brilla", 900);
    }

    /** Módulo Suave: el cojín de aire brilla y absorbe el objeto suavemente; LED verde. */
    async function colAbsorber(mat, desde) {
        const m = moduloDe(reto.grupo);
        const cojin = m.querySelector(".cojin").getBoundingClientRect();
        const sobre = cajaEn({ x: cojin.left + cojin.width / 2, y: cojin.top - 10 }, 80);
        const el = await volar(material(mat).img, desde, sobre, { arco: 60, ms: 520, conservar: true });
        reiniciarClase(m, "sopla", 900);
        await animar(el, [
            { transform: "none", opacity: 1 },
            { transform: "translateY(-12px) scale(1.05)", opacity: 1, offset: 0.35 },
            { transform: "translateY(" + cojin.height * 0.5 + "px) scale(.2)", opacity: 0 }
        ], { duration: 700, easing: "ease-in-out" });
        el.remove();
        particulas(cojin.left + cojin.width / 2, cojin.top + cojin.height / 2, { n: 6, tipo: "nube", dist: 60, gravedad: -30 });
        encenderModulo(m);
        agregarAModulo(mat);
        await sleep(300);
    }

    /** Tolva abrasiva: tritura figuradamente la textura con destellos verdes y chispitas. */
    async function colTriturar(mat, desde) {
        const m = moduloDe(reto.grupo);
        const tolva = m.querySelector(".tolva").getBoundingClientRect();
        const boca = cajaEn({ x: tolva.left + tolva.width / 2, y: tolva.top + 6 }, 72);
        const el = await volar(material(mat).img, desde, boca, { arco: 60, ms: 520, conservar: true });
        m.classList.add("tritura");
        const c = { x: tolva.left + tolva.width / 2, y: tolva.top + tolva.height * 0.6 };
        const iv = setInterval(function () {
            particulas(c.x, c.y, { n: 4, tipo: "polvo", dist: 50, gravedad: 30, ms: 600 });
            particulas(c.x, c.y - 20, { n: 2, tipo: "verde", dist: 60, ms: 600 });
        }, 120);
        await animar(el, [
            { transform: "none", opacity: 1 },
            { transform: "translate(-3px, 8px) rotate(-6deg) scale(.85)", offset: 0.3 },
            { transform: "translate(3px, 18px) rotate(6deg) scale(.6)", offset: 0.6 },
            { transform: "translate(0, 34px) scale(.15)", opacity: 0 }
        ], { duration: 900, easing: "linear" });
        clearInterval(iv);
        el.remove();
        m.classList.remove("tritura");
        particulas(c.x, c.y, { n: 12, tipo: "verde", dist: 90 });
        encenderModulo(m);
        agregarAModulo(mat);
        await sleep(300);
    }

    /** Rampa de cristal: el objeto se desliza a gran velocidad con reflejos brillantes. */
    async function colRampa(mat, desde) {
        const m = moduloDe(reto.grupo);
        const rampa = m.querySelector(".rampa").getBoundingClientRect();
        const lado = 60;
        const arriba = cajaEn({ x: rampa.left + lado * 0.5, y: rampa.top - lado * 0.3 }, lado);
        const abajo = cajaEn({ x: rampa.right - lado * 0.5, y: rampa.bottom - lado * 0.6 }, lado);
        const el = await volar(material(mat).img, desde, arriba, { arco: 50, ms: 480, conservar: true });
        m.classList.add("reflejo");
        const t0 = performance.now();
        const iv = setInterval(function () {
            const k = Math.min(1, (performance.now() - t0) / 380);
            particulas(arriba.left + lado / 2 + (abajo.left - arriba.left) * k, arriba.top + lado / 2 + (abajo.top - arriba.top) * k, { n: 2, tipo: "brillo", dist: 30, ms: 500 });
        }, 50);
        await animar(el, [caja(arriba), caja(abajo)], { duration: 380, easing: "cubic-bezier(.6,0,.9,.6)" });
        clearInterval(iv);
        el.remove();
        m.classList.remove("reflejo");
        encenderModulo(m);
        agregarAModulo(mat);
        await sleep(350);
    }

    /** Trituradora de relieves: escanea las hendiduras en 3D, encaja el relieve y suena el engranaje. */
    async function colEscanear(mat, desde) {
        const m = moduloDe(reto.grupo);
        const maq = m.querySelector(".modulo-maquina").getBoundingClientRect();
        const centro = cajaEn({ x: maq.left + maq.width / 2, y: maq.top + maq.height / 2 }, 74);
        const el = await volar(material(mat).img, desde, centro, { arco: 60, ms: 520, conservar: true });
        m.classList.add("escaneando");
        await animar(el, [
            { transform: "perspective(300px) rotateY(0deg) rotateX(0deg)" },
            { transform: "perspective(300px) rotateY(180deg) rotateX(20deg)", offset: 0.5 },
            { transform: "perspective(300px) rotateY(360deg) rotateX(0deg)" }
        ], { duration: 1100, easing: "ease-in-out" });
        m.classList.remove("escaneando");
        m.classList.add("engrana");
        await animar(el, [{ transform: "scale(1)" }, { transform: "scale(1.15)", offset: 0.4 }, { transform: "scale(.2)", opacity: 0 }], { duration: 420, easing: "ease-in" });
        el.remove();
        const c = centroDe(m);
        particulas(c.x, c.y, { n: 8, tipo: "migas", dist: 60, gravedad: 30 });
        encenderModulo(m);
        agregarAModulo(mat);
        setTimeout(function () { m.classList.remove("engrana"); }, 600);
        await sleep(350);
    }

    /* ── Rechazos ─────────────────────────────────────────────── */

    function rechazar(el, desde) {
        efecto(reto.rechazo.sonido);
        switch (reto.rechazo.efecto) {
            case "rebote": return rechRebote(el, desde);
            case "flotar": return rechFlotar(el, desde);
            case "vibraExpulsa": return rechVibra(el, desde);
            case "barreraRoja": return rechBarrera(el, desde);
            case "deslizarFuera": return rechDeslizar(el, desde);
            case "frenoSeco": return rechFreno(el, desde);
            case "reboteSuave": return rechReboteSuave(el, desde);
            default: return volverACinta(el, desde);
        }
    }

    function bocaCesta() {
        const r = zonaActiva().getBoundingClientRect();
        return cajaEn({ x: r.left + r.width / 2, y: r.top + r.height * 0.22 }, 84);
    }

    /** Reto 1 (3-4): la Cesta Nube rebota la lija suavemente hacia los descartes. */
    async function rechRebote(el, desde) {
        const boca = bocaCesta();
        await volar(material(el.dataset.mat).img, desde, boca, { ms: 360 });
        reiniciarClase(zonaActiva(), "rebota", 520);
        await mandarADescarte(el, boca, { arco: 160, ms: 820, easing: "cubic-bezier(.2,.9,.3,1.1)" });
    }

    /** Reto 2 (3-4): el algodón sale flotando de la cesta y baja a los descartes. */
    async function rechFlotar(el, desde) {
        const mat = el.dataset.mat;
        const boca = bocaCesta();
        await volar(material(mat).img, desde, boca, { ms: 360 });
        el.classList.remove("levantada");
        el.classList.add("descartada");
        const lugar = crearImg(material(mat).img, "descarte-item");
        lugar.style.visibility = "hidden";
        $id("descarte-fila").appendChild(lugar);
        const meta = rectDe(lugar);
        const vuelo = crearImg(material(mat).img, "vuelo");
        $id("capa-efectos").appendChild(vuelo);
        const frames = [];
        const pasos = 8;
        for (let i = 0; i <= pasos; i++) {
            const t = i / pasos;
            const vaiven = Math.sin(t * Math.PI * 3) * 40 * (1 - t);
            frames.push(caja({
                left: boca.left + (meta.left - boca.left) * t + vaiven,
                top: boca.top + (meta.top - boca.top) * t - Math.sin(t * Math.PI) * 150,
                width: boca.width + (meta.width - boca.width) * t,
                height: boca.height + (meta.height - boca.height) * t
            }, { transform: "rotate(" + vaiven / 3 + "deg)" }));
        }
        particulas(boca.left + boca.width / 2, boca.top, { n: 6, tipo: "nube", dist: 60, gravedad: -30 });
        await animar(vuelo, frames, { duration: 1800, easing: "ease-in-out" });
        vuelo.remove();
        lugar.style.visibility = "";
    }

    /** Reto 3 (3-4): la cesta vibra y expulsa la corteza suavemente. */
    async function rechVibra(el, desde) {
        const boca = bocaCesta();
        await volar(material(el.dataset.mat).img, desde, boca, { ms: 360 });
        reiniciarClase(zonaActiva(), "vibra", 700);
        await sleep(600);
        await mandarADescarte(el, boca, { arco: 70, ms: 750 });
    }

    async function volverACinta(el, desde, opts) {
        opts = opts || {};
        await volar(material(el.dataset.mat).img, desde, rectDe(el.querySelector(".pieza-img")), { arco: opts.arco || 80, ms: opts.ms || 600, easing: opts.easing });
        el.classList.remove("levantada");
    }

    /** Módulo Suave: barrera de luz roja que rebota el objeto con sonido rasposo. */
    async function rechBarrera(el, desde) {
        const m = moduloDe(reto.grupo);
        const r = m.getBoundingClientRect();
        const sobre = cajaEn({ x: r.left + r.width / 2, y: r.top - 10 }, 70);
        m.classList.add("barrera");
        await volar(material(el.dataset.mat).img, desde, sobre, { ms: 320 });
        particulas(sobre.left + 35, sobre.top + 50, { n: 8, tipo: "roja", dist: 60 });
        await volverACinta(el, sobre, { arco: 140, ms: 720, easing: "cubic-bezier(.2,.9,.3,1.1)" });
        setTimeout(function () { m.classList.remove("barrera"); }, 300);
    }

    /** Tolva: expulsa el objeto deslizándolo de vuelta. */
    async function rechDeslizar(el, desde) {
        const m = moduloDe(reto.grupo);
        const tolva = m.querySelector(".tolva").getBoundingClientRect();
        const boca = cajaEn({ x: tolva.left + tolva.width / 2, y: tolva.top + 6 }, 72);
        const vuelo = await volar(material(el.dataset.mat).img, desde, boca, { ms: 400, conservar: true });
        await animar(vuelo, [
            { transform: "none" },
            { transform: "translateY(16px) scale(.9)", offset: 0.4 },
            { transform: "translate(-60px, -30px) rotate(-14deg)" }
        ], { duration: 520, easing: "ease-out" });
        const r = rectDe(vuelo);
        vuelo.remove();
        await volverACinta(el, r, { arco: 40, ms: 620, easing: "ease-out" });
    }

    /** Rampa de cristal: el objeto rugoso se frena en seco. */
    async function rechFreno(el, desde) {
        const m = moduloDe(reto.grupo);
        const rampa = m.querySelector(".rampa").getBoundingClientRect();
        const lado = 60;
        const arriba = cajaEn({ x: rampa.left + lado * 0.5, y: rampa.top - lado * 0.3 }, lado);
        const freno = cajaEn({ x: rampa.left + rampa.width * 0.38, y: rampa.top + rampa.height * 0.15 }, lado);
        const vuelo = await volar(material(el.dataset.mat).img, desde, arriba, { ms: 400, conservar: true });
        await animar(vuelo, [caja(arriba), caja(freno)], { duration: 260, easing: "ease-out" });
        m.classList.add("frenada");
        particulas(freno.left + lado / 2, freno.top + lado, { n: 8, tipo: "polvo", dist: 40, gravedad: 20 });
        await animar(vuelo, [
            { transform: "none" }, { transform: "translateX(-4px) rotate(-4deg)" }, { transform: "translateX(4px) rotate(3deg)" }, { transform: "none" }
        ], { duration: 300 });
        await sleep(350);
        m.classList.remove("frenada");
        vuelo.remove();
        await volverACinta(el, freno, { arco: 90 });
    }

    /** Trituradora: el sensor no detecta relieve y el objeto rebota suavemente. */
    async function rechReboteSuave(el, desde) {
        const m = moduloDe(reto.grupo);
        const maq = m.querySelector(".modulo-maquina").getBoundingClientRect();
        const centro = cajaEn({ x: maq.left + maq.width / 2, y: maq.top + maq.height / 2 }, 74);
        await volar(material(el.dataset.mat).img, desde, centro, { ms: 400 });
        m.classList.add("sin-relieve");
        await sleep(450);
        await volverACinta(el, centro, { arco: 110, ms: 700, easing: "cubic-bezier(.2,.9,.3,1.1)" });
        m.classList.remove("sin-relieve");
    }

    /* ── Demostración (material que no es un reto real) ───────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.material || !material(d.material).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        const g = grupoDemo();
        $id("reto-titulo").textContent = "";
        if (esEstacion()) activarModulo(g.id);
        else await mostrarCesta(g.id);
        await llegarPiezas([d.material]);
        const t = textos();
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const el = piezaDe(d.material);
        const img = el.querySelector(".pieza-img");
        const c = centroDe(img);
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 700,
            cancelado: cancelado,
            onPresionar: function () { tocarPieza(el, c.x, c.y, true); }
        });
        ocultarLupa();
        if (cancelado()) return;
        const zona = zonaActiva();
        const cd = centroDe(zona);
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 300,
            arrastre: { dx: cd.x - c.x, dy: cd.y - c.y, durMs: 1200, soltarEnDestino: true },
            cancelado: cancelado,
            onDuranteArrastre: function () {
                el.classList.add("levantada");
                zona.classList.add("is-demo-target");
                volar(img.getAttribute("src"), rectDe(img), cajaEn(cd, 80), { ms: 1200, easing: "ease" });
            },
            onSoltar: function () {
                efecto(esEstacion() ? "swooshding" : grupo(g.id).reaccion);
                efecto("magia");
                particulas(cd.x, cd.y, { n: 12, tipo: "estrella", dist: 90 });
                if (esEstacion()) encenderModulo(zona);
                else reiniciarClase(zona, "brilla", 1000);
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        zona.classList.remove("is-demo-target");
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        zona.classList.remove("ok");
        $id("piezas").innerHTML = "";
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        ocultarLupa();
        const ce = nivelElegido.cierreEscena;
        if (ce && ce.tipo === "desfile") {
            await desfileCestas(ce);
        } else {
            await sleep(600);
        }
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Las dos cestas se juntan en el centro mostrando los objetos organizados por grupo táctil. */
    async function desfileCestas(ce) {
        const capa = $id("gran-final");
        capa.innerHTML = "";
        capa.className = "gran-final final-desfile";
        capa.hidden = false;
        const titulo = document.createElement("h2");
        titulo.className = "gran-final-titulo";
        titulo.textContent = ce.titulo;
        capa.appendChild(titulo);
        const escena = document.createElement("div");
        escena.className = "gran-final-escena";
        capa.appendChild(escena);
        const contenido = L.contenidoDesfile(nivelElegido);
        escena.appendChild(crearImg("../../img/zoe_normal.gif", "gf-personaje"));
        const desfile = document.createElement("div");
        desfile.className = "desfile";
        escena.appendChild(desfile);
        escena.appendChild(crearImg("../../img/zeus_normal.gif", "gf-personaje"));
        const cestas = nivelElegido.grupos.map(function (g) {
            const col = document.createElement("div");
            col.className = "desfile-cesta desfile-" + g.id;
            col.innerHTML = '<div class="desfile-objetos"></div><img class="desfile-cesta-img" alt="" draggable="false"><span class="desfile-nombre"></span>';
            col.querySelector(".desfile-cesta-img").src = g.img;
            col.querySelector(".desfile-nombre").textContent = g.nombre;
            desfile.appendChild(col);
            return { g: g, col: col };
        });
        void capa.offsetWidth;
        capa.classList.add("visible");
        efecto("fanfarria");
        await Promise.all(cestas.map(function (c, i) {
            return animar(c.col, [
                { transform: "translateX(" + (i === 0 ? -420 : 420) + "px)", opacity: 0 },
                { transform: "none", opacity: 1 }
            ], { duration: 900, easing: "cubic-bezier(.3,1.3,.5,1)", fill: "backwards" });
        }));
        for (let i = 0; i < cestas.length; i++) {
            const c = cestas[i];
            const fila = c.col.querySelector(".desfile-objetos");
            const mats = contenido[c.g.id] || [];
            for (let k = 0; k < mats.length; k++) {
                const mat = mats[k];
                const o = crearImg(material(mat).img, "desfile-objeto");
                o.setAttribute("aria-label", material(mat).nombre);
                o.addEventListener("pointerdown", function (ev) {
                    ev.stopPropagation();
                    efecto(material(mat).sonido);
                    const cc = centroDe(o);
                    particulasTacto(material(mat).tacto, cc.x, cc.y, 1.5);
                    reiniciarClase(o, "toca", 500);
                });
                fila.appendChild(o);
                efecto("ding");
                animar(o, [{ transform: "translateY(-40px) scale(.4)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "backwards" });
                await sleep(260);
            }
        }
        await new Promise(function (resolve) {
            const t = setTimeout(resolve, 5000);
            capa.addEventListener("pointerdown", function (ev) {
                if (ev.target.closest(".desfile-objeto")) return;
                clearTimeout(t);
                resolve();
            });
        });
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

    /** Lluvia de confeti con texturas brillantes (suave, áspero, liso y rugoso). */
    function iniciarConfetiTexturas() {
        const capa = $id("confeti-texturas");
        if (!capa || reducirMovimiento()) return;
        const texturas = L.TEXTURAS;
        clearInterval(confetiTimer);
        confetiTimer = setInterval(function () {
            if (capa.childNodes.length > 90) return;
            const p = document.createElement("span");
            p.className = "ct ct-" + texturas[Math.floor(Math.random() * texturas.length)];
            p.style.left = Math.random() * 100 + "%";
            const tam = 14 + Math.random() * 16;
            p.style.width = tam + "px";
            p.style.height = tam * (0.6 + Math.random() * 0.6) + "px";
            capa.appendChild(p);
            animar(p, [
                { transform: "translateY(-40px) rotate(0deg)", opacity: 1 },
                { transform: "translateY(" + (window.innerHeight + 60) + "px) rotate(" + (360 + Math.random() * 360) + "deg)", opacity: 0.9 }
            ], { duration: 3200 + Math.random() * 2200, easing: "linear" }).then(function () { p.remove(); });
        }, 110);
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
        const victoria = $id("victoria");
        if (victoria) victoria.classList.add("celebra-" + (nivelElegido.celebracion || "baile"));
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
            if (nivelElegido.celebracion === "confetiTexturas") setTimeout(iniciarConfetiTexturas, 1500);
        }, 400);
    }

    /* ── Boot ─────────────────────────────────────────────────── */

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../intro.json"));
        introConfig.conversacion = (gameConfig.textos && gameConfig.textos.conversacion) || [];
        aplicarLetterSpacing();

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ClasificaPorTextura] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarPiezas();
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
