/* Rompecabezas artístico — Expresión Artística */
(function () {
    "use strict";

    const L = window.RompecabezasArtisticoLogica;
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
    function sfx() { return window.RompecabezasArtisticoSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261024a"; }
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
        return (nivel && nivel.bienvenida) || textos().conversacion || [];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-taller", tema === "taller");
        document.body.classList.toggle("tema-caballete", tema !== "taller");
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
    function efecto(nombre, extra) { if (sfx()) sfx().sonar(nombre, extra); }
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

    function aplicarGiro(el, grados) {
        el.dataset.giro = String((grados || 0) % 360);
        el.style.transform = "rotate(" + el.dataset.giro + "deg)";
    }

    async function retoPuzzle(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-puz";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo" + (r.festejo === "arcoiris" ? " cielo" : "") + (r.festejo === "luna" ? " noche" : "");
        if (r.festejo === "arcoiris") lienzo.appendChild(Object.assign(document.createElement("div"), { className: "arco" }));
        if (r.festejo === "rayos") lienzo.appendChild(Object.assign(document.createElement("div"), { className: "rayos" }));
        if (r.festejo === "casita") {
            lienzo.appendChild(Object.assign(document.createElement("div"), { className: "humo" }));
            lienzo.appendChild(Object.assign(document.createElement("div"), { className: "sol-esquina" }));
        }
        if (r.festejo === "luna") {
            for (let s = 0; s < 6; s++) {
                const estrella = document.createElement("i");
                estrella.className = "estrella e" + (s + 1);
                estrella.setAttribute("aria-hidden", "true");
                lienzo.appendChild(estrella);
            }
        }
        const huecos = {};
        (r.fijos || []).forEach(function (f) {
            const el = document.createElement("div");
            el.className = "fijo";
            el.style.left = f.x;
            el.style.top = f.y;
            el.appendChild(crearImg(elemento(f.id).img));
            lienzo.appendChild(el);
        });
        r.piezas.forEach(function (p) {
            const h = document.createElement("div");
            h.className = "hueco";
            h.dataset.id = p.hueco;
            h.style.left = p.x;
            h.style.top = p.y;
            const guia = crearImg(elemento((p.silueta || p.id)).img);
            guia.className = p.silueta ? "silueta" : (r.guiaColor ? "guia-color" : "guia");
            h.appendChild(guia);
            lienzo.appendChild(h);
            huecos[p.hueco] = h;
        });
        if (r.adorno) {
            const ad = crearImg(elemento(r.adorno).img, "fijo");
            ad.style.left = "50%";
            ad.style.top = "88%";
            ad.style.width = "18%";
            lienzo.appendChild(ad);
        }
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const nodos = {};
        const ordenBandeja = r.revolver ? L.mezclar(r.piezas) : r.piezas;
        ordenBandeja.forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza";
            b.dataset.id = p.id;
            b.setAttribute("aria-label", elemento(p.id).nombre || p.id);
            b.appendChild(crearImg(elemento(p.id).img));
            bandeja.appendChild(b);
            nodos[p.id] = b;
            if (r.tipo === "giro") aplicarGiro(b, p.giro || 0);
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        await decirLineas(r.consigna);
        if (!vivo(gen)) return;
        let puestos = [];
        let dijo = false;
        await new Promise(function (resolve) {
            let listo = false;
            function siguiente() {
                if (r.orden) return nodos[r.orden[puestos.length]];
                return Object.keys(nodos).map(function (id) { return nodos[id]; }).find(function (n) { return !n.classList.contains("puesta"); });
            }
            function ayuda() { return mano(siguiente()); }
            function colocar(id, huecoId) {
                const nodo = nodos[id];
                const giro = Number(nodo.dataset.giro || 0);
                const res = L.evaluarEncaje(r, puestos, id, huecoId, giro);
                if (res.estado === "girada") { efecto("resorte"); nodo.style.transform = ""; aplicarGiro(nodo, giro); return; }
                if (res.estado === "espera") {
                    nodo.style.transform = "";
                    if (r.tipo === "giro") aplicarGiro(nodo, giro);
                    if (r.error && !dijo) { dijo = true; decir(r.error); }
                    else efecto("suave");
                    return;
                }
                if (res.estado !== "bien" && res.estado !== "completo") {
                    nodo.style.transform = "";
                    if (r.tipo === "giro") aplicarGiro(nodo, giro);
                    efecto("suave");
                    return;
                }
                puestos = res.colocadas;
                const pieza = r.piezas.find(function (p) { return p.id === id; });
                const hueco = huecos[huecoId];
                nodo.classList.add("puesta");
                nodo.style.transform = "";
                if (pieza.resultado) {
                    hueco.innerHTML = "";
                    hueco.appendChild(crearImg(elemento(pieza.resultado).img));
                    nodo.remove();
                } else hueco.appendChild(nodo);
                hueco.classList.add("lleno");
                if (pieza.nota) efecto("nota", pieza.nota);
                else if (pieza.sonido) efecto(pieza.sonido);
                else efecto(r.tipo === "giro" ? "chasquido" : "iman");
                const c = centroDe(hueco);
                particulas(c.x, c.y);
                if (res.estado === "completo") { listo = true; cancelarAyuda(); resolve(); }
                else vigilar(ayuda, 6000);
            }
            Object.keys(nodos).forEach(function (id) {
                const nodo = nodos[id];
                nodo.addEventListener("pointerdown", function (ev) {
                    if (listo || nodo.classList.contains("puesta") || demoActiva || !vivo(gen)) return;
                    ev.preventDefault();
                    nodo.setPointerCapture(ev.pointerId);
                    nodo.classList.add("arrastrando");
                    const ox = ev.clientX;
                    const oy = ev.clientY;
                    let movio = false;
                    const base = nodo.style.transform || "";
                    function mover(e) {
                        const dx = e.clientX - ox;
                        const dy = e.clientY - oy;
                        if (Math.hypot(dx, dy) > 10) movio = true;
                        const rot = nodo.dataset.giro ? " rotate(" + nodo.dataset.giro + "deg)" : "";
                        nodo.style.transform = "translate(" + dx + "px," + dy + "px)" + rot;
                    }
                    function soltar(e) {
                        nodo.removeEventListener("pointermove", mover);
                        nodo.removeEventListener("pointerup", soltar);
                        nodo.classList.remove("arrastrando");
                        callar();
                        if (!movio && r.tipo === "giro") {
                            const g = L.girar(nodo.dataset.giro || 0);
                            aplicarGiro(nodo, g);
                            efecto("resorte");
                            return;
                        }
                        if (!movio && r.toqueColoca) {
                            const pieza = r.piezas.find(function (p) { return p.id === id; });
                            colocar(id, pieza.hueco);
                            return;
                        }
                        const zonas = Object.keys(huecos).map(function (hid) {
                            const c = centroDe(huecos[hid]);
                            return { id: hid, x: c.x, y: c.y };
                        });
                        const cerca = L.huecoMasCercano({ x: e.clientX, y: e.clientY }, zonas, L.RADIO);
                        if (!cerca) {
                            nodo.style.transform = base;
                            if (r.tipo === "giro") aplicarGiro(nodo, nodo.dataset.giro || 0);
                            return;
                        }
                        colocar(id, cerca);
                    }
                    nodo.addEventListener("pointermove", mover);
                    nodo.addEventListener("pointerup", soltar);
                });
            });
            vigilar(ayuda, 5000);
        });
        if (!vivo(gen)) return;
        if (r.festejo === "gato") { efecto("maullido"); lienzo.classList.add("brinca"); }
        else if (r.festejo === "luna") { efecto("arpa"); if (huecos.cielo) huecos.cielo.classList.add("encendida"); lienzo.classList.add("estrellas"); }
        else if (r.festejo === "vuelo") { efecto("viento"); lienzo.classList.add("eleva"); }
        else if (r.festejo === "casita") { efecto("recompensa"); lienzo.classList.add("casita-viva"); }
        else if (r.festejo === "arcoiris") { efecto("fanfarria"); lienzo.classList.add("arco-lleno"); }
        else if (r.festejo === "rayos") { efecto("fanfarria"); lienzo.classList.add("sonrie"); }
        else if (r.festejo === "brillo") { efecto("recompensa"); lienzo.classList.add("brilla"); }
        else efecto("recompensa");
        celebrar(true);
        particulas(centroDe(lienzo).x, centroDe(lienzo).y);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function iniciarReto(gen) {
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
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
        await retoPuzzle(r, gen);
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
        await PedniaTutorial.activarDemo();
        const t = textos();
        const est = $id("estacion");
        est.innerHTML = "";
        const caja = document.createElement("div");
        caja.className = "est-puz";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const hueco = document.createElement("div");
        hueco.className = "hueco";
        hueco.style.left = "50%";
        hueco.style.top = "46%";
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
        if (!vivo(gen) || !demoActiva) return;
        await PedniaTutorial.animarMano({
            punto: pieza, holdMs: 500,
            cancelado: function () { return !demoActiva || !vivo(gen); },
            onPresionar: function () {
                hueco.appendChild(pieza);
                pieza.classList.add("puesta");
                hueco.classList.add("lleno");
                efecto("iman");
                particulas(centroDe(hueco).x, centroDe(hueco).y);
            }
        });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 700 });
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 700 });
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        if (!vivo(gen)) return;
        est.innerHTML = "";
        iniciarReto(gen);
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
        if (!bruto || !introBruto) { console.error("[RompecabezasArtistico] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[RompecabezasArtistico]", errores);
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
