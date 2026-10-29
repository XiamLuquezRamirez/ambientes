/* Clasifica por los sentidos — canastas (3-4) y laboratorio (5-6) */
(function () {
    "use strict";

    const L = window.ClasificaSentidosLogica;
    let introConfig = null;
    let gameConfig = null;
    let cerrado = false;
    let introTimers = [];
    let audioFondo = null;
    let nivelElegido = null;
    let indiceReto = 0;
    let reto = null;
    let ctx = null;
    let colocados = {};
    let seleccionada = null;
    let juegoTerminado = false;
    let fase = "";
    let rondaGen = 0;
    let tokenDialogo = 0;
    let demoActiva = false;
    let entradaActiva = false;
    let imagenesPromise = Promise.resolve();
    const pista = { timer: null, gen: 0 };

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
    function sentido(id) { return (gameConfig.sentidos || {})[id] || { nombre: id, icono: "", color: "#4dabf7" }; }
    function linea(l) {
        if (!l) return null;
        if (typeof l === "string") return { voz: "zoe", texto: l };
        return l;
    }

    function avatarDe(voz, hablando) {
        const base = voz === "zeus" ? "zeus" : "zoe";
        return "../../../images/" + base + (hablando ? "_hablando" : "_normal") + ".gif";
    }

    function pintarDialogo(voz, texto, estado) {
        const d = $id("dialogo");
        d.dataset.voz = voz === "zeus" ? "zeus" : "zoe";
        d.classList.toggle("es-acierto", estado === "acierto");
        $id("dialogo-avatar").src = avatarDe(voz, true);
        $id("enunciado").textContent = texto || "";
    }
    function silenciarAvatar() {
        const voz = $id("dialogo").dataset.voz || "zoe";
        $id("dialogo-avatar").src = avatarDe(voz, false);
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
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 900)]),
            sleep(16000)
        ]).then(function () {
            if (token === tokenDialogo) silenciarAvatar();
        });
    }

    function efecto(nombre) {
        if (window.ClasificaSentidosSfx) ClasificaSentidosSfx.sonar(nombre);
    }

    function reducir() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve();
        const o = Object.assign({ duration: 420, easing: "ease", fill: "forwards" }, opts || {});
        if (reducir()) o.duration = 80;
        const a = el.animate(frames, o);
        return a.finished.catch(function () {});
    }
    function centroDe(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    function etiqueta(id) {
        const n = sentido(id).nombre;
        const de = id === "vista" ? "de la" : "del";
        return (esLab() ? "Tubo " : "Canasta ") + de + " " + n;
    }

    function aplicarLetterSpacing() {
        const n = Number(acc().letterSpacing);
        if (isFinite(n)) document.documentElement.style.setProperty("--mc-letter-spacing", n + "px");
    }

    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        return isFinite(n) ? n : 20;
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
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (l) {
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
        if (!pantalla || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (TextoVoz.desbloquear) TextoVoz.desbloquear();
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
            const color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color +
                '" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" +
                nivel.titulo + "</small></button></div>";
        });
        TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            heightAuto: false,
            width: 420
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
        indiceReto = 0;
        TextoVoz.detener();
        if (typeof TextoVoz.encolarFrases === "function") TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        document.body.classList.toggle("laboratorio", esLab());
        limpiar();
        pintarProgreso(-1);
        Promise.resolve(imagenesPromise).then(function () {
            if (!vivo(gen)) return;
            if (mostrarIntroActiva()) iniciarDemo(gen);
            else iniciarReto(gen);
        });
    };

    function limpiar() {
        $id("zona-tubos").innerHTML = "";
        $id("cinta").innerHTML = "";
        $id("organigrama").hidden = true;
        $id("organigrama").innerHTML = "";
        colocados = {};
        seleccionada = null;
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

    function crearContenedor(idSentido) {
        const s = sentido(idSentido);
        const el = document.createElement("button");
        el.type = "button";
        el.className = esLab() ? "tubo" : "canasta";
        el.dataset.sentido = idSentido;
        el.style.setProperty("--color", s.color || "#4dabf7");
        el.setAttribute("aria-label", etiqueta(idSentido));
        const icono = document.createElement("img");
        icono.className = esLab() ? "tubo-icono" : "canasta-icono";
        icono.src = s.icono;
        icono.alt = "";
        const nombre = document.createElement("p");
        nombre.className = esLab() ? "tubo-nombre" : "canasta-nombre";
        nombre.textContent = etiqueta(idSentido);
        const caja = document.createElement("div");
        caja.className = esLab() ? "tubo-contenido" : "canasta-contenido";
        el.appendChild(icono);
        el.appendChild(nombre);
        el.appendChild(caja);
        return el;
    }

    function crearPieza(id) {
        const e = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pieza";
        b.dataset.id = id;
        b.setAttribute("aria-label", e.nombre || id);
        const img = document.createElement("img");
        img.src = e.img;
        img.alt = "";
        img.draggable = false;
        b.appendChild(img);
        return b;
    }

    function pintarEscena(tubos, ids) {
        const zona = $id("zona-tubos");
        const cinta = $id("cinta");
        zona.innerHTML = "";
        cinta.innerHTML = "";
        tubos.forEach(function (s) { zona.appendChild(crearContenedor(s)); });
        ids.forEach(function (id) { cinta.appendChild(crearPieza(id)); });
    }

    function tuboDe(sentidoId) {
        return $id("zona-tubos").querySelector('[data-sentido="' + sentidoId + '"]');
    }
    function piezaDe(id) {
        return $id("cinta").querySelector('.pieza[data-id="' + id + '"]');
    }
    function contenidoDe(tubo) {
        return tubo.querySelector(".canasta-contenido, .tubo-contenido");
    }

    function tuboEn(x, y) {
        const lista = $id("zona-tubos").querySelectorAll(".canasta, .tubo");
        for (let i = 0; i < lista.length; i++) {
            if (L.dentro({ x: x, y: y }, lista[i].getBoundingClientRect(), 36)) return lista[i];
        }
        return null;
    }

    async function volar(pieza, tubo) {
        const a = centroDe(pieza);
        const b = centroDe(tubo);
        await animar(pieza, [
            { transform: "translate(0,0) scale(1)" },
            { transform: "translate(" + (b.x - a.x) + "px," + (b.y - a.y) + "px) scale(.4)" }
        ], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
        const e = elemento(pieza.dataset.id);
        const chip = document.createElement("img");
        chip.className = "chip";
        chip.src = e.img;
        chip.alt = "";
        contenidoDe(tubo).appendChild(chip);
        pieza.remove();
        const reaccion = sentido(tubo.dataset.sentido).reaccion;
        if (reaccion) {
            tubo.classList.add(reaccion);
            setTimeout(function () { tubo.classList.remove(reaccion); }, 800);
        }
    }

    function puedeJugar() {
        return entradaActiva && !demoActiva && !juegoTerminado && fase === "jugar";
    }

    function enlazar() {
        const cinta = $id("cinta");
        const zona = $id("zona-tubos");
        let st = null;

        cinta.addEventListener("pointerdown", function (ev) {
            const pieza = ev.target.closest(".pieza");
            if (!pieza || !puedeJugar()) return;
            st = { pieza: pieza, x: ev.clientX, y: ev.clientY, id: ev.pointerId, arrastra: false, ghost: null };
            try { pieza.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });
        cinta.addEventListener("pointermove", function (ev) {
            if (!st || st.id !== ev.pointerId) return;
            const dx = ev.clientX - st.x;
            const dy = ev.clientY - st.y;
            if (!st.arrastra && L.clasificarGesto(dx, dy) === "arrastre") {
                st.arrastra = true;
                const e = elemento(st.pieza.dataset.id);
                const r = st.pieza.getBoundingClientRect();
                const g = document.createElement("img");
                g.className = "fantasma";
                g.src = e.img;
                g.style.width = r.width + "px";
                g.style.height = r.height + "px";
                $id("capa-efectos").appendChild(g);
                st.ghost = g;
                st.pieza.classList.add("arrastrando");
            }
            if (!st.ghost) return;
            st.ghost.style.left = ev.clientX + "px";
            st.ghost.style.top = ev.clientY + "px";
            zona.querySelectorAll(".destino").forEach(function (t) { t.classList.remove("destino"); });
            const t = tuboEn(ev.clientX, ev.clientY);
            if (t) t.classList.add("destino");
        });
        function terminar(ev) {
            if (!st || st.id !== ev.pointerId) return;
            const s = st;
            st = null;
            try { s.pieza.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            if (s.ghost) s.ghost.remove();
            s.pieza.classList.remove("arrastrando");
            zona.querySelectorAll(".destino").forEach(function (t) { t.classList.remove("destino"); });
            if (!puedeJugar()) return;
            if (s.arrastra) {
                const t = tuboEn(ev.clientX, ev.clientY);
                if (t && ev.type === "pointerup") resolver(s.pieza, t);
                return;
            }
            if (ev.type !== "pointerup") return;
            if (!esLab() && ctx.tubos.length === 1) {
                resolver(s.pieza, tuboDe(ctx.tubos[0]));
                return;
            }
            if (seleccionada) seleccionada.classList.remove("seleccionada");
            seleccionada = s.pieza;
            s.pieza.classList.add("seleccionada");
        }
        cinta.addEventListener("pointerup", terminar);
        cinta.addEventListener("pointercancel", terminar);

        zona.addEventListener("click", function (ev) {
            const tubo = ev.target.closest(".canasta, .tubo");
            if (!tubo || !puedeJugar() || !seleccionada) return;
            const pieza = seleccionada;
            seleccionada = null;
            pieza.classList.remove("seleccionada");
            resolver(pieza, tubo);
        });
    }

    function cancelarPista() {
        clearTimeout(pista.timer);
        pista.gen += 1;
        pista.timer = null;
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }
    function programarPista() {
        clearTimeout(pista.timer);
        const g = ++pista.gen;
        pista.timer = setTimeout(function () {
            if (pista.gen !== g) return;
            pistaObjetivo(g);
        }, 9000);
    }
    async function pistaObjetivo(g) {
        if (!window.PedniaTutorial || fase !== "jugar" || !ctx) return;
        const cancelado = function () { return pista.gen !== g || fase !== "jugar"; };
        const pendiente = ctx.orden.filter(function (id) { return !colocados[id]; })[0];
        if (!pendiente) return;
        const pieza = piezaDe(pendiente);
        const tubo = tuboDe(ctx.mapa[pendiente]);
        if (pieza) {
            await PedniaTutorial.animarMano({ punto: pieza, holdMs: 400, cancelado: cancelado });
        }
        if (tubo && !cancelado()) {
            await PedniaTutorial.animarMano({ punto: tubo, holdMs: 400, cancelado: cancelado });
        }
        if (!cancelado()) programarPista();
    }

    async function iniciarReto(gen) {
    if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        reto = nivelElegido.retos[indiceReto];
        if (!reto) { granCierre(gen); return; }
        colocados = {};
        seleccionada = null;
        ctx = L.preparar(reto, Math.random);
        pintarProgreso(indiceReto);
        fase = "presentacion";
        entradaActiva = false;
        cancelarPista();
        limpiar();
        await sleep(200);
        if (!vivo(gen)) return;
        pintarEscena(ctx.tubos, ctx.orden);
        await decir(reto.presentacion);
        if (!vivo(gen)) return;
        if (reto.pregunta) await decir(reto.pregunta);
        if (!vivo(gen)) return;
        entradaActiva = true;
        fase = "jugar";
        programarPista();
    }

    async function resolver(pieza, tubo) {
        if (!pieza || !tubo || fase !== "jugar") return;
        const gen = rondaGen;
        const item = pieza.dataset.id;
        const sentidoId = tubo.dataset.sentido;
        const r = L.evaluar(reto, item, sentidoId);
        fase = "animando";
        cancelarPista();
        TextoVoz.detener();
        tokenDialogo += 1;

        if (r === "correcto") {
            efecto((sentido(sentidoId).efecto) || (reto.acierto && reto.acierto.efecto) || "pop");
            await volar(pieza, tubo);
            if (!vivo(gen)) return;
            colocados[item] = sentidoId;
            if (L.completo(reto, colocados)) {
                entradaActiva = false;
                if (reto.acierto) await decir(reto.acierto, { estado: "acierto" });
                if (!vivo(gen)) return;
                pintarProgreso(indiceReto + 1);
                await sleep(400);
                indiceReto += 1;
                iniciarReto(gen);
                return;
            }
            fase = "jugar";
            programarPista();
            return;
        }

        pieza.classList.add("tiembla");
        setTimeout(function () { pieza.classList.remove("tiembla"); }, 500);
        const err = L.errorPara(reto, item) || reto.errorOtro;
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

    async function iniciarDemo(gen) {
        const d = esLab() ? (gameConfig.demoLab || gameConfig.demo) : (gameConfig.demo || {});
        if (!d || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        fase = "";
        entradaActiva = false;
        await PedniaTutorial.activarDemo();
        const t = textos();
        limpiar();
        const tubos = d.tubos || ["vista"];
        const ids = d.opciones || (d.piezas || []).map(function (p) { return p.id; });
        const mapa = {};
        if (d.correcto) mapa[d.correcto] = tubos[0];
        (d.piezas || []).forEach(function (p) { mapa[p.id] = p.tubo; });
        pintarEscena(tubos, ids);
        await decir({ voz: "zoe", texto: esLab() ? (t.demostracionLab || t.demostracion) : t.demostracion }, { minMs: 1600 });
        if (!demoActiva || !vivo(gen)) return;
        const primero = Object.keys(mapa)[0];
        const pieza = piezaDe(primero);
        const tubo = tuboDe(mapa[primero]);
        if (pieza && tubo) {
            await PedniaTutorial.animarMano({
                punto: pieza,
                holdMs: 420,
                cancelado: function () { return !demoActiva; }
            });
            if (!demoActiva || !vivo(gen)) return;
            efecto("pop");
            await volar(pieza, tubo);
        }
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 1200 });
        detenerDemo();
        if (!vivo(gen)) return;
        limpiar();
        indiceReto = 0;
        iniciarReto(gen);
    }

    async function granCierre(gen) {
        fase = "";
        juegoTerminado = true;
        entradaActiva = false;
        cancelarPista();
        limpiar();
        if (nivelElegido.cierreEscena === "organigrama") {
            const org = $id("organigrama");
            org.hidden = false;
            const cerebro = document.createElement("div");
            cerebro.className = "cerebro";
            cerebro.setAttribute("aria-label", "Cerebro");
            org.appendChild(cerebro);
            const zona = document.createElement("div");
            zona.className = "zona-tubos";
            org.appendChild(zona);
            ["vista", "oido", "olfato", "gusto", "tacto"].forEach(function (s) {
                zona.appendChild(crearContenedor(s));
            });
        } else {
            pintarEscena(["vista", "oido", "olfato"], []);
            const pares = [["vista", "arcoiris"], ["oido", "campana"], ["olfato", "perfume"]];
            pares.forEach(function (par) {
                const tubo = tuboDe(par[0]);
                const e = elemento(par[1]);
                const chip = document.createElement("img");
                chip.className = "chip";
                chip.src = e.img;
                chip.alt = e.nombre;
                contenidoDe(tubo).appendChild(chip);
            });
        }
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
            return p.then(function () {
                return Promise.resolve(TextoVoz.hablar(l.texto, l.voz === "zeus" ? "zeus" : "zoe")).catch(function () {});
            });
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
        const urls = [];
        Object.keys(gameConfig.elementos || {}).forEach(function (id) { urls.push(elemento(id).img); });
        Object.keys(gameConfig.sentidos || {}).forEach(function (id) { urls.push(sentido(id).icono); });
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
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        const errores = L.validarConfig(gameConfig);
        if (errores && errores.length) console.warn("[ClasificaSentidos] config:", errores);
        TextoVoz.iniciar(gameConfig, introConfig, {
            obtenerAudioFondo: function () { return audioFondo; },
            volumenFondo: volumenFondoPct() / 100,
            frasesExtra: []
        });
        enlazar();
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
