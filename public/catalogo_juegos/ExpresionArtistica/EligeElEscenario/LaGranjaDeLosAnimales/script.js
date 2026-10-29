/* Elige el escenario — Expresión Artística */
(function () {
    "use strict";

    const L = window.EligeElEscenarioLogica;
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
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.EligeElEscenarioSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261027j"; }
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
            { personaje: 1, texto: "¡Bienvenido al Gran Teatro!" },
            { personaje: 0, texto: "Hoy elegiremos escenarios y utilería." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-teatro", tema === "teatro");
        document.body.classList.toggle("tema-control", tema === "control");
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

    function montarTarima(fondoId, actorId) {
        const caja = document.createElement("div");
        caja.className = "est-esc";
        const tarima = document.createElement("div");
        tarima.className = "tarima";
        const fondo = crearImg(elemento(fondoId || "telon_blanco").img, "img-fondo");
        tarima.appendChild(fondo);
        let actor = null;
        if (actorId && elemento(actorId).img) {
            actor = crearImg(elemento(actorId).img, "actor-escena");
            tarima.appendChild(actor);
        }
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        caja.appendChild(tarima);
        caja.appendChild(bandeja);
        return { caja: caja, tarima: tarima, fondo: fondo, actor: actor, bandeja: bandeja };
    }
    function crearPieza(id, permitirToque) {
        const el = elemento(id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pieza" + (permitirToque ? " toque" : "");
        btn.dataset.id = id;
        btn.setAttribute("aria-label", el.nombre || id);
        btn.appendChild(crearImg(el.img));
        const lab = document.createElement("span");
        lab.className = "pieza-nombre";
        lab.textContent = el.nombre || id;
        btn.appendChild(lab);
        return btn;
    }
    function ponerZona(tarima, zona) {
        const z = document.createElement("div");
        z.className = "zona-destino";
        z.style.left = zona.x + "%";
        z.style.top = zona.y + "%";
        z.style.width = zona.w + "%";
        z.style.height = zona.h + "%";
        tarima.appendChild(z);
        return z;
    }
    function festejar(efectoNombre, el) {
        efecto(efectoNombre || "destello");
        if (el) {
            particulas(centroDe(el).x, centroDe(el).y);
            reiniciarClase(el, "celebra", 700);
        }
        if (efectoNombre === "burbujas" && el) {
            for (let i = 0; i < 8; i++) {
                const b = document.createElement("span");
                b.className = "burbuja";
                b.style.left = (20 + Math.random() * 60) + "%";
                b.style.bottom = "10%";
                b.style.width = b.style.height = (10 + Math.random() * 16) + "px";
                el.appendChild(b);
                setTimeout(function () { b.remove(); }, 1300);
            }
        }
    }
    function enlazarArrastre(pieza, tarima, onSoltar) {
        let arrastrando = false;
        let ox = 0, oy = 0;
        let startX = 0, startY = 0;
        pieza.addEventListener("pointerdown", function (ev) {
            if (demoActiva || pieza.disabled) return;
            ev.preventDefault();
            arrastrando = true;
            startX = ev.clientX;
            startY = ev.clientY;
            pieza.classList.add("arrastrando");
            const br = pieza.getBoundingClientRect();
            ox = ev.clientX - br.left;
            oy = ev.clientY - br.top;
            pieza.style.position = "fixed";
            pieza.style.left = (ev.clientX - ox) + "px";
            pieza.style.top = (ev.clientY - oy) + "px";
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
            const movio = Math.hypot(ev.clientX - startX, ev.clientY - startY) > 12;
            const p = pctDesdeEvento(ev, tarima);
            const ok = onSoltar(pieza.dataset.id, p, ev, movio);
            if (!ok) {
                pieza.style.left = "";
                pieza.style.top = "";
                pieza.style.position = "";
                pieza.style.zIndex = "";
            }
        }
        pieza.addEventListener("pointerup", soltar);
        pieza.addEventListener("pointercancel", soltar);
    }
    function rielBajoEvento(ev, nodosRiel) {
        let mejor = null;
        let mejorDist = Infinity;
        Object.keys(nodosRiel).forEach(function (id) {
            const r = nodosRiel[id].getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dentro = ev.clientX >= r.left - 12 && ev.clientX <= r.right + 12 &&
                ev.clientY >= r.top - 12 && ev.clientY <= r.bottom + 12;
            const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
            if (dentro && dist < mejorDist) {
                mejorDist = dist;
                mejor = id;
            }
        });
        return mejor;
    }

    async function retoArrastre(r, gen) {
        const ui = montarTarima(r.fondoInicial, r.actor);
        $id("estacion").appendChild(ui.caja);
        const zona = ponerZona(ui.tarima, r.zonaDestino);
        const piezas = {};
        (r.opciones || []).forEach(function (id) {
            const p = crearPieza(id, !!r.permitirToque);
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
                if (r.tipo === "arrastreTelon") {
                    ui.fondo.classList.remove("telon-cae");
                    void ui.fondo.offsetWidth;
                    ui.fondo.src = asset(elemento(r.correcta).img);
                    ui.fondo.classList.add("telon-cae");
                    if (r.id === "castillo") ui.tarima.classList.add("castillo-brilla");
                } else if (r.tipo === "arrastreUtileria") {
                    const put = crearImg(elemento(r.correcta).img, "utileria-puesta");
                    put.style.left = r.zonaDestino.x + "%";
                    put.style.top = r.zonaDestino.y + "%";
                    if (r.id === "granja") put.classList.add("luces-on");
                    if (r.id === "circo") put.classList.add("ilumina");
                    ui.tarima.appendChild(put);
                    if (r.id === "granja") {
                        const vaca = crearImg(elemento("vaquita").img || "img/vaquita.svg", "vaca-saludo");
                        vaca.style.left = "58%";
                        vaca.style.top = "62%";
                        ui.tarima.appendChild(vaca);
                    }
                }
                if (ui.actor && r.id === "pececito") ui.actor.classList.add("nada");
                if (ui.actor && r.id === "castillo") ui.actor.classList.add("reverencia");
                festejar(r.efecto, ui.tarima);
                resolve();
            }
            Object.keys(piezas).forEach(function (id) {
                const pieza = piezas[id];
                enlazarArrastre(pieza, ui.tarima, function (piezaId, p, ev, movio) {
                    if (!vivo(gen) || demoActiva || listo) return false;
                    // Toque (castillo): soltar sin mover mucho = elegir
                    if (r.permitirToque && !movio) {
                        const resT = L.evaluarPieza(r, piezaId);
                        if (resT.estado === "bien") { completar(); return true; }
                        efecto("error");
                        reiniciarClase(pieza, "mal", 450);
                        callar();
                        decirLineas(r.error);
                        return false;
                    }
                    if (!p) { efecto("error"); return false; }
                    const res = L.evaluarArrastre(r, piezaId, p.x, p.y);
                    if (res.estado === "completo") {
                        completar();
                        return true;
                    }
                    if (res.estado === "mal") {
                        efecto("error");
                        reiniciarClase(pieza, "mal", 450);
                        callar();
                        decirLineas(r.error);
                    } else efecto("error");
                    return false;
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

    async function retoSecuencia(r, gen) {
        const ui = montarTarima(r.fondoInicial, r.actor);
        $id("estacion").appendChild(ui.caja);
        for (let i = 0; i < (r.pasos || []).length; i++) {
            if (!vivo(gen)) return;
            const paso = r.pasos[i];
            ui.bandeja.innerHTML = "";
            const zona = ponerZona(ui.tarima, paso.zonaDestino);
            const piezas = {};
            (paso.opciones || []).forEach(function (id) {
                const p = crearPieza(id);
                piezas[id] = p;
                ui.bandeja.appendChild(p);
            });
            await new Promise(function (resolve) {
                Object.keys(piezas).forEach(function (id) {
                    enlazarArrastre(piezas[id], ui.tarima, function (piezaId, p) {
                        if (!vivo(gen) || demoActiva) return false;
                        if (!p) { efecto("error"); return false; }
                        const res = L.evaluarArrastre(paso, piezaId, p.x, p.y);
                        if (res.estado === "completo") {
                            cancelarAyuda();
                            Object.keys(piezas).forEach(function (k) {
                                piezas[k].disabled = true;
                                piezas[k].style.visibility = "hidden";
                            });
                            zona.classList.add("lleno");
                            if (paso.esFondo) {
                                ui.fondo.classList.remove("telon-cae");
                                void ui.fondo.offsetWidth;
                                ui.fondo.src = asset(elemento(paso.correcta).img);
                                ui.fondo.classList.add("telon-cae");
                            } else {
                                const put = crearImg(elemento(paso.correcta).img, "utileria-puesta");
                                put.style.left = paso.zonaDestino.x + "%";
                                put.style.top = paso.zonaDestino.y + "%";
                                ui.tarima.appendChild(put);
                            }
                            if (ui.actor) ui.actor.classList.add("flota");
                            if (i === (r.pasos || []).length - 1) ui.tarima.classList.add("estrellas-giro");
                            festejar(r.efecto, ui.tarima);
                            resolve();
                            return true;
                        }
                        if (res.estado === "mal") {
                            efecto("error");
                            reiniciarClase(piezas[id], "mal", 450);
                            callar();
                            decirLineas(r.error);
                        } else efecto("error");
                        return false;
                    });
                });
                vigilar(function () { return mano(piezas[paso.correcta]); }, 5000);
            });
            zona.remove();
        }
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function retoLuces(r, gen) {
        const ui = montarTarima(r.fondoInicial, r.actor);
        $id("estacion").appendChild(ui.caja);
        const consola = document.createElement("div");
        consola.className = "consola-luces";
        const focos = document.createElement("div");
        focos.className = "focos-fila";
        let focoSel = r.focos[0];
        const botones = {};
        (r.focos || []).forEach(function (id) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "btn-foco" + (id === focoSel ? " activo" : "");
            b.appendChild(crearImg(elemento(id).img));
            b.setAttribute("aria-label", elemento(id).nombre || id);
            botones[id] = b;
            focos.appendChild(b);
        });
        const wrap = document.createElement("div");
        wrap.className = "intensidad-wrap";
        const lab = document.createElement("label");
        lab.textContent = "Intensidad de luces";
        const rango = document.createElement("input");
        rango.type = "range";
        rango.min = "1";
        rango.max = "3";
        rango.step = "1";
        rango.value = "3";
        rango.className = "rango-intensidad";
        rango.setAttribute("aria-label", "Intensidad");
        wrap.appendChild(lab);
        wrap.appendChild(rango);
        consola.appendChild(focos);
        consola.appendChild(wrap);
        ui.bandeja.appendChild(consola);
        let listo = false;
        const hecho = new Promise(function (resolve) {
            function intentar(desdeCambio) {
                if (listo || !vivo(gen) || demoActiva) return;
                const res = L.evaluarLuces(r, focoSel, Number(rango.value));
                if (res.estado === "completo") {
                    listo = true;
                    cancelarAyuda();
                    ui.tarima.classList.add("noche");
                    if (!ui.tarima.querySelector(".estrellas-proyector")) {
                        const estrellas = document.createElement("div");
                        estrellas.className = "estrellas-proyector";
                        estrellas.setAttribute("aria-hidden", "true");
                        for (let i = 0; i < 12; i++) {
                            const s = document.createElement("span");
                            s.style.left = (8 + Math.random() * 84) + "%";
                            s.style.top = (8 + Math.random() * 50) + "%";
                            estrellas.appendChild(s);
                        }
                        ui.tarima.appendChild(estrellas);
                    }
                    if (ui.actor) ui.actor.classList.add("linterna-haz");
                    festejar(r.efecto, ui.tarima);
                    resolve();
                    return;
                }
                if (desdeCambio) {
                    efecto("error");
                    callar();
                    decirLineas(r.error);
                }
            }
            Object.keys(botones).forEach(function (id) {
                botones[id].addEventListener("pointerdown", function (ev) {
                    if (!vivo(gen) || demoActiva || listo) return;
                    ev.preventDefault();
                    focoSel = id;
                    Object.keys(botones).forEach(function (k) { botones[k].classList.toggle("activo", k === id); });
                    intentar(false);
                });
            });
            rango.addEventListener("input", function () {
                if (L.evaluarLuces(r, focoSel, Number(rango.value)).estado === "completo") intentar(false);
            });
            rango.addEventListener("change", function () { intentar(true); });
            vigilar(function () {
                focoSel = r.focoCorrecto;
                Object.keys(botones).forEach(function (k) { botones[k].classList.toggle("activo", k === focoSel); });
                rango.value = String(r.intensidadObjetivo);
                intentar(false);
                return Promise.resolve();
            }, 8000);
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

    async function retoCapas(r, gen) {
        const ui = montarTarima("telon_blanco", null);
        $id("estacion").appendChild(ui.caja);
        const rielesWrap = document.createElement("div");
        rielesWrap.className = "rieles";
        const nodosRiel = {};
        (r.rieles || []).forEach(function (riel) {
            const d = document.createElement("div");
            d.className = "riel";
            d.dataset.id = riel.id;
            d.style.top = (riel.y - 11) + "%";
            const et = document.createElement("span");
            et.className = "riel-etiqueta";
            et.textContent = riel.etiqueta;
            d.appendChild(et);
            rielesWrap.appendChild(d);
            nodosRiel[riel.id] = d;
        });
        ui.tarima.appendChild(rielesWrap);
        const piezas = {};
        (r.piezas || []).forEach(function (p) {
            const btn = crearPieza(p.id);
            piezas[p.id] = btn;
            ui.bandeja.appendChild(btn);
        });
        let colocadas = {};
        const hecho = new Promise(function (resolve) {
            Object.keys(piezas).forEach(function (id) {
                enlazarArrastre(piezas[id], ui.tarima, function (piezaId, p, ev) {
                    if (!vivo(gen) || demoActiva || colocadas[piezaId]) return false;
                    const rielHit = rielBajoEvento(ev, nodosRiel);
                    if (!rielHit) {
                        efecto("error");
                        return false;
                    }
                    const res = L.evaluarCapa(r, piezaId, rielHit, colocadas);
                    if (res.estado === "mal") {
                        efecto("error");
                        reiniciarClase(piezas[id], "mal", 450);
                        callar();
                        decirLineas(r.error);
                        return false;
                    }
                    colocadas = res.halladas;
                    piezas[id].style.visibility = "hidden";
                    const nodo = nodosRiel[rielHit];
                    nodo.classList.add("lleno");
                    nodo.appendChild(crearImg(elemento(piezaId).img));
                    efecto(r.efecto || "engranaje");
                    particulas(centroDe(nodo).x, centroDe(nodo).y);
                    if (res.estado === "completo") {
                        cancelarAyuda();
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

    async function retoAnacronismo(r, gen) {
        const ui = montarTarima(r.fondoInicial, null);
        $id("estacion").appendChild(ui.caja);
        const posiciones = [
            { x: 22, y: 48 },
            { x: 50, y: 55 },
            { x: 78, y: 48 }
        ];
        const objs = {};
        (r.objetosEscena || []).forEach(function (id, i) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "objeto-escena";
            b.dataset.id = id;
            b.style.left = posiciones[i].x + "%";
            b.style.top = posiciones[i].y + "%";
            b.appendChild(crearImg(elemento(id).img));
            b.setAttribute("aria-label", elemento(id).nombre || id);
            ui.tarima.appendChild(b);
            objs[id] = b;
        });
        await new Promise(function (resolve) {
            Object.keys(objs).forEach(function (id) {
                objs[id].addEventListener("pointerdown", function (ev) {
                    if (!vivo(gen) || demoActiva) return;
                    ev.preventDefault();
                    const res = L.evaluarQuitar(r, id);
                    if (res.estado !== "bien") {
                        efecto("error");
                        reiniciarClase(objs[id], "mal", 450);
                        callar();
                        decirLineas(r.error);
                        return;
                    }
                    cancelarAyuda();
                    objs[id].classList.add("fuera", "pixeles");
                    efecto("chispas");
                    setTimeout(resolve, 700);
                });
            });
            vigilar(function () { return mano(objs[r.quitar]); }, 5000);
        });
        if (!vivo(gen)) return;
        // Doc: tras quitar el anacronismo, se instalan las antorchas en los muros.
        if (objs[r.utileria]) {
            objs[r.utileria].remove();
            delete objs[r.utileria];
        }
        Object.keys(objs).forEach(function (id) { if (id !== r.quitar) objs[id].style.pointerEvents = "none"; });
        if (r.despuesQuitar) await decirLineas(r.despuesQuitar);
        if (!vivo(gen)) return;
        const zona = ponerZona(ui.tarima, r.zonaDestino);
        const herramienta = crearPieza(r.utileria);
        ui.bandeja.appendChild(herramienta);
        await new Promise(function (resolve) {
            enlazarArrastre(herramienta, ui.tarima, function (piezaId, p) {
                if (!vivo(gen) || demoActiva) return false;
                if (!p || !L.dentroPct(p.x, p.y, r.zonaDestino)) { efecto("error"); return false; }
                cancelarAyuda();
                herramienta.style.visibility = "hidden";
                zona.classList.add("lleno");
                const put = crearImg(elemento(r.utileria).img, "utileria-puesta fuego-vivo");
                put.style.left = r.zonaDestino.x + "%";
                put.style.top = r.zonaDestino.y + "%";
                ui.tarima.appendChild(put);
                festejar(r.efecto, ui.tarima);
                resolve();
                return true;
            });
            vigilar(function () { return mano(herramienta); }, 5000);
        });
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function jugarReto(r, gen) {
        if (r.tipo === "arrastreTelon" || r.tipo === "arrastreUtileria") return retoArrastre(r, gen);
        if (r.tipo === "secuencia") return retoSecuencia(r, gen);
        if (r.tipo === "luces") return retoLuces(r, gen);
        if (r.tipo === "capas") return retoCapas(r, gen);
        if (r.tipo === "anacronismo") return retoAnacronismo(r, gen);
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
        const el = elemento(gameConfig.demo.elemento);
        if (!el.img || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        let pasoAReto = false;
        try {
            await PedniaTutorial.activarDemo();
            const t = textos();
            const est = $id("estacion");
            est.innerHTML = "";
            const ui = montarTarima("telon_blanco", "pececito");
            const mar = crearPieza("telon_mar");
            const des = crearPieza("telon_desierto");
            ui.bandeja.appendChild(mar);
            ui.bandeja.appendChild(des);
            const zona = ponerZona(ui.tarima, { x: 50, y: 42, w: 70, h: 55 });
            est.appendChild(ui.caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: mar, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        mar.classList.add("correcta");
                        ui.fondo.src = asset(elemento("telon_mar").img);
                        zona.classList.add("lleno");
                        efecto("burbujas");
                        particulas(centroDe(ui.tarima).x, centroDe(ui.tarima).y);
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
        const esDesfile = nivelElegido.tema === "teatro";
        (nivelElegido.galeria || []).forEach(function (id, i) {
            const m = document.createElement("div");
            m.className = "marco-mini" + (esDesfile ? " desfile-item" : "");
            if (esDesfile) m.style.setProperty("--i", String(i));
            const lab = document.createElement("span");
            lab.className = "marco-etiqueta";
            lab.textContent = elemento(id).nombre || id;
            m.appendChild(crearImg(elemento(id).img));
            if (esDesfile) m.appendChild(lab);
            tarima.appendChild(m);
        });
        conc.hidden = false;
        if (esDesfile) {
            conc.classList.add("desfile");
            efecto("aplausos");
            await decir({
                voz: "zoe",
                texto: "¡El desfile de escenarios! Mira el mar, el castillo, la granja y el espacio que armamos juntos."
            }, { minMs: 900 });
            await sleep(1400);
        } else {
            await sleep(500);
        }
        if (gen !== rondaGen) return;
        juegoTerminado = true;
        celebrar(true);
        efecto("fanfarria");
        if (esDesfile) efecto("aplausos");
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
        if (!bruto || !introBruto) { console.error("[EligeElEscenario] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EligeElEscenario]", errores);
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
