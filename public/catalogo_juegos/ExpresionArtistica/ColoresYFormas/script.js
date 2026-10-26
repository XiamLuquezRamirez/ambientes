/* Colores y formas — Expresión Artística */
(function () {
    "use strict";

    const L = window.ColoresYFormasLogica;
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
    let ultimoErrorVoz = 0;

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
    function sfx() { return window.ColoresYFormasSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261026a"; }
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
            { personaje: 1, texto: "¡Hola! Bienvenido a la fábrica de juguetes de madera." },
            { personaje: 0, texto: "Hoy vamos a encajar formas y colores para armar juguetes." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-fabrica", tema === "fabrica");
        document.body.classList.toggle("tema-atelier", tema === "atelier");
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
    function avatarDe(voz, hablando) { return "../../images/" + voz + (hablando ? "_hablando.gif" : "_normal.gif"); }
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
    function posicionGeo(el, h) {
        el.style.left = h.x + "%";
        el.style.top = h.y + "%";
        if (h.w != null) el.style.width = h.w + "%";
        if (h.h != null) el.style.height = h.h + "%";
        if (h.rot != null) el.style.transform = "translate(-50%, -50%) rotate(" + h.rot + "deg)";
        else el.style.transform = "translate(-50%, -50%)";
    }
    function imgElementoDePieza(p) {
        const id = p.elemento || p.id;
        return elemento(id).img;
    }
    function nombreElementoDePieza(p) {
        const id = p.elemento || p.id;
        return elemento(id).nombre || id;
    }
    function trianguloDeColor(color) {
        return color === "amarillo" ? "triangulo_amarillo" : "triangulo_rojo";
    }
    function boteDeColor(color) {
        const map = { rojo: "bote_rojo", azul: "bote_azul", amarillo: "bote_amarillo" };
        return map[color] || "bote_rojo";
    }
    function sonidoEncaje(tipo) {
        if (tipo === "casita" || tipo === "torre") return "madera";
        if (tipo === "tren") return "silbato";
        return "campana";
    }
    function avisarError(r) {
        if (!r || !r.error) return;
        const ahora = Date.now();
        if (ahora - ultimoErrorVoz < 2800) return;
        ultimoErrorVoz = ahora;
        callar();
        decirLineas(r.error);
    }
    function mostrarPremio(lienzo, premioId) {
        if (!premioId) return;
        const prem = document.createElement("div");
        prem.className = premioId === "chimenea" ? "chimenea-premio" : "antena-premio";
        prem.appendChild(crearImg(elemento(premioId).img));
        lienzo.appendChild(prem);
    }

    function festejar(tipo, lienzo) {
        if (tipo === "semaforo") efecto("campana");
        else if (tipo === "casita" || tipo === "torre") efecto("madera");
        else if (tipo === "tren") efecto("silbato");
        else if (tipo === "cohete") efecto("destello");
        else if (tipo === "mosaico") efecto("cristal");
        else if (tipo === "mondrian") efecto("recompensa");
        else if (tipo === "ciudad") { efecto("fanfarria"); efecto("aplausos"); }
        else efecto("recompensa");
        if (lienzo) {
            if (tipo === "cohete") reiniciarClase(lienzo, "despega", 1400);
            if (tipo === "mosaico") lienzo.classList.add("gira-estrella");
            if (tipo === "mondrian") lienzo.classList.add("marco-dorado");
            if (tipo === "ciudad") lienzo.classList.add("ciudad-viva");
        }
        celebrar(true);
        if (lienzo) particulas(centroDe(lienzo).x, centroDe(lienzo).y);
    }

    async function retoEncaje(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-geo";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        if (r.base) {
            const base = document.createElement("div");
            base.className = "geo-base";
            base.appendChild(crearImg(elemento(r.base).img));
            lienzo.appendChild(base);
        }
        const huecos = {};
        (r.huecos || []).forEach(function (h) {
            const el = document.createElement("div");
            el.className = "hueco";
            el.dataset.id = h.id;
            posicionGeo(el, h);
            lienzo.appendChild(el);
            huecos[h.id] = el;
        });
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const nodos = {};
        (r.piezas || []).forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza";
            b.dataset.id = p.id;
            b.setAttribute("aria-label", elemento(p.id).nombre || p.id);
            b.appendChild(crearImg(elemento(p.id).img));
            bandeja.appendChild(b);
            nodos[p.id] = b;
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let puestos = [];
        const hecho = new Promise(function (resolve) {
            function colocar(id, huecoId) {
                const res = L.evaluarEncaje(r, puestos, id, huecoId);
                const nodo = nodos[id];
                if (res.estado !== "bien" && res.estado !== "completo") {
                    nodo.style.transform = "";
                    nodo.classList.add("mal");
                    setTimeout(function () { nodo.classList.remove("mal"); }, 400);
                    efecto("error");
                    avisarError(r);
                    return;
                }
                puestos = res.colocadas;
                nodo.classList.add("puesta");
                nodo.style.transform = "";
                huecos[huecoId].appendChild(nodo);
                huecos[huecoId].classList.add("lleno");
                efecto(sonidoEncaje(r.tipo));
                particulas(centroDe(huecos[huecoId]).x, centroDe(huecos[huecoId]).y);
                if (res.estado === "completo") {
                    if (r.premio) mostrarPremio(lienzo, r.premio);
                    if (r.tipo === "cohete") reiniciarClase(lienzo, "despega", 1400);
                    cancelarAyuda();
                    resolve();
                }
            }
            Object.keys(nodos).forEach(function (id) {
                const nodo = nodos[id];
                nodo.addEventListener("pointerdown", function (ev) {
                    if (nodo.classList.contains("puesta") || demoActiva || !vivo(gen)) return;
                    ev.preventDefault();
                    try { nodo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                    nodo.classList.add("arrastrando");
                    const ox = ev.clientX, oy = ev.clientY;
                    let movio = false;
                    function mover(e) {
                        const dx = e.clientX - ox, dy = e.clientY - oy;
                        if (Math.hypot(dx, dy) > 10) movio = true;
                        nodo.style.transform = "translate(" + dx + "px," + dy + "px)";
                    }
                    function soltar(e) {
                        nodo.removeEventListener("pointermove", mover);
                        nodo.removeEventListener("pointerup", soltar);
                        nodo.removeEventListener("pointercancel", soltar);
                        nodo.classList.remove("arrastrando");
                        callar();
                        const pieza = r.piezas.find(function (p) { return p.id === id; });
                        const tap = Math.hypot(e.clientX - ox, e.clientY - oy) < 36;
                        if (r.toqueColoca && (!movio || tap)) { colocar(id, pieza.hueco); return; }
                        const zonas = Object.keys(huecos).filter(function (hid) {
                            return !huecos[hid].classList.contains("lleno");
                        }).map(function (hid) {
                            const c = centroDe(huecos[hid]);
                            return { id: hid, x: c.x, y: c.y };
                        });
                        const cerca = L.huecoMasCercano({ x: e.clientX, y: e.clientY }, zonas, L.RADIO);
                        if (!cerca) { nodo.style.transform = ""; return; }
                        colocar(id, cerca);
                    }
                    nodo.addEventListener("pointermove", mover);
                    nodo.addEventListener("pointerup", soltar);
                    nodo.addEventListener("pointercancel", soltar);
                });
            });
            vigilar(function () { return mano(Object.values(nodos)[0]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar(r.tipo, lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoMosaico(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-geo";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const base = document.createElement("div");
        base.className = "geo-base";
        base.appendChild(crearImg(elemento(r.base || "estrella_base").img));
        lienzo.appendChild(base);
        const huecos = {};
        (r.huecos || []).forEach(function (h) {
            const el = document.createElement("div");
            el.className = "hueco" + (h.fijo ? " fijo lleno" : "");
            el.dataset.id = h.id;
            posicionGeo(el, h);
            if (h.fijo) {
                el.appendChild(crearImg(elemento(trianguloDeColor(h.color)).img));
            }
            lienzo.appendChild(el);
            if (!h.fijo) huecos[h.id] = el;
        });
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const nodos = {};
        (r.piezas || []).forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza";
            b.dataset.id = p.id;
            b.setAttribute("aria-label", nombreElementoDePieza(p));
            b.appendChild(crearImg(imgElementoDePieza(p)));
            bandeja.appendChild(b);
            nodos[p.id] = b;
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let puestos = [];
        const hecho = new Promise(function (resolve) {
            function colocar(id, huecoId) {
                const res = L.evaluarMosaico(r, puestos, id, huecoId);
                const nodo = nodos[id];
                if (res.estado !== "bien" && res.estado !== "completo") {
                    nodo.style.transform = "";
                    nodo.classList.add("mal");
                    setTimeout(function () { nodo.classList.remove("mal"); }, 400);
                    efecto("error");
                    avisarError(r);
                    return;
                }
                puestos = res.colocadas;
                nodo.classList.add("puesta");
                nodo.style.transform = "";
                huecos[huecoId].appendChild(nodo);
                huecos[huecoId].classList.add("lleno");
                efecto("campana");
                particulas(centroDe(huecos[huecoId]).x, centroDe(huecos[huecoId]).y);
                if (res.estado === "completo") {
                    lienzo.classList.add("gira-estrella");
                    cancelarAyuda();
                    resolve();
                }
            }
            Object.keys(nodos).forEach(function (id) {
                const nodo = nodos[id];
                nodo.addEventListener("pointerdown", function (ev) {
                    if (nodo.classList.contains("puesta") || demoActiva || !vivo(gen)) return;
                    ev.preventDefault();
                    try { nodo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                    nodo.classList.add("arrastrando");
                    const ox = ev.clientX, oy = ev.clientY;
                    let movio = false;
                    function mover(e) {
                        const dx = e.clientX - ox, dy = e.clientY - oy;
                        if (Math.hypot(dx, dy) > 10) movio = true;
                        nodo.style.transform = "translate(" + dx + "px," + dy + "px)";
                    }
                    function soltar(e) {
                        nodo.removeEventListener("pointermove", mover);
                        nodo.removeEventListener("pointerup", soltar);
                        nodo.removeEventListener("pointercancel", soltar);
                        nodo.classList.remove("arrastrando");
                        callar();
                        const tap = Math.hypot(e.clientX - ox, e.clientY - oy) < 36;
                        if (r.toqueColoca && (!movio || tap)) {
                            const pieza = r.piezas.find(function (p) { return p.id === id; });
                            const libre = (r.huecos || []).find(function (h) {
                                return !h.fijo && huecos[h.id] && !huecos[h.id].classList.contains("lleno") && h.color === (pieza && pieza.color);
                            });
                            if (libre) colocar(id, libre.id);
                            else nodo.style.transform = "";
                            return;
                        }
                        const zonas = Object.keys(huecos).filter(function (hid) {
                            return !huecos[hid].classList.contains("lleno");
                        }).map(function (hid) {
                            const c = centroDe(huecos[hid]);
                            return { id: hid, x: c.x, y: c.y };
                        });
                        const cerca = L.huecoMasCercano({ x: e.clientX, y: e.clientY }, zonas, L.RADIO);
                        if (!cerca) { nodo.style.transform = ""; return; }
                        colocar(id, cerca);
                    }
                    nodo.addEventListener("pointermove", mover);
                    nodo.addEventListener("pointerup", soltar);
                    nodo.addEventListener("pointercancel", soltar);
                });
            });
            vigilar(function () { return mano(Object.values(nodos)[0]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("mosaico", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoMondrian(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-geo";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const fondo = document.createElement("div");
        fondo.className = "geo-base";
        fondo.appendChild(crearImg(elemento("lienzo_mondrian").img));
        lienzo.appendChild(fondo);
        const celdas = {};
        (r.celdas || []).forEach(function (c) {
            const el = document.createElement("button");
            el.type = "button";
            el.className = "celda";
            el.dataset.id = c.id;
            posicionGeo(el, c);
            lienzo.appendChild(el);
            celdas[c.id] = el;
        });
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        let colorActivo = null;
        const botonesColor = {};
        (r.colores || []).forEach(function (color) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "bote-pintura";
            b.dataset.color = color;
            b.setAttribute("aria-label", elemento(boteDeColor(color)).nombre || color);
            b.appendChild(crearImg(elemento(boteDeColor(color)).img));
            b.addEventListener("click", function () {
                if (demoActiva || !vivo(gen)) return;
                callar();
                colorActivo = color;
                Object.keys(botonesColor).forEach(function (k) { botonesColor[k].classList.toggle("activo", k === color); });
                efecto("suave");
            });
            bandeja.appendChild(b);
            botonesColor[color] = b;
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let pintados = [];
        const hecho = new Promise(function (resolve) {
            Object.keys(celdas).forEach(function (cid) {
                celdas[cid].addEventListener("click", function () {
                    if (!colorActivo || demoActiva || !vivo(gen)) return;
                    callar();
                    const res = L.evaluarMondrian(r, pintados, cid, colorActivo);
                    if (res.estado === "puesta") { efecto("suave"); return; }
                    if (res.estado !== "bien" && res.estado !== "completo") {
                        efecto("error");
                        return;
                    }
                    pintados = res.pintados;
                    celdas[cid].style.background = L.hexDe(colorActivo);
                    celdas[cid].classList.add("pintada");
                    celdas[cid].disabled = true;
                    efecto("suave");
                    particulas(centroDe(celdas[cid]).x, centroDe(celdas[cid]).y);
                    if (res.estado === "completo") {
                        lienzo.classList.add("marco-dorado");
                        cancelarAyuda();
                        resolve();
                    }
                });
            });
            vigilar(function () { return mano(bandeja.firstChild); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("mondrian", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoCiudad(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-geo";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const fondo = document.createElement("div");
        fondo.className = "geo-base";
        fondo.appendChild(crearImg(elemento("plano_ciudad").img));
        lienzo.appendChild(fondo);
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const nodos = {};
        (r.piezas || []).forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza";
            b.dataset.id = p.id;
            b.setAttribute("aria-label", elemento(p.id).nombre || p.id);
            b.appendChild(crearImg(elemento(p.id).img));
            bandeja.appendChild(b);
            nodos[p.id] = b;
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let puestos = [];
        const hecho = new Promise(function (resolve) {
            function colocarEnLienzo(id, xPct, yPct) {
                const res = L.evaluarCiudad(r, puestos, id);
                const nodo = nodos[id];
                if (res.estado === "puesta") return;
                puestos = res.colocadas;
                nodo.classList.add("puesta");
                nodo.disabled = true;
                nodo.style.visibility = "hidden";
                const pieza = document.createElement("div");
                pieza.className = "pieza puesta ciudad-pieza";
                pieza.style.left = xPct + "%";
                pieza.style.top = yPct + "%";
                pieza.style.transform = "translate(-50%, -50%)";
                pieza.appendChild(crearImg(elemento(id).img));
                lienzo.appendChild(pieza);
                efecto("suave");
                particulas(centroDe(pieza).x, centroDe(pieza).y);
                if (res.estado === "completo") {
                    lienzo.classList.add("ciudad-viva");
                    cancelarAyuda();
                    resolve();
                } else {
                    const sig = Object.keys(nodos).map(function (k) { return nodos[k]; }).find(function (n) { return !n.classList.contains("puesta"); });
                    if (sig) vigilar(function () { return mano(sig); }, 6000);
                }
            }
            Object.keys(nodos).forEach(function (id) {
                const nodo = nodos[id];
                nodo.addEventListener("pointerdown", function (ev) {
                    if (nodo.classList.contains("puesta") || demoActiva || !vivo(gen)) return;
                    ev.preventDefault();
                    try { nodo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                    nodo.classList.add("arrastrando");
                    const ox = ev.clientX, oy = ev.clientY;
                    function mover(e) {
                        nodo.style.transform = "translate(" + (e.clientX - ox) + "px," + (e.clientY - oy) + "px)";
                    }
                    function soltar(e) {
                        nodo.removeEventListener("pointermove", mover);
                        nodo.removeEventListener("pointerup", soltar);
                        nodo.removeEventListener("pointercancel", soltar);
                        nodo.classList.remove("arrastrando");
                        nodo.style.transform = "";
                        callar();
                        const rect = lienzo.getBoundingClientRect();
                        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
                        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
                        colocarEnLienzo(id, xPct, yPct);
                    }
                    nodo.addEventListener("pointermove", mover);
                    nodo.addEventListener("pointerup", soltar);
                    nodo.addEventListener("pointercancel", soltar);
                });
            });
            vigilar(function () { return mano(Object.values(nodos)[0]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("ciudad", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function jugarReto(r, gen) {
        if (["semaforo", "casita", "tren", "cohete", "torre"].indexOf(r.tipo) !== -1) return retoEncaje(r, gen);
        if (r.tipo === "mosaico") return retoMosaico(r, gen);
        if (r.tipo === "mondrian") return retoMondrian(r, gen);
        if (r.tipo === "ciudad") return retoCiudad(r, gen);
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
            const caja = document.createElement("div");
            caja.className = "est-geo";
            const lienzo = document.createElement("div");
            lienzo.className = "lienzo";
            const hueco = document.createElement("div");
            hueco.className = "hueco";
            hueco.style.left = "50%";
            hueco.style.top = "46%";
            hueco.style.transform = "translate(-50%, -50%)";
            lienzo.appendChild(hueco);
            const pieza = document.createElement("button");
            pieza.type = "button";
            pieza.className = "pieza";
            pieza.appendChild(crearImg(el.img));
            const bandeja = document.createElement("div");
            bandeja.className = "bandeja";
            bandeja.appendChild(pieza);
            caja.appendChild(lienzo);
            caja.appendChild(bandeja);
            est.appendChild(caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: pieza, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        hueco.appendChild(pieza);
                        pieza.classList.add("puesta");
                        hueco.classList.add("lleno");
                        efecto("campana");
                        particulas(centroDe(hueco).x, centroDe(hueco).y);
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
        juegoTerminado = true;
        cancelarAyuda();
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        (nivelElegido.galeria || []).forEach(function (id) {
            const m = document.createElement("div");
            m.className = "marco-mini";
            m.appendChild(crearImg(elemento(id).img));
            tarima.appendChild(m);
        });
        const conc = $id("concierto");
        conc.hidden = false;
        await sleep(500);
        if (gen !== rondaGen) return;
        celebrar(true);
        efecto("fanfarria");
        await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 800 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }
    function mostrarCierre() {
        const primera = (nivelElegido.cierre || [])[0] || { texto: "¡Excelente!" };
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
        const introBruto = readText("../../intro.json");
        if (!bruto || !introBruto) { console.error("[ColoresYFormas] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ColoresYFormas]", errores);
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
