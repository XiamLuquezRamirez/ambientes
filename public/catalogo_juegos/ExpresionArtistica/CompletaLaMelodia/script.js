/* Completa la melodía — Expresión Artística */
(function () {
    "use strict";

    const L = window.CompletaMelodiaLogica;
    const COLORES = ["#ef5350", "#ffca28", "#66bb6a", "#42a5f5", "#ab47bc", "#ffb74d"];
    const VOLUMEN_FONDO_ESCUCHA = 0;

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
    let atacar = null;

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
    function escenaUrl(id) { return (gameConfig.escenas || {})[id] || ""; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.CompletaMelodiaSfx || null; }
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
        if (btn) btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            setMenuVol($id("menu-vol-panel") && $id("menu-vol-panel").hidden);
        });
        const cerrar = $id("btn-cerrar-vol");
        if (cerrar) cerrar.addEventListener("click", function () { setMenuVol(false); });
        if (slider) slider.addEventListener("input", function () {
            if (val) val.textContent = slider.value;
            aplicarVolumenCalibrado(Number(slider.value));
        });
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
            let audio = audioCache[ruta];
            if (!audio) { audio = new Audio(ruta); audioCache[ruta] = audio; }
            else { try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ } }
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
        document.body.classList.toggle("tema-estudio", tema === "estudio");
        document.body.classList.toggle("tema-estacion", tema !== "estudio");
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
        const colores = (window.INTRO_CONFIG.dialogo.colores) || {};
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            const id = Number(linea.personaje) === 1 ? "zoe" : "zeus";
            return { personaje: id, nombre: id === "zoe" ? "Zoe" : "Zeus", color: colores[id] || "#8ec5ff", texto: String(linea.texto || "") };
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
            if (window.__introPhaser) { try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ } window.__introPhaser = null; }
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
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        asegurarAudioFondo();
        if (typeof TextoVoz !== "undefined") TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        $("#principal").css("display", "flex").hide().fadeIn(800);
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: (gameConfig && gameConfig.niveles) || [],
                elegirManual: elegirNivel,
                onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
            });
        } else elegirNivel();
    }
    function empecemosJuego() {
        const pantalla = $id("pantalla-inicio");
        const btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        let oculto = false;
        const ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) { if (ev.animationName === "inicioDisuelve") ocultar(); });
        setTimeout(ocultar, 1250);
    }
    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };
    function asegurarAudioFondo() {
        if (audioFondo) { const p = audioFondo.play(); if (p && p.catch) p.catch(function () {}); return audioFondo; }
        const vol = (typeof TextoVoz !== "undefined" && TextoVoz.VOLUMEN_FONDO != null) ? TextoVoz.VOLUMEN_FONDO : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios && gameConfig.audios.fondo, vol, true);
    }
    function atenuarFondo(si) {
        if (typeof TextoVoz === "undefined") { if (audioFondo) audioFondo.volume = si ? 0 : volumenFondoPct() / 100; return; }
        TextoVoz.volumenFondo(si ? VOLUMEN_FONDO_ESCUCHA : TextoVoz.VOLUMEN_FONDO);
    }
    function animar(el, frames, opts) {
        if (!el || typeof el.animate !== "function") return Promise.resolve(null);
        const o = Object.assign({ duration: 400, easing: "ease", fill: "forwards" }, opts || {});
        let a;
        try { a = el.animate(frames, o); } catch (e) { return Promise.resolve(null); }
        return Promise.race([a.finished.catch(function () {}), sleep(o.duration + 400)]);
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
    function particulas(x, y, n) {
        const capa = $id("capa-efectos");
        if (!capa) return;
        for (let i = 0; i < (n || 10); i++) {
            const p = document.createElement("span");
            p.className = "particula";
            p.innerHTML = '<i class="fa-solid fa-music"></i>';
            p.style.color = COLORES[i % COLORES.length];
            p.style.left = x + "px";
            p.style.top = y + "px";
            capa.appendChild(p);
            const ang = Math.random() * Math.PI * 2;
            const dist = 70 + Math.random() * 80;
            animar(p, [
                { transform: "translate(-50%,-50%)", opacity: 1 },
                { transform: "translate(calc(-50% + " + Math.cos(ang) * dist + "px), calc(-50% + " + Math.sin(ang) * dist + "px))", opacity: 0 }
            ], { duration: 800 }).then(function () { p.remove(); });
        }
    }
    function cambiarEscena(id) {
        const url = escenaUrl(id);
        const imgs = Array.prototype.slice.call(document.querySelectorAll("#escena-fondo .escena-capa"));
        const actual = imgs.find(function (i) { return i.classList.contains("activa"); }) || imgs[0];
        const destino = asset(url);
        if (!url || !actual || (actual.getAttribute("src") === destino && actual.classList.contains("activa"))) return;
        const sig = imgs.find(function (i) { return i !== actual; });
        if (!sig) return;
        let hecho = false;
        const mostrar = function () {
            if (hecho) return;
            hecho = true;
            sig.classList.add("activa");
            actual.classList.remove("activa");
        };
        sig.onload = mostrar;
        sig.onerror = mostrar;
        sig.src = destino;
        setTimeout(mostrar, 600);
    }
    function efecto(nombre) { if (sfx()) sfx().sonar(nombre); }
    function tocarEvento(ev, timbre) { if (sfx() && ev) sfx().tocar(ev, timbre); }

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
        dialogo.classList.remove("pop");
        void dialogo.offsetWidth;
        dialogo.classList.add("pop");
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
        const respaldo = setTimeout(mostrar, 4000);
        let p = null;
        try { if (typeof TextoVoz !== "undefined") p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar }); } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 700)]),
            sleep(12000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }
    function callar() { tokenDialogo += 1; if (typeof TextoVoz !== "undefined") TextoVoz.detener(); }
    async function decirLineas(x, opts) {
        const lista = L.lineas(x);
        for (let i = 0; i < lista.length; i++) await decir(lista[i], opts);
    }
    function elegirNivel() {
        let botones = "";
        gameConfig.niveles.forEach(function (nivel, i) {
            const color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id + '\')"><strong>' + nivel.edad + "</strong><br><small>" + nivel.titulo + "</small></button></div>";
        });
        if (typeof TextoVoz !== "undefined") TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, scrollbarPadding: false, width: 440
        });
    }
    function lineasDelNivel(nivel) {
        const lista = [];
        const sumar = function (x) { L.lineas(x).forEach(function (l) { lista.push({ texto: l.texto, personaje: l.voz }); }); };
        (nivel.retos || []).forEach(function (r) { sumar(r.consigna); sumar(r.turno); sumar(r.acierto); sumar(r.error); });
        sumar(nivel.cierre);
        return lista;
    }
    function mostrarIntroActiva() {
        return window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro;
    }
    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        const gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        atacar = null;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        if (sfx()) sfx().detener();
        if (typeof TextoVoz !== "undefined" && TextoVoz.encolarFrases) TextoVoz.encolarFrases(lineasDelNivel(nivelElegido));
        aplicarTema(nivelElegido.tema);
        $id("escenario").className = "escenario edad-" + nivelElegido.id;
        $id("estacion").innerHTML = "";
        $id("estacion").style.visibility = "";
        cambiarEscena(nivelElegido.escena);
        pintarProgreso(-1);
        if (!vivo(gen)) return;
        if (mostrarIntroActiva()) iniciarDemo(gen);
        else iniciarReto(gen);
    };
    function pintarProgreso(actual) {
        const cont = $id("progreso");
        const total = (nivelElegido.retos || []).length;
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
    function celebrarPersonajes(si) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) { const pj = $id(id); if (pj) pj.classList.toggle("celebra", !!si); });
    }
    function crearPad(id, grande) {
        const el = elemento(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pad" + (grande ? " grande" : "");
        b.dataset.id = id;
        b.setAttribute("aria-label", el.nombre || id);
        b.appendChild(crearImg(el.img));
        return b;
    }
    function cancelarAyuda() {
        clearTimeout(ayuda.timer);
        ayuda = { timer: null, fn: null };
        if (window.PedniaTutorial) PedniaTutorial.quitarManos();
    }
    function vigilarInactividad(fn, ms) {
        clearTimeout(ayuda.timer);
        ayuda.fn = fn;
        ayuda.timer = setTimeout(function () { if (ayuda.fn === fn) Promise.resolve(fn()); }, ms || 7000);
    }
    function manoTocar(el) {
        if (!window.PedniaTutorial || !el) return Promise.resolve();
        const fn = ayuda.fn;
        return PedniaTutorial.animarMano({ punto: el, holdMs: 420, cancelado: function () { return ayuda.fn !== fn; } });
    }

    async function reproducirFrase(eventos, pasoMs, timbre, gen, pasos) {
        atenuarFondo(true);
        for (let i = 0; i < eventos.length; i++) {
            if (!vivo(gen)) break;
            if (pasos && pasos[i]) pasos[i].classList.add("sono");
            tocarEvento(eventos[i], timbre);
            await sleep(pasoMs || 450);
        }
        atenuarFondo(false);
        await sleep(220);
    }

    function armarEscena(r) {
        const caja = document.createElement("div");
        caja.className = "est-mel";
        if (r.adorno) caja.appendChild(crearImg(elemento(r.adorno).img, "adorno"));
        if (r.extra) {
            const extra = crearImg(elemento(r.extra).img, "extra" + (r.extraOculto ? " oculto" : ""));
            extra.id = "extra-reto";
            caja.appendChild(extra);
        }
        return caja;
    }

    function marcarFrase(caja, eventos) {
        const fila = document.createElement("div");
        fila.className = "frase";
        eventos.forEach(function () {
            const s = document.createElement("span");
            s.className = "paso";
            fila.appendChild(s);
        });
        const vacio = document.createElement("span");
        vacio.className = "paso vacio falta";
        fila.appendChild(vacio);
        caja.appendChild(fila);
        return { fila: fila, pasos: fila.querySelectorAll(".paso:not(.vacio)"), vacio: vacio };
    }

    async function retoToque(r, gen) {
        const caja = armarEscena(r);
        const frase = marcarFrase(caja, r.intro);
        const boton = crearPad(r.boton, true);
        const controles = document.createElement("div");
        controles.className = "controles";
        controles.appendChild(boton);
        caja.appendChild(controles);
        $id("estacion").appendChild(caja);
        await decirLineas(r.consigna);
        if (!vivo(gen)) return;
        await reproducirFrase(r.intro, r.pasoMs, r.timbre, gen, frase.pasos);
        if (!vivo(gen)) return;
        frase.vacio.classList.add("falta");
        boton.classList.add("listo");
        if (r.turno) decir(r.turno);
        await new Promise(function (resolve) {
            const fin = function () { atacar = null; cancelarAyuda(); resolve(); };
            atacar = function (id) {
                if (!vivo(gen)) return;
                callar();
                const res = L.evaluarToque(r.boton, id);
                if (res.estado !== "completo") return;
                boton.classList.add("ok");
                tocarEvento(r.cierre, r.timbre);
                frase.vacio.classList.add("sono");
                frase.vacio.classList.remove("falta");
                fin();
            };
            boton.addEventListener("pointerdown", function (ev) {
                ev.preventDefault();
                if (atacar) atacar(boton.dataset.id);
            });
            vigilarInactividad(function () { return manoTocar(boton); }, 5000);
        });
        if (!vivo(gen)) return;
        festejar(r, caja);
        celebrarPersonajes(true);
        await sleep(350);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoOpcion(r, gen) {
        const caja = armarEscena(r);
        const frase = marcarFrase(caja, r.intro);
        const controles = document.createElement("div");
        controles.className = "controles";
        const botones = {};
        r.opciones.forEach(function (op) {
            const b = crearPad(op.id, false);
            controles.appendChild(b);
            botones[op.id] = b;
        });
        caja.appendChild(controles);
        $id("estacion").appendChild(caja);
        await decirLineas(r.consigna);
        if (!vivo(gen)) return;
        await reproducirFrase(r.intro, r.pasoMs, r.timbre, gen, frase.pasos);
        if (!vivo(gen)) return;
        frase.vacio.classList.add("falta");
        await new Promise(function (resolve) {
            let cerradoLocal = false;
            const ayudaTurno = function () {
                const buena = r.opciones.find(function (o) { return o.correcto; });
                return manoTocar(botones[buena.id]);
            };
            function enlazar() {
                Object.keys(botones).forEach(function (id) {
                    botones[id].classList.add("listo");
                    botones[id].onclick = function () {
                        if (cerradoLocal || !vivo(gen)) return;
                        callar();
                        const op = r.opciones.find(function (o) { return o.id === id; });
                        if (op && op.preview) tocarEvento(op.preview, r.timbre);
                        const res = L.evaluarOpcion(r.opciones, id);
                        if (res.estado !== "completo") {
                            botones[id].classList.add("falla");
                            efecto("suave");
                            decir(r.error).then(function () { if (!cerradoLocal) vigilarInactividad(ayudaTurno, 4000); });
                            return;
                        }
                        cerradoLocal = true;
                        cancelarAyuda();
                        botones[id].classList.add("ok");
                        frase.vacio.classList.add("sono");
                        resolve();
                    };
                });
            }
            enlazar();
            vigilarInactividad(ayudaTurno, 5000);
        });
        if (!vivo(gen)) return;
        if (r.completa) await reproducirFrase(r.completa, r.pasoMs, r.timbre, gen, null);
        festejar(r, caja);
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    function celdasDe(r) {
        if (r.fijas) return r.fijas;
        return (r.intro || []).map(function (ev) { return ev; }).concat([null]);
    }

    async function retoArrastre(r, gen) {
        const caja = armarEscena(r);
        const huecosFila = document.createElement("div");
        huecosFila.className = "huecos";
        const huecos = [];
        let indiceHueco = 0;
        celdasDe(r).forEach(function (ev) {
            const h = document.createElement("div");
            h.className = "hueco";
            if (ev) {
                h.classList.add("lleno");
                const mini = document.createElement("span");
                mini.className = "paso sono";
                h.appendChild(mini);
            } else {
                h.dataset.hueco = String(indiceHueco);
                h.classList.add("falta");
                indiceHueco += 1;
                huecos.push(h);
            }
            huecosFila.appendChild(h);
        });
        const bandeja = document.createElement("div");
        bandeja.className = "controles";
        const piezas = {};
        r.piezas.forEach(function (id) {
            const p = crearPad(id, false);
            p.classList.add("pieza");
            bandeja.appendChild(p);
            piezas[id] = p;
        });
        caja.appendChild(huecosFila);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);
        let llenos = r.solucion.map(function () { return null; });

        await decirLineas(r.consigna);
        if (!vivo(gen)) return;
        await reproducirFrase(r.intro, r.pasoMs, r.timbre, gen, null);
        if (!vivo(gen)) return;
        if (r.turno) decir(r.turno);

        await new Promise(function (resolve) {
            let cerradoLocal = false;
            function siguienteVacio() {
                for (let i = 0; i < llenos.length; i++) if (!llenos[i]) return i;
                return 0;
            }
            function colocar(id, indice, pieza) {
                if (cerradoLocal || !vivo(gen)) return;
                callar();
                const res = L.evaluarEncaje(r.solucion, llenos, id, indice);
                if (res.estado === "mal" || res.estado === "ocupado") {
                    pieza.style.transform = "";
                    reiniciarClase(pieza, "falla", 450);
                    efecto("suave");
                    return;
                }
                llenos = res.llenos;
                pieza.classList.add("puesta", "ok");
                pieza.style.transform = "";
                huecos[indice].classList.add("lleno");
                huecos[indice].classList.remove("falta");
                huecos[indice].appendChild(pieza);
                const nota = notaDePieza(id);
                if (nota) tocarEvento({ nota: nota }, r.timbre);
                if (res.estado === "completo") {
                    cerradoLocal = true;
                    cancelarAyuda();
                    resolve();
                } else vigilarInactividad(ayudaTurno, 6000);
            }
            function notaDePieza(id) {
                if (id.indexOf("sol") !== -1) return "sol4";
                if (id.indexOf("re") !== -1) return "re4";
                if (id.indexOf("mi") !== -1) return "mi4";
                if (id.indexOf("fa") !== -1) return "fa4";
                return null;
            }
            function ayudaTurno() {
                const i = siguienteVacio();
                return manoTocar(piezas[r.solucion[i]]);
            }
            function soltarEn(pieza, x, y) {
                pieza.classList.remove("arrastrando");
                let destino = -1;
                huecos.forEach(function (h, i) {
                    const rect = h.getBoundingClientRect();
                    if (x >= rect.left - 36 && x <= rect.right + 36 && y >= rect.top - 36 && y <= rect.bottom + 36) destino = i;
                });
                if (destino < 0) { pieza.style.transform = ""; return; }
                colocar(pieza.dataset.id, destino, pieza);
            }
            Object.keys(piezas).forEach(function (id) {
                const pieza = piezas[id];
                pieza.addEventListener("pointerdown", function (ev) {
                    if (pieza.classList.contains("puesta") || demoActiva || cerradoLocal) return;
                    ev.preventDefault();
                    pieza.setPointerCapture(ev.pointerId);
                    pieza.classList.add("arrastrando");
                    const ox = ev.clientX;
                    const oy = ev.clientY;
                    function mover(e) {
                        pieza.style.transform = "translate(" + (e.clientX - ox) + "px," + (e.clientY - oy) + "px)";
                    }
                    function soltar(e) {
                        pieza.removeEventListener("pointermove", mover);
                        pieza.removeEventListener("pointerup", soltar);
                        soltarEn(pieza, e.clientX, e.clientY);
                    }
                    pieza.addEventListener("pointermove", mover);
                    pieza.addEventListener("pointerup", soltar);
                });
                if (huecos.length === 1) {
                    pieza.addEventListener("click", function () {
                        if (!pieza.classList.contains("puesta")) colocar(id, 0, pieza);
                    });
                }
            });
            vigilarInactividad(ayudaTurno, 5000);
        });
        if (!vivo(gen)) return;
        if (r.completa) await reproducirFrase(r.completa, r.pasoMs, r.timbre, gen, null);
        else if (r.cierre) tocarEvento(r.cierre, r.timbre);
        festejar(r, caja);
        celebrarPersonajes(true);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    function festejar(r, caja) {
        const extra = caja.querySelector(".extra");
        const adorno = caja.querySelector(".adorno");
        if (r.festejo === "puerta") {
            if (adorno) adorno.classList.add("abierta");
            if (extra) { extra.classList.remove("oculto"); reiniciarClase(extra, "saluda", 700); }
            efecto("recompensa");
        } else if (r.festejo === "arcoiris" || r.festejo === "escala") efecto("arcoiris");
        else if (r.festejo === "vuelo") {
            if (extra) { extra.classList.remove("oculto"); reiniciarClase(extra, "vuela", 1100); }
            efecto("recompensa");
        } else if (r.festejo === "tren" || r.festejo === "himno") efecto("fanfarria");
        else if (r.festejo === "violin") efecto("recompensa");
        else if (r.festejo === "fuegos") {
            efecto("fanfarria");
            efecto("chispas");
            const c = centroDe(caja);
            particulas(c.x, c.y, 18);
        }
        const c = centroDe(caja);
        particulas(c.x, c.y - 20, 12);
    }

    const RETOS = { toque: retoToque, opcion: retoOpcion, arrastre: retoArrastre };

    async function iniciarReto(gen) {
        if (window.PedniaTutorial && PedniaTutorial.soltarVozDemo) PedniaTutorial.soltarVozDemo();
        if (!vivo(gen)) return;
        const r = nivelElegido.retos[indiceReto];
        if (!r) { granCierre(gen); return; }
        cancelarAyuda();
        atacar = null;
        celebrarPersonajes(false);
        pintarProgreso(indiceReto);
        const est = $id("estacion");
        est.className = "estacion reto-" + r.tipo;
        est.innerHTML = "";
        est.style.opacity = "";
        await sleep(250);
        if (!vivo(gen)) return;
        await RETOS[r.tipo](r, gen);
        if (!vivo(gen)) return;
        cancelarAyuda();
        pintarProgreso(indiceReto + 1);
        await sleep(450);
        if (!vivo(gen)) return;
        await animar(est, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
        est.innerHTML = "";
        est.getAnimations().forEach(function (a) { a.cancel(); });
        est.style.opacity = "";
        indiceReto += 1;
        iniciarReto(gen);
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }
    async function iniciarDemo(gen) {
        const d = gameConfig.demo || {};
        const el = elemento(d.elemento);
        if (!el.img || !window.PedniaTutorial) { iniciarReto(gen); return; }
        demoActiva = true;
        await PedniaTutorial.activarDemo();
        const t = textos();
        const est = $id("estacion");
        est.innerHTML = "";
        const boton = crearPad(d.elemento, true);
        est.appendChild(boton);
        await decir({ voz: "zoe", texto: t.demostracion }, { minMs: 1400 });
        if (!vivo(gen) || !demoActiva) return;
        tocarEvento({ nota: "do4" }, "xilofono");
        await sleep(420);
        tocarEvento({ nota: "re4" }, "xilofono");
        await sleep(420);
        boton.classList.add("listo");
        await PedniaTutorial.animarMano({
            punto: boton, holdMs: 460,
            cancelado: function () { return !demoActiva || !vivo(gen); },
            onPresionar: function () {
                tocarEvento({ nota: "mi4" }, "xilofono");
                const c = centroDe(boton);
                particulas(c.x, c.y, 8);
            }
        });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 800 });
        await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 800 });
        detenerDemo();
        if (!vivo(gen)) return;
        est.innerHTML = "";
        iniciarReto(gen);
    }

    async function concierto(gen) {
        const estacion = nivelElegido.tema === "estacion";
        const ids = estacion ? ["tren", "vagon", "perro", "pajaro"] : ["violin", "nota_sol", "gran_acorde"];
        $id("estacion").style.visibility = "hidden";
        const tarima = $id("concierto-tarima");
        tarima.innerHTML = "";
        ids.forEach(function (id) {
            const d = document.createElement("div");
            d.className = "concierto-item";
            d.appendChild(crearImg(elemento(id).img));
            tarima.appendChild(d);
        });
        const caja = $id("concierto");
        caja.hidden = false;
        caja.setAttribute("aria-hidden", "false");
        await sleep(400);
        if (gen !== rondaGen) return;
        celebrarPersonajes(true);
        atenuarFondo(true);
        if (estacion) {
            tocarEvento({ golpe: "chucu" });
            await sleep(280);
            tocarEvento({ golpe: "silbato" });
        } else {
            await reproducirFrase([{ nota: "do4" }, { nota: "re4" }, { nota: "mi4" }, { nota: "fa4" }, { nota: "sol4" }], 280, "violin", gen, null);
            tocarEvento({ golpe: "gran" });
        }
        atenuarFondo(false);
        efecto(estacion ? "celebracion" : "fanfarria");
        await sleep(700);
    }
    async function granCierre(gen) {
        juegoTerminado = true;
        cancelarAyuda();
        atacar = null;
        await sleep(200);
        if (gen !== rondaGen) return;
        await concierto(gen);
        if (gen !== rondaGen) return;
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
            trofeo.addEventListener("click", function () {
                trofeo.classList.add("quieta");
                reiniciarClase(trofeo, "gira", 1000);
                efecto("chispas");
            });
        }
        reproducirAudio(gameConfig.audios && gameConfig.audios.cierre, 0.9, false);
        if (ins.sonido) setTimeout(function () { efecto(ins.sonido); }, 2400);
        setTimeout(function () {
            const cajaFinal = $id("final");
            if (cajaFinal) { cajaFinal.hidden = false; cajaFinal.style.display = "block"; }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
        }, 400);
    }

    $(document).ready(function () {
        const bruto = readText("config.json");
        const introBruto = readText("../../intro.json");
        if (!bruto || !introBruto) { console.error("[CompletaLaMelodia] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const nivelSesion = nivelDeSesion();
        if (nivelSesion) aplicarTema(nivelSesion.tema);
        cambiarEscena((nivelSesion || gameConfig.niveles[0] || {}).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[CompletaLaMelodia] config:", errores);
        const btn = $id("btn-empecemos");
        if (btn) btn.addEventListener("click", empecemosJuego);
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: [textos().eligeNivel, textos().demostracion, textos().demostracionAcierto, textos().demostracionFin].filter(Boolean)
            });
        } catch (e) { console.warn("[CompletaLaMelodia] voz:", e); }
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        sincronizarDialogoIntro3d();
        const btnOmitir = $id("btn-omitir-intro3d");
        if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
        const btnContinuar = $id("btn-continuar-intro3d");
        if (btnContinuar) btnContinuar.addEventListener("click", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
