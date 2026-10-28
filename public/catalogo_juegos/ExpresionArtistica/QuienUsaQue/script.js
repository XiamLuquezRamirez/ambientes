/* ¿Quién usa qué? — Expresión Artística */
(function () {
    "use strict";

    const L = window.QuienUsaQueLogica;
    const CACHE = "20261028a";
    const ESCALA = [523, 587, 659, 698, 784, 880, 988];
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
        xhr.open("GET", ruta + sep + "v=" + CACHE, false);
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
    function sfx() { return window.QuienUsaQueSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=" + CACHE; }
    function barajar(lista) {
        const a = (lista || []).slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }
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
            { personaje: 1, texto: "¡Bienvenido al taller de utilería del teatro!" },
            { personaje: 0, texto: "Hoy vamos a descubrir quién usa cada herramienta." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-taller", tema === "taller");
        document.body.classList.toggle("tema-laboratorio", tema === "laboratorio");
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
        demoActiva = false;
        cancelarAyuda();
        if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        if (sfx()) sfx().detener();
        aplicarTema(nivelElegido.tema);
        $id("estacion").innerHTML = "";
        const conc = $id("concierto");
        if (conc) conc.hidden = true;
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
    function puntoEnEl(ev, el) {
        if (!ev || !el) return false;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
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
        const map = {
            mano: "Mano", pecho: "Pecho", olla: "Olla",
            base: "Trípode", cuerpo: "Tubo", punta: "Lente",
            cielo: "Cielo estrellado", suelo: "Suelo"
        };
        return map[slot] || "";
    }
    function ponerZona(marco, zona, slot, extra) {
        const z = document.createElement("div");
        z.className = "zona-destino" + (extra ? " " + extra : "");
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
        marco.appendChild(z);
        return z;
    }
    function colocarPieza(marco, piezaId, zona, slot) {
        const put = crearImg(elemento(piezaId).img, "prenda-puesta" + (slot ? " slot-" + slot : ""));
        put.style.left = zona.x + "%";
        put.style.top = zona.y + "%";
        marco.appendChild(put);
        return put;
    }
    function enlazarArrastre(pieza, marco, onSoltar) {
        let arrastrando = false;
        let ox = 0;
        let oy = 0;
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
            const p = pctDesdeEvento(ev, marco);
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
    function fijarPieza(pieza) {
        pieza.disabled = true;
        pieza.style.visibility = "hidden";
    }
    function fallarPieza(pieza, lineasError, sonido) {
        efecto(sonido || "error");
        reiniciarClase(pieza, "mal", 450);
        if (lineasError) { callar(); decirLineas(lineasError); }
    }

    function poseArrastre(r, ui, put) {
        if (r.id === "pintora") {
            const lienzo = ui.espejo.querySelector(".lienzo");
            if (lienzo) lienzo.classList.add("pintado");
            if (put) put.classList.add("brilla");
        } else if (r.id === "doctor") {
            ui.espejo.classList.add("latido");
            const osito = ui.espejo.querySelector(".osito");
            if (osito) osito.classList.add("sonrie");
        } else if (r.id === "chef") {
            if (put) put.classList.add("revuelve");
            for (let i = 0; i < 6; i++) {
                const b = document.createElement("span");
                b.className = "burbuja";
                b.innerHTML = '<i class="fa-solid fa-heart"></i>';
                b.style.left = (58 + Math.random() * 18) + "%";
                b.style.top = (48 + Math.random() * 12) + "%";
                b.style.animationDelay = (i * 0.08) + "s";
                ui.espejo.appendChild(b);
            }
        } else if (r.id === "cantante") {
            if (put) put.classList.add("brilla");
            efecto("aplausos");
            for (let i = 0; i < 5; i++) {
                const n = document.createElement("span");
                n.className = "burbuja";
                n.innerHTML = '<i class="fa-solid fa-music"></i>';
                n.style.left = (40 + i * 8) + "%";
                n.style.top = "42%";
                n.style.color = "#ffd54f";
                n.style.animationDelay = (i * 0.07) + "s";
                ui.espejo.appendChild(n);
            }
        }
    }

    async function retoArrastre(r, gen) {
        const ui = montarEspejo(r.personaje);
        if (r.id === "pintora") {
            const lienzo = document.createElement("div");
            lienzo.className = "lienzo";
            ui.espejo.appendChild(lienzo);
        }
        if (r.id === "doctor") {
            const osito = document.createElement("div");
            osito.className = "osito";
            osito.setAttribute("aria-hidden", "true");
            ui.espejo.appendChild(osito);
        }
        $id("estacion").appendChild(ui.caja);
        const zona = ponerZona(ui.espejo, r.zonaDestino, r.slot);
        const piezas = {};
        barajar(r.opciones || []).forEach(function (id) {
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
                Object.keys(piezas).forEach(function (k) { fijarPieza(piezas[k]); });
                zona.classList.add("lleno");
                const put = colocarPieza(ui.espejo, r.correcta, r.zonaDestino, r.slot);
                poseArrastre(r, ui, put);
                efecto(r.efecto);
                particulas(centroDe(ui.espejo).x, centroDe(ui.espejo).y);
                resolve();
            }
            Object.keys(piezas).forEach(function (id) {
                enlazarArrastre(piezas[id], ui.espejo, function (piezaId, p, ev) {
                    if (!vivo(gen) || demoActiva || listo) return false;
                    const enZona = puntoEnEl(ev, zona);
                    let res = L.evaluarArrastre(r, piezaId, p && p.x, p && p.y);
                    if (res.correcta && res.estado === "fuera" && enZona) {
                        res = L.evaluarArrastre(r, piezaId, r.zonaDestino.x, r.zonaDestino.y);
                    }
                    if (res.estado === "mal") {
                        fallarPieza(piezas[id], r.error, r.efectoError || "error");
                        vigilar(function () { return mano(piezas[r.correcta]); }, 5000);
                        return false;
                    }
                    if (res.estado !== "completo") {
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

    async function retoEnsamblaje(r, gen) {
        const ui = montarEspejo(r.personaje);
        $id("estacion").appendChild(ui.caja);
        const zonas = {};
        (r.piezas || []).forEach(function (p) {
            const z = ponerZona(ui.espejo, p.zonaDestino, p.slot);
            z.dataset.pieza = p.id;
            zonas[p.id] = z;
        });
        const piezas = {};
        barajar(r.orden || []).forEach(function (id) {
            const btn = crearPieza(id);
            piezas[id] = btn;
            ui.bandeja.appendChild(btn);
        });
        let colocadas = {};
        const armado = new Promise(function (resolve) {
            Object.keys(piezas).forEach(function (id) {
                enlazarArrastre(piezas[id], ui.espejo, function (piezaId, p, ev) {
                    if (!vivo(gen) || demoActiva || colocadas[piezaId]) return false;
                    const meta = (r.piezas || []).filter(function (x) { return x.id === piezaId; })[0];
                    if (!meta) return false;
                    const zonaEl = zonas[meta.id];
                    const enZona = puntoEnEl(ev, zonaEl);
                    let res = L.evaluarEnsamblaje(r, piezaId, p && p.x, p && p.y, colocadas);
                    if (res.estado === "fuera" && enZona) {
                        res = L.evaluarEnsamblaje(r, piezaId, meta.zonaDestino.x, meta.zonaDestino.y, colocadas);
                    }
                    if (res.estado === "orden" || res.estado === "mal") {
                        fallarPieza(piezas[id], r.errorOrden, "error");
                        return false;
                    }
                    if (res.estado !== "progreso" && res.estado !== "armado") {
                        efecto("error");
                        return false;
                    }
                    colocadas = res.halladas;
                    fijarPieza(piezas[id]);
                    if (zonaEl) zonaEl.classList.add("lleno");
                    const put = colocarPieza(ui.espejo, meta.id, meta.zonaDestino, meta.slot);
                    efecto("destello");
                    particulas(centroDe(put).x, centroDe(put).y);
                    if (res.estado === "armado") {
                        cancelarAyuda();
                        resolve();
                    } else {
                        const sig = (r.orden || []).filter(function (pid) { return !colocadas[pid]; })[0];
                        vigilar(function () { return mano(piezas[sig]); }, 5000);
                    }
                    return true;
                });
            });
            vigilar(function () { return mano(piezas[r.orden[0]]); }, 5000);
        });
        decirLineas(r.consigna);
        await armado;
        if (!vivo(gen)) return;

        const zonaCielo = ponerZona(ui.espejo, r.apunte.zonas.cielo, "cielo", "zona-cielo");
        const zonaSuelo = ponerZona(ui.espejo, r.apunte.zonas.suelo, "suelo", "zona-suelo");
        const token = crearPieza("telescopio");
        ui.bandeja.appendChild(token);
        const apuntado = new Promise(function (resolve) {
            let listo = false;
            enlazarArrastre(token, ui.espejo, function (piezaId, p, ev) {
                if (!vivo(gen) || listo) return false;
                let destino = null;
                if (puntoEnEl(ev, zonaCielo) || (p && L.dentroPct(p.x, p.y, r.apunte.zonas.cielo))) destino = "cielo";
                else if (puntoEnEl(ev, zonaSuelo) || (p && L.dentroPct(p.x, p.y, r.apunte.zonas.suelo))) destino = "suelo";
                const res = L.evaluarApunte(r, destino);
                if (res.estado !== "completo") {
                    fallarPieza(token, destino ? r.errorApunte : null, "error");
                    return false;
                }
                listo = true;
                cancelarAyuda();
                fijarPieza(token);
                zonaCielo.classList.add("lleno");
                const haz = document.createElement("div");
                haz.className = "haz-laser";
                const galaxia = document.createElement("div");
                galaxia.className = "galaxia";
                ui.espejo.appendChild(haz);
                ui.espejo.appendChild(galaxia);
                efecto(r.efecto || "espacial");
                particulas(centroDe(zonaCielo).x, centroDe(zonaCielo).y);
                resolve();
                return true;
            });
            vigilar(function () { return mano(token); }, 4500);
        });
        decir({ voz: "zoe", texto: r.apunte.pregunta });
        await apuntado;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    function coordsPuntos(total) {
        const coords = [];
        for (let n = 1; n <= total; n++) {
            const ang = -Math.PI / 2 + (n - 1) * (2 * Math.PI / total);
            coords[n] = { x: 50 + Math.cos(ang) * 34, y: 48 + Math.sin(ang) * 34 };
        }
        return coords;
    }
    function puntoCercano(coords, p) {
        if (!p) return 0;
        let mejor = 0;
        let dist = 9;
        for (let n = 1; n < coords.length; n++) {
            const dx = coords[n].x - p.x;
            const dy = coords[n].y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < dist) { dist = d; mejor = n; }
        }
        return mejor;
    }
    function lineaSvg(svg, a, b, clase) {
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", a.x);
        ln.setAttribute("y1", a.y);
        ln.setAttribute("x2", b.x);
        ln.setAttribute("y2", b.y);
        ln.setAttribute("class", clase);
        svg.appendChild(ln);
        return ln;
    }

    async function retoUnirPuntos(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-esc";
        const muro = document.createElement("div");
        muro.className = "muro";
        const puerta = document.createElement("div");
        puerta.className = "puerta";
        muro.appendChild(puerta);
        const silueta = crearImg(elemento("lupa").img, "lupa-silueta");
        muro.appendChild(silueta);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "trazos");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");
        muro.appendChild(svg);
        const coords = coordsPuntos(r.puntos);
        const botones = {};
        for (let n = 1; n <= r.puntos; n++) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "punto";
            b.dataset.n = String(n);
            b.style.left = coords[n].x + "%";
            b.style.top = coords[n].y + "%";
            b.textContent = String(n);
            b.setAttribute("aria-label", "Punto " + n);
            muro.appendChild(b);
            botones[n] = b;
        }
        const glyph = crearImg(elemento("jeroglifico").img, "jeroglifico");
        glyph.style.left = r.jeroglifico.x + "%";
        glyph.style.top = r.jeroglifico.y + "%";
        glyph.style.width = r.jeroglifico.w + "%";
        glyph.style.height = r.jeroglifico.h + "%";
        muro.appendChild(glyph);
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        caja.appendChild(muro);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        const circuito = new Promise(function (resolve) {
            let ultimo = 0;
            let origen = 0;
            let viva = null;
            let listo = false;
            function ayudaSiguiente() {
                const n = ultimo === 0 ? 1 : ultimo + 1;
                vigilar(function () { return mano(botones[n] || botones[1]); }, 5000);
            }
            function seguir(ev) {
                if (!origen) return;
                const p = pctDesdeEvento(ev, muro);
                if (!p) return;
                if (viva) viva.remove();
                viva = lineaSvg(svg, coords[origen], p, "linea-viva");
            }
            function cortar() {
                document.removeEventListener("pointermove", seguir);
                document.removeEventListener("pointerup", soltar);
                document.removeEventListener("pointercancel", soltar);
            }
            muro.addEventListener("pointerdown", function (ev) {
                if (!vivo(gen) || listo || demoActiva || origen) return;
                const p = pctDesdeEvento(ev, muro);
                const n = puntoCercano(coords, p);
                if (!n) return;
                ev.preventDefault();
                origen = n;
                document.addEventListener("pointermove", seguir);
                document.addEventListener("pointerup", soltar);
                document.addEventListener("pointercancel", soltar);
                try { muro.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            });
            function soltar(ev) {
                if (!origen || listo) return;
                cortar();
                const desde = origen;
                origen = 0;
                if (viva) { viva.remove(); viva = null; }
                const p = pctDesdeEvento(ev, muro);
                const hasta = puntoCercano(coords, p);
                const res = L.evaluarUnion(ultimo, desde, hasta, r.puntos);
                if (res.estado === "mismo" || res.estado === "mal" || !hasta) return;
                if (res.estado === "salto") {
                    const roja = lineaSvg(svg, coords[desde], coords[hasta] || p, "trazo-mal");
                    efecto("error");
                    callar();
                    decirLineas(r.errorSalto);
                    setTimeout(function () { if (roja.parentNode) roja.remove(); }, 520);
                    ayudaSiguiente();
                    return;
                }
                ultimo = res.ultimo;
                lineaSvg(svg, coords[desde], coords[hasta], "trazo-ok");
                if (botones[desde]) botones[desde].classList.add("hecho");
                if (botones[hasta]) botones[hasta].classList.add("hecho");
                efecto("xilofono", { f: ESCALA[(hasta - 2) % ESCALA.length] });
                if (res.estado === "circuito") {
                    listo = true;
                    cancelarAyuda();
                    muro.classList.add("encendido");
                    resolve();
                } else ayudaSiguiente();
            }
            ayudaSiguiente();
        });
        decirLineas(r.consigna);
        await circuito;
        if (!vivo(gen)) return;

        const lupa = crearPieza("lupa");
        bandeja.appendChild(lupa);
        const hallado = new Promise(function (resolve) {
            let listo = false;
            enlazarArrastre(lupa, muro, function (piezaId, p, ev) {
                if (!vivo(gen) || listo) return false;
                const en = puntoEnEl(ev, glyph);
                let res = L.evaluarHallazgo(r.jeroglifico, p && p.x, p && p.y);
                if (res.estado === "fuera" && en) res = L.evaluarHallazgo(r.jeroglifico, r.jeroglifico.x, r.jeroglifico.y);
                if (res.estado !== "completo") {
                    efecto("error");
                    return false;
                }
                listo = true;
                cancelarAyuda();
                fijarPieza(lupa);
                glyph.classList.add("revelado");
                muro.classList.add("abierto");
                efecto("templo");
                particulas(centroDe(glyph).x, centroDe(glyph).y);
                resolve();
                return true;
            });
            vigilar(function () { return mano(lupa); }, 4000);
        });
        await hallado;
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function mostrarPatron(patron, tempo, manoBatuta, gen) {
        for (let i = 0; i < patron.length; i++) {
            if (!vivo(gen)) return;
            manoBatuta.classList.toggle("arriba", patron[i] === "arriba");
            manoBatuta.classList.toggle("abajo", patron[i] === "abajo");
            efecto("tambor");
            await sleep(tempo);
        }
        manoBatuta.classList.remove("arriba", "abajo");
    }

    async function retoBatuta(r, gen) {
        const caja = document.createElement("div");
        caja.className = "batuta-escena";
        const manoBatuta = document.createElement("div");
        manoBatuta.className = "batuta-mano";
        manoBatuta.appendChild(crearImg(elemento("batuta").img));
        const orquesta = document.createElement("div");
        orquesta.className = "orquesta";
        const chips = {};
        (r.rondas || []).forEach(function (ron) {
            const chip = document.createElement("span");
            chip.className = "chip-orquesta";
            chip.textContent = ron.instrumento === "bateria" ? "Batería" : (ron.instrumento === "trompetas" ? "Trompetas" : "Violines");
            orquesta.appendChild(chip);
            chips[ron.instrumento] = chip;
        });
        const fila = document.createElement("div");
        fila.className = "batuta-botones";
        const botones = {};
        (r.botones || []).forEach(function (b) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-batuta";
            btn.dataset.dir = b.id;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-arrow-' + (b.id === "arriba" ? "up" : "down") + '"></i> ' + b.etiqueta;
            fila.appendChild(btn);
            botones[b.id] = btn;
        });
        caja.appendChild(manoBatuta);
        caja.appendChild(orquesta);
        caja.appendChild(fila);
        $id("estacion").appendChild(caja);
        await decirLineas(r.consigna);
        if (!vivo(gen)) return;

        for (let i = 0; i < r.rondas.length; i++) {
            if (!vivo(gen)) return;
            const ron = r.rondas[i];
            let indice = 0;
            let superada = false;
            while (vivo(gen) && !superada) {
                Object.keys(botones).forEach(function (k) { botones[k].disabled = true; });
                await mostrarPatron(ron.patron, ron.tempoMs, manoBatuta, gen);
                if (!vivo(gen)) return;
                Object.keys(botones).forEach(function (k) { botones[k].disabled = false; });
                const primero = botones[ron.patron[0]];
                vigilar(function () { return mano(primero); }, 3500);
                superada = await new Promise(function (resolve) {
                    let idx = indice;
                    let cerradoLocal = false;
                    function limpiar() {
                        Object.keys(botones).forEach(function (k) {
                            botones[k].removeEventListener("pointerdown", alTocar);
                        });
                    }
                    function alTocar(ev) {
                        if (cerradoLocal || !vivo(gen)) return;
                        ev.preventDefault();
                        const dir = ev.currentTarget.dataset.dir;
                        reiniciarClase(ev.currentTarget, "toca", 180);
                        const res = L.evaluarBatuta(ron.patron, idx, dir);
                        if (res.estado === "mal") {
                            cerradoLocal = true;
                            limpiar();
                            cancelarAyuda();
                            Object.keys(botones).forEach(function (k) { botones[k].disabled = true; });
                            efecto("error");
                            callar();
                            decirLineas(r.casi).then(function () { resolve(false); });
                            return;
                        }
                        idx = res.indice;
                        efecto("tambor");
                        if (res.estado === "completo") {
                            cerradoLocal = true;
                            limpiar();
                            cancelarAyuda();
                            resolve(true);
                        } else {
                            vigilar(function () { return mano(botones[ron.patron[idx]]); }, 3500);
                        }
                    }
                    Object.keys(botones).forEach(function (k) {
                        botones[k].addEventListener("pointerdown", alTocar);
                    });
                });
                indice = 0;
            }
            if (!vivo(gen)) return;
            if (chips[ron.instrumento]) chips[ron.instrumento].classList.add("suma");
            efecto(ron.instrumento);
            await sleep(350);
        }
        if (!vivo(gen)) return;
        celebrar(true);
        efecto("fanfarria");
        await sleep(200);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function retoNotas(r, gen) {
        const wrap = document.createElement("div");
        wrap.className = "carriles-wrap";
        const pista = document.createElement("div");
        pista.className = "carriles";
        const carriles = [];
        (r.carriles || []).forEach(function (color, i) {
            const c = document.createElement("button");
            c.type = "button";
            c.className = "carril";
            c.dataset.carril = String(i);
            c.setAttribute("aria-label", "Carril " + color);
            const linea = document.createElement("span");
            linea.className = "linea-golpe";
            c.appendChild(linea);
            pista.appendChild(c);
            carriles.push(c);
        });
        wrap.appendChild(pista);
        $id("estacion").appendChild(wrap);
        await decirLineas(r.consigna);
        if (!vivo(gen)) return;

        let activa = null;
        function alTocar(ev) {
            if (!activa || !vivo(gen)) return;
            ev.preventDefault();
            const carril = Number(ev.currentTarget.dataset.carril);
            activa.cerrar(carril);
        }
        carriles.forEach(function (c) { c.addEventListener("pointerdown", alTocar); });

        let afinadas = 0;
        for (let i = 0; i < r.notas.length; i++) {
            if (!vivo(gen)) return;
            const nota = r.notas[i];
            const afinada = await new Promise(function (resolve) {
                const bola = document.createElement("span");
                bola.className = "nota-bola c" + nota.carril;
                bola.innerHTML = '<i class="fa-solid fa-music"></i>';
                carriles[nota.carril].appendChild(bola);
                let resuelta = false;
                const anim = bola.animate([{ top: "-14%" }, { top: "86%" }], { duration: 2200, easing: "linear", fill: "forwards" });
                function cerrar(carrilElegido) {
                    if (resuelta) return;
                    resuelta = true;
                    if (activa && activa.bola === bola) activa = null;
                    try { anim.cancel(); } catch (e) { /* noop */ }
                    const evn = L.evaluarNota(nota, carrilElegido);
                    bola.classList.add(evn.afinada ? "afinada" : "desafinada");
                    efecto(evn.sonido, { f: nota.f });
                    setTimeout(function () { if (bola.parentNode) bola.remove(); resolve(evn.afinada); }, 160);
                }
                activa = { bola: bola, cerrar: function (carril) { cerrar(carril); } };
                anim.onfinish = function () { if (!vivo(gen)) { resuelta = true; resolve(false); return; } cerrar(-1); };
                vigilar(function () { return mano(carriles[nota.carril]); }, 900);
            });
            const avance = L.avanzarPista(i, r.notas.length);
            if (afinada) afinadas += 1;
            if (avance.estado === "completo") break;
            await sleep(180);
        }
        cancelarAyuda();
        if (!vivo(gen)) return;
        const cierre = L.cierreMelodia(afinadas, r.notas.length);
        if (sfx() && sfx().melodia) sfx().melodia(r.notas.map(function (n) { return n.f; }), cierre.perfecta);
        await sleep(cierre.perfecta ? 1600 : 1400);
        if (!vivo(gen)) return;
        celebrar(true);
        await decirLineas(r.acierto, { estado: "acierto" });
        celebrar(false);
    }

    async function jugarReto(r, gen) {
        if (r.tipo === "arrastreHerramienta") return retoArrastre(r, gen);
        if (r.tipo === "ensamblaje") return retoEnsamblaje(r, gen);
        if (r.tipo === "unirPuntos") return retoUnirPuntos(r, gen);
        if (r.tipo === "ritmoBatuta") return retoBatuta(r, gen);
        if (r.tipo === "notasCarriles") return retoNotas(r, gen);
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
        if (!nivelElegido || nivelElegido.tema === "laboratorio") {
            demoActiva = true;
            let paso = false;
            try {
                if (window.PedniaTutorial && PedniaTutorial.activarDemo) await PedniaTutorial.activarDemo();
                await decir({ voz: "zoe", texto: textos().demostracionLab }, { minMs: 1100 });
                if (vivo(gen) && demoActiva) await decir({ voz: "zoe", texto: textos().demostracionFin }, { minMs: 700 });
                if (vivo(gen)) { paso = true; iniciarReto(gen); }
            } finally {
                demoActiva = false;
                if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
                if (!paso && vivo(gen)) iniciarReto(gen);
            }
            return;
        }
        const demo = gameConfig.demo || {};
        const el = elemento(demo.elemento);
        const reto = nivelElegido.retos[0];
        if (!el.img || !reto || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        let pasoAReto = false;
        try {
            await PedniaTutorial.activarDemo();
            const t = textos();
            const est = $id("estacion");
            est.innerHTML = "";
            const ui = montarEspejo(demo.personaje || reto.personaje);
            const lienzo = document.createElement("div");
            lienzo.className = "lienzo";
            ui.espejo.appendChild(lienzo);
            const buena = crearPieza(demo.elemento);
            const distractor = crearPieza(demo.distractor || "saxofon");
            ui.bandeja.appendChild(buena);
            ui.bandeja.appendChild(distractor);
            const zona = ponerZona(ui.espejo, reto.zonaDestino, reto.slot);
            est.appendChild(ui.caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: buena, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        buena.classList.add("correcta");
                        zona.classList.add("lleno");
                        const put = colocarPieza(ui.espejo, demo.elemento, reto.zonaDestino, reto.slot);
                        if (put) put.classList.add("brilla");
                        lienzo.classList.add("pintado");
                        efecto("pincelada");
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
        await decirLineas(nivelElegido.desfile, { minMs: 900 });
        await sleep(1200);
        if (gen !== rondaGen) return;
        juegoTerminado = true;
        celebrar(true);
        efecto("fanfarria");
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
        const introBruto = readText("../../intro.json");
        if (!bruto || !introBruto) { console.error("[QuienUsaQue] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[QuienUsaQue]", errores);
        const btn = $id("btn-empecemos");
        if (btn) {
            btn.addEventListener("pointerdown", function (ev) { ev.preventDefault(); empecemosJuego(); });
            btn.addEventListener("click", empecemosJuego);
        }
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: [textos().eligeNivel, textos().demostracion, textos().demostracionAcierto, textos().demostracionFin, textos().demostracionLab].filter(Boolean)
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
