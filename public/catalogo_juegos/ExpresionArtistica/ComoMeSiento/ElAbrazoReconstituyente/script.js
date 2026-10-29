/* Como me siento — Expresión Artística */
(function () {
    "use strict";

    const L = window.ComoMeSientoLogica;
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
    function sfx() { return window.ComoMeSientoSfx || null; }
    function asset(url) { return !url || url.indexOf("?v=") !== -1 ? url : url + "?v=20261027i"; }
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
            { personaje: 1, texto: "¡Hola! Bienvenido al camerino de teatro mágico." },
            { personaje: 0, texto: "Hoy vamos a descubrir cómo nos sentimos." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-camerino", tema === "camerino");
        document.body.classList.toggle("tema-escenario", tema === "escenario");
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
    function particulas(x, y, tipo) {
        const capa = $id("capa-efectos");
        if (!capa) return;
        const kind = tipo || "estrella";
        const n = kind === "serpentina" ? 16 : 12;
        for (let i = 0; i < n; i++) {
            const p = document.createElement("span");
            p.className = "particula particula-" + kind;
            if (kind === "sol") p.innerHTML = '<i class="fa-solid fa-sun"></i>';
            else if (kind === "nube") p.innerHTML = '<i class="fa-solid fa-cloud"></i>';
            else if (kind === "serpentina") p.innerHTML = "";
            else p.innerHTML = '<i class="fa-solid fa-star"></i>';
            if (kind === "serpentina") {
                p.style.background = ["#ef5350", "#42a5f5", "#ffca28", "#66bb6a", "#ab47bc"][i % 5];
            }
            p.style.left = x + "px";
            p.style.top = y + "px";
            capa.appendChild(p);
            const ang = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 100;
            if (p.animate) {
                p.animate([
                    { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
                    { transform: "translate(calc(-50% + " + Math.cos(ang) * dist + "px), calc(-50% + " + Math.sin(ang) * dist + "px)) rotate(" + (kind === "serpentina" ? 180 : 40) + "deg)", opacity: 0 }
                ], { duration: kind === "serpentina" ? 1100 : 800 }).finished.then(function () { p.remove(); }).catch(function () { p.remove(); });
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
    function festejarEmocion(efectoNombre, el) {
        const map = {
            soles: "destello", nube: "suave", abrazo: "arpa", confeti: "fanfarria",
            calma: "arpa", luz: "destello", fiesta: "celebracion", flor: "cristal"
        };
        const partMap = {
            soles: "sol", nube: "nube", abrazo: "estrella", confeti: "serpentina",
            calma: "estrella", luz: "sol", fiesta: "serpentina", flor: "estrella"
        };
        efecto(map[efectoNombre] || "destello");
        const tipoPart = partMap[efectoNombre] || "estrella";
        if (el) particulas(centroDe(el).x, centroDe(el).y, tipoPart);
        else {
            const c = $id("estacion");
            if (c) particulas(centroDe(c).x, centroDe(c).y, tipoPart);
        }
        if (efectoNombre === "confeti") {
            const c = $id("estacion");
            if (c) particulas(centroDe(c).x, centroDe(c).y - 40, "serpentina");
        }
    }
    function montarLuces(espejo) {
        const luces = document.createElement("div");
        luces.className = "espejo-luces";
        luces.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 12; i++) {
            const b = document.createElement("span");
            b.className = "luz-bulbo";
            b.style.setProperty("--i", String(i));
            luces.appendChild(b);
        }
        espejo.appendChild(luces);
        return luces;
    }
    function montarHotspots(espejo) {
        const ojos = document.createElement("button");
        ojos.type = "button";
        ojos.className = "hotspot hotspot-ojos";
        ojos.setAttribute("aria-label", "Ojos del personaje");
        const boca = document.createElement("button");
        boca.type = "button";
        boca.className = "hotspot hotspot-boca";
        boca.setAttribute("aria-label", "Boca del personaje");
        espejo.appendChild(ojos);
        espejo.appendChild(boca);
        function toque(zona) {
            if (zona === "ojos") { efecto("suave"); reiniciarClase(espejo, "guiña", 450); }
            else { efecto("risa"); reiniciarClase(espejo, "mueca", 500); }
            particulas(centroDe(zona === "ojos" ? ojos : boca).x, centroDe(zona === "ojos" ? ojos : boca).y, "estrella");
        }
        ojos.addEventListener("pointerdown", function (ev) {
            if (demoActiva) return;
            ev.preventDefault();
            ev.stopPropagation();
            toque("ojos");
        });
        boca.addEventListener("pointerdown", function (ev) {
            if (demoActiva) return;
            ev.preventDefault();
            ev.stopPropagation();
            toque("boca");
        });
        return { ojos: ojos, boca: boca };
    }
    function montarEscena(escenaId, opts) {
        opts = opts || {};
        const caja = document.createElement("div");
        caja.className = "est-emo";
        const espejo = document.createElement("div");
        espejo.className = "espejo";
        if (opts.animacionEscena) espejo.classList.add("anim-" + opts.animacionEscena);
        montarLuces(espejo);
        const img = crearImg(elemento(escenaId).img, "img-escena");
        espejo.appendChild(img);
        const hot = montarHotspots(espejo);
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja-caras";
        caja.appendChild(espejo);
        caja.appendChild(bandeja);
        return { caja: caja, espejo: espejo, img: img, bandeja: bandeja, ojos: hot.ojos, boca: hot.boca };
    }
    async function invitacionImitacion(r, ui, gen) {
        const inv = r.invitarImitacion;
        if (!inv || !vivo(gen)) return;
        const zona = inv.zona === "ojos" ? ui.ojos : ui.boca;
        if (!zona) return;
        const pista = document.createElement("p");
        pista.className = "pista-abrazo pista-imitacion";
        pista.textContent = inv.pista || "Toca la cara del personaje e imita su emoción";
        ui.caja.appendChild(pista);
        zona.classList.add("hotspot-pide");
        const meta = Math.max(1, Number(inv.toques) || 2);
        await new Promise(function (resolve) {
            let n = 0;
            function onTap(ev) {
                if (!vivo(gen)) return;
                ev.preventDefault();
                ev.stopPropagation();
                n += 1;
                if (inv.zona === "ojos") { efecto("suspiro"); reiniciarClase(ui.espejo, "respirando", 700); }
                else { efecto("ohh"); reiniciarClase(ui.espejo, "mueca", 500); }
                particulas(centroDe(zona).x, centroDe(zona).y, inv.zona === "ojos" ? "estrella" : "sol");
                if (n >= meta) {
                    zona.classList.remove("hotspot-pide");
                    zona.removeEventListener("pointerdown", onTap);
                    pista.remove();
                    cancelarAyuda();
                    resolve();
                }
            }
            zona.addEventListener("pointerdown", onTap);
            vigilar(function () { return mano(zona); }, 4500);
        });
    }
    function crearTarjeta(op) {
        const id = L.idOpcion(op);
        const el = elemento(id);
        const nombre = L.nombreOpcion(op, gameConfig.elementos);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tarjeta-cara";
        btn.dataset.id = id;
        btn.setAttribute("aria-label", nombre || id);
        btn.appendChild(crearImg(el.img));
        const lab = document.createElement("span");
        lab.className = "tarjeta-nombre";
        lab.textContent = nombre || id;
        btn.appendChild(lab);
        return btn;
    }
    function aplicarEscenaResuelta(r, ui) {
        if (r.escenaResuelta && elemento(r.escenaResuelta).img) {
            ui.img.src = asset(elemento(r.escenaResuelta).img);
        }
        if (r.animacionAcierto === "pirueta") reiniciarClase(ui.espejo, "pirueta", 900);
        else reiniciarClase(ui.espejo, "celebra-escena", 700);
    }

    async function retoElegir(r, gen, conAccionExtra) {
        const ui = montarEscena(r.escena, { animacionEscena: r.animacionEscena });
        $id("estacion").appendChild(ui.caja);
        const tarjetas = {};
        (r.opciones || []).forEach(function (op) {
            const id = L.idOpcion(op);
            const t = crearTarjeta(op);
            tarjetas[id] = t;
            ui.bandeja.appendChild(t);
        });
        const hecho = new Promise(function (resolve) {
            Object.keys(tarjetas).forEach(function (id) {
                tarjetas[id].addEventListener("pointerdown", function (ev) {
                    if (!vivo(gen) || demoActiva) return;
                    ev.preventDefault();
                    const res = L.evaluarEleccion(r, id);
                    if (res.estado !== "bien") {
                        efecto("error");
                        reiniciarClase(tarjetas[id], "mal", 450);
                        callar();
                        decirLineas(r.error);
                        return;
                    }
                    cancelarAyuda();
                    Object.keys(tarjetas).forEach(function (k) { tarjetas[k].disabled = true; });
                    tarjetas[id].classList.add("correcta");
                    festejarEmocion(r.efecto, tarjetas[id]);
                    if (!conAccionExtra) aplicarEscenaResuelta(r, ui);
                    resolve(id);
                });
            });
            vigilar(function () { return mano(tarjetas[r.correcta]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        if (conAccionExtra) {
            ui.bandeja.innerHTML = "";
            await conAccionExtra(ui, gen);
            if (!vivo(gen)) return;
        }
        celebrar(true);
        efecto("fanfarria");
        await sleep(250);
        await decirLineas(r.acierto, { estado: "acierto" });
        if (r.invitarImitacion) await invitacionImitacion(r, ui, gen);
        celebrar(false);
    }

    async function accionAbrazo(r, ui, gen) {
        if (r.despuesAcierto) await decirLineas(r.despuesAcierto);
        if (!vivo(gen)) return;
        ui.espejo.classList.add("abrazo-zona");
        const pista = document.createElement("p");
        pista.className = "pista-abrazo";
        pista.textContent = "Desliza el dedo sobre el conejito";
        ui.caja.appendChild(pista);
        await new Promise(function (resolve) {
            let dibujando = false;
            let recorrido = 0;
            let last = null;
            function fin() {
                if (!dibujando) return;
                dibujando = false;
                if (recorrido > 80) {
                    ui.espejo.classList.remove("abrazo-zona");
                    pista.remove();
                    if (r.escenaResuelta && elemento(r.escenaResuelta).img) {
                        ui.img.src = asset(elemento(r.escenaResuelta).img);
                    }
                    festejarEmocion("abrazo", ui.espejo);
                    resolve();
                }
            }
            function move(ev) {
                if (!dibujando || !vivo(gen)) return;
                const p = { x: ev.clientX, y: ev.clientY };
                if (last) recorrido += Math.hypot(p.x - last.x, p.y - last.y);
                last = p;
                if (recorrido > 80) fin();
            }
            ui.espejo.addEventListener("pointerdown", function (ev) {
                if (!vivo(gen) || demoActiva) return;
                ev.preventDefault();
                dibujando = true;
                recorrido = 0;
                last = { x: ev.clientX, y: ev.clientY };
                try { ui.espejo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            });
            ui.espejo.addEventListener("pointermove", move);
            ui.espejo.addEventListener("pointerup", fin);
            ui.espejo.addEventListener("pointercancel", fin);
            vigilar(function () { return mano(ui.espejo); }, 4500);
        });
    }

    async function accionArrastre(r, ui, gen) {
        if (r.despuesAcierto) await decirLineas(r.despuesAcierto);
        else if (r.herramienta) {
            const pista = document.createElement("p");
            pista.className = "pista-abrazo";
            pista.textContent = "Arrastra " + (elemento(r.herramienta).nombre || "la herramienta") + " hacia la escena";
            ui.caja.appendChild(pista);
        }
        if (!vivo(gen)) return;
        ui.bandeja.innerHTML = "";
        const zona = document.createElement("div");
        zona.className = "zona-destino";
        zona.style.left = r.zonaDestino.x + "%";
        zona.style.top = r.zonaDestino.y + "%";
        zona.style.width = r.zonaDestino.w + "%";
        zona.style.height = r.zonaDestino.h + "%";
        ui.espejo.appendChild(zona);
        const herramienta = document.createElement("button");
        herramienta.type = "button";
        herramienta.className = "herramienta";
        herramienta.appendChild(crearImg(elemento(r.herramienta).img));
        herramienta.setAttribute("aria-label", elemento(r.herramienta).nombre || "herramienta");
        ui.bandeja.appendChild(herramienta);
        await new Promise(function (resolve) {
            let arrastrando = false;
            let ox = 0, oy = 0;
            function soltar(ev) {
                if (!arrastrando) return;
                arrastrando = false;
                herramienta.classList.remove("arrastrando");
                const p = pctDesdeEvento(ev, ui.espejo);
                const res = p ? L.evaluarArrastre(r, p.x, p.y) : { estado: "mal" };
                if (res.estado === "completo") {
                    cancelarAyuda();
                    herramienta.style.visibility = "hidden";
                    zona.classList.add("lleno");
                    zona.hidden = true;
                    aplicarEscenaResuelta(r, ui);
                    festejarEmocion(r.efecto, ui.espejo);
                    Promise.resolve(r.feedbackAccion ? decirLineas(r.feedbackAccion) : null)
                        .then(function () { resolve(); });
                } else {
                    herramienta.style.left = "";
                    herramienta.style.top = "";
                    herramienta.style.position = "";
                    efecto("error");
                }
            }
            herramienta.addEventListener("pointerdown", function (ev) {
                if (!vivo(gen) || demoActiva) return;
                ev.preventDefault();
                arrastrando = true;
                herramienta.classList.add("arrastrando");
                const br = herramienta.getBoundingClientRect();
                ox = ev.clientX - br.left;
                oy = ev.clientY - br.top;
                herramienta.style.position = "fixed";
                herramienta.style.left = (ev.clientX - ox) + "px";
                herramienta.style.top = (ev.clientY - oy) + "px";
                herramienta.style.zIndex = "40";
                try { herramienta.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            });
            herramienta.addEventListener("pointermove", function (ev) {
                if (!arrastrando) return;
                herramienta.style.left = (ev.clientX - ox) + "px";
                herramienta.style.top = (ev.clientY - oy) + "px";
            });
            herramienta.addEventListener("pointerup", soltar);
            herramienta.addEventListener("pointercancel", soltar);
            vigilar(function () { return mano(herramienta); }, 5000);
        });
    }

    async function retoMedidor(r, gen) {
        const ui = montarEscena(r.escena);
        $id("estacion").appendChild(ui.caja);
        ui.bandeja.classList.add("bandeja-medidor");
        const wrap = document.createElement("div");
        wrap.className = "emocionometro";
        const etiqueta = document.createElement("p");
        etiqueta.className = "medidor-etiqueta";
        etiqueta.textContent = (r.niveles[0] && r.niveles[0].etiqueta) || "";
        const rango = document.createElement("input");
        rango.type = "range";
        rango.min = "1";
        rango.max = String((r.niveles || []).length || 3);
        rango.step = "1";
        rango.value = "1";
        rango.className = "medidor-rango";
        rango.setAttribute("aria-label", "Emociómetro");
        const ticks = document.createElement("div");
        ticks.className = "medidor-ticks";
        (r.niveles || []).forEach(function (n) {
            const s = document.createElement("span");
            s.textContent = String(n.id);
            ticks.appendChild(s);
        });
        wrap.appendChild(etiqueta);
        wrap.appendChild(rango);
        wrap.appendChild(ticks);
        ui.bandeja.appendChild(wrap);
        function pintarNivelMedidor(val) {
            const n = (r.niveles || []).find(function (x) { return String(x.id) === String(val); });
            etiqueta.textContent = (n && n.etiqueta) || "";
            ui.espejo.dataset.nivel = String(val);
            if (n && n.escena && elemento(n.escena).img) {
                ui.img.src = asset(elemento(n.escena).img);
            }
            ui.espejo.classList.toggle("anim-saltitos", Number(val) >= 3);
        }
        pintarNivelMedidor(1);
        let listo = false;
        const hecho = new Promise(function (resolve) {
            function intentarCompletar(desdeInput) {
                if (listo || !vivo(gen) || demoActiva) return;
                const res = L.evaluarMedidor(r, Number(rango.value));
                if (res.estado === "completo") {
                    listo = true;
                    cancelarAyuda();
                    rango.disabled = true;
                    pintarNivelMedidor(rango.value);
                    festejarEmocion(r.efecto, ui.espejo);
                    reiniciarClase(ui.espejo, "fiesta", 900);
                    resolve();
                    return;
                }
                if (desdeInput && (res.estado === "casi" || res.estado === "mal") && Number(rango.value) > 1) {
                    efecto("error");
                    reiniciarClase(wrap, "mal", 450);
                    callar();
                    decirLineas(r.error);
                }
            }
            rango.addEventListener("input", function () {
                pintarNivelMedidor(rango.value);
                if (r.completarAlLlegar && L.evaluarMedidor(r, Number(rango.value)).estado === "completo") {
                    intentarCompletar(false);
                }
            });
            rango.addEventListener("change", function () { intentarCompletar(true); });
            vigilar(function () {
                rango.value = String(r.nivelCorrecto);
                rango.dispatchEvent(new Event("input"));
                intentarCompletar(false);
                return Promise.resolve();
            }, 7000);
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
        if (r.tipo === "elegir") return retoElegir(r, gen, null);
        if (r.tipo === "elegirAbrazo") {
            return retoElegir(r, gen, function (ui, g) { return accionAbrazo(r, ui, g); });
        }
        if (r.tipo === "elegirArrastre") {
            return retoElegir(r, gen, function (ui, g) { return accionArrastre(r, ui, g); });
        }
        if (r.tipo === "medidor") return retoMedidor(r, gen);
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
            const ui = montarEscena("zoe_alegre");
            const feliz = crearTarjeta("cara_feliz");
            const triste = crearTarjeta("cara_triste");
            ui.bandeja.appendChild(feliz);
            ui.bandeja.appendChild(triste);
            est.appendChild(ui.caja);
            await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1200 });
            if (vivo(gen) && demoActiva) {
                await PedniaTutorial.animarMano({
                    punto: feliz, holdMs: 500,
                    cancelado: function () { return !demoActiva || !vivo(gen); },
                    onPresionar: function () {
                        feliz.classList.add("correcta");
                        efecto("destello");
                        particulas(centroDe(feliz).x, centroDe(feliz).y);
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
    async function fiestaMuecas(gen) {
        const muecas = [
            { id: "cara_feliz", nombre: "Feliz" },
            { id: "cara_enojada", nombre: "Enojado" },
            { id: "cara_triste", nombre: "Triste" },
            { id: "cara_sorprendida", nombre: "Sorprendido" }
        ];
        const tarima = $id("concierto-tarima");
        const conc = $id("concierto");
        tarima.innerHTML = "";
        conc.classList.add("interactivo");
        conc.hidden = false;
        await decir({
            voz: "zoe",
            texto: "¡Fiesta de las muecas! Toca cada emoción frente al espejo mágico: feliz, enojado, triste y sorprendido."
        }, { minMs: 900 });
        if (gen !== rondaGen) return;
        await new Promise(function (resolve) {
            let hechas = 0;
            muecas.forEach(function (m) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "mueca-btn";
                btn.setAttribute("aria-label", m.nombre);
                btn.appendChild(crearImg(elemento(m.id).img));
                const lab = document.createElement("span");
                lab.textContent = m.nombre;
                btn.appendChild(lab);
                btn.addEventListener("pointerdown", function (ev) {
                    if (!vivo(gen) || btn.classList.contains("hecha")) return;
                    ev.preventDefault();
                    btn.classList.add("hecha");
                    hechas += 1;
                    festejarEmocion("confeti", btn);
                    if (hechas >= muecas.length) {
                        cancelarAyuda();
                        resolve();
                    }
                });
                tarima.appendChild(btn);
            });
            vigilar(function () {
                const pendiente = tarima.querySelector(".mueca-btn:not(.hecha)");
                return mano(pendiente);
            }, 5000);
        });
        conc.classList.remove("interactivo");
    }

    async function granCierre(gen) {
        cancelarAyuda();
        const tarima = $id("concierto-tarima");
        const conc = $id("concierto");
        tarima.innerHTML = "";
        conc.classList.remove("interactivo");
        if (!nivelElegido.cierreSoloTexto) {
            await fiestaMuecas(gen);
            if (gen !== rondaGen) return;
        } else {
            (nivelElegido.galeria || []).forEach(function (id) {
                const m = document.createElement("div");
                m.className = "marco-mini";
                m.appendChild(crearImg(elemento(id).img));
                tarima.appendChild(m);
            });
            conc.hidden = false;
            await sleep(500);
        }
        if (gen !== rondaGen) return;
        juegoTerminado = true;
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
        if (!bruto || !introBruto) { console.error("[ComoMeSiento] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ComoMeSiento]", errores);
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
