/* Descubre el objeto — Multisensorial */
(function () {
    "use strict";

    const L = window.DescubreObjetoLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const RADIO_FROTE = 34;

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
    let frote = null;
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
    function objeto(id) { return (gameConfig.objetos || {})[id] || {}; }
    function esRadar() { return !!nivelElegido && nivelElegido.escenario === "radar"; }
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
        const urls = ["img/cofre_caja.svg", "img/cofre_tapa.svg", "img/paisaje_montana.svg"];
        Object.keys(gameConfig.objetos || {}).forEach(function (id) { urls.push(gameConfig.objetos[id].img); });
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
        const frases = [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin];
        (gameConfig.niveles || []).forEach(function (n) { frases.push(n.demostracion); });
        return frases.filter(Boolean);
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
        if (window.DescubreObjetoSfx) DescubreObjetoSfx.desbloquear();
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

    function reiniciarClase(el, clase, ms) {
        if (!el) return;
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
        if (window.DescubreObjetoSfx) DescubreObjetoSfx.sonar(nombre);
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

    /**
     * Pista del reto. En el radar se lee por partes y cada parte enciende su luz;
     * el diálogo muestra la pista completa desde que empieza la voz.
     */
    async function decirPista(r) {
        if (!r || !r.pista) return;
        const voz = r.pista.voz === "zeus" ? "zeus" : "zoe";
        const partes = L.partesPista(r.pista);
        if (!esRadar() || partes.length < 2) {
            await decir({ voz: voz, texto: L.textoPista(r.pista) });
            return;
        }
        apagarLuces();
        const token = ++tokenDialogo;
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, L.textoPista(r.pista));
        };
        const respaldo = setTimeout(mostrar, 6000);
        for (let i = 0; i < partes.length; i++) {
            if (token !== tokenDialogo) break;
            let p;
            try { p = TextoVoz.hablar(partes[i].texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
            await Promise.race([
                Promise.all([Promise.resolve(p).catch(function () {}), sleep(450)]),
                sleep(10000)
            ]);
            if (token !== tokenDialogo) break;
            if (partes[i].luz) encenderLuz(partes[i].luz, partes[i].valor, "encendida");
        }
        clearTimeout(respaldo);
        mostrar();
        if (token === tokenDialogo) silenciarAvatar();
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
            if (r.pista) {
                const voz = r.pista.voz;
                if (nivel.escenario === "radar") L.partesPista(r.pista).forEach(function (p) { sumar({ voz: voz, texto: p.texto }); });
                else sumar({ voz: voz, texto: L.textoPista(r.pista) });
            }
            sumar(r.consigna);
            sumar(r.pregunta);
            sumar(r.acierto);
            (r.errores || []).forEach(sumar);
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
        $id("escenario").className = "escenario nivel-" + nivelElegido.escenario;
        $id("escena-cofre").innerHTML = "";
        $id("tarjetas").innerHTML = "";
        $id("zona-central").dataset.escena = esRadar() ? "radar" : "cofre";
        ocultarAltavoz();
        if (esRadar()) pintarLuces();
    }

    function mostrarEscena(nombre) {
        $id("zona-central").dataset.escena = nombre;
    }

    function mostrarAltavoz(contenedor) {
        const btn = $id("btn-altavoz");
        if (contenedor && btn.parentNode !== contenedor) contenedor.appendChild(btn);
        btn.hidden = false;
    }

    /** Vuelve a la zona central para que no se vaya con el cofre cuando este se retira. */
    function ocultarAltavoz() {
        const btn = $id("btn-altavoz");
        if (!btn) return;
        btn.hidden = true;
        if (btn.parentNode !== $id("zona-central")) $id("zona-central").appendChild(btn);
    }

    /** Escucha otra vez: la pista (cofre y radar), la consigna o la pregunta (laboratorio). */
    function repetirPista() {
        if (!reto || juegoTerminado || demoActiva || arrastre) return;
        if (fase !== "jugar" && fase !== "limpiar") return;
        reprogramarPista();
        reiniciarClase($id("btn-altavoz"), "suena", 600);
        if (reto.tipo === "limpieza") decir(fase === "limpiar" ? reto.consigna : reto.pregunta);
        else decirPista(reto);
    }

    /* Cofre mágico (3-4) */

    function crearCofre(ambiente) {
        const c = document.createElement("div");
        c.className = "cofre" + (ambiente ? " amb-" + ambiente : "");
        c.setAttribute("aria-label", "Cofre mágico");
        c.innerHTML =
            '<span class="cofre-aura" aria-hidden="true"></span>' +
            '<span class="cofre-hojas" aria-hidden="true">' + '<i></i>'.repeat(6) + "</span>" +
            '<img class="cofre-premio" alt="" draggable="false">' +
            '<div class="cofre-tapa"><img src="img/cofre_tapa.svg" alt="" draggable="false"></div>' +
            '<div class="cofre-cuerpo"><img src="img/cofre_caja.svg" alt="" draggable="false">' +
            '<span class="cerradura" aria-label="Cerradura del cofre"></span>' +
            '<span class="cofre-reflejo" aria-hidden="true"></span></div>';
        return c;
    }

    function cofreActual() {
        return $id("escena-cofre").querySelector(".cofre");
    }

    /** Aparece un nuevo cofre en el centro (el anterior sale por un lado). */
    async function mostrarCofre(ambiente) {
        mostrarEscena("cofre");
        const escena = $id("escena-cofre");
        const viejo = cofreActual();
        if (viejo) {
            await animar(viejo, [{ transform: "none", opacity: 1 }, { transform: "translateX(-120%) rotate(-6deg)", opacity: 0 }], { duration: 450, easing: "ease-in" });
            viejo.remove();
        }
        const c = crearCofre(ambiente);
        escena.appendChild(c);
        efecto("cofre");
        await animar(c, [
            { transform: "translateY(-60px) scale(.6)", opacity: 0 },
            { transform: "translateY(6px) scale(1.04)", opacity: 1, offset: 0.7 },
            { transform: "none", opacity: 1 }
        ], { duration: 650, easing: "ease-out", fill: "none" });
        return c;
    }

    async function abrirCofre(c, idObjeto, efectoAcierto) {
        c.classList.remove("amb-tiembla");
        c.classList.add("abierto", "efecto-" + efectoAcierto);
        efecto("abrir");
        const premio = c.querySelector(".cofre-premio");
        premio.src = objeto(idObjeto).img;
        const cuerpo = c.querySelector(".cofre-cuerpo").getBoundingClientRect();
        const boca = { x: cuerpo.left + cuerpo.width / 2, y: cuerpo.top + 10 };
        await sleep(250);
        if (efectoAcierto === "hojitas") {
            particulas(boca.x, boca.y, { n: 18, tipo: "hoja", dist: 150, angulo: -Math.PI / 2, abanico: 2.4, gravedad: 40, ms: 1400 });
        } else if (efectoAcierto === "cristal") {
            reiniciarClase(c, "destello", 1100);
            particulas(boca.x, boca.y, { n: 16, tipo: "brillo", dist: 160, ms: 1100 });
        } else {
            particulas(boca.x, boca.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        }
        await animar(premio, [
            { transform: "translate(-50%, 40%) scale(.3)", opacity: 0 },
            { transform: "translate(-50%, -95%) scale(1.1)", opacity: 1, offset: 0.55 },
            { transform: "translate(-50%, -60%) scale(.95)", opacity: 1, offset: 0.8 },
            { transform: "translate(-50%, -70%) scale(1)", opacity: 1 }
        ], { duration: 900, easing: "ease-out" });
    }

    /* Radar de pistas (5-6) */

    function pintarLuces() {
        const cont = $id("radar-luces");
        cont.innerHTML = "";
        (nivelElegido.luces || []).forEach(function (l, i) {
            const el = document.createElement("div");
            el.className = "luz";
            el.dataset.id = l.id;
            el.innerHTML =
                '<span class="luz-bombillo"><i class="fa-solid ' + l.icono + '"></i><b>' + (i + 1) + "</b></span>" +
                '<span class="luz-textos"><span class="luz-nombre"></span><strong class="luz-valor"></strong></span>';
            el.querySelector(".luz-nombre").textContent = l.nombre;
            cont.appendChild(el);
        });
    }

    function luzDe(id) {
        return $id("radar-luces").querySelector('.luz[data-id="' + id + '"]');
    }

    function apagarLuces() {
        Array.prototype.forEach.call($id("radar-luces").querySelectorAll(".luz"), function (l) {
            l.classList.remove("encendida", "ok", "casi");
            l.querySelector(".luz-valor").textContent = "";
        });
    }

    function encenderLuz(id, valor, estado) {
        const l = luzDe(id);
        if (!l) return;
        l.classList.remove("encendida", "ok", "casi");
        if (valor != null) l.querySelector(".luz-valor").textContent = valor;
        void l.offsetWidth;
        l.classList.add(estado || "encendida");
        efecto(estado === "casi" ? "casi" : "luz");
    }

    /** Estado de las 3 luces tras una elección (verde / amarilla). */
    function marcarRadar(estados) {
        L.LUCES.forEach(function (id, i) {
            const l = luzDe(id);
            if (!l) return;
            l.classList.remove("encendida", "ok", "casi");
            void l.offsetWidth;
            l.classList.add(estados[i]);
        });
        if (estados.indexOf("casi") !== -1) efecto("casi");
    }

    function restaurarLuces() {
        Array.prototype.forEach.call($id("radar-luces").querySelectorAll(".luz"), function (l) {
            const encendida = l.querySelector(".luz-valor").textContent !== "";
            l.classList.remove("ok", "casi");
            l.classList.toggle("encendida", encendida);
        });
    }

    function prepararRadar() {
        mostrarEscena("radar");
        apagarLuces();
        $id("radar-hallazgo").innerHTML = "";
        $id("radar-pantalla").classList.remove("hallado");
    }

    /* Laboratorio de limpieza (5-6, reto 3) */

    function prepararLaboratorio() {
        mostrarEscena("lab");
        const vista = $id("ventana-vista");
        const ventana = $id("ventana");
        ventana.classList.remove("limpia", "brilla", "encajada");
        vista.classList.remove("empanada", "nitida");
        $id("ventana-hueco").innerHTML = "";
        const canvas = $id("ventana-polvo");
        canvas.style.opacity = "";
        canvas.hidden = false;
        const r = vista.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        pintarPolvo(canvas);
    }

    /** Capa opaca de polvo y manchitas sobre el vidrio. */
    function pintarPolvo(canvas) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#a89a86";
        ctx.fillRect(0, 0, w, h);
        const manchas = ["rgba(120,104,84,0.55)", "rgba(196,184,166,0.6)", "rgba(140,124,100,0.5)", "rgba(90,78,62,0.4)"];
        for (let i = 0; i < 70; i++) {
            ctx.fillStyle = manchas[i % manchas.length];
            ctx.beginPath();
            ctx.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * w * 0.08, 4 + Math.random() * h * 0.06, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 900; i++) {
            ctx.fillStyle = i % 2 ? "rgba(70,60,48,0.35)" : "rgba(230,220,204,0.35)";
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
    }

    function fraccionLimpiaCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        let datos;
        try { datos = ctx.getImageData(0, 0, canvas.width, canvas.height).data; } catch (e) { return 1; }
        const paso = 6;
        const alfas = [];
        for (let y = 0; y < canvas.height; y += paso) {
            for (let x = 0; x < canvas.width; x += paso) {
                alfas.push(datos[(y * canvas.width + x) * 4 + 3]);
            }
        }
        return L.fraccionLimpia(alfas);
    }

    function limpiarEn(canvas, x, y, xPrev, yPrev) {
        const r = canvas.getBoundingClientRect();
        const kx = canvas.width / r.width;
        const ky = canvas.height / r.height;
        const ctx = canvas.getContext("2d");
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = RADIO_FROTE * 2 * kx;
        ctx.beginPath();
        ctx.moveTo((xPrev - r.left) * kx, (yPrev - r.top) * ky);
        ctx.lineTo((x - r.left) * kx + 0.01, (y - r.top) * ky);
        ctx.stroke();
    }

    function enlazarFrote() {
        const canvas = $id("ventana-polvo");
        canvas.addEventListener("pointerdown", function (ev) {
            if (fase !== "limpiar" || demoActiva || juegoTerminado) return;
            ev.preventDefault();
            cancelarPista();
            frote = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, sonidoT: 0, brilloT: 0, medidaT: 0 };
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            frotar(canvas, ev.clientX, ev.clientY);
        });
        canvas.addEventListener("pointermove", function (ev) {
            if (!frote || frote.id !== ev.pointerId || fase !== "limpiar") return;
            frotar(canvas, ev.clientX, ev.clientY);
        });
        const fin = function (ev) {
            if (!frote || frote.id !== ev.pointerId) return;
            frote = null;
            if (fase === "limpiar") {
                comprobarLimpieza(canvas);
                if (fase === "limpiar") programarPista(pistaFrotar, 7000);
            }
        };
        canvas.addEventListener("pointerup", fin);
        canvas.addEventListener("pointercancel", fin);
    }

    function frotar(canvas, x, y) {
        const st = frote;
        limpiarEn(canvas, x, y, st.x, st.y);
        const mov = Math.hypot(x - st.x, y - st.y);
        st.x = x;
        st.y = y;
        const ahora = performance.now();
        if (ahora - st.sonidoT > 230 && mov > 1) {
            st.sonidoT = ahora;
            efecto((reto.limpiar && reto.limpiar.sonido) || "schwik");
        }
        if (ahora - st.brilloT > 140) {
            st.brilloT = ahora;
            particulas(x, y, { n: 2, tipo: "brillo", dist: 40, ms: 600 });
        }
        if (ahora - st.medidaT > 300) {
            st.medidaT = ahora;
            comprobarLimpieza(canvas);
        }
    }

    function comprobarLimpieza(canvas) {
        if (fase !== "limpiar") return;
        const umbral = (reto.limpiar && reto.limpiar.umbral) || 0.7;
        if (fraccionLimpiaCanvas(canvas) >= umbral) ventanaLimpia(rondaGen);
    }

    /** El polvo desaparece, el marco brilla (destello prisma) y Zeus hace la pregunta. */
    async function ventanaLimpia(gen) {
        fase = "revelando";
        frote = null;
        cancelarPista();
        const canvas = $id("ventana-polvo");
        const ventana = $id("ventana");
        efecto((reto.limpiar && reto.limpiar.revelado) || "glimmer");
        await animar(canvas, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 });
        canvas.hidden = true;
        $id("ventana-vista").classList.add("empanada");
        ventana.classList.add("limpia", "brilla");
        const c = centroDe(ventana);
        particulas(c.x, c.y, { n: 14, tipo: "brillo", dist: 170, ms: 1100 });
        if (!vivo(gen)) return;
        await sleep(600);
        if (!vivo(gen)) return;
        await decir(reto.pregunta);
        if (!vivo(gen)) return;
        tarjetas().forEach(function (t) { t.classList.remove("apagada"); t.classList.add("brilla"); });
        fase = "jugar";
        mostrarAltavoz($id("escena-lab"));
        programarPista(pistaArrastrar, 7000);
    }

    /* ── Tarjetas de la bandeja ───────────────────────────────── */

    function tarjetas() {
        return Array.prototype.slice.call($id("tarjetas").querySelectorAll(".tarjeta"));
    }

    function tarjetaDe(id) {
        return $id("tarjetas").querySelector('.tarjeta[data-obj="' + id + '"]');
    }

    function tarjetasLibres() {
        return tarjetas().filter(function (t) { return !t.classList.contains("usada"); });
    }

    function crearTarjeta(id) {
        const o = objeto(id);
        const t = document.createElement("div");
        t.className = "tarjeta";
        t.dataset.obj = id;
        t.setAttribute("role", "button");
        t.setAttribute("aria-label", o.nombre);
        t.innerHTML = '<span class="tarjeta-marco"><img class="tarjeta-img" alt="" draggable="false"></span><span class="tarjeta-nombre"></span>';
        t.querySelector(".tarjeta-img").src = o.img;
        t.querySelector(".tarjeta-nombre").textContent = o.nombre;
        return t;
    }

    async function llegarTarjetas(lista, opts) {
        opts = opts || {};
        const cont = $id("tarjetas");
        cont.innerHTML = "";
        const els = lista.map(function (id) {
            const t = crearTarjeta(id);
            if (opts.apagadas) t.classList.add("apagada");
            cont.appendChild(t);
            return t;
        });
        await Promise.all(els.map(function (t, i) {
            return animar(t, [
                { transform: "translateY(80px) scale(.6)", opacity: 0 },
                { transform: "translateY(-6px) scale(1.04)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 520, delay: i * 120, easing: "ease-out", fill: "backwards" });
        }));
    }

    async function retirarTarjetas() {
        await Promise.all(tarjetasLibres().map(function (t) {
            return animar(t, [{ opacity: 1 }, { opacity: 0, transform: "translateY(60px) scale(.7)" }], { duration: 380 });
        }));
        $id("tarjetas").innerHTML = "";
    }

    function tocarTarjeta(el) {
        reiniciarClase(el, "toca", 500);
        const ahora = performance.now();
        if (!el._sonidoT || ahora - el._sonidoT > 380) {
            el._sonidoT = ahora;
            efecto(objeto(el.dataset.obj).sonido);
        }
    }

    /* ── Arrastre hacia el cofre / radar / ventana ────────────── */

    function zonaActiva() {
        const escena = $id("zona-central").dataset.escena;
        if (escena === "radar") return $id("radar-pantalla");
        if (escena === "lab") return $id("ventana");
        return cofreActual();
    }

    function puedeArrastrar() {
        return !juegoTerminado && !demoActiva && fase === "jugar" && !!reto;
    }

    function crearAgarre(el) {
        const ag = document.createElement("div");
        ag.className = "agarre";
        ag.appendChild(crearImg(objeto(el.dataset.obj).img, "agarre-img"));
        $id("capa-efectos").appendChild(ag);
        return ag;
    }

    function posicionarAgarre(ag, x, y) {
        ag.style.left = x + "px";
        ag.style.top = y + "px";
    }

    function marcarSobre(zona, sobre) {
        if (!zona) return;
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
        posicionarAgarre(st.ag, x, y);
        const zona = zonaActiva();
        marcarSobre(zona, zona && L.dentro({ x: x, y: y }, zona.getBoundingClientRect(), 20));
    }

    async function soltarArrastre(st, x, y) {
        const zona = zonaActiva();
        const dentro = zona && L.dentro({ x: x, y: y }, zona.getBoundingClientRect(), 20);
        if (zona) zona.classList.remove("sobre");
        const desde = rectDe(st.ag.querySelector(".agarre-img"));
        st.ag.remove();
        if (dentro && fase === "jugar") {
            intentar(st.el, desde);
            return;
        }
        await volar(objeto(st.obj).img, desde, rectDe(st.el.querySelector(".tarjeta-img")), { ms: 380 });
        st.el.classList.remove("levantada");
        programarPista(pistaArrastrar, 7000);
    }

    function enlazarTarjetas() {
        const cont = $id("tarjetas");
        cont.addEventListener("pointerdown", function (ev) {
            const el = ev.target.closest(".tarjeta");
            if (!el || arrastre || demoActiva || juegoTerminado || !reto) return;
            if (el.classList.contains("usada") || el.classList.contains("levantada")) return;
            ev.preventDefault();
            arrastre = { id: ev.pointerId, el: el, obj: el.dataset.obj, x: ev.clientX, y: ev.clientY, activo: false };
            try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            reprogramarPista();
            tocarTarjeta(el);
        });
        cont.addEventListener("pointermove", function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            if (!st.activo) {
                const lejos = L.clasificarGesto(ev.clientX - st.x, ev.clientY - st.y) === "arrastre";
                if (!lejos || !puedeArrastrar()) return;
                iniciarArrastre(st);
            }
            moverArrastre(st, ev.clientX, ev.clientY);
        });
        const fin = function (ev) {
            const st = arrastre;
            if (!st || st.id !== ev.pointerId) return;
            arrastre = null;
            if (!st.activo) return;
            if (ev.type === "pointercancel") {
                st.ag.remove();
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

    /** La mano lleva una tarjeta cualquiera hacia el destino y vuelve (no revela la respuesta). */
    function pistaArrastrar() {
        const libres = tarjetasLibres().filter(function (t) { return !t.classList.contains("levantada"); });
        const zona = zonaActiva();
        if (!window.PedniaTutorial || fase !== "jugar" || !libres.length || arrastre || !zona) return Promise.resolve();
        const fn = pista.fn;
        const el = libres[Math.floor(Math.random() * libres.length)];
        const c = centroDe(el.querySelector(".tarjeta-img"));
        const d = centroDe(zona);
        return PedniaTutorial.animarMano({
            punto: c,
            holdMs: 400,
            arrastre: { dx: (d.x - c.x) * 0.7, dy: (d.y - c.y) * 0.7, durMs: 1100 },
            cancelado: function () { return pista.fn !== fn || fase !== "jugar" || !!arrastre; },
            onPresionar: function () { tocarTarjeta(el); }
        });
    }

    /** La mano frota el panel opaco de un lado a otro. */
    function pistaFrotar() {
        const vista = $id("ventana-vista");
        if (!window.PedniaTutorial || fase !== "limpiar" || frote) return Promise.resolve();
        const fn = pista.fn;
        const r = vista.getBoundingClientRect();
        return PedniaTutorial.animarMano({
            punto: { x: r.left + r.width * 0.3, y: r.top + r.height * 0.5 },
            holdMs: 300,
            arrastre: { dx: r.width * 0.4, dy: 0, durMs: 900 },
            cancelado: function () { return pista.fn !== fn || fase !== "limpiar" || !!frote; }
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
        ocultarAltavoz();
        $id("reto-titulo").textContent = reto.titulo;
        const opciones = L.mezclar(reto.opciones);

        if (reto.tipo === "limpieza") {
            prepararLaboratorio();
            await llegarTarjetas(opciones, { apagadas: true });
            if (!vivo(gen)) return;
            await decir(reto.consigna);
            if (!vivo(gen)) return;
            fase = "limpiar";
            mostrarAltavoz($id("escena-lab"));
            programarPista(pistaFrotar, 7000);
            return;
        }

        if (reto.tipo === "radar") prepararRadar();
        else await mostrarCofre(reto.ambiente);
        if (!vivo(gen)) return;
        await llegarTarjetas(opciones);
        if (!vivo(gen)) return;
        await decirPista(reto);
        if (!vivo(gen)) return;
        fase = "jugar";
        mostrarAltavoz(esRadar() ? $id("escena-radar") : cofreActual());
        programarPista(pistaArrastrar, 7000);
    }

    async function intentar(el, desde) {
        const gen = rondaGen;
        const id = el.dataset.obj;
        fase = "animando";
        cancelarPista();
        tokenDialogo += 1;
        TextoVoz.detener();
        if (L.esCorrecto(reto, id)) {
            el.classList.remove("levantada", "pista");
            el.classList.add("usada");
            await responderAcierto(id, desde);
            if (!vivo(gen)) return;
            if (reto.acierto.texto) await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            await completarReto(gen);
            return;
        }
        erroresReto += 1;
        fase = "error";
        const resp = L.respuestaError(reto, id) || {};
        await responderError(el, desde, resp);
        if (!vivo(gen)) return;
        await decir(resp, { estado: "error" });
        if (!vivo(gen)) return;
        if (esRadar() && resp.radar) restaurarLuces();
        if (erroresReto >= 3) {
            const t = tarjetaDe(reto.correcto);
            if (t) t.classList.add("pista");
        }
        fase = "jugar";
        programarPista(pistaArrastrar, 7000);
    }

    async function completarReto(gen) {
        fase = "completo";
        ocultarAltavoz();
        await sleep(600);
        if (!vivo(gen)) return;
        await retirarTarjetas();
        if (!vivo(gen)) return;
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Respuestas ───────────────────────────────────────────── */

    function responderAcierto(id, desde) {
        const a = reto.acierto;
        efecto(a.sonido);
        if (a.efecto === "abrazo" || a.efecto === "hojasMagicas") return aciertoRadar(id, desde, a.efecto);
        if (a.efecto === "encaja") return aciertoVentana(id, desde);
        return aciertoCofre(id, desde, a.efecto);
    }

    /** 3-4: el objeto entra por la cerradura y el cofre se abre. */
    async function aciertoCofre(id, desde, efectoAcierto) {
        const c = cofreActual();
        const cerr = c.querySelector(".cerradura");
        await volar(objeto(id).img, desde, cajaEn(centroDe(cerr), 40), { arco: 60, ms: 520, opacidadFinal: 0.2 });
        await abrirCofre(c, id, efectoAcierto);
        await sleep(300);
    }

    /** 5-6: ráfaga del radar; el oso abraza la pantalla o se despliegan hojas mágicas. */
    async function aciertoRadar(id, desde, efectoAcierto) {
        const pantalla = $id("radar-pantalla");
        const hallazgo = $id("radar-hallazgo");
        const c = centroDe(pantalla);
        await volar(objeto(id).img, desde, cajaEn(c, 110), { arco: 60, ms: 520 });
        hallazgo.innerHTML = "";
        const img = crearImg(objeto(id).img, "radar-hallazgo-img");
        hallazgo.appendChild(img);
        pantalla.classList.add("hallado");
        marcarRadar(["ok", "ok", "ok"]);
        if (efectoAcierto === "abrazo") {
            particulas(c.x, c.y, { n: 22, tipo: "verde", dist: 200, ms: 1100 });
            await animar(img, [
                { transform: "scale(1)" },
                { transform: "scale(2.3)", offset: 0.4 },
                { transform: "scale(2.5, 2.1)", offset: 0.55 },
                { transform: "scale(2.3)", offset: 0.7 },
                { transform: "scale(1)" }
            ], { duration: 1500, easing: "ease-in-out", fill: "none" });
        } else {
            for (let k = 0; k < 3; k++) {
                particulas(c.x, c.y, { n: 10, tipo: "hoja", dist: 220, ms: 1500, gravedad: 30 });
                await sleep(260);
            }
            await sleep(500);
        }
    }

    /** Laboratorio: la ficha encaja en el marco con luz brillante y el paisaje queda nítido. */
    async function aciertoVentana(id, desde) {
        const hueco = $id("ventana-hueco");
        await volar(objeto(id).img, desde, rectDe(hueco), { arco: 50, ms: 560 });
        hueco.innerHTML = "";
        hueco.appendChild(crearImg(objeto(id).img, "ventana-ficha"));
        const ventana = $id("ventana");
        ventana.classList.add("encajada");
        reiniciarClase(ventana, "brilla", 1400);
        $id("ventana-vista").classList.remove("empanada");
        $id("ventana-vista").classList.add("nitida");
        const c = centroDe(ventana);
        particulas(c.x, c.y, { n: 18, tipo: "brillo", dist: 200, ms: 1200 });
        await sleep(1400);
    }

    async function responderError(el, desde, resp) {
        const id = el.dataset.obj;
        const zona = zonaActiva();
        const destino = reto.tipo === "cofre"
            ? cajaEn(centroDe(zona.querySelector(".cerradura")), 70)
            : cajaEn(centroDe(zona), 90);
        await volar(objeto(id).img, desde, destino, { arco: 50, ms: 420 });
        if (resp.sonido) efecto(resp.sonido);
        switch (resp.efecto) {
            case "toctoc": reiniciarClase(zona, "toctoc", 600); break;
            case "grave": reiniciarClase(zona, "grave", 900); break;
            case "raspa": reiniciarClase(zona, "raspa", 700); break;
            default: break;
        }
        if (esRadar() && resp.radar) marcarRadar(resp.radar);
        if (resp.efecto !== "maulla") await sleep(450);
        await volar(objeto(id).img, destino, rectDe(el.querySelector(".tarjeta-img")), { arco: 70, ms: 520 });
        el.classList.remove("levantada");
        if (resp.efecto === "maulla") maullar(el);
        else if (!resp.efecto) efecto("regresa");
    }

    function maullar(el) {
        const burbuja = document.createElement("span");
        burbuja.className = "burbuja-miau";
        burbuja.textContent = "¡Miau!";
        el.appendChild(burbuja);
        reiniciarClase(el, "maulla", 900);
        setTimeout(function () { burbuja.remove(); }, 1400);
    }

    /* ── Demostración (objeto que no es un reto real) ─────────── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        if (!d.objeto || !objeto(d.objeto).img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        $id("reto-titulo").textContent = "";
        if (esRadar()) prepararRadar();
        else await mostrarCofre(null);
        await llegarTarjetas([d.objeto]);
        const t = textos();
        await decir({ voz: "zoe", texto: nivelElegido.demostracion || t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        const cancelado = function () { return !demoActiva || !vivo(gen); };
        const el = tarjetaDe(d.objeto);
        const img = el.querySelector(".tarjeta-img");
        const c = centroDe(img);
        const zona = zonaActiva();
        const objetivo = esRadar() ? zona : zona.querySelector(".cerradura");
        const cd = centroDe(objetivo);
        await PedniaTutorial.animarMano({
            punto: c,
            holdMs: 500,
            arrastre: { dx: cd.x - c.x, dy: cd.y - c.y, durMs: 1300, soltarEnDestino: true },
            cancelado: cancelado,
            onPresionar: function () { tocarTarjeta(el); },
            onDuranteArrastre: function () {
                el.classList.add("levantada");
                zona.classList.add("is-demo-target");
                volar(img.getAttribute("src"), rectDe(img), cajaEn(cd, 70), { ms: 1300, easing: "ease", opacidadFinal: 0.3 });
            },
            onSoltar: function () {
                efecto("magia");
                particulas(cd.x, cd.y, { n: 12, tipo: "estrella", dist: 90 });
                if (esRadar()) reiniciarClase(zona, "destello", 900);
                else abrirCofre(zona, d.objeto, "salto");
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        zona.classList.remove("is-demo-target");
        el.classList.add("usada");
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1800 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        $id("tarjetas").innerHTML = "";
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Gran cierre ──────────────────────────────────────────── */

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        cancelarPista();
        ocultarAltavoz();
        const ce = nivelElegido.cierreEscena;
        if (ce && ce.tipo === "galeria") {
            await galeriaHallazgos(ce);
        } else {
            await sleep(600);
        }
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Los objetos descubiertos aparecen juntos en una repisa mágica rodeados de estrellas. */
    async function galeriaHallazgos(ce) {
        const capa = $id("gran-final");
        capa.innerHTML = "";
        capa.className = "gran-final final-galeria";
        capa.hidden = false;
        const titulo = document.createElement("h2");
        titulo.className = "gran-final-titulo";
        titulo.textContent = ce.titulo;
        capa.appendChild(titulo);
        const escena = document.createElement("div");
        escena.className = "gran-final-escena";
        capa.appendChild(escena);
        escena.appendChild(crearImg("../../../img/zoe_normal.gif", "gf-personaje"));
        const repisa = document.createElement("div");
        repisa.className = "repisa";
        repisa.innerHTML = '<div class="repisa-objetos"></div><span class="repisa-tabla" aria-hidden="true"></span>' +
            '<span class="repisa-estrellas" aria-hidden="true">' + "<i></i>".repeat(10) + "</span>";
        escena.appendChild(repisa);
        escena.appendChild(crearImg("../../../img/zeus_normal.gif", "gf-personaje"));
        void capa.offsetWidth;
        capa.classList.add("visible");
        efecto("fanfarria");
        await sleep(500);
        const fila = repisa.querySelector(".repisa-objetos");
        const ids = L.hallazgos(nivelElegido);
        for (let k = 0; k < ids.length; k++) {
            const id = ids[k];
            const o = crearImg(objeto(id).img, "repisa-objeto");
            o.setAttribute("aria-label", objeto(id).nombre);
            o.addEventListener("pointerdown", function (ev) {
                ev.stopPropagation();
                efecto(objeto(id).sonido);
                reiniciarClase(o, "toca", 500);
            });
            fila.appendChild(o);
            efecto("ding");
            animar(o, [{ transform: "translateY(-50px) scale(.4)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.3,1.5,.5,1)", fill: "backwards" });
            const c = centroDe(o);
            particulas(c.x, c.y, { n: 8, tipo: "estrella", dist: 90 });
            await sleep(450);
        }
        await new Promise(function (resolve) {
            const t = setTimeout(resolve, 5000);
            capa.addEventListener("pointerdown", function (ev) {
                if (ev.target.closest(".repisa-objeto")) return;
                clearTimeout(t);
                resolve();
            });
        });
    }

    /** Medalla interactiva: al tocarla gira y suelta chispas. */
    function prepararPremio() {
        const premio = nivelElegido.premio;
        if (!premio) return;
        const contenido = document.querySelector("#victoria .contenido");
        const trofeo = contenido && contenido.querySelector("img.trofeo");
        if (!trofeo) return;
        trofeo.style.display = "none";
        const cajaPremio = document.createElement("button");
        cajaPremio.type = "button";
        cajaPremio.className = "trofeo premio premio-" + (premio.tipo || "medalla");
        cajaPremio.innerHTML =
            '<i class="premio-icono fa-solid ' + (premio.icono || "fa-medal") + '"></i>' +
            '<span class="premio-textos"><span class="premio-titulo"></span><strong class="premio-nombre"></strong></span>';
        cajaPremio.querySelector(".premio-titulo").textContent = premio.titulo;
        cajaPremio.querySelector(".premio-nombre").textContent = premio.nombre;
        cajaPremio.setAttribute("aria-label", premio.titulo + ": " + premio.nombre);
        cajaPremio.addEventListener("click", function () {
            const c = centroDe(cajaPremio);
            reiniciarClase(cajaPremio, "gira", 1000);
            efecto("chispas");
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        });
        contenido.appendChild(cajaPremio);
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
        if (errores.length) console.warn("[DescubreElObjeto] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarTarjetas();
        enlazarFrote();
        $id("btn-altavoz").addEventListener("click", repetirPista);
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
