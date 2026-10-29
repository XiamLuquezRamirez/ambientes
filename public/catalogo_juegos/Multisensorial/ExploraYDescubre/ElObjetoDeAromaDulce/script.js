/* Explora y descubre — lupa (3-4) y radar (5-6) */
(function () {
    "use strict";

    const L = window.ExploraDescubreLogica;
    let introConfig = null;
    let gameConfig = null;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;
    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let ctx = null;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let entradaActiva = false;
    let pistaVista = false;
    let elegida = null;
    let imagenesPromise = Promise.resolve();
    const pista = { timer: null, gen: 0 };
    const DESCUBIERTOS = ["arcoiris", "tambor", "perfume", "helado"];

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
    function esLab() { return !!nivelElegido && String(nivelElegido.id) === "5"; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || { img: "", nombre: id }; }
    function linea(l) { return !l ? null : (typeof l === "string" ? { voz: "zoe", texto: l } : l); }
    function efecto(nombre) { if (window.ExploraDescubreSfx) ExploraDescubreSfx.sonar(nombre); }
    function avatarDe(voz, hablando) {
        return "../../../images/" + (voz === "zeus" ? "zeus" : "zoe") + (hablando ? "_hablando" : "_normal") + ".gif";
    }
    function pintarDialogo(voz, texto, estado) {
        const d = $id("dialogo");
        d.dataset.voz = voz === "zeus" ? "zeus" : "zoe";
        d.classList.toggle("es-acierto", estado === "acierto");
        $id("dialogo-avatar").src = avatarDe(voz, true);
        $id("enunciado").textContent = texto || "";
    }
    function decir(l, opts) {
        opts = opts || {};
        l = linea(l);
        if (!l || !l.texto) return Promise.resolve();
        const token = ++tokenDialogo;
        const voz = l.voz === "zeus" ? "zeus" : "zoe";
        pintarDialogo(voz, l.texto, opts.estado);
        let p;
        try { p = TextoVoz.hablar(l.texto, voz); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 700)]),
            sleep(16000)
        ]).then(function () {
            if (token === tokenDialogo) $id("dialogo-avatar").src = avatarDe(voz, false);
        });
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
        if (typeof TextoVoz !== "undefined" && typeof TextoVoz.definirVolumenFondo === "function") TextoVoz.definirVolumenFondo(vol);
        else if (audioFondo) audioFondo.volume = vol;
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
        pintarMenuVol();
    }
    function frasesFijasTts() {
        const t = textos();
        return [t.eligeNivel, t.demostracion, t.demostracionEstudio, t.demostracionDetective, t.demostracionAcierto, t.demostracionFin, t.usaLupa].filter(Boolean);
    }
    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
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
        const conversacion = conversacionInicial();
        const personajesCfg = window.INTRO_CONFIG.personajes || [];
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (l) {
            const indice = Number(l.personaje);
            const def = personajesCfg[isFinite(indice) ? indice : 0] || personajesCfg[0] || {};
            const id = def.id || (indice === 1 ? "zoe" : "zeus");
            const nombre = (introConfig && introConfig.personajes && introConfig.personajes[indice] && introConfig.personajes[indice].nombre) || (id === "zoe" ? "Zoe" : "Zeus");
            return { personaje: id, nombre: nombre, color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"), texto: String(l.texto || "").replace(/\s+/g, " ").trim() };
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
        TextoVoz.detener();
        asegurarAudioFondo();
        if (TextoVoz.volumenFondo && TextoVoz.VOLUMEN_FONDO != null) TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(500);
        PedniaEdad.iniciarNivel({
            niveles: (gameConfig && gameConfig.niveles) || [],
            elegirManual: elegirNivel,
            onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
        });
    }
    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (TextoVoz.desbloquear) TextoVoz.desbloquear();
        if (window.ExploraDescubreSfx) ExploraDescubreSfx.desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        setTimeout(function () { pantalla.hidden = true; }, 1100);
    }
    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + (i ? "primary" : "success") +
                '" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" +
                nivel.titulo + "</small></button></div>";
        });
        TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<div class="row justify-content-center">' + botones + "</div>",
            showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, width: 420
        });
    }
    function lineasDelNivel(nivel) {
        const out = [];
        const sumar = function (l) {
            l = linea(l);
            if (l && l.texto) out.push({ texto: l.texto, personaje: l.voz || "zoe" });
        };
        (nivel.retos || []).forEach(function (r) {
            sumar(r.presentacion); sumar(r.acierto); sumar(r.errorOtro);
            (r.errores || []).forEach(sumar);
            (r.pistas || []).forEach(function (p) { if (p && p.texto) out.push({ texto: p.texto, personaje: "zoe" }); });
        });
        (nivel.cierre || []).forEach(sumar);
        return out;
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
        indiceReto = 0;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        document.body.classList.toggle("escena-caja", !esLab());
        document.body.classList.toggle("escena-radar", esLab());
        limpiar();
        pintarProgreso(-1);
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    function solapan(a, b) {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return ra.left < rb.right && ra.right > rb.left && ra.top < rb.bottom && ra.bottom > rb.top;
    }
    function limpiar() {
        $id("opciones").innerHTML = "";
        $id("pistas-radar").innerHTML = "";
        $id("coleccion").hidden = true;
        $id("coleccion").innerHTML = "";
        $id("caja").hidden = true;
        $id("caja").className = "caja";
        $id("radar").hidden = true;
        $id("lupa").hidden = true;
        $id("revelado").hidden = true;
        document.querySelectorAll(".pj").forEach(function (p) { p.classList.remove("baila"); });
        pistaVista = false;
        elegida = null;
    }
    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = (nivelElegido.retos || []).length;
        if (cont.children.length !== total) {
            cont.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const p = document.createElement("span");
                p.className = "progreso-punto";
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }
    function crearFicha(id) {
        const e = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcion";
        b.dataset.id = id;
        b.setAttribute("aria-label", e.nombre || id);
        const img = document.createElement("img");
        img.src = e.img;
        img.alt = "";
        img.draggable = false;
        b.appendChild(img);
        return b;
    }
    function fichaDe(id) { return $id("opciones").querySelector('.opcion[data-id="' + id + '"]'); }
    function marcarPista(r) {
        if (pistaVista) return;
        pistaVista = true;
        const caja = $id("caja");
        caja.classList.add("emitiendo", (r && r.pista) || "visual");
        efecto((r && r.efectoPista) || "pop");
    }
    function pintarRadar(r) {
        const cont = $id("pistas-radar");
        cont.innerHTML = "";
        (r.pistas || []).forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pista-btn";
            b.setAttribute("aria-label", p.texto);
            const img = document.createElement("img");
            img.src = p.icono;
            img.alt = "";
            b.appendChild(img);
            b.addEventListener("click", function () {
                if (fase !== "jugar" && !demoActiva) return;
                efecto(r.efectoPista || "pop");
                decir({ voz: (r.presentacion && r.presentacion.voz) || "zoe", texto: p.texto });
            });
            cont.appendChild(b);
        });
    }
    function puedeJugar() { return entradaActiva && !demoActiva && fase === "jugar" && !juegoTerminado; }

    function enlazar() {
        const lupa = $id("lupa");
        let drag = null;
        lupa.addEventListener("pointerdown", function (ev) {
            drag = { id: ev.pointerId };
            try { lupa.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });
        lupa.addEventListener("pointermove", function (ev) {
            if (!drag || drag.id !== ev.pointerId) return;
            const zona = $id("dispositivo").getBoundingClientRect();
            lupa.style.left = (ev.clientX - zona.left - 32) + "px";
            lupa.style.top = (ev.clientY - zona.top - 32) + "px";
            lupa.style.bottom = "auto";
            if ($id("caja") && !$id("caja").hidden && solapan(lupa, $id("caja"))) marcarPista(reto);
        });
        function soltar(ev) {
            if (!drag || drag.id !== ev.pointerId) return;
            drag = null;
        }
        lupa.addEventListener("pointerup", soltar);
        lupa.addEventListener("pointercancel", soltar);

        $id("opciones").addEventListener("click", function (ev) {
            const el = ev.target.closest(".opcion");
            if (!el || !puedeJugar()) return;
            if (!esLab()) {
                if (!pistaVista) { decir({ voz: "zeus", texto: textos().usaLupa }); return; }
                resolver(el.dataset.id, el);
                return;
            }
            elegida = el.dataset.id;
            Array.prototype.forEach.call($id("opciones").children, function (n) { n.classList.toggle("elegida", n === el); });
        });
        $id("radar").addEventListener("click", function (ev) {
            if (ev.target.closest(".pista-btn")) return;
            if (!puedeJugar() || !elegida) return;
            resolver(elegida, fichaDe(elegida));
        });
        $id("opciones").addEventListener("pointerdown", function (ev) {
            const el = ev.target.closest(".opcion");
            if (!el || !esLab() || !puedeJugar()) return;
            const mover = function (e) {
                if (e.pointerId !== ev.pointerId) return;
                el.classList.add("volando");
                el.style.left = (e.clientX - 40) + "px";
                el.style.top = (e.clientY - 40) + "px";
            };
            const fin = function (e) {
                if (e.pointerId !== ev.pointerId) return;
                document.removeEventListener("pointermove", mover);
                document.removeEventListener("pointerup", fin);
                const sobre = solapan(el, $id("radar"));
                el.classList.remove("volando");
                el.style.left = "";
                el.style.top = "";
                if (sobre) resolver(el.dataset.id, el);
            };
            document.addEventListener("pointermove", mover);
            document.addEventListener("pointerup", fin);
        });
    }

    function cancelarPista() {
        clearTimeout(pista.timer);
        pista.gen += 1;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }
    function programarPista() {
        const g = ++pista.gen;
        pista.timer = setTimeout(function () { if (pista.gen === g) pistaObjetivo(g); }, 9000);
    }
    async function pistaObjetivo(g) {
        if (!window.PedniaTutorial || fase !== "jugar") return;
        const cancelado = function () { return pista.gen !== g || fase !== "jugar"; };
        let el = null;
        if (!esLab() && !pistaVista) el = $id("lupa");
        else if (ctx) el = fichaDe(ctx.correcto);
        if (!el) return;
        await PedniaTutorial.animarMano({ punto: el, holdMs: 420, cancelado: cancelado });
        if (pista.gen === g) programarPista();
    }

    async function presentar(r, gen, esDemo) {
        fase = "presentacion";
        entradaActiva = false;
        pistaVista = false;
        elegida = null;
        const radar = esDemo ? r.mecanica === "radar" : esLab();
        $id("caja").hidden = radar;
        $id("radar").hidden = !radar;
        $id("lupa").hidden = radar;
        $id("caja").className = "caja";
        $id("revelado").hidden = true;
        const cont = $id("opciones");
        cont.innerHTML = "";
        const local = esDemo ? L.preparar(r, Math.random) : ctx;
        (local.opciones || []).forEach(function (id) { cont.appendChild(crearFicha(id)); });
        if (radar) pintarRadar(r);
        if (r.presentacion) await decir(r.presentacion);
        return esDemo ? (demoActiva && vivo(gen)) : vivo(gen);
    }

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) { granCierre(gen); return; }
        ctx = L.preparar(reto, Math.random);
        pintarProgreso(indiceReto);
        limpiar();
        const ok = await presentar(reto, gen, false);
        if (!ok || !vivo(gen)) return;
        entradaActiva = true;
        fase = "jugar";
        programarPista();
    }

    async function resolver(id, el) {
        if (fase !== "jugar") return;
        const gen = rondaGen;
        const r = L.evaluar(reto, id);
        fase = "animando";
        cancelarPista();
        TextoVoz.detener();
        tokenDialogo += 1;
        if (r === "correcto") {
            entradaActiva = false;
            if (reto.acierto && reto.acierto.efecto) efecto(reto.acierto.efecto);
            const img = $id("revelado");
            img.src = elemento(id).img;
            img.hidden = false;
            if (!esLab()) {
                $id("caja").classList.add("abierta");
            }
            if (reto.acierto && reto.acierto.animacion === "baila") {
                document.querySelectorAll(".pj").forEach(function (p) { p.classList.add("baila"); });
            }
            await sleep(700);
            if (!vivo(gen)) return;
            if (reto.acierto) await decir(reto.acierto, { estado: "acierto" });
            if (!vivo(gen)) return;
            pintarProgreso(indiceReto + 1);
            indiceReto += 1;
            iniciarReto(gen);
            return;
        }
        if (el) {
            el.classList.add("tiembla");
            setTimeout(function () { el.classList.remove("tiembla"); }, 500);
        }
        const err = L.errorPara(reto, id) || reto.errorOtro;
        if (err && err.efecto) efecto(err.efecto);
        if (err && err.texto) await decir(err);
        if (!vivo(gen)) return;
        fase = "jugar";
        programarPista();
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
    }
    function retoDemo() {
        const d = gameConfig.demo || {};
        if (!esLab() || !d.detective) return d;
        return Object.assign({}, d, d.detective);
    }
    async function mano(el) {
        if (!el || !window.PedniaTutorial) return;
        await PedniaTutorial.animarMano({
            punto: el, holdMs: 360,
            cancelado: function () { return !demoActiva; }
        });
    }
    async function iniciarDemo(gen) {
        const d = retoDemo();
        if (!d || !d.correcto || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        fase = "";
        await PedniaTutorial.activarDemo();
        limpiar();
        reto = d;
        const ok = await presentar(d, gen, true);
        if (!ok) { detenerDemo(); return; }
        if (d.mecanica === "radar") {
            const btn = $id("pistas-radar").querySelector(".pista-btn");
            await mano(btn);
            if (btn) btn.click();
        } else {
            await mano($id("lupa"));
            marcarPista(d);
        }
        const el = fichaDe(d.correcto);
        await mano(el);
        efecto("pop");
        detenerDemo();
        const t = textos();
        if (t.demostracionAcierto) await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 700 });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 800 });
        if (!vivo(gen)) return;
        limpiar();
        indiceReto = 0;
        iniciarReto(gen);
    }

    function fotoDe(id) {
        const fig = document.createElement("div");
        fig.className = "foto";
        const img = document.createElement("img");
        img.src = elemento(id).img;
        img.alt = elemento(id).nombre || "";
        fig.appendChild(img);
        return fig;
    }
    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        entradaActiva = false;
        cancelarPista();
        limpiar();
        const caja = $id("coleccion");
        caja.hidden = false;
        DESCUBIERTOS.forEach(function (id) { caja.appendChild(fotoDe(id)); });
        await sleep(700);
        if (gen !== rondaGen) return;
        mostrarCierre();
    }
    function mostrarCierre() {
        const cierre = (nivelElegido.cierre && nivelElegido.cierre.length) ? nivelElegido.cierre : [{ voz: "zoe", texto: "¡Excelente!" }];
        const texto = $id("texto_final");
        if (texto) texto.textContent = cierre.map(function (l) { return l.texto; }).join(" ");
        const ins = nivelElegido.insignia;
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (ins && trofeo) {
            trofeo.src = ins.img;
            trofeo.alt = ins.nombre || "Insignia";
        }
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        cierre.reduce(function (p, l) {
            return p.then(function () { return Promise.resolve(TextoVoz.hablar(l.texto, l.voz === "zeus" ? "zeus" : "zoe")).catch(function () {}); });
        }, Promise.resolve());
        setTimeout(function () {
            const caja = $id("final");
            if (caja) { caja.hidden = false; caja.style.display = "block"; }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
        }, 500);
    }

    function precargar() {
        const urls = [];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) { urls.push(elemento(id).img); });
        (gameConfig.niveles || []).forEach(function (n) {
            if (n.insignia) urls.push(n.insignia.img);
            (n.retos || []).forEach(function (r) { (r.pistas || []).forEach(function (p) { if (p.icono) urls.push(p.icono); }); });
        });
        ((gameConfig.demo && gameConfig.demo.detective && gameConfig.demo.detective.pistas) || []).forEach(function (p) { urls.push(p.icono); });
        return Promise.all(urls.filter(Boolean).map(function (url) {
            return new Promise(function (resolve) {
                const img = new Image();
                img.onload = img.onerror = function () { resolve(); };
                img.src = url;
            });
        }));
    }

    $(document).ready(function () {
        gameConfig = JSON.parse(readText("config.json"));
        introConfig = JSON.parse(readText("../../../intro.json"));
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ExploraDescubre] config:", errores);
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: frasesFijasTts()
        });
        enlazar();
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        imagenesPromise = precargar();
        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        const omitir = $id("btn-omitir-intro3d");
        if (omitir) omitir.addEventListener("click", omitirIntro3d);
        const cont = $id("btn-continuar-intro3d");
        if (cont) cont.addEventListener("click", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
