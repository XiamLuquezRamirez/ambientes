/* Encuentra las diferencias — Expresión Artística */
(function () {
    "use strict";

    const L = window.EncuentraLasDiferenciasLogica;
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
        const url = ruta.indexOf("?") === -1 ? ruta + "?v=20261027e" : ruta;
        xhr.open("GET", url, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.EncuentraLasDiferenciasSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261027e"; }
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
            { personaje: 1, texto: "¡Hola! Bienvenido a la galería de arte." },
            { personaje: 0, texto: "Hoy vamos a encontrar las diferencias." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-galeria", tema === "galeria");
        document.body.classList.toggle("tema-museo", tema === "museo");
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
    function crearHotspot(o, clase) {
        const z = document.createElement("button");
        z.type = "button";
        z.className = "hotspot" + (clase ? " " + clase : "");
        z.dataset.id = o.id;
        z.style.left = o.x + "%";
        z.style.top = o.y + "%";
        z.style.width = o.w + "%";
        z.style.height = o.h + "%";
        z.setAttribute("aria-label", o.id);
        return z;
    }
    function selloEn(marco, o) {
        const s = document.createElement("img");
        s.className = "sello-estrella";
        s.src = asset(elemento("estrella_sello").img || "img/estrella_sello.svg");
        s.alt = "";
        s.style.left = o.x + "%";
        s.style.top = o.y + "%";
        marco.appendChild(s);
        return s;
    }
    function festejarToque(efectoNombre, marco, o) {
        const map = {
            aparece: "destello", gira: "cristal", desaparece: "chispas", sello: "recompensa",
            vuela: "alarma", transforma: "arpa", laser: "laser", pixel: "teleport"
        };
        efecto(map[efectoNombre] || "destello");
        const c = centroDe(marco);
        if (o) {
            const r = marco.getBoundingClientRect();
            particulas(r.left + (o.x / 100) * r.width, r.top + (o.y / 100) * r.height);
            if (efectoNombre === "desaparece") {
                for (let i = 0; i < 8; i++) {
                    particulas(r.left + (o.x / 100) * r.width + (Math.random() - 0.5) * 40,
                        r.top + (o.y / 100) * r.height + (Math.random() - 0.5) * 40);
                }
            }
        } else particulas(c.x, c.y);
        reiniciarClase(marco, "marco-ok", 700);
    }
    function claveProgreso(encontrados) {
        return Object.keys(encontrados || {}).filter(function (k) { return encontrados[k]; }).sort().join("+");
    }
    function aplicarProgresoB(r, imgB, encontrados) {
        if (r.progresoB) {
            const clave = claveProgreso(encontrados);
            const id = r.progresoB[clave];
            if (id && elemento(id).img) {
                imgB.src = asset(elemento(id).img);
                return;
            }
        }
        if (L.retoCompleto(r, encontrados)) {
            const resuelto = r.cuadroBResuelto || r.cuadroResuelto || r.cuadroA;
            if (resuelto && elemento(resuelto).img) imgB.src = asset(elemento(resuelto).img);
        }
    }
    function selloAutentica(marco) {
        const s = document.createElement("img");
        s.className = "sello-autentica";
        s.src = asset(elemento("sello_autentica").img || "img/sello_autentica.svg");
        s.alt = "Obra Auténtica";
        marco.appendChild(s);
        return s;
    }

    function montarPareja(r) {
        const caja = document.createElement("div");
        caja.className = "est-diff";
        const fila = document.createElement("div");
        fila.className = "fila-cuadros";
        const marcoA = document.createElement("div");
        marcoA.className = "marco-cuadro marco-activo";
        const etiquetaA = document.createElement("span");
        etiquetaA.className = "etiqueta-cuadro";
        etiquetaA.textContent = "Cuadro Original";
        const imgA = crearImg(elemento(r.cuadroA).img, "img-cuadro");
        marcoA.appendChild(etiquetaA);
        marcoA.appendChild(imgA);
        const marcoB = document.createElement("div");
        marcoB.className = "marco-cuadro marco-activo";
        const etiquetaB = document.createElement("span");
        etiquetaB.className = "etiqueta-cuadro";
        etiquetaB.textContent = "Cuadro Travieso";
        const imgB = crearImg(elemento(r.cuadroB).img, "img-cuadro");
        marcoB.appendChild(etiquetaB);
        marcoB.appendChild(imgB);
        fila.appendChild(marcoA);
        fila.appendChild(marcoB);
        caja.appendChild(fila);
        return { caja: caja, marcoA: marcoA, marcoB: marcoB, imgA: imgA, imgB: imgB };
    }
    function montarUno(src) {
        const caja = document.createElement("div");
        caja.className = "est-diff";
        const fila = document.createElement("div");
        fila.className = "fila-cuadros fila-uno";
        const marco = document.createElement("div");
        marco.className = "marco-cuadro marco-activo marco-grande";
        const img = crearImg(src, "img-cuadro");
        marco.appendChild(img);
        fila.appendChild(marco);
        caja.appendChild(fila);
        return { caja: caja, marco: marco, img: img };
    }

    async function retoPareja(r, gen) {
        const ui = montarPareja(r);
        $id("estacion").appendChild(ui.caja);
        let encontrados = {};
        const hotspots = [];
        const marcosToque = (r.toqueEn === "ambos") ? [ui.marcoA, ui.marcoB] : [ui.marcoB];
        (r.objetivos || []).forEach(function (o) {
            marcosToque.forEach(function (m) {
                const z = crearHotspot(o);
                m.appendChild(z);
                hotspots.push(z);
            });
        });
        const hecho = new Promise(function (resolve) {
            function onToque(ev) {
                if (!vivo(gen) || demoActiva) return;
                ev.preventDefault();
                const marco = ev.currentTarget;
                const p = pctDesdeEvento(ev, marco);
                if (!p) return;
                const res = L.evaluarToque(r, encontrados, p.x, p.y);
                if (res.estado === "mal" || res.estado === "distractores") {
                    efecto("error");
                    reiniciarClase(marco, "marco-mal", 400);
                    callar();
                    decirLineas(r.error);
                    return;
                }
                encontrados = res.encontrados;
                cancelarAyuda();
                const obj = (r.objetivos || []).find(function (o) { return o.id === res.objetivo; });
                hotspots.forEach(function (h) {
                    if (h.dataset.id === res.objetivo) { h.classList.add("hallado"); h.disabled = true; }
                });
                if (obj) {
                    selloEn(ui.marcoB, obj);
                    if (marco === ui.marcoA) selloEn(ui.marcoA, obj);
                }
                if (r.efecto === "laser") reiniciarClase(ui.marcoB, "laser-verde", 600);
                festejarToque(r.efecto, ui.marcoB, obj);
                if (r.efecto === "gira") reiniciarClase(ui.imgB, "gira-cuadro", 700);
                aplicarProgresoB(r, ui.imgB, encontrados);
                if (res.estado === "completo") {
                    ui.marcoA.classList.add("resuelto");
                    ui.marcoB.classList.add("resuelto");
                    aplicarProgresoB(r, ui.imgB, encontrados);
                    if (r.selloAutentica) selloAutentica(ui.marcoB);
                    hotspots.forEach(function (h) { h.disabled = true; });
                    resolve();
                } else {
                    vigilar(function () {
                        const pendiente = hotspots.find(function (h) { return !h.classList.contains("hallado") && h.parentNode === ui.marcoB; });
                        return mano(pendiente);
                    }, 6000);
                }
            }
            marcosToque.forEach(function (m) { m.addEventListener("pointerdown", onToque); });
            vigilar(function () {
                const z = hotspots.find(function (h) { return h.parentNode === ui.marcoB; });
                return mano(z);
            }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function retoUnCuadro(r, gen) {
        const ui = montarUno(elemento(r.cuadro).img);
        $id("estacion").appendChild(ui.caja);
        let encontrados = {};
        const hotspots = [];
        (r.objetivos || []).forEach(function (o) {
            const z = crearHotspot(o);
            ui.marco.appendChild(z);
            hotspots.push(z);
        });
        const hecho = new Promise(function (resolve) {
            function onToque(ev) {
                if (!vivo(gen) || demoActiva) return;
                ev.preventDefault();
                const p = pctDesdeEvento(ev, ui.marco);
                if (!p) return;
                const res = L.evaluarToque(r, encontrados, p.x, p.y);
                if (res.estado === "mal" || res.estado === "distractores") {
                    efecto("error");
                    reiniciarClase(ui.marco, "marco-mal", 400);
                    callar();
                    decirLineas(r.error);
                    return;
                }
                encontrados = res.encontrados;
                cancelarAyuda();
                const obj = (r.objetivos || []).find(function (o) { return o.id === res.objetivo; });
                const zona = hotspots.find(function (h) { return h.dataset.id === res.objetivo; });
                if (zona) {
                    zona.classList.add("hallado", r.efecto === "vuela" ? "vuela-fuera" : "pixel-out");
                    zona.disabled = true;
                }
                if (obj) selloEn(ui.marco, obj);
                festejarToque(r.efecto, ui.marco, obj);
                if (r.cuadroResuelto && elemento(r.cuadroResuelto).img) {
                    setTimeout(function () {
                        if (vivo(gen)) ui.img.src = asset(elemento(r.cuadroResuelto).img);
                    }, r.efecto === "vuela" || r.efecto === "pixel" ? 500 : 0);
                }
                if (res.estado === "completo") {
                    ui.marco.classList.add("resuelto");
                    resolve();
                }
            }
            ui.marco.addEventListener("pointerdown", onToque);
            vigilar(function () { return mano(hotspots[0]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function retoMemoria(r, gen) {
        const ui = montarUno(elemento(r.cuadroAntes).img);
        $id("estacion").appendChild(ui.caja);
        const velo = document.createElement("div");
        velo.className = "velo-parpadeo";
        velo.hidden = true;
        ui.marco.appendChild(velo);
        ui.marco.classList.add("bloqueado");
        await decirLineas(r.consigna);
        if (!vivo(gen)) return;
        await sleep(r.observarMs || 5000);
        if (!vivo(gen)) return;
        velo.hidden = false;
        efecto("suave");
        await sleep(r.parpadeoMs || 2000);
        if (!vivo(gen)) return;
        ui.img.src = asset(elemento(r.cuadroDespues).img);
        velo.hidden = true;
        ui.marco.classList.remove("bloqueado");
        let encontrados = {};
        const hotspots = [];
        (r.objetivos || []).forEach(function (o) {
            const z = crearHotspot(o);
            ui.marco.appendChild(z);
            hotspots.push(z);
        });
        const hecho = new Promise(function (resolve) {
            function onToque(ev) {
                if (!vivo(gen) || demoActiva || ui.marco.classList.contains("bloqueado")) return;
                ev.preventDefault();
                const p = pctDesdeEvento(ev, ui.marco);
                if (!p) return;
                const res = L.evaluarToque(r, encontrados, p.x, p.y);
                if (res.estado === "mal" || res.estado === "distractores") {
                    efecto("error");
                    reiniciarClase(ui.marco, "marco-mal", 400);
                    callar();
                    decirLineas(r.error);
                    return;
                }
                encontrados = res.encontrados;
                cancelarAyuda();
                const obj = (r.objetivos || []).find(function (o) { return o.id === res.objetivo; });
                const zona = hotspots.find(function (h) { return h.dataset.id === res.objetivo; });
                if (zona) { zona.classList.add("hallado"); zona.disabled = true; }
                if (obj) selloEn(ui.marco, obj);
                festejarToque(r.efecto, ui.marco, obj);
                reiniciarClase(ui.img, "gira-cuadro", 700);
                if (r.cuadroResuelto && elemento(r.cuadroResuelto).img) {
                    ui.img.src = asset(elemento(r.cuadroResuelto).img);
                }
                if (res.estado === "completo") resolve();
            }
            ui.marco.addEventListener("pointerdown", onToque);
            vigilar(function () { return mano(hotspots[0]); }, 5000);
        });
        await hecho;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function jugarReto(r, gen) {
        if (["faltante", "color", "extra", "multi", "espejo"].indexOf(r.tipo) !== -1) return retoPareja(r, gen);
        if (r.tipo === "memoria") return retoMemoria(r, gen);
        if (r.tipo === "intruso" || r.tipo === "anacronismo") return retoUnCuadro(r, gen);
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
            const ui = montarPareja({
                cuadroA: "osito_completo",
                cuadroB: "osito_sin_pincel"
            });
            const zona = crearHotspot({ id: "demo", x: 66, y: 70, w: 20, h: 26 });
            ui.marcoB.appendChild(zona);
            est.appendChild(ui.caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: zona, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        zona.classList.add("hallado");
                        selloEn(ui.marcoB, { x: 66, y: 70 });
                        ui.imgB.src = asset(elemento("osito_completo").img);
                        efecto("destello");
                        particulas(centroDe(zona).x, centroDe(zona).y);
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
        if (!nivelElegido.cierreSoloTexto) {
            await decirLineas(nivelElegido.cierre, { estado: "acierto", minMs: 800 });
        } else {
            const primera = L.lineas(nivelElegido.cierre)[0];
            if (primera) pintarDialogo(primera.voz, primera.texto, "acierto");
            await sleep(900);
        }
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
        if (!bruto || !introBruto) { console.error("[EncuentraLasDiferencias] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[EncuentraLasDiferencias]", errores);
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
