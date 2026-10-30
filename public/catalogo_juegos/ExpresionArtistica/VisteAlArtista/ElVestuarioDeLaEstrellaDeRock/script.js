/* Viste al artista — Expresión Artística */
(function () {
    "use strict";

    const L = window.VisteAlArtistaLogica;
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

    function readText(ruta) {
        const xhr = new XMLHttpRequest();
        const sep = ruta.indexOf("?") === -1 ? "?" : "&";
        xhr.open("GET", ruta + sep + "v=20261027d", false);
        xhr.setRequestHeader("Cache-Control", "no-cache");
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.VisteAlArtistaSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261027d"; }
    function volumenFondoPct() {
        const n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }
    function aplicarVolumenCalibrado(pct) {
        const n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        if (typeof TextoVoz !== "undefined" && TextoVoz.definirVolumenFondo) TextoVoz.definirVolumenFondo(n / 100);
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
        const slider = $id("rango-volumen");
        const val = $id("vol-val");
        const pct = volumenFondoPct();
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
        const btn = $id("btn-menu-vol");
        if (btn) btn.addEventListener("click", function (ev) { ev.stopPropagation(); setMenuVol($id("menu-vol-panel").hidden); });
        const cerrar = $id("btn-cerrar-vol");
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) slider.addEventListener("input", function () { if (val) val.textContent = slider.value; aplicarVolumenCalibrado(Number(slider.value)); });
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
    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        try {
            let audio = audioCache[ruta] || new Audio(ruta);
            audioCache[ruta] = audio;
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
            audio.loop = !!loop;
            audio.volume = volumen != null ? volumen : 0.8;
            const p = audio.play();
            if (p && p.catch) p.catch(function () {});
            if (loop) audioFondo = audio;
            return audio;
        } catch (e) { return null; }
    }
    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        const edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }
    function conversacionInicial() {
        const nivel = nivelDeSesion();
        return (nivel && nivel.bienvenida) || [
            { personaje: 1, texto: "¡Bienvenido al camerino del teatro!" },
            { personaje: 0, texto: "Hoy vestiremos a los artistas para cada obra." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-camerino", tema === "camerino");
        document.body.classList.toggle("tema-camerino-pro", tema === "camerino-pro");
    }
    function cancelarIntroPendiente() { introTimers.forEach(function (id) { clearTimeout(id); }); introTimers = []; }
    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (linea) {
            const id = Number(linea.personaje) === 1 ? "zoe" : "zeus";
            return { personaje: id, nombre: id === "zoe" ? "Zoe" : "Zeus", color: id === "zoe" ? "#8ec5ff" : "#f0c14d", texto: String(linea.texto || "") };
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
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) { try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ } window.__introPhaser = null; }
            if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
            root.remove();
        }, 400);
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
        const pantalla = $id("pantalla-inicio");
        if (pantalla) { pantalla.classList.add("is-out"); pantalla.hidden = true; }
        $("#principal").css("display", "flex").hide().fadeIn(700);
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: gameConfig.niveles || [],
                elegirManual: elegirNivel,
                onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
            });
        } else elegirNivel();
    }
    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        if (!pantalla || pantalla.classList.contains("is-out")) return;
        const btn = $id("btn-empecemos");
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        let oculto = false;
        const ocultar = function () { if (oculto) return; oculto = true; pantalla.hidden = true; };
        pantalla.addEventListener("animationend", function (ev) { if (ev.animationName === "disuelve") ocultar(); });
        setTimeout(ocultar, 1200);
    }
    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };
    function asegurarAudioFondo() {
        if (audioFondo) { const p = audioFondo.play(); if (p && p.catch) p.catch(function () {}); return audioFondo; }
        const vol = (typeof TextoVoz !== "undefined" && TextoVoz.VOLUMEN_FONDO != null) ? TextoVoz.VOLUMEN_FONDO : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios.fondo, vol, true);
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
    function particulas(x, y) {
        const capa = $id("capa-efectos");
        if (!capa) return;
        for (let i = 0; i < 12; i++) {
            const p = document.createElement("span");
            p.className = "particula";
            p.innerHTML = '<i class="fa-solid fa-star"></i>';
            p.style.left = x + "px";
            p.style.top = y + "px";
            capa.appendChild(p);
            const ang = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 80;
            if (p.animate) {
                p.animate([
                    { transform: "translate(-50%,-50%)", opacity: 1 },
                    { transform: "translate(calc(-50% + " + Math.cos(ang) * dist + "px), calc(-50% + " + Math.sin(ang) * dist + "px))", opacity: 0 }
                ], { duration: 800 }).finished.then(function () { p.remove(); }).catch(function () { p.remove(); });
            } else p.remove();
        }
    }
    function confetiEn(espejo) {
        if (!espejo) return;
        const colores = ["#e53935", "#ffd54f", "#42a5f5", "#66bb6a", "#ab47bc"];
        for (let i = 0; i < 14; i++) {
            const c = document.createElement("span");
            c.className = "confeti-bit";
            c.style.left = (10 + Math.random() * 80) + "%";
            c.style.top = (5 + Math.random() * 20) + "%";
            c.style.background = colores[i % colores.length];
            c.style.animationDelay = (Math.random() * 0.3) + "s";
            espejo.appendChild(c);
            setTimeout(function () { c.remove(); }, 1400);
        }
    }
    function cambiarEscena(id) {
        const url = (gameConfig.escenas || {})[id];
        const imgs = Array.prototype.slice.call(document.querySelectorAll("#escena-fondo .escena-capa"));
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        const destino = asset(url);
        if (!url || !actual || actual.getAttribute("src") === destino) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        if (!sig) return;
        let hecho = false;
        const mostrar = function () { if (hecho) return; hecho = true; sig.classList.add("activa"); actual.classList.remove("activa"); };
        sig.onload = mostrar;
        sig.onerror = mostrar;
        sig.src = destino;
        setTimeout(mostrar, 500);
    }
    function efecto(nombre) { if (sfx()) sfx().sonar(nombre); }
    function avatarDe(voz, hablando) { return "../../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif"); }
    function pintarDialogo(voz, texto, estado) {
        const dialogo = $id("dialogo");
        const avatar = $id("dialogo-avatar");
        if (!dialogo || !avatar) return;
        dialogo.dataset.voz = voz;
        dialogo.classList.toggle("es-acierto", estado === "acierto");
        avatar.src = avatarDe(voz, true);
        avatar.alt = voz === "zeus" ? "Zeus" : "Zoe";
        $id("enunciado").textContent = texto;
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
        const respaldo = setTimeout(mostrar, 3500);
        let p = null;
        try { if (typeof TextoVoz !== "undefined") p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 700)]),
            sleep(12000)
        ]).then(function () { clearTimeout(respaldo); mostrar(); if (token === tokenDialogo) silenciarAvatar(); });
    }
    function callar() { tokenDialogo += 1; if (typeof TextoVoz !== "undefined") TextoVoz.detener(); }
    async function decirLineas(x, opts) { const lista = L.lineas(x); for (let i = 0; i < lista.length; i++) await decir(lista[i], opts); }
    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + (i ? "primary" : "success") + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        if (typeof TextoVoz !== "undefined") TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({ title: textos().eligeNivel || "Elige tu edad", html: '<div class="row justify-content-center">' + botones + "</div>", showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, width: 440 });
    }
    function mostrarIntroActiva() { return window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro; }
    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        demoActiva = false;
        cancelarAyuda();
        if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        if (sfx()) sfx().detener();
        aplicarTema(nivelElegido.tema);
        $id("estacion").innerHTML = "";
        cambiarEscena(nivelElegido.escena);
        pintarProgreso(-1);
        if (mostrarIntroActiva()) iniciarDemo(gen);
        else iniciarReto(gen);
    };
    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = nivelElegido.retos.length;
        if (cont.children.length !== total) {
            cont.innerHTML = "";
            for (let i = 0; i < total; i++) {
                const p = document.createElement("span");
                p.className = "progreso-punto";
                p.innerHTML = '<i class="fa-solid fa-star"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            p.classList.toggle("hecho", i < actual);
            p.classList.toggle("actual", i === actual);
        });
    }
    function celebrar(si) { ["pj-zoe", "pj-zeus"].forEach(function (id) { const pj = $id(id); if (pj) pj.classList.toggle("celebra", !!si); }); }
    function cancelarAyuda() {
        clearTimeout(ayuda.timer);
        ayuda = { timer: null, fn: null };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }
    function vigilar(fn, ms) {
        clearTimeout(ayuda.timer);
        ayuda.fn = fn;
        ayuda.timer = setTimeout(function () { if (ayuda.fn === fn) Promise.resolve(fn()); }, ms || 7000);
    }
    function mano(el) {
        if (!window.PedniaTutorial || !el) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({ punto: el, holdMs: 400, cancelado: function () { return ayuda.fn !== fn; } });
    }
    function pctDesdeEvento(ev, marco) {
        const r = marco.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return {
            x: ((ev.clientX - r.left) / r.width) * 100,
            y: ((ev.clientY - r.top) / r.height) * 100
        };
    }

    function montarEspejo(personajeId) {
        const caja = document.createElement("div");
        caja.className = "est-esc";
        const espejo = document.createElement("div");
        espejo.className = "espejo";
        let actor = null;
        if (personajeId && elemento(personajeId).img) {
            actor = crearImg(elemento(personajeId).img, "actor-escena");
            espejo.appendChild(actor);
        }
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        caja.appendChild(espejo);
        caja.appendChild(bandeja);
        return { caja: caja, espejo: espejo, actor: actor, bandeja: bandeja };
    }
    function crearPieza(id) {
        const el = elemento(id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pieza";
        btn.dataset.id = id;
        btn.setAttribute("aria-label", el.nombre || id);
        btn.appendChild(crearImg(el.img));
        const lab = document.createElement("span");
        lab.className = "pieza-nombre";
        lab.textContent = el.nombre || id;
        btn.appendChild(lab);
        return btn;
    }
    function etiquetaSlot(slot) {
        const map = { cabeza: "Cabeza", cara: "Cara", cuerpo: "Cuerpo", mano: "Mano", espalda: "Espalda" };
        return map[slot] || "";
    }
    function ponerZona(espejo, zona, slot) {
        const z = document.createElement("div");
        z.className = "zona-destino";
        z.style.left = zona.x + "%";
        z.style.top = zona.y + "%";
        z.style.width = zona.w + "%";
        z.style.height = zona.h + "%";
        const lab = etiquetaSlot(slot);
        if (lab) {
            const span = document.createElement("span");
            span.className = "zona-etiqueta";
            span.textContent = lab;
            z.appendChild(span);
        }
        espejo.appendChild(z);
        return z;
    }
    function colocarPrenda(espejo, piezaId, zona, slot) {
        const put = crearImg(elemento(piezaId).img, "prenda-puesta" + (slot ? " slot-" + slot : ""));
        put.style.left = zona.x + "%";
        put.style.top = zona.y + "%";
        espejo.appendChild(put);
        return put;
    }
    function mostrarExtra(espejo, id, left, top, clase) {
        const el = crearImg(elemento(id).img, "extra-escena" + (clase ? " " + clase : ""));
        el.style.left = left + "%";
        el.style.top = top + "%";
        espejo.appendChild(el);
        return el;
    }
    function poseAlAcertar(r, ui, prenda) {
        if (!ui.actor) return;
        const id = r.id;
        if (id === "superheroina") {
            efecto("destello");
            ui.actor.classList.add("vuela");
            if (prenda) prenda.classList.add("flamea", "brilla");
        } else if (id === "bombero") {
            ui.actor.classList.add("saluda");
        } else if (id === "payaso") {
            ui.actor.classList.add("risa");
            confetiEn(ui.espejo);
            efecto("confeti");
        } else if (id === "mago") {
            ui.actor.classList.add("abra");
            ui.espejo.querySelectorAll(".prenda-puesta").forEach(function (p) { p.classList.add("brilla"); });
            mostrarExtra(ui.espejo, "conejo", 22, 72, "conejo-saluda");
            efecto("chispas");
        } else if (id === "caballero") {
            ui.actor.classList.add("heroico");
            ui.espejo.querySelectorAll(".prenda-puesta").forEach(function (p) { p.classList.add("brilla", "metal"); });
        } else if (id === "rock") {
            ui.actor.classList.add("heroico");
            if (prenda) prenda.classList.add("brilla");
        } else if (id === "detective") {
            ui.actor.classList.add("investiga");
            const lupa = ui.espejo.querySelector(".prenda-puesta.slot-mano");
            if (lupa) lupa.classList.add("lupa-zoom");
        } else if (id === "exploradora") {
            ui.actor.classList.add("heroico");
            ui.espejo.querySelectorAll(".prenda-puesta").forEach(function (p) { p.classList.add("brilla"); });
            mostrarExtra(ui.espejo, "mapa", 72, 42, "mapa-saca");
        }
    }
    function festejar(efectoNombre, el) {
        efecto(efectoNombre || "destello");
        if (el) {
            particulas(centroDe(el).x, centroDe(el).y);
            reiniciarClase(el, "celebra", 700);
        }
    }
    function puntoEnEl(ev, el) {
        if (!ev || !el) return false;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    }
    function enlazarArrastre(pieza, espejo, onSoltar) {
        let arrastrando = false;
        let ox = 0, oy = 0;
        let fantasma = null;
        function quitarFantasma() {
            if (fantasma && fantasma.parentNode) fantasma.parentNode.removeChild(fantasma);
            fantasma = null;
        }
        pieza.addEventListener("pointerdown", function (ev) {
            if (demoActiva || pieza.disabled) return;
            ev.preventDefault();
            arrastrando = true;
            pieza.classList.add("arrastrando");
            // Reserva el hueco en la bandeja para que el espejo no se desplace al soltar.
            fantasma = document.createElement("span");
            fantasma.className = "pieza-fantasma";
            fantasma.style.width = pieza.offsetWidth + "px";
            fantasma.style.height = pieza.offsetHeight + "px";
            if (pieza.parentNode) pieza.parentNode.insertBefore(fantasma, pieza);
            const br = pieza.getBoundingClientRect();
            ox = ev.clientX - br.left;
            oy = ev.clientY - br.top;
            pieza.style.position = "fixed";
            pieza.style.left = (ev.clientX - ox) + "px";
            pieza.style.top = (ev.clientY - oy) + "px";
            pieza.style.width = br.width + "px";
            pieza.style.zIndex = "40";
            try { pieza.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        });
        pieza.addEventListener("pointermove", function (ev) {
            if (!arrastrando) return;
            pieza.style.left = (ev.clientX - ox) + "px";
            pieza.style.top = (ev.clientY - oy) + "px";
        });
        function soltar(ev) {
            if (!arrastrando) return;
            arrastrando = false;
            pieza.classList.remove("arrastrando");
            const p = pctDesdeEvento(ev, espejo);
            const ok = onSoltar(pieza.dataset.id, p, ev);
            quitarFantasma();
            if (!ok) {
                pieza.style.left = "";
                pieza.style.top = "";
                pieza.style.position = "";
                pieza.style.width = "";
                pieza.style.zIndex = "";
            }
        }
        pieza.addEventListener("pointerup", soltar);
        pieza.addEventListener("pointercancel", soltar);
    }

    async function retoArrastre(r, gen) {
        const ui = montarEspejo(r.personaje);
        $id("estacion").appendChild(ui.caja);
        const zona = ponerZona(ui.espejo, r.zonaDestino, r.slot);
        const piezas = {};
        (r.opciones || []).forEach(function (id) {
            const p = crearPieza(id);
            piezas[id] = p;
            ui.bandeja.appendChild(p);
        });
        const hecho = new Promise(function (resolve) {
            let listo = false;
            function completar() {
                if (listo) return;
                listo = true;
                cancelarAyuda();
                Object.keys(piezas).forEach(function (k) { piezas[k].disabled = true; piezas[k].style.visibility = "hidden"; });
                zona.classList.add("lleno");
                const put = colocarPrenda(ui.espejo, r.correcta, r.zonaDestino, r.slot);
                poseAlAcertar(r, ui, put);
                festejar(r.efecto, ui.espejo);
                resolve();
            }
            Object.keys(piezas).forEach(function (id) {
                const pieza = piezas[id];
                enlazarArrastre(pieza, ui.espejo, function (piezaId, p, ev) {
                    if (!vivo(gen) || demoActiva || listo) return false;
                    const eleccion = L.evaluarPieza(r, piezaId);
                    if (eleccion.estado !== "bien") {
                        efecto("error");
                        reiniciarClase(pieza, "mal", 450);
                        callar();
                        decirLineas(r.error);
                        return false;
                    }
                    // Hit-test real de la zona (evita desfase si el layout se mueve al arrastrar).
                    if (!puntoEnEl(ev, zona) && !(p && L.evaluarArrastre(r, piezaId, p.x, p.y).estado === "completo")) {
                        efecto("error");
                        return false;
                    }
                    completar();
                    return true;
                });
            });
            vigilar(function () { return mano(piezas[r.correcta]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function retoVestirMulti(r, gen) {
        const ui = montarEspejo(r.personaje);
        $id("estacion").appendChild(ui.caja);
        const zonas = {};
        (r.piezas || []).forEach(function (p) {
            const z = ponerZona(ui.espejo, p.zonaDestino, p.slot);
            z.dataset.slot = p.slot || "";
            z.dataset.pieza = p.id;
            zonas[p.id] = z;
        });
        const idsBandeja = L.idsPiezas(r.piezas).concat(r.distractores || []);
        const piezas = {};
        idsBandeja.forEach(function (id) {
            const btn = crearPieza(id);
            piezas[id] = btn;
            ui.bandeja.appendChild(btn);
        });
        let colocadas = {};
        const hecho = new Promise(function (resolve) {
            Object.keys(piezas).forEach(function (id) {
                enlazarArrastre(piezas[id], ui.espejo, function (piezaId, p, ev) {
                    if (!vivo(gen) || demoActiva || colocadas[piezaId]) return false;
                    const meta = (r.piezas || []).find(function (x) { return x.id === piezaId; });
                    if (!meta) {
                        efecto("error");
                        reiniciarClase(piezas[id], "mal", 450);
                        if (r.error) { callar(); decirLineas(r.error); }
                        return false;
                    }
                    const zonaEl = zonas[meta.id];
                    const enZona = puntoEnEl(ev, zonaEl) || (p && L.dentroPct(p.x, p.y, meta.zonaDestino));
                    if (!enZona) {
                        efecto("error");
                        return false;
                    }
                    // Centro de la zona configurada: el hit-test DOM ya validó el drop.
                    const res = L.evaluarVestir(r, piezaId, meta.zonaDestino.x, meta.zonaDestino.y, colocadas);
                    if (res.estado !== "progreso" && res.estado !== "completo") {
                        efecto("error");
                        return false;
                    }
                    colocadas = res.halladas;
                    piezas[id].disabled = true;
                    piezas[id].style.visibility = "hidden";
                    if (zonaEl) zonaEl.classList.add("lleno");
                    const put = colocarPrenda(ui.espejo, meta.id, meta.zonaDestino, meta.slot);
                    efecto("destello");
                    particulas(centroDe(put).x, centroDe(put).y);
                    if (res.estado === "completo") {
                        cancelarAyuda();
                        Object.keys(piezas).forEach(function (k) {
                            piezas[k].disabled = true;
                            if (!colocadas[k]) piezas[k].style.visibility = "hidden";
                        });
                        poseAlAcertar(r, ui, put);
                        festejar(r.efecto, ui.espejo);
                        resolve();
                    }
                    return true;
                });
            });
            vigilar(function () {
                const pendiente = (r.piezas || []).find(function (p) { return !colocadas[p.id]; });
                return pendiente ? mano(piezas[pendiente.id]) : Promise.resolve();
            }, 5500);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function jugarReto(r, gen) {
        if (r.tipo === "arrastrePrenda") return retoArrastre(r, gen);
        if (r.tipo === "vestirMulti") return retoVestirMulti(r, gen);
    }

    async function iniciarReto(gen) {
        demoActiva = false;
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
        if (!vivo(gen)) return;
        const r = nivelElegido.retos[indiceReto];
        if (!r) { granCierre(gen); return; }
        cancelarAyuda();
        celebrar(false);
        pintarProgreso(indiceReto);
        const est = $id("estacion");
        est.innerHTML = "";
        est.style.opacity = "";
        await sleep(200);
        if (!vivo(gen)) return;
        await jugarReto(r, gen);
        if (!vivo(gen)) return;
        pintarProgreso(indiceReto + 1);
        await sleep(400);
        indiceReto += 1;
        iniciarReto(gen);
    }

    async function iniciarDemo(gen) {
        const demo = gameConfig.demo || {};
        const el = elemento(demo.elemento);
        if (!el.img || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        let pasoAReto = false;
        try {
            await PedniaTutorial.activarDemo();
            const t = textos();
            const est = $id("estacion");
            est.innerHTML = "";
            const ui = montarEspejo(demo.personaje || "zoe_base");
            const capa = crearPieza(demo.elemento);
            const distractor = crearPieza("gorro_cocinero");
            ui.bandeja.appendChild(capa);
            ui.bandeja.appendChild(distractor);
            const zona = ponerZona(ui.espejo, { x: 50, y: 58, w: 52, h: 44 }, "cuerpo");
            est.appendChild(ui.caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: capa, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        capa.classList.add("correcta");
                        zona.classList.add("lleno");
                        colocarPrenda(ui.espejo, demo.elemento, { x: 50, y: 58 }, "cuerpo");
                        efecto("viento");
                        particulas(centroDe(ui.espejo).x, centroDe(ui.espejo).y);
                    }
                });
            }
            if (vivo(gen) && demoActiva) {
                await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 700 });
                await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 700 });
            }
            if (vivo(gen)) {
                est.innerHTML = "";
                pasoAReto = true;
                iniciarReto(gen);
            }
        } finally {
            demoActiva = false;
            if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
            if (!pasoAReto && vivo(gen)) iniciarReto(gen);
        }
    }

    async function granCierre(gen) {
        cancelarAyuda();
        const tarima = $id("concierto-tarima");
        const conc = $id("concierto");
        tarima.innerHTML = "";
        conc.classList.remove("desfile");
        (nivelElegido.galeria || []).forEach(function (id, i) {
            const m = document.createElement("div");
            m.className = "marco-mini desfile-item";
            m.style.setProperty("--i", String(i));
            const lab = document.createElement("span");
            lab.className = "marco-etiqueta";
            lab.textContent = elemento(id).nombre || id;
            m.appendChild(crearImg(elemento(id).img));
            m.appendChild(lab);
            tarima.appendChild(m);
        });
        conc.hidden = false;
        conc.classList.add("desfile");
        efecto("aplausos");
        await decir({
            voz: "zoe",
            texto: "¡El desfile de disfraces! Mira cómo quedaron nuestros artistas listos para la función."
        }, { minMs: 900 });
        await sleep(1400);
        if (gen !== rondaGen) return;
        juegoTerminado = true;
        celebrar(true);
        efecto("fanfarria");
        efecto("aplausos");
        await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 800 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }
    function mostrarCierre() {
        const primera = L.lineas(nivelElegido.cierre)[0] || { texto: "¡Excelente!" };
        const texto = $id("texto_final");
        if (texto) texto.textContent = primera.texto;
        const ins = nivelElegido.insignia || {};
        const trofeo = document.querySelector("#victoria img.trofeo");
        if (ins.img && trofeo) {
            trofeo.src = asset(ins.img);
            trofeo.alt = ins.nombre;
            trofeo.classList.add("insignia");
            trofeo.addEventListener("click", function () { trofeo.classList.add("quieta"); reiniciarClase(trofeo, "gira", 900); efecto("chispas"); });
        }
        reproducirAudio(gameConfig.audios.cierre, 0.9, false);
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 2200);
        setTimeout(function () {
            const fin = $id("final");
            if (fin) { fin.hidden = false; fin.style.display = "block"; }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
        }, 350);
    }

    $(document).ready(function () {
        const bruto = readText("config.json");
        const introBruto = readText("../../../intro.json");
        if (!bruto || !introBruto) { console.error("[VisteAlArtista] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[VisteAlArtista]", errores);
        const btn = $id("btn-empecemos");
        if (btn) {
            btn.addEventListener("pointerdown", function (ev) { ev.preventDefault(); empecemosJuego(); });
            btn.addEventListener("click", empecemosJuego);
        }
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: [textos().eligeNivel, textos().demostracion, textos().demostracionAcierto, textos().demostracionFin].filter(Boolean)
            });
        } catch (e) { console.warn(e); }
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        sincronizarDialogoIntro3d();
        const omitir = $id("btn-omitir-intro3d");
        if (omitir) omitir.addEventListener("click", function () {
            if (cerrado) return;
            const root = $id("intro3d-root");
            if (!root || root.hidden) empezarJuegoTrasIntro();
            else window.dispatchEvent(new CustomEvent("intro3d-omitir"));
        });
        const seguir = $id("btn-continuar-intro3d");
        if (seguir) seguir.addEventListener("click", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
