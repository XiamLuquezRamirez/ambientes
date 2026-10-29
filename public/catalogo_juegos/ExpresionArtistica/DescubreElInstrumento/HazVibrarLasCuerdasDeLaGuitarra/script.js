/* La Guitarra — Descubre el instrumento (EA) */
(function () {
    "use strict";

    const L = window.DescubreInstrumentoLogica;
    const COLORES_FIESTA = ["#ff6b6b", "#fcc419", "#51cf66", "#339af0", "#cc5de8", "#ff922b"];
    const COLORES_TUBO = { rojo: "#ef5350", azul: "#42a5f5", amarillo: "#ffca28", verde: "#66bb6a" };
    /** Geometría de img/guitarra_muda.svg (600×300): del clavijero al puente y altura de las cuerdas. */
    const GUITARRA = { x0: 50 / 600, x1: 509 / 600, yArriba: 132 / 300, yAbajo: 168 / 300 };
    const NOTAS_CUERDA = ["sol4", "mi4", "do4", "sol3"];
    const RADIO_IMAN = 90;

    let introConfig = null;
    let gameConfig = null;
    let conversacionCancelada = false;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;

    let nivelElegido = null;
    let indiceReto = 0;
    let juegoTerminado = false;
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let ayuda = { timer: null, fn: null, ms: 0 };
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

    function promesa() {
        let resolve;
        const p = new Promise(function (r) { resolve = r; });
        return { p: p, resolve: resolve };
    }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function instrumento(id) { return (gameConfig.instrumentos || {})[id] || {}; }
    function escenaUrl(id) { return (gameConfig.escenas || {})[id] || ""; }
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

    function rutasSonidos() {
        return (gameConfig.audios && gameConfig.audios.sonidos) || {};
    }

    function urlsImagenesCriticas() {
        const urls = [
            "img/caja_regalo.svg", "img/caja_abierta.svg", "img/guitarra_muda.svg",
            "img/pajarito_gris.svg", "img/pajarito.svg", "img/batuta.svg"
        ];
        Object.keys(gameConfig.instrumentos || {}).forEach(function (id) { urls.push(gameConfig.instrumentos[id].img); });
        Object.keys(gameConfig.escenas || {}).forEach(function (id) { urls.push(gameConfig.escenas[id]); });
        (gameConfig.niveles || []).forEach(function (n) { if (n.insignia) urls.push(n.insignia.img); });
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
        const rutas = rutasSonidos();
        const audios = [
            gameConfig.audios && gameConfig.audios.cierre,
            gameConfig.audios && gameConfig.audios.fondo
        ].concat(Object.keys(rutas).map(function (k) { return rutas[k]; }));
        return Promise.all(urls.map(preloadUrl).concat(audios.map(preloadAudio)));
    }

    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionAcierto, t.demostracionFin].filter(Boolean);
    }

    /** En kiosco la edad ya se conoce al cargar; en la vista previa se elige después de la intro. */
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
        const teatro = tema === "teatro";
        document.body.classList.toggle("tema-teatro", teatro);
        document.body.classList.toggle("tema-tienda", !teatro);
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

        const conversacion = conversacionInicial();
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
        if (window.DescubreInstrumentoSfx) DescubreInstrumentoSfx.desbloquear();
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
        if (clase) img.className = clase;
        return img;
    }

    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    const ICONOS_PARTICULA = { nota: "fa-music", pluma: "fa-feather" };

    function particulas(x, y, o) {
        o = o || {};
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = o.n || 14;
        const icono = ICONOS_PARTICULA[o.tipo];
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-" + (o.tipo || "estrella");
            const color = o.colores ? o.colores[i % o.colores.length] : null;
            if (icono) {
                p.innerHTML = '<i class="fa-solid ' + icono + '" aria-hidden="true"></i>';
                if (color) p.style.color = color;
            } else if (color) {
                p.style[o.tipo === "burbuja" ? "borderColor" : "background"] = color;
            }
            p.style.left = x + (o.dispersionX ? (Math.random() - 0.5) * o.dispersionX : 0) + "px";
            p.style.top = y + (o.dispersionY ? (Math.random() - 0.5) * o.dispersionY : 0) + "px";
            capa.appendChild(p);
            const ang = o.angulo != null
                ? o.angulo + (Math.random() - 0.5) * (o.abanico != null ? o.abanico : 1)
                : Math.random() * Math.PI * 2;
            const dist = (o.dist || 90) * (0.5 + Math.random() * 0.7);
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist + (o.gravedad || 0);
            const rot = icono ? Math.round((Math.random() - 0.5) * 60) : Math.round(Math.random() * 360);
            animar(p, [
                { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
                { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) rotate(" + rot + "deg) scale(.4)", opacity: 0 }
            ], { duration: (o.ms || 900) * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.2,.7,.4,1)" })
                .then(function () { p.remove(); });
        }
    }

    /** Notas doradas que caen sobre todo el teatro durante el gran concierto. */
    function lluviaDeNotas(ms) {
        if (reducirMovimiento()) return;
        const capa = $id("capa-efectos");
        const n = Math.round(ms / 60);
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula p-nota nota-dorada";
            p.innerHTML = '<i class="fa-solid fa-music" aria-hidden="true"></i>';
            p.style.left = Math.random() * window.innerWidth + "px";
            p.style.top = "-40px";
            capa.appendChild(p);
            animar(p, [
                { transform: "translateY(0) rotate(-15deg)", opacity: 1 },
                { transform: "translateY(" + (window.innerHeight + 80) + "px) rotate(20deg)", opacity: 0.9 }
            ], { duration: 2200 + Math.random() * 1400, delay: Math.random() * ms, easing: "linear", fill: "backwards" })
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

    /** Cambia la escena de fondo con un fundido entre dos imágenes superpuestas. */
    function cambiarEscena(id) {
        const url = escenaUrl(id);
        const imgs = Array.prototype.slice.call(document.querySelectorAll("#escena-fondo .escena-capa"));
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        if (!url || (actual.getAttribute("src") === url && actual.classList.contains("activa"))) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        let hecho = false;
        const mostrar = function () {
            if (hecho) return;
            hecho = true;
            sig.classList.add("activa");
            actual.classList.remove("activa");
        };
        sig.onload = mostrar;
        sig.src = url;
        setTimeout(mostrar, 500);
    }

    /* ── Sonido y voz ─────────────────────────────────────────── */

    function sfx() { return window.DescubreInstrumentoSfx; }

    function efecto(nombre, arg) {
        if (!nombre) return;
        const efectos = (gameConfig.audios && gameConfig.audios.efectos) || {};
        const ruta = efectos[nombre];
        if (ruta) {
            const a = reproducirAudio(ruta, 0.85, false);
            if (a) setTimeout(function () { try { a.pause(); } catch (e) { /* noop */ } }, 3000);
            return;
        }
        if (sfx()) sfx().sonar(nombre, arg);
    }

    /** Las canciones y el sonido que hay que reconocer suenan sin la música de fondo encima. */
    function atenuarFondo(si) {
        TextoVoz.volumenFondo(si ? 0 : TextoVoz.VOLUMEN_FONDO);
    }

    /** Frase característica del instrumento (grabación si existe). Resuelve cuando termina. */
    function sonidoInstrumento(id, o) {
        const s = instrumento(id).sonido;
        if (!s) return Promise.resolve();
        const ruta = rutasSonidos()[s];
        if (ruta) {
            const a = new Audio(ruta);
            a.volume = 0.9;
            return new Promise(function (resolve) {
                a.addEventListener("ended", resolve, { once: true });
                a.addEventListener("error", resolve, { once: true });
                setTimeout(resolve, 6000);
                const p = a.play();
                if (p && p.catch) p.catch(resolve);
            });
        }
        const seg = sfx() ? sfx().tocar(s, o) : 0;
        return sleep(Math.max(200, seg * 1000));
    }

    function tocarEvento(ev) {
        const s = sfx();
        if (!s) return;
        const sonido = instrumento(ev.id).sonido;
        if (ev.tipo === "golpe") s.golpe(sonido, ev.fuerte);
        else if (ev.tipo === "acorde") s.acorde(sonido, ev.notas, ev.dur / 1000);
        else s.nota(sonido, ev.notas[0], ev.dur / 1000);
    }

    /**
     * Toca un arreglo evento por evento. `filtro(ev)` decide si suena (para sumar instrumentos en vivo),
     * `alEvento(ev)` anima a quien suena y `alPulso(i)` marca cada tiempo.
     */
    async function reproducirArreglo(arr, o) {
        o = o || {};
        const cancelado = o.cancelado || function () { return false; };
        const t0 = performance.now();
        const pulsos = Math.round(arr.duracionMs / arr.pulsoMs);
        const marcas = [];
        for (let b = 0; b < pulsos; b++) marcas.push({ t: b * arr.pulsoMs, pulso: b });
        const linea = arr.eventos.concat(marcas).sort(function (a, b) { return a.t - b.t; });
        for (let i = 0; i < linea.length; i++) {
            const ev = linea[i];
            const espera = ev.t - (performance.now() - t0);
            if (espera > 4) await sleep(espera);
            if (cancelado()) return false;
            if (ev.pulso != null) {
                if (o.alPulso) o.alPulso(ev.pulso);
                continue;
            }
            if (o.filtro && !o.filtro(ev)) continue;
            tocarEvento(ev);
            if (o.alEvento) o.alEvento(ev);
        }
        await sleep(Math.max(0, arr.duracionMs - (performance.now() - t0)));
        return !cancelado();
    }

    function avatarDe(voz, hablando) {
        return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif");
    }

    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
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
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    /** Si el niño ya hizo lo que se pedía, no tiene que esperar a que termine la frase. */
    function callar() {
        tokenDialogo += 1;
        TextoVoz.detener();
    }

    /** "Audio de Zoe y Zeus": las frases se dicen una tras otra. */
    async function decirLineas(x, opts) {
        const lista = L.lineas(x);
        for (let i = 0; i < lista.length; i++) await decir(lista[i], opts);
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
        const sumar = function (x) {
            L.lineas(x).forEach(function (l) { lineas.push({ texto: l.texto, personaje: l.voz }); });
        };
        (nivel.retos || []).forEach(function (r) {
            ["consigna", "revelar", "afinada", "secuenciaConsigna", "pregunta", "acierto", "error"].forEach(function (k) { sumar(r[k]); });
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
        if (sfx()) sfx().detener();
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
        aplicarTema(nivelElegido.tema);
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("estacion").innerHTML = "";
        cambiarEscena(nivelElegido.escena);
        pintarProgreso(-1);
    }

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
            if (!pj) return;
            pj.classList.toggle("celebra", !!si);
            if (si) reiniciarClase(pj, "baila", 1400);
        });
    }

    /* ── Ayuda sin voz tras inactividad (mano del tutorial) ───── */

    function cancelarAyuda() {
        clearTimeout(ayuda.timer);
        ayuda = { timer: null, fn: null, ms: 0 };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }

    function programarAyuda(fn, ms) {
        clearTimeout(ayuda.timer);
        ayuda.fn = fn;
        ayuda.ms = ms;
        ayuda.timer = setTimeout(function () {
            if (ayuda.fn !== fn) return;
            Promise.resolve(fn()).then(function () {
                if (ayuda.fn === fn) programarAyuda(fn, Math.max(ms, 8000) + 2000);
            });
        }, ms);
    }

    /** Reprograma la ayuda cada vez que el niño hace algo. */
    function vigilarInactividad(fn, ms) {
        programarAyuda(fn, ms || 8000);
    }

    function manoTocar(el, o) {
        if (!window.PedniaTutorial || !el) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: el,
            holdMs: 500,
            cancelado: function () { return ayuda.fn !== fn; },
            onPresionar: o && o.alPresionar
        });
    }

    /** La mano arrastra la pieza hasta su destino y la devuelve (solo muestra cómo se hace). */
    function manoArrastrar(pieza, destino) {
        if (!window.PedniaTutorial || !pieza || !destino) return Promise.resolve();
        const fn = ayuda.fn;
        const a = centroDe(pieza);
        const b = centroDe(destino);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return PedniaTutorial.animarMano({
            punto: pieza,
            holdMs: 400,
            cancelado: function () { return ayuda.fn !== fn || pieza.classList.contains("arrastrando"); },
            arrastre: { dx: dx, dy: dy, durMs: 900 },
            onDuranteArrastre: function () {
                pieza.style.transition = "transform 900ms ease";
                pieza.style.transform = "translate(" + dx + "px," + dy + "px)";
            },
            onVolver: function (el, ms) {
                pieza.style.transition = "transform " + ms + "ms ease";
                pieza.style.transform = "";
                setTimeout(function () { pieza.style.transition = ""; }, ms + 60);
            }
        });
    }

    /** La mano se desliza (romper el papel, rasguear) sin mover nada. */
    function manoDeslizar(desde, dx, dy) {
        if (!window.PedniaTutorial) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({
            punto: desde,
            holdMs: 300,
            cancelado: function () { return ayuda.fn !== fn; },
            arrastre: { dx: dx, dy: dy, durMs: 800, soltarEnDestino: true }
        });
    }

    /* ── Arrastre con el dedo ─────────────────────────────────── */

    function volarA(pieza, destino) {
        const a = centroDe(pieza);
        const b = centroDe(destino);
        const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(pieza.style.transform || "");
        const dx = (m ? Number(m[1]) : 0) + (b.x - a.x);
        const dy = (m ? Number(m[2]) : 0) + (b.y - a.y);
        pieza.style.transition = "transform 260ms cubic-bezier(.3,1.4,.5,1)";
        pieza.style.transform = "translate(" + dx + "px," + dy + "px) scale(.92)";
        return sleep(280).then(function () { pieza.style.transition = ""; });
    }

    function regresar(pieza, rebote) {
        pieza.style.transition = "transform 320ms ease";
        pieza.style.transform = "";
        setTimeout(function () {
            pieza.style.transition = "";
            if (rebote) reiniciarClase(pieza, "rebota", 600);
        }, 330);
    }

    /**
     * La pieza sigue al dedo. `mover(x, y)` puede devolver { destino, alLlegar } (imán: se suelta sola);
     * al soltar, `soltar(x, y)` devuelve { destino, alLlegar }, "rebote" o nada (vuelve a su sitio).
     */
    function hacerArrastrable(pieza, o) {
        let g = null;
        const terminar = function (r) {
            const gg = g;
            g = null;
            pieza.classList.remove("arrastrando");
            try { pieza.releasePointerCapture(gg.id); } catch (e) { /* noop */ }
            if (o.alTerminar) o.alTerminar();
            if (r && r.destino) {
                volarA(pieza, r.destino).then(function () { if (r.alLlegar) r.alLlegar(); });
            } else {
                regresar(pieza, r === "rebote");
            }
        };
        pieza.addEventListener("pointerdown", function (ev) {
            if (g || !o.puede()) return;
            if (ev.pointerType === "mouse" && ev.button !== 0) return;
            ev.preventDefault();
            g = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY };
            try { pieza.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            if (window.PedniaTutorial) PedniaTutorial.quitarManos();
            pieza.style.transition = "none";
            pieza.style.transform = "";
            pieza.classList.add("arrastrando");
            if (o.alEmpezar) o.alEmpezar();
        });
        pieza.addEventListener("pointermove", function (ev) {
            if (!g || g.id !== ev.pointerId) return;
            pieza.style.transform = "translate(" + (ev.clientX - g.x0) + "px," + (ev.clientY - g.y0) + "px) scale(1.08)";
            const r = o.mover ? o.mover(ev.clientX, ev.clientY) : null;
            if (r && r.destino) terminar(r);
        });
        const soltar = function (ev) {
            if (!g || g.id !== ev.pointerId) return;
            terminar(ev.type === "pointercancel" ? null : o.soltar(ev.clientX, ev.clientY));
        };
        pieza.addEventListener("pointerup", soltar);
        pieza.addEventListener("pointercancel", soltar);
        pieza.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    }

    function crearPieza(id, clase) {
        const d = document.createElement("div");
        d.className = "pieza" + (clase ? " " + clase : "");
        d.dataset.id = id;
        d.setAttribute("role", "img");
        d.setAttribute("aria-label", instrumento(id).nombre || id);
        d.appendChild(crearImg(instrumento(id).img, "pieza-img"));
        return d;
    }

    /* ── Retos 3-4: la tienda de música ───────────────────────── */

    /** Reto 1: deslizar el dedo rompe el papel, aparece el tambor y se toca 3 veces. */
    async function retoCaja(r, gen) {
        const est = $id("estacion");
        est.innerHTML =
            '<div class="est-caja">' +
            '<div class="caja-zona" id="caja-zona">' +
            '<img class="caja-img" id="caja-img" src="img/caja_regalo.svg" alt="" draggable="false">' +
            '<div class="caja-rasgado" id="caja-rasgado" aria-hidden="true"></div>' +
            '<button type="button" class="tambor-btn" id="tambor-btn" hidden aria-label="' + (instrumento(r.instrumento).nombre || "") + '">' +
            '<img src="' + instrumento(r.instrumento).img + '" alt="" draggable="false"></button>' +
            "</div>" +
            '<div class="golpes" id="golpes" hidden></div>' +
            "</div>";
        const zona = $id("caja-zona");
        const cajaImg = $id("caja-img");
        const tambor = $id("tambor-btn");
        const golpesBox = $id("golpes");
        for (let i = 0; i < r.golpes; i++) golpesBox.appendChild(document.createElement("span"));

        const abierta = promesa();
        let largo = 0;
        let trazo = null;
        let ultimoPapel = 0;
        let fase = "destape";
        const sigue = function () { return vivo(gen); };

        const alMover = function (ev) {
            if (!trazo || trazo.id !== ev.pointerId || fase !== "destape") return;
            const d = Math.hypot(ev.clientX - trazo.x, ev.clientY - trazo.y);
            trazo.x = ev.clientX;
            trazo.y = ev.clientY;
            largo += d;
            trazo.desdePapel += d;
            if (trazo.desdePapel > 26) {
                trazo.desdePapel = 0;
                particulas(ev.clientX, ev.clientY, { n: 3, tipo: "papel", dist: 70, colores: ["#7e57c2", "#ffd54f", "#f48fb1"], gravedad: 50, ms: 800 });
                if (performance.now() - ultimoPapel > 130) {
                    ultimoPapel = performance.now();
                    efecto("papel");
                    reiniciarClase(cajaImg, "sacude", 260);
                }
            }
            const prog = L.progresoDestape(largo, zona.getBoundingClientRect().width, r.destape);
            $id("caja-rasgado").style.opacity = String(prog);
            if (prog >= 1) {
                fase = "abriendo";
                abierta.resolve();
            }
        };
        zona.addEventListener("pointerdown", function (ev) {
            if (fase !== "destape" || demoActiva) return;
            ev.preventDefault();
            trazo = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, desdePapel: 0 };
            try { zona.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            vigilarInactividad(ayudaDestape);
        });
        zona.addEventListener("pointermove", alMover);
        const fin = function (ev) { if (trazo && trazo.id === ev.pointerId) trazo = null; };
        zona.addEventListener("pointerup", fin);
        zona.addEventListener("pointercancel", fin);

        const ayudaDestape = function () {
            const rc = zona.getBoundingClientRect();
            return manoDeslizar({ x: rc.left + rc.width * 0.18, y: rc.top + rc.height * 0.55 }, rc.width * 0.64, -rc.height * 0.1);
        };

        decir(r.consigna).then(function () {
            if (sigue() && fase === "destape") vigilarInactividad(ayudaDestape, 6000);
        });
        await abierta.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        trazo = null;

        efecto("boing");
        cajaImg.src = "img/caja_abierta.svg";
        $id("caja-rasgado").style.opacity = "0";
        reiniciarClase(cajaImg, "salto", 700);
        tambor.hidden = false;
        tambor.classList.add("revelado");
        await animar(tambor, [
            { transform: "translate(-50%, 40%) scale(.4)", opacity: 0 },
            { transform: "translate(-50%, -38%) scale(1.1)", opacity: 1, offset: 0.7 },
            { transform: "translate(-50%, -30%) scale(1)", opacity: 1 }
        ], { duration: 700, easing: "ease-out", fill: "none" });
        const c = centroDe(tambor);
        particulas(c.x, c.y, { n: 20, tipo: "estrella", dist: 200, colores: COLORES_FIESTA });
        efecto("chispas");
        golpesBox.hidden = false;
        fase = "golpes";

        const listo = promesa();
        let golpes = 0;
        const ayudaGolpe = function () { return manoTocar(tambor); };
        tambor.addEventListener("click", function () {
            if (fase !== "golpes" || !sigue()) return;
            golpes += 1;
            sonidoInstrumento(r.instrumento);
            reiniciarClase(tambor, "bota", 450);
            const cc = centroDe(tambor);
            particulas(cc.x, cc.y - 30, { n: 10, tipo: "estrella", dist: 150, angulo: -Math.PI / 2, abanico: 2.4, colores: ["#ffd43b", "#fff59d", "#ff922b"] });
            const punto = golpesBox.children[golpes - 1];
            if (punto) punto.classList.add("hecho");
            if (golpes >= r.golpes) {
                fase = "hecho";
                listo.resolve();
            } else {
                vigilarInactividad(ayudaGolpe, 6000);
            }
        });
        decir(r.revelar).then(function () {
            if (fase === "golpes" && sigue()) vigilarInactividad(ayudaGolpe, 5000);
        });
        await listo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(500);
        celebrarPersonajes(true);
        efecto("recompensa");
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    /** Reto 2: arrastrar las cuerdas a la guitarra y luego rasguearlas. */
    async function retoCuerdas(r, gen) {
        const est = $id("estacion");
        const n = r.cuerdas.length;
        const alturas = r.cuerdas.map(function (_, i) {
            return GUITARRA.yArriba + (n > 1 ? i * (GUITARRA.yAbajo - GUITARRA.yArriba) / (n - 1) : 0);
        });
        let html = '<div class="est-cuerdas"><div class="guitarra-wrap" id="guitarra-wrap">' +
            '<img class="guitarra-img" src="img/guitarra_muda.svg" alt="" draggable="false">';
        r.cuerdas.forEach(function (color, i) {
            html += '<div class="cuerda-slot" data-i="' + i + '" style="top:' + (alturas[i] * 100) + "%;left:" + (GUITARRA.x0 * 100) +
                "%;width:" + ((GUITARRA.x1 - GUITARRA.x0) * 100) + "%;--c:" + color + '"><span class="cuerda"></span></div>';
        });
        html += '</div><div class="rollos" id="rollos">';
        r.cuerdas.forEach(function (color, i) {
            html += '<div class="rollo" data-i="' + i + '" style="--c:' + color + '" role="img" aria-label="Cuerda ' + (i + 1) + '"><span class="rollo-hilo"></span></div>';
        });
        html += "</div></div>";
        est.innerHTML = html;
        const wrap = $id("guitarra-wrap");
        const slots = Array.prototype.slice.call(wrap.querySelectorAll(".cuerda-slot"));
        let fase = "encajar";
        let puestas = 0;
        const sigue = function () { return vivo(gen); };
        const afinada = promesa();

        const pulsar = function (i) {
            if (sfx()) sfx().nota("guitarra", NOTAS_CUERDA[i % NOTAS_CUERDA.length], 1.1);
            reiniciarClase(slots[i], "vibra", 500);
        };
        const libreCercano = function (y) {
            let mejor = null;
            let dMejor = Infinity;
            slots.forEach(function (s) {
                if (s.classList.contains("puesta") || s.classList.contains("reservada")) return;
                const d = Math.abs(centroDe(s).y - y);
                if (d < dMejor) { mejor = s; dMejor = d; }
            });
            return mejor;
        };
        const ayudaEncajar = function () {
            const rollo = $id("rollos").querySelector(".rollo:not(.usado)");
            const slot = slots.find(function (s) { return !s.classList.contains("puesta"); });
            return manoArrastrar(rollo, slot);
        };
        Array.prototype.forEach.call($id("rollos").children, function (rollo) {
            hacerArrastrable(rollo, {
                puede: function () { return fase === "encajar" && sigue() && !demoActiva && !rollo.classList.contains("usado"); },
                alEmpezar: function () { vigilarInactividad(ayudaEncajar); },
                soltar: function (x, y) {
                    if (!L.dentro({ x: x, y: y }, wrap.getBoundingClientRect(), 40)) return null;
                    const slot = libreCercano(y);
                    if (!slot) return null;
                    slot.classList.add("reservada");
                    return {
                        destino: slot,
                        alLlegar: function () {
                            const i = Number(slot.dataset.i);
                            slot.style.setProperty("--c", rollo.style.getPropertyValue("--c"));
                            slot.classList.remove("reservada");
                            slot.classList.add("puesta");
                            rollo.classList.add("usado");
                            pulsar(i);
                            const cc = centroDe(slot);
                            particulas(cc.x, cc.y, { n: 6, tipo: "estrella", dist: 90, colores: COLORES_FIESTA });
                            puestas += 1;
                            if (puestas >= n) {
                                fase = "afinando";
                                afinada.resolve();
                            }
                        }
                    };
                }
            });
        });

        decir(r.consigna).then(function () {
            if (sigue() && fase === "encajar") vigilarInactividad(ayudaEncajar, 6000);
        });
        await afinada.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(450);
        wrap.classList.add("afinada");
        sonidoInstrumento(r.instrumento);
        const cg = centroDe(wrap);
        particulas(cg.x, cg.y, { n: 14, tipo: "nota", dist: 220, colores: COLORES_FIESTA, ms: 1300 });

        fase = "rasguear";
        const listo = promesa();
        let rasgueos = 0;
        let trazo = null;
        const ayudaRasgueo = function () {
            const rw = wrap.getBoundingClientRect();
            const y0 = rw.top + rw.height * GUITARRA.yArriba - 50;
            return manoDeslizar({ x: rw.left + rw.width * 0.4, y: y0 }, 0, rw.height * (GUITARRA.yAbajo - GUITARRA.yArriba) + 100);
        };
        const alturasPantalla = function () {
            return slots.map(function (s) { return centroDe(s).y; });
        };
        wrap.addEventListener("pointerdown", function (ev) {
            if (fase !== "rasguear") return;
            ev.preventDefault();
            trazo = { id: ev.pointerId, y: ev.clientY, tocadas: [] };
            try { wrap.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            if (window.PedniaTutorial) PedniaTutorial.quitarManos();
        });
        wrap.addEventListener("pointermove", function (ev) {
            if (!trazo || trazo.id !== ev.pointerId || fase !== "rasguear") return;
            const cruzadas = L.cuerdasCruzadas(trazo.y, ev.clientY, alturasPantalla());
            trazo.y = ev.clientY;
            cruzadas.forEach(function (i) {
                pulsar(i);
                trazo.tocadas.push(i);
                particulas(ev.clientX, centroDe(slots[i]).y, { n: 2, tipo: "nota", dist: 80, angulo: -Math.PI / 2, abanico: 1.6, colores: [slots[i].style.getPropertyValue("--c")], ms: 900 });
            });
        });
        const finRasgueo = function (ev) {
            if (!trazo || trazo.id !== ev.pointerId) return;
            const t = trazo;
            trazo = null;
            if (fase !== "rasguear" || !L.esRasgueo(t.tocadas, 2)) return;
            rasgueos += 1;
            reiniciarClase(wrap, "rasgueo", 600);
            const c2 = centroDe(wrap);
            particulas(c2.x, c2.y, { n: 10, tipo: "nota", dist: 200, colores: COLORES_FIESTA, ms: 1200 });
            if (rasgueos >= r.rasgueos) {
                fase = "hecho";
                listo.resolve();
            } else {
                vigilarInactividad(ayudaRasgueo);
            }
        };
        wrap.addEventListener("pointerup", finRasgueo);
        wrap.addEventListener("pointercancel", finRasgueo);
        decir(r.afinada).then(function () {
            if (sigue() && fase === "rasguear") vigilarInactividad(ayudaRasgueo, 5000);
        });
        await listo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(400);
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    /** Reto 3: despertar el tubo dormido, tocar la secuencia y oír la melodía del pajarito. */
    async function retoFlauta(r, gen) {
        const est = $id("estacion");
        let html = '<div class="est-flauta"><div class="flauta" id="flauta">' +
            '<span class="flauta-cuerda izq"></span><span class="flauta-cuerda der"></span><span class="flauta-barra"></span>' +
            '<div class="flauta-tubos">';
        r.tubos.forEach(function (t, i) {
            html += '<button type="button" class="tubo' + (t.color === r.dormido ? " dormido" : "") + '" data-color="' + t.color +
                '" style="--c:' + (COLORES_TUBO[t.color] || "#adb5bd") + ";--alto:" + (100 - i * 13) + '%" aria-label="Tubo ' + t.color + '">' +
                '<span class="tubo-boca"></span><span class="tubo-brillo"></span></button>';
        });
        html += '</div><img class="pajarito" id="pajarito" src="img/pajarito_gris.svg" alt="" draggable="false"></div>' +
            '<div class="guia-secuencia" id="guia" hidden>';
        r.secuencia.forEach(function (color, i) {
            if (i) html += '<i class="fa-solid fa-arrow-right guia-flecha" aria-hidden="true"></i>';
            html += '<span class="guia-paso" data-color="' + color + '" style="--c:' + (COLORES_TUBO[color] || "#adb5bd") + '"></span>';
        });
        html += "</div></div>";
        est.innerHTML = html;
        const tubos = Array.prototype.slice.call(est.querySelectorAll(".tubo"));
        const tuboDe = function (color) { return tubos.find(function (t) { return t.dataset.color === color; }); };
        const notaDe = function (color) { return (r.tubos.find(function (t) { return t.color === color; }) || {}).nota; };
        const pajarito = $id("pajarito");
        const sigue = function () { return vivo(gen); };
        let fase = "despertar";
        let hechos = 0;
        const despierto = promesa();
        const completo = promesa();

        const soplar = function (tubo, color) {
            if (sfx()) sfx().nota("flautaTubos", notaDe(color), 0.6);
            reiniciarClase(tubo, "suena", 600);
            const rt = tubo.getBoundingClientRect();
            particulas(rt.left + rt.width / 2, rt.top + 6, { n: 3, tipo: "nota", dist: 120, angulo: -Math.PI / 2, abanico: 1.2, colores: [COLORES_TUBO[color]], ms: 1200 });
        };
        const esperado = function () { return fase === "despertar" ? tuboDe(r.dormido) : tuboDe(r.secuencia[hechos]); };
        const ayudaTubo = function () { return manoTocar(esperado()); };

        tubos.forEach(function (tubo) {
            tubo.addEventListener("click", function () {
                if (!sigue() || demoActiva) return;
                const color = tubo.dataset.color;
                if (fase === "despertar") {
                    if (color !== r.dormido) {
                        reiniciarClase(tubo, "tiembla", 550);
                        reiniciarClase(tuboDe(r.dormido), "resalta", 2400);
                        vigilarInactividad(ayudaTubo);
                        return;
                    }
                    fase = "volando";
                    tubo.classList.remove("dormido");
                    tubo.classList.add("encendido");
                    soplar(tubo, color);
                    despierto.resolve();
                    return;
                }
                if (fase !== "secuencia") return;
                const res = L.evaluarSecuencia(r.secuencia, hechos, color);
                if (res.estado === "fuera") {
                    reiniciarClase(tubo, "tiembla", 550);
                    efecto("suave");
                    reiniciarClase(tuboDe(res.esperado), "resalta", 2400);
                    vigilarInactividad(ayudaTubo);
                    return;
                }
                hechos += 1;
                tubo.classList.add("encendido");
                soplar(tubo, color);
                const paso = $id("guia").querySelector('.guia-paso[data-color="' + color + '"]');
                if (paso) {
                    paso.classList.add("hecho");
                    paso.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
                }
                if (res.estado === "completa") {
                    fase = "melodia";
                    completo.resolve();
                } else {
                    vigilarInactividad(ayudaTubo);
                }
            });
        });

        decir(r.consigna).then(function () {
            if (sigue() && fase === "despertar") vigilarInactividad(ayudaTubo, 5000);
        });
        await despierto.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        efecto("burbujas");
        const ct = centroDe(tuboDe(r.dormido));
        particulas(ct.x, ct.y - 40, { n: 12, tipo: "burbuja", dist: 180, angulo: -Math.PI / 2, abanico: 2.4, colores: COLORES_FIESTA, ms: 1600 });
        particulas(ct.x, ct.y - 40, { n: 6, tipo: "pluma", dist: 160, colores: ["#42a5f5", "#ffca28", "#ef5350"], gravedad: 60, ms: 1800 });
        pajarito.src = "img/pajarito.svg";
        efecto("trino");
        await animar(pajarito, [
            { transform: "translate(0, 0) rotate(0deg)" },
            { transform: "translate(120px, -140px) rotate(10deg)", offset: 0.3 },
            { transform: "translate(320px, -80px) rotate(-8deg)", offset: 0.6 },
            { transform: "translate(160px, -20px) rotate(6deg)", offset: 0.85 },
            { transform: "translate(0, 0) rotate(0deg)" }
        ], { duration: 2000, easing: "ease-in-out", fill: "none" });
        if (!sigue()) return;
        fase = "secuencia";
        $id("guia").hidden = false;
        decir(r.secuenciaConsigna).then(function () {
            if (sigue() && fase === "secuencia") vigilarInactividad(ayudaTubo, 5000);
        });
        await completo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(350);

        tubos.forEach(function (t) { t.classList.add("encendido", "fiesta"); });
        pajarito.classList.add("baila");
        celebrarPersonajes(true);
        atenuarFondo(true);
        efecto("trino");
        for (let i = 0; i < r.melodia.length; i++) {
            const t = r.tubos.find(function (x) { return x.nota === r.melodia[i]; });
            if (t) soplar(tuboDe(t.color), t.color);
            await sleep(i === r.melodia.length - 1 ? 700 : 380);
            if (!sigue()) return;
        }
        atenuarFondo(false);
        efecto("trino");
        await decirLineas(r.acierto, { estado: "acierto" });
        pajarito.classList.remove("baila");
    }

    /** Reto 4: guardar cada instrumento en su estuche (con imán al acercarlo). */
    async function retoEstuches(r, gen) {
        const est = $id("estacion");
        est.innerHTML = '<div class="est-estuches"><div class="mesa"><div class="mesa-piezas" id="mesa-piezas"></div><div class="mesa-tabla"></div></div>' +
            '<div class="estuches" id="estuches"></div></div>';
        const mesa = $id("mesa-piezas");
        const cont = $id("estuches");
        const estuches = {};
        L.mezclar(r.instrumentos).forEach(function (id) {
            const e = document.createElement("div");
            e.className = "estuche forma-" + r.estuches[id];
            e.dataset.id = id;
            e.innerHTML = '<div class="estuche-hueco"><img class="estuche-silueta" src="' + instrumento(id).img + '" alt="" draggable="false"></div>' +
                '<div class="estuche-tapa"><span class="estuche-broche"></span></div>';
            cont.appendChild(e);
            estuches[id] = e;
        });
        const sigue = function () { return vivo(gen); };
        let guardados = 0;
        let jugando = false;
        const listo = promesa();
        const objetivos = function () {
            return Object.keys(estuches).filter(function (id) { return !estuches[id].classList.contains("lleno"); })
                .map(function (id) { return { id: id, rect: estuches[id].getBoundingClientRect() }; });
        };
        const ayudaGuardar = function () {
            const p = mesa.querySelector(".pieza:not(.guardada)");
            return p ? manoArrastrar(p, estuches[p.dataset.id]) : Promise.resolve();
        };
        const guardar = function (pieza, id) {
            const e = estuches[id];
            pieza.classList.add("guardada");
            pieza.style.visibility = "hidden";
            e.classList.add("lleno");
            efecto("clic");
            const c = centroDe(e);
            particulas(c.x, c.y, { n: 12, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
            guardados += 1;
            if (guardados >= r.instrumentos.length) listo.resolve();
            else vigilarInactividad(ayudaGuardar);
        };
        L.mezclar(r.instrumentos).forEach(function (id) {
            const pieza = crearPieza(id);
            mesa.appendChild(pieza);
            hacerArrastrable(pieza, {
                puede: function () { return jugando && sigue() && !demoActiva && !pieza.classList.contains("guardada"); },
                alEmpezar: function () { vigilarInactividad(ayudaGuardar); },
                alTerminar: function () { Object.keys(estuches).forEach(function (k) { estuches[k].classList.remove("cerca"); }); },
                mover: function (x, y) {
                    const cerca = L.imanMasCercano({ x: x, y: y }, objetivos(), RADIO_IMAN);
                    Object.keys(estuches).forEach(function (k) { estuches[k].classList.toggle("cerca", k === cerca); });
                    if (cerca !== id) return null;
                    return { destino: estuches[id].querySelector(".estuche-hueco"), alLlegar: function () { guardar(pieza, id); } };
                },
                soltar: function (x, y) {
                    const cual = L.imanMasCercano({ x: x, y: y }, objetivos(), RADIO_IMAN * 1.4);
                    if (!cual) return null;
                    if (cual === id) return { destino: estuches[id].querySelector(".estuche-hueco"), alLlegar: function () { guardar(pieza, id); } };
                    efecto("rebote");
                    reiniciarClase(estuches[id], "resalta", 2400);
                    return "rebote";
                }
            });
        });
        jugando = true;
        decir(r.consigna).then(function () {
            if (sigue() && guardados < r.instrumentos.length) vigilarInactividad(ayudaGuardar, 5000);
        });
        await listo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(400);
        const ids = Object.keys(estuches);
        for (let i = 0; i < ids.length; i++) {
            estuches[ids[i]].classList.add("cerrado");
            efecto("broche");
            await sleep(260);
        }
        efecto("fanfarria");
        const cc = centroDe(cont);
        particulas(cc.x, cc.y, { n: 26, tipo: "confeti", dist: 320, colores: COLORES_FIESTA, gravedad: 80, ms: 1600 });
        celebrarPersonajes(true);
        await sleep(600);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    /* ── Retos 5-6: el gran teatro ────────────────────────────── */

    /** Reto 1: arrastrar cada instrumento a la zona de su familia. */
    async function retoFamilias(r, gen) {
        const est = $id("estacion");
        const familias = gameConfig.familias || {};
        let html = '<div class="est-familias"><div class="zonas" id="zonas">';
        r.zonas.forEach(function (f) {
            const fam = familias[f] || {};
            html += '<div class="zona" data-familia="' + f + '" style="--c:' + fam.color + '" aria-label="' + (fam.nombre || f) + '">' +
                '<div class="zona-insignia"><img src="' + instrumento(fam.icono).img + '" alt="" draggable="false"></div>' +
                '<div class="zona-ranuras"></div></div>';
        });
        html += '</div><div class="bandeja" id="bandeja"></div></div>';
        est.innerHTML = html;
        const zonas = Array.prototype.slice.call(est.querySelectorAll(".zona"));
        const zonaDe = function (familia) { return zonas.find(function (z) { return z.dataset.familia === familia; }); };
        const bandeja = $id("bandeja");
        const sigue = function () { return vivo(gen); };
        let colocados = 0;
        let jugando = false;
        const listo = promesa();
        const ayudaOrdenar = function () {
            const p = bandeja.querySelector(".pieza:not(.colocada)");
            return p ? manoArrastrar(p, zonaDe(L.familiaDe(gameConfig.instrumentos, p.dataset.id))) : Promise.resolve();
        };
        const colocar = function (pieza, ranura) {
            ranura.classList.remove("reservada");
            pieza.style.transform = "";
            pieza.classList.add("colocada");
            ranura.appendChild(pieza);
            const foco = document.createElement("span");
            foco.className = "foco";
            ranura.appendChild(foco);
            efecto("luz");
            sonidoInstrumento(pieza.dataset.id, { breve: true });
            colocados += 1;
            if (colocados >= r.instrumentos.length) listo.resolve();
            else vigilarInactividad(ayudaOrdenar);
        };
        L.mezclar(r.instrumentos).forEach(function (id) {
            const pieza = crearPieza(id);
            bandeja.appendChild(pieza);
            hacerArrastrable(pieza, {
                puede: function () { return jugando && sigue() && !demoActiva && !pieza.classList.contains("colocada"); },
                alEmpezar: function () { vigilarInactividad(ayudaOrdenar); },
                soltar: function (x, y) {
                    const zona = zonas.find(function (z) { return L.dentro({ x: x, y: y }, z.getBoundingClientRect(), 16); });
                    if (!zona) return null;
                    if (zona.dataset.familia !== L.familiaDe(gameConfig.instrumentos, id)) {
                        efecto("rebote");
                        reiniciarClase(zona, "rechaza", 500);
                        decir(r.error);
                        return "rebote";
                    }
                    const ranura = document.createElement("div");
                    ranura.className = "ranura reservada";
                    zona.querySelector(".zona-ranuras").appendChild(ranura);
                    return { destino: ranura, alLlegar: function () { colocar(pieza, ranura); } };
                }
            });
        });
        jugando = true;
        decir(r.consigna).then(function () {
            if (sigue() && colocados < r.instrumentos.length) vigilarInactividad(ayudaOrdenar, 5000);
        });
        await listo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await sleep(600);
        zonas.forEach(function (z) { z.classList.add("lista"); });
        efecto("celebracion");
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    /** Reto 2: ¿quién suena más grave? El contrabajo y el violín frente a frente. */
    async function retoDuelo(r, gen) {
        const est = $id("estacion");
        const orden = L.mezclar(r.opciones);
        let html = '<div class="est-duelo">';
        orden.forEach(function (id, i) {
            if (i === 1) html += '<button type="button" class="btn-oir" id="btn-oir" disabled aria-label="Escuchar otra vez"><span class="onda o1" aria-hidden="true"></span><span class="onda o2" aria-hidden="true"></span><i class="fa-solid fa-ear-listen" aria-hidden="true"></i></button>';
            html += '<button type="button" class="duelo-carta carta-' + id + '" data-id="' + id + '" disabled aria-label="' + (instrumento(id).nombre || id) + '">' +
                '<span class="ondas" aria-hidden="true"><i></i><i></i><i></i></span><img src="' + instrumento(id).img + '" alt="" draggable="false"></button>';
        });
        html += "</div>";
        est.innerHTML = html;
        const oir = $id("btn-oir");
        const cartas = Array.prototype.slice.call(est.querySelectorAll(".duelo-carta"));
        const sigue = function () { return vivo(gen); };
        let fase = "presentacion";
        let errores = 0;
        let ultimoError = null;
        const listo = promesa();

        const estimulo = async function () {
            oir.classList.add("sonando");
            atenuarFondo(true);
            await sonidoInstrumento(r.correcto);
            atenuarFondo(false);
            oir.classList.remove("sonando");
        };
        const ayudaOir = function () {
            return manoTocar(oir, { alPresionar: function () { oir.click(); } });
        };
        oir.addEventListener("click", async function () {
            if (!sigue() || (fase !== "jugar" && fase !== "error")) return;
            const previa = fase;
            fase = "escuchando";
            tokenDialogo += 1;
            TextoVoz.detener();
            await estimulo();
            if (fase === "escuchando") fase = previa === "error" ? "jugar" : previa;
            vigilarInactividad(ayudaOir);
        });
        cartas.forEach(function (carta) {
            carta.addEventListener("click", async function () {
                if (!sigue() || (fase !== "jugar" && fase !== "error" && fase !== "escuchando")) return;
                if (fase === "error" && carta === ultimoError) return;
                cancelarAyuda();
                tokenDialogo += 1;
                TextoVoz.detener();
                if (sfx()) sfx().detener();
                oir.classList.remove("sonando");
                if (carta.dataset.id === r.correcto) {
                    fase = "hecho";
                    cartas.forEach(function (c) { c.disabled = true; if (c !== carta) c.classList.add("apagada"); });
                    oir.disabled = true;
                    carta.classList.remove("resalta");
                    carta.classList.add("vibra-grave");
                    atenuarFondo(true);
                    await sonidoInstrumento(carta.dataset.id);
                    atenuarFondo(false);
                    listo.resolve();
                    return;
                }
                fase = "error";
                errores += 1;
                ultimoError = carta;
                reiniciarClase(carta, "vibra-agudo", 1400);
                atenuarFondo(true);
                await sonidoInstrumento(carta.dataset.id);
                atenuarFondo(false);
                if (!sigue() || fase !== "error") return;
                if (errores >= 3) {
                    const c = cartas.find(function (x) { return x.dataset.id === r.correcto; });
                    if (c) c.classList.add("resalta");
                }
                await decir(r.error);
                if (!sigue() || fase !== "error") return;
                fase = "jugar";
                vigilarInactividad(ayudaOir);
            });
        });

        await decir(r.consigna);
        if (!sigue()) return;
        await sleep(300);
        await estimulo();
        if (!sigue()) return;
        await decir(r.pregunta);
        if (!sigue()) return;
        cartas.forEach(function (c) { c.disabled = false; });
        oir.disabled = false;
        fase = "jugar";
        vigilarInactividad(ayudaOir);
        await listo.p;
        if (!sigue()) return;
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    /** Reto 3: el niño dirige la orquesta tocando los instrumentos en el orden de la partitura. */
    async function retoDirector(r, gen) {
        const est = $id("estacion");
        let html = '<div class="est-director"><div class="partitura"><img class="batuta" id="batuta" src="img/batuta.svg" alt="" draggable="false">' +
            '<div class="pentagrama"><span class="pauta" aria-hidden="true"></span>';
        r.secuencia.forEach(function (id, i) {
            html += '<div class="casilla' + (i === 0 ? " siguiente" : "") + '" data-id="' + id + '"><img src="' + instrumento(id).img + '" alt="" draggable="false"></div>';
        });
        html += '</div></div><div class="secciones" id="secciones">';
        L.mezclar(r.secuencia).forEach(function (id) {
            html += '<button type="button" class="seccion" data-id="' + id + '" aria-label="' + (instrumento(id).nombre || id) + '"><img src="' + instrumento(id).img + '" alt="" draggable="false"></button>';
        });
        html += "</div></div>";
        est.innerHTML = html;
        const secciones = Array.prototype.slice.call(est.querySelectorAll(".seccion"));
        const casillas = Array.prototype.slice.call(est.querySelectorAll(".casilla"));
        const seccionDe = function (id) { return secciones.find(function (s) { return s.dataset.id === id; }); };
        const batuta = $id("batuta");
        const sigue = function () { return vivo(gen); };
        const activos = [];
        let hechos = 0;
        let jugando = false;
        let bucle = null;
        const listo = promesa();
        const cancion = (nivelElegido.concierto || {}).cancion || {};
        const mitad = {
            melodia: cancion.melodia.slice(0, 7),
            acordes: (cancion.acordes || []).slice(0, 4),
            tiemposAcorde: cancion.tiemposAcorde
        };
        const ayudaTurno = function () { return manoTocar(seccionDe(r.secuencia[hechos])); };
        const marcarSiguiente = function () {
            casillas.forEach(function (c, i) { c.classList.toggle("siguiente", i === hechos); });
        };
        const alEvento = function (ev) { reiniciarClase(seccionDe(ev.id), "suena", 300); };
        const alPulso = function () { reiniciarClase(batuta, "marca", 380); };
        const arrancarBucle = function () {
            if (bucle) return;
            bucle = (async function () {
                const arr = L.arreglo(r.secuencia, gameConfig.instrumentos, mitad, { bpm: r.bpm });
                atenuarFondo(true);
                while (sigue() && hechos < r.secuencia.length) {
                    await reproducirArreglo(arr, {
                        cancelado: function () { return !sigue() || hechos >= r.secuencia.length; },
                        filtro: function (ev) { return activos.indexOf(ev.id) !== -1; },
                        alEvento: alEvento,
                        alPulso: alPulso
                    });
                }
            })();
        };

        secciones.forEach(function (sec) {
            sec.addEventListener("click", function () {
                if (!jugando || !sigue() || demoActiva || hechos >= r.secuencia.length) return;
                const id = sec.dataset.id;
                const res = L.evaluarSecuencia(r.secuencia, hechos, id);
                if (res.estado === "fuera") {
                    reiniciarClase(sec, "tiembla", 550);
                    efecto("suave");
                    reiniciarClase(seccionDe(res.esperado), "resalta", 2400);
                    vigilarInactividad(ayudaTurno);
                    return;
                }
                hechos += 1;
                activos.push(id);
                sec.classList.add("iluminada");
                casillas[hechos - 1].classList.add("llena");
                marcarSiguiente();
                if (!bucle) sonidoInstrumento(id);
                const c = centroDe(sec);
                particulas(c.x, c.y - 30, { n: 8, tipo: "nota", dist: 140, angulo: -Math.PI / 2, abanico: 2, colores: COLORES_FIESTA, ms: 1100 });
                arrancarBucle();
                if (res.estado === "completa") listo.resolve();
                else vigilarInactividad(ayudaTurno);
            });
        });

        jugando = true;
        decir(r.consigna).then(function () {
            if (sigue() && hechos < r.secuencia.length) vigilarInactividad(ayudaTurno, 5000);
        });
        await listo.p;
        if (!sigue()) return;
        callar();
        cancelarAyuda();
        await bucle;
        if (!sigue()) return;
        batuta.classList.add("dirige");
        atenuarFondo(true);
        await reproducirArreglo(L.arreglo(r.secuencia, gameConfig.instrumentos, cancion, { bpm: r.bpm }), {
            cancelado: function () { return !sigue(); },
            alEvento: alEvento,
            alPulso: alPulso
        });
        atenuarFondo(false);
        batuta.classList.remove("dirige");
        if (!sigue()) return;
        efecto("aplausos");
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    const RETOS = {
        caja: retoCaja,
        cuerdas: retoCuerdas,
        flauta: retoFlauta,
        estuches: retoEstuches,
        familias: retoFamilias,
        duelo: retoDuelo,
        director: retoDirector
    };

    /* ── Flujo ────────────────────────────────────────────────── */

    async function iniciarReto(gen) {
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        const r = nivelElegido.retos[indiceReto];
        if (!r) {
            granCierre(gen);
            return;
        }
        cancelarAyuda();
        celebrarPersonajes(false);
        pintarProgreso(indiceReto);
        cambiarEscena(r.escena);
        $id("estacion").className = "estacion reto-" + r.tipo;
        await sleep(400);
        if (!vivo(gen)) return;
        await RETOS[r.tipo](r, gen);
        if (!vivo(gen)) return;
        cancelarAyuda();
        pintarProgreso(indiceReto + 1);
        await sleep(700);
        if (!vivo(gen)) return;
        const est = $id("estacion");
        await animar(est, [{ opacity: 1 }, { opacity: 0, transform: "scale(.96)" }], { duration: 380 });
        est.innerHTML = "";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        indiceReto += 1;
        iniciarReto(gen);
    }

    /* ── Demostración (con un instrumento que no está en ningún reto) ── */

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const inst = instrumento(d.instrumento);
        if (!inst.img || !window.PedniaTutorial) {
            iniciarReto(gen);
            return;
        }
        demoActiva = true;
        await PedniaTutorial.activarDemo();
        const t = textos();
        const est = $id("estacion");
        est.className = "estacion reto-demo";
        est.innerHTML = '<div class="est-demo"><button type="button" class="demo-inst" id="demo-inst" aria-label="' + (inst.nombre || "") + '">' +
            '<img src="' + inst.img + '" alt="" draggable="false"></button></div>';
        const boton = $id("demo-inst");
        await animar(boton, [{ transform: "scale(.5)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }], { duration: 480, fill: "none" });
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 2500 });
        if (!vivo(gen) || !demoActiva) return;
        await PedniaTutorial.animarMano({
            punto: boton,
            holdMs: 600,
            cancelado: function () { return !demoActiva || !vivo(gen); },
            onPresionar: function () {
                reiniciarClase(boton, "agita", 1000);
                sonidoInstrumento(d.instrumento);
                const c = centroDe(boton);
                particulas(c.x, c.y, { n: 12, tipo: "nota", dist: 150, colores: COLORES_FIESTA, ms: 1200 });
            }
        });
        if (!vivo(gen) || !demoActiva) return;
        await sleep(600);
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 1500 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1500 });
        detenerDemo();
        if (!vivo(gen)) return;
        await animar(est, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
        est.innerHTML = "";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        indiceReto = 0;
        iniciarReto(gen);
    }

    /* ── Concierto final ──────────────────────────────────────── */

    /**
     * 3-4: los estuches se abren solos y el tambor, la guitarra y la flauta tocan la canción.
     * 5-6: toda la orquesta toca al unísono, caen notas doradas y el público aplaude.
     */
    async function concierto(gen) {
        const conc = nivelElegido.concierto || {};
        const teatro = conc.tipo === "teatro";
        const ids = conc.instrumentos || [];
        cambiarEscena(nivelElegido.escena);
        $id("estacion").style.visibility = "hidden";
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        tarima.className = "concierto-tarima" + (teatro ? " orquesta" : " tienda");
        const items = {};
        ids.forEach(function (id) {
            const d = document.createElement("div");
            d.className = "concierto-item";
            d.dataset.id = id;
            if (!teatro) d.innerHTML = '<span class="estuche-abierto" aria-hidden="true"></span>';
            if (teatro) d.innerHTML = '<span class="foco" aria-hidden="true"></span>';
            d.appendChild(crearImg(instrumento(id).img, "concierto-img"));
            tarima.appendChild(d);
            items[id] = d;
        });
        const caja = $id("concierto");
        caja.hidden = false;
        caja.setAttribute("aria-hidden", "false");
        await Promise.all(ids.map(function (id, i) {
            const img = items[id].querySelector(".concierto-img");
            return animar(img, [
                { transform: "translateY(70%) scale(.4)", opacity: 0 },
                { transform: "translateY(-14%) scale(1.08)", opacity: 1, offset: 0.7 },
                { transform: "none", opacity: 1 }
            ], { duration: 620, delay: i * 140, easing: "ease-out", fill: "backwards" });
        }));
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        const arr = L.arreglo(ids, gameConfig.instrumentos, conc.cancion, { bpm: conc.bpm });
        atenuarFondo(true);
        if (teatro) lluviaDeNotas(arr.duracionMs);
        await reproducirArreglo(arr, {
            cancelado: function () { return gen !== rondaGen; },
            alEvento: function (ev) { reiniciarClase(items[ev.id], "canta", 320); },
            alPulso: function (b) { if (b % 4 === 0) celebrarPersonajes(true); }
        });
        atenuarFondo(false);
        if (gen !== rondaGen) return;
        efecto(teatro ? "aplausos" : "fanfarria");
        const r = tarima.getBoundingClientRect();
        particulas(r.left + r.width / 2, r.top, { n: 30, tipo: "confeti", dist: 340, colores: COLORES_FIESTA, gravedad: 80, ms: 1700 });
        await sleep(900);
    }

    async function granCierre(gen) {
        juegoTerminado = true;
        cancelarAyuda();
        await sleep(300);
        if (gen !== rondaGen) return;
        await concierto(gen);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 1200 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /** Medalla visual (sin texto) en lugar del trofeo; al tocarla gira y suelta chispas. */
    function prepararInsignia() {
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (!ins || !trofeo) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre;
        trofeo.classList.add("insignia");
        trofeo.addEventListener("click", function () {
            const c = centroDe(trofeo);
            trofeo.classList.add("quieta");
            reiniciarClase(trofeo, "gira", 1000);
            efecto("chispas");
            particulas(c.x, c.y, { n: 16, tipo: "estrella", dist: 140, colores: COLORES_FIESTA });
        });
    }

    /** Las frases de cierre ya se dijeron tras el concierto; aquí solo la victoria y la medalla. */
    function mostrarCierre() {
        const primera = (nivelElegido.cierre || [])[0] || { texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = primera.texto;
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        const ins = nivelElegido.insignia || {};
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 3000);
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
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelSesion = nivelDeSesion();
        if (nivelSesion) aplicarTema(nivelSesion.tema);
        cambiarEscena((nivelSesion || gameConfig.niveles[0] || {}).escena);

        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[DescubreElInstrumento] config:", errores);

        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
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
