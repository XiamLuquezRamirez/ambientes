/* Clasifica por los sentidos — flujo común de los 6 juegos (cada uno trae su mundo Phaser). */
(function () {
    "use strict";

    let introConfig = null;
    let gameConfig = null;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;
    let nivelElegido = null;
    let juegoTerminado = false;
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let imagenesPromise = Promise.resolve();

    function readText(ruta) {
        const x = new XMLHttpRequest();
        x.open("GET", ruta, false);
        x.send(null);
        return x.responseText;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || { img: "", nombre: id }; }
    function linea(l) {
        if (!l) return null;
        if (typeof l === "string") return { voz: "zoe", texto: l };
        return l;
    }

    /* ── Voz ─────────────────────────────────────────────────── */

    function avatarDe(voz, hablando) {
        return "../../../images/" + (voz === "zeus" ? "zeus" : "zoe") + (hablando ? "_hablando" : "_normal") + ".gif";
    }
    function pintarDialogo(voz, texto, estado) {
        const d = $id("dialogo");
        d.dataset.voz = voz;
        d.classList.toggle("es-acierto", estado === "acierto");
        $id("dialogo-avatar").src = avatarDe(voz, true);
        $id("dialogo-avatar").alt = voz === "zeus" ? "Zeus" : "Zoe";
        $id("enunciado").textContent = texto || "";
        d.classList.remove("pop");
        void d.offsetWidth;
        d.classList.add("pop");
    }
    function silenciarAvatar() {
        $id("dialogo-avatar").src = avatarDe($id("dialogo").dataset.voz || "zoe", false);
    }

    /** Muestra el texto cuando la voz empieza de verdad y resuelve cuando termina. */
    function decir(l, opts) {
        opts = opts || {};
        l = linea(l);
        if (!l || !l.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = l.voz === "zeus" ? "zeus" : "zoe";
        let mostrado = false;
        const mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, l.texto, opts.estado);
        };
        const respaldo = setTimeout(mostrar, 5000);
        let p;
        try { p = TextoVoz.hablar(l.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
            sleep(16000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    /* ── Sonido ─────────────────────────────────────────────── */

    function efecto(nombre) {
        if (window.ClasificaSentidosSfx) ClasificaSentidosSfx.sonar(nombre);
    }

    /** Estímulo de un objeto del oído (síntesis); la música de fondo baja mientras suena. */
    function reproducirSonido(id, o) {
        const s = elemento(id).sonido;
        if (!s || !window.ClasificaSentidosSfx) return Promise.resolve();
        if (TextoVoz.volumenFondo) TextoVoz.volumenFondo(Math.min(0.04, TextoVoz.VOLUMEN_FONDO));
        const seg = ClasificaSentidosSfx.reproducir(s, o || {});
        return sleep(Math.max(300, seg * 1000)).then(function () {
            if (TextoVoz.volumenFondo) TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        });
    }

    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }
    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        const audio = new Audio(ruta);
        audio.loop = !!loop;
        audio.volume = typeof volumen === "number" ? volumen : 0.2;
        const p = audio.play();
        if (p && p.catch) p.catch(function () {});
        if (loop) audioFondo = audio;
        return audio;
    }
    function asegurarAudioFondo() {
        if (audioFondo) {
            const p = audioFondo.play();
            if (p && p.catch) p.catch(function () {});
            return audioFondo;
        }
        const v = (window.TextoVoz && TextoVoz.VOLUMEN_FONDO != null) ? TextoVoz.VOLUMEN_FONDO : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, v, true);
    }

    function aplicarVolumenCalibrado(pct) {
        const n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        if (typeof TextoVoz.definirVolumenFondo === "function") TextoVoz.definirVolumenFondo(n / 100);
        else if (audioFondo) audioFondo.volume = n / 100;
        const icono = document.querySelector("#btn-menu-vol i");
        if (icono) icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
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
        if (btn) btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            const panel = $id("menu-vol-panel");
            setMenuVol(panel && panel.hidden);
        });
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) slider.addEventListener("input", function () {
            const n = Number(slider.value);
            const val = $id("vol-val");
            if (val) val.textContent = String(n);
            aplicarVolumenCalibrado(n);
        });
        document.addEventListener("pointerdown", function (ev) {
            const menu = $id("menu-vol");
            if (!menu || menu.contains(ev.target)) return;
            setMenuVol(false);
        });
        const pct = volumenFondoPct();
        if (slider) slider.value = String(pct);
        if ($id("vol-val")) $id("vol-val").textContent = String(pct);
        aplicarVolumenCalibrado(pct);
    }

    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    }

    /* ── Intro 3D y edad ─────────────────────────────────────── */

    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        const edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }
    function conversacionInicial() {
        const nivel = nivelDeSesion();
        return (nivel && nivel.bienvenida) || textos().conversacion || [];
    }
    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
        introTimers = [];
    }
    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (l) {
            const indice = Number(l.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            return { personaje: id, nombre: id === "zoe" ? "Zoe" : "Zeus", texto: String(l.texto || "") };
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
        root.hidden = true;
        if (window.__introPhaser) {
            try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
            window.__introPhaser = null;
        }
        if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
        root.remove();
    }
    function omitirIntro3d() {
        if (cerrado) return;
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }
    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        cancelarIntroPendiente();
        TextoVoz.detener();
        asegurarAudioFondo();
        if (TextoVoz.volumenFondo && TextoVoz.VOLUMEN_FONDO != null) TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(600);
        PedniaEdad.iniciarNivel({
            niveles: (gameConfig && gameConfig.niveles) || [],
            elegirManual: elegirNivel,
            onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
        });
    }
    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (TextoVoz.desbloquear) TextoVoz.desbloquear();
        if (window.ClasificaSentidosSfx) ClasificaSentidosSfx.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        setTimeout(function () {
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
        }, 1200);
    }
    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + (i === 0 ? "success" : "primary") +
                ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" +
                nivel.titulo + "</small></button></div>";
        });
        TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, width: 420
        });
    }

    function lineasDelNivel(nivel) {
        const lineas = [];
        const sumar = function (l) {
            l = linea(l);
            if (l && l.texto) lineas.push({ texto: l.texto, personaje: l.voz || "zoe" });
        };
        (nivel.retos || []).forEach(function (r) {
            sumar(r.presentacion);
            sumar(r.pregunta);
            sumar(r.acierto);
            sumar(r.errorOtro);
            (r.errores || []).forEach(sumar);
        });
        (nivel.cierre || []).forEach(sumar);
        const t = textos();
        [t.demostracion, t.demostracionAcierto, t.demostracionFin].forEach(function (x) { if (x) sumar({ voz: "zoe", texto: x }); });
        return lineas;
    }

    function mostrarIntroActiva() {
        return window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro;
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        if (window.Swal) Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (window.PedniaJuego) iniciarMotor(gen);
            else console.error("[ClasificaSentidos] no cargó el motor del juego");
        });
    };

    /* ── Motor Phaser del juego ─────────────────────────────── */

    function celebrarPersonajes() { /* los personajes viven en la escena (presentador 3D) */ }

    function ctxMotor(gen) {
        return {
            decir: function (l, opts) { return vivo(gen) || juegoTerminado ? decir(l, opts) : Promise.resolve(); },
            callar: function () { TextoVoz.detener(); },
            mano: function (opts) { return window.PedniaTutorial ? PedniaTutorial.animarMano(opts) : Promise.resolve(); },
            quitarMano: function () { if (window.PedniaTutorial) PedniaTutorial.quitarManos(); },
            sonido: function (id, o) { return reproducirSonido(id, o); },
            efecto: efecto,
            vivo: function () { return vivo(gen); },
            enDemo: function () { return demoActiva; },
            textos: textos(),
            reto: (nivelElegido.retos || [])[0] || {},
            nivel: nivelElegido,
            elemento: elemento,
            celebrar: celebrarPersonajes
        };
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
    }

    async function iniciarMotor(gen) {
        const M = window.PedniaJuego;
        try {
            await M.montar({ gameConfig: gameConfig, nivel: nivelElegido, ctx: ctxMotor(gen) });
        } catch (e) {
            console.error("[ClasificaSentidos] el motor no montó:", e);
            return;
        }
        if (!vivo(gen)) return;
        try {
            if (typeof TextoVoz.encolarFrases === "function") {
                if (M.frases) TextoVoz.encolarFrases(M.frases());
                if (window.SentidosKit) TextoVoz.encolarFrases(SentidosKit.frases(gameConfig, nivelElegido));
            }
        } catch (e) { /* noop */ }
        if (mostrarIntroActiva() && window.PedniaTutorial && M.escena && M.escena() && M.escena().demo) {
            demoActiva = true;
            await PedniaTutorial.activarDemo();
            await M.demo();
            detenerDemo();
            if (!vivo(gen)) return;
        }
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        await M.jugar();
        if (!vivo(gen)) return;
        juegoTerminado = true;
        await M.fiestaFinal();
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    /* ── Cierre ─────────────────────────────────────────────── */

    function prepararInsignia() {
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (!ins || !trofeo) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre || "Insignia";
        trofeo.classList.add("insignia");
    }

    function mostrarCierre() {
        const cierre = (nivelElegido.cierre && nivelElegido.cierre.length) ? nivelElegido.cierre : [{ voz: "zoe", texto: "¡Excelente!" }];
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre.map(function (l) { return l.texto; }).join(" ");
        prepararInsignia();
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        cierre.reduce(function (p, l) {
            return p.then(function () { return Promise.resolve(TextoVoz.hablar(l.texto, l.voz === "zeus" ? "zeus" : "zoe")).catch(function () {}); });
        }, Promise.resolve());
        setTimeout(function () {
            const caja = $id("final");
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
        }, 400);
    }

    function precargar() {
        const urls = Object.keys(gameConfig.elementos || {}).map(function (id) { return elemento(id).img; });
        (gameConfig.niveles || []).forEach(function (n) { if (n.insignia) urls.push(n.insignia.img); });
        return Promise.all(urls.filter(Boolean).map(function (url) {
            return new Promise(function (resolve) {
                const img = new Image();
                img.onload = img.onerror = function () { resolve(); };
                img.src = url;
                setTimeout(resolve, 4000);
            });
        }));
    }

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        if (window.ClasificaSentidosLogica) {
            const errores = ClasificaSentidosLogica.validarConfig(gameConfig);
            if (errores && errores.length) console.warn("[ClasificaSentidos] config:", errores);
        }
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: []
        });
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        window.addEventListener("pagehide", function () { if (TextoVoz.vaciar) TextoVoz.vaciar(); });
        imagenesPromise = precargar();
        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        const btnOmitir = $id("btn-omitir-intro3d");
        if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
        const btnCont = $id("btn-continuar-intro3d");
        if (btnCont) btnCont.addEventListener("click", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
