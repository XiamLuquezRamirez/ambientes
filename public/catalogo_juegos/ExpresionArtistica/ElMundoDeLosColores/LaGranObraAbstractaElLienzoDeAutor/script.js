/* El mundo de los colores — Expresión Artística */
(function () {
    "use strict";

    const L = window.ElMundoDeLosColoresLogica;
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
    function sfx() { return window.ElMundoDeLosColoresSfx || null; }
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
            { personaje: 1, texto: "¡Hola! Bienvenido al estudio de arte colorido." },
            { personaje: 0, texto: "Hoy vamos a mezclar pinturas y jugar con colores." }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle("tema-laboratorio", tema === "laboratorio");
        document.body.classList.toggle("tema-estudio", tema !== "laboratorio");
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
    function colorDe(id) {
        const e = elemento(id);
        return (e && e.color) || id.replace(/^gota_|^bote_|^mancha_/, "").replace(/a$/, "") || id;
    }
    function imgColor(color) {
        const map = {
            rojo: "gota_roja", azul: "gota_azul", amarillo: "gota_amarilla", verde: "gota_verde",
            naranja: "gota_naranja", morado: "gota_morada", marron: "gota_marron"
        };
        return elemento(map[color] || "gota_roja").img;
    }

    function festejar(tipo, lienzo) {
        if (tipo === "mezcla" || tipo === "laboratorio") efecto("mezcla");
        else if (tipo === "huellas") efecto("xilofono");
        else if (tipo === "clasifica") efecto("bocina");
        else if (tipo === "salpicadura" || tipo === "abstracto") { efecto("destello"); efecto("aplausos"); if (lienzo) lienzo.classList.add("marco-dorado"); }
        else if (tipo === "temperatura") efecto("recompensa");
        else if (tipo === "volumen") efecto("recompensa");
        else efecto("recompensa");
        celebrar(true);
        if (lienzo) particulas(centroDe(lienzo).x, centroDe(lienzo).y);
    }

    function arrastrarGota(nodo, onSoltar) {
        nodo.addEventListener("pointerdown", function (ev) {
            if (nodo.classList.contains("mezclada") || demoActiva) return;
            ev.preventDefault();
            try { nodo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            nodo.classList.add("arrastrando");
            const ox = ev.clientX, oy = ev.clientY;
            const left0 = parseFloat(nodo.dataset.x) || 50;
            const top0 = parseFloat(nodo.dataset.y) || 50;
            function mover(e) {
                const lienzo = nodo.parentElement;
                if (!lienzo) return;
                const r = lienzo.getBoundingClientRect();
                const nx = ((e.clientX - r.left) / r.width) * 100;
                const ny = ((e.clientY - r.top) / r.height) * 100;
                nodo.style.left = nx + "%";
                nodo.style.top = ny + "%";
            }
            function soltar(e) {
                nodo.removeEventListener("pointermove", mover);
                nodo.removeEventListener("pointerup", soltar);
                nodo.removeEventListener("pointercancel", soltar);
                nodo.classList.remove("arrastrando");
                callar();
                onSoltar(e, nodo, { ox: ox, oy: oy, left0: left0, top0: top0 });
            }
            nodo.addEventListener("pointermove", mover);
            nodo.addEventListener("pointerup", soltar);
            nodo.addEventListener("pointercancel", soltar);
        });
    }

    async function retoMezcla(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const paleta = document.createElement("div");
        paleta.className = "paleta-fondo";
        paleta.appendChild(crearImg(elemento("paleta").img));
        lienzo.appendChild(paleta);
        const gotasIds = r.gotas || ["gota_azul", "gota_amarilla", "gota_roja"];
        const posiciones = [{ x: 28, y: 40 }, { x: 72, y: 40 }, { x: 50, y: 72 }];
        const nodos = [];
        gotasIds.forEach(function (id, i) {
            const g = document.createElement("div");
            g.className = "gota";
            g.dataset.id = id;
            g.dataset.color = colorDe(id);
            g.dataset.x = String(posiciones[i].x);
            g.dataset.y = String(posiciones[i].y);
            g.style.left = posiciones[i].x + "%";
            g.style.top = posiciones[i].y + "%";
            g.appendChild(crearImg(elemento(id).img));
            lienzo.appendChild(g);
            nodos.push(g);
        });
        const resultado = document.createElement("div");
        resultado.className = "resultado-gota";
        lienzo.appendChild(resultado);
        caja.appendChild(lienzo);
        $id("estacion").appendChild(caja);

        let hechos = 0;
        const meta = r.meta || 1;
        const hecho = new Promise(function (resolve) {
            function resetGotas() {
                resultado.classList.remove("visible");
                resultado.innerHTML = "";
                nodos.forEach(function (n) {
                    n.classList.remove("mezclada");
                    n.style.left = n.dataset.x + "%";
                    n.style.top = n.dataset.y + "%";
                });
            }
            function intentarMezcla(a, b) {
                const clave = L.claveMezcla(a.dataset.color, b.dataset.color);
                const res = L.resultadoMezcla(a.dataset.color, b.dataset.color);
                const mezcla = (r.mezclas || []).find(function (m) {
                    return L.claveMezcla(m.a, m.b) === clave;
                });
                if (!res || !mezcla) {
                    a.style.left = a.dataset.x + "%";
                    a.style.top = a.dataset.y + "%";
                    efecto("suave");
                    return;
                }
                a.classList.add("mezclada");
                b.classList.add("mezclada");
                const tw = document.createElement("div");
                tw.className = "torbellino";
                tw.style.background = "radial-gradient(circle, " + L.hexDe(res) + ", transparent)";
                lienzo.appendChild(tw);
                setTimeout(function () { tw.remove(); }, 650);
                resultado.innerHTML = "";
                resultado.appendChild(crearImg(imgColor(res)));
                resultado.classList.add("visible");
                efecto("mezcla");
                particulas(centroDe(resultado).x, centroDe(resultado).y);
                // El acierto del reto habla del verde: cuenta solo azul+amarillo (primera mezcla).
                const objetivo = r.mezclas[0];
                const esObjetivo = objetivo && L.claveMezcla(objetivo.a, objetivo.b) === clave;
                if (esObjetivo) {
                    hechos += 1;
                    if (hechos >= meta) { cancelarAyuda(); resolve(); return; }
                }
                setTimeout(resetGotas, 900);
            }
            nodos.forEach(function (nodo) {
                arrastrarGota(nodo, function (e, yo) {
                    if (yo.classList.contains("mezclada")) return;
                    const c = centroDe(yo);
                    let pareja = null;
                    nodos.forEach(function (otra) {
                        if (otra === yo || otra.classList.contains("mezclada")) return;
                        if (L.distancia(c, centroDe(otra)) <= L.RADIO) pareja = otra;
                    });
                    if (!pareja) {
                        yo.style.left = yo.dataset.x + "%";
                        yo.style.top = yo.dataset.y + "%";
                        return;
                    }
                    intentarMezcla(yo, pareja);
                });
            });
            vigilar(function () { return mano(nodos[0]); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("mezcla", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoHuellas(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const arbol = document.createElement("div");
        arbol.className = "arbol-base";
        arbol.appendChild(crearImg(elemento("arbol_pelado").img));
        lienzo.appendChild(arbol);
        const zona = document.createElement("div");
        zona.className = "zona-arbol";
        lienzo.appendChild(zona);
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const bote = document.createElement("button");
        bote.type = "button";
        bote.className = "bote-pintura";
        bote.appendChild(crearImg(elemento("bote_rojo").img));
        bandeja.appendChild(bote);
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let untado = false;
        let count = 0;
        const meta = r.meta || 6;
        const hecho = new Promise(function (resolve) {
            bote.addEventListener("click", function () {
                if (demoActiva || !vivo(gen)) return;
                callar();
                untado = true;
                bote.classList.add("activo");
                lienzo.classList.add("dedo-pintado");
                efecto("suave");
            });
            zona.addEventListener("pointerdown", function (ev) {
                if (!untado || demoActiva || !vivo(gen)) return;
                ev.preventDefault();
                callar();
                const rect = lienzo.getBoundingClientRect();
                const flor = document.createElement("div");
                flor.className = "huella-flor";
                flor.style.left = ((ev.clientX - rect.left) / rect.width * 100) + "%";
                flor.style.top = ((ev.clientY - rect.top) / rect.height * 100) + "%";
                flor.appendChild(crearImg(elemento("flor_roja").img));
                lienzo.appendChild(flor);
                efecto("huella");
                count += 1;
                if (count >= meta) { cancelarAyuda(); resolve(); }
            });
            vigilar(function () { return mano(untado ? zona : bote); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("huellas", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoClasifica(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const tren = document.createElement("div");
        tren.className = "tren-fondo";
        tren.appendChild(crearImg(elemento("tren").img));
        lienzo.appendChild(tren);
        const vagones = document.createElement("div");
        vagones.className = "vagones";
        const huecos = {};
        ["rojo", "amarillo", "azul"].forEach(function (c) {
            const v = document.createElement("div");
            v.className = "vagon";
            v.dataset.color = c;
            v.dataset.id = c;
            vagones.appendChild(v);
            huecos[c] = v;
        });
        lienzo.appendChild(vagones);
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
                const res = L.evaluarClasifica(r, puestos, id, huecoId);
                const nodo = nodos[id];
                if (res.estado !== "bien" && res.estado !== "completo") {
                    nodo.style.transform = "";
                    efecto("error");
                    return;
                }
                puestos = res.colocadas;
                nodo.classList.add("puesta");
                nodo.style.transform = "";
                huecos[huecoId].appendChild(nodo);
                huecos[huecoId].classList.add("lleno");
                efecto("bocina");
                particulas(centroDe(huecos[huecoId]).x, centroDe(huecos[huecoId]).y);
                if (res.estado === "completo") { cancelarAyuda(); resolve(); }
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
                        const zonas = Object.keys(huecos).map(function (hid) {
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
        festejar("clasifica", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoSalpicadura(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo noche";
        caja.appendChild(lienzo);
        $id("estacion").appendChild(caja);
        let count = 0;
        const meta = r.meta || 8;
        const colores = r.colores || ["fucsia", "turquesa", "neon"];
        const hecho = new Promise(function (resolve) {
            lienzo.addEventListener("pointerdown", function (ev) {
                if (demoActiva || !vivo(gen)) return;
                ev.preventDefault();
                callar();
                const rect = lienzo.getBoundingClientRect();
                const s = document.createElement("span");
                s.className = "salpicadura";
                const col = L.hexDe(colores[count % colores.length]);
                s.style.background = col;
                s.style.color = col;
                s.style.left = ((ev.clientX - rect.left) / rect.width * 100) + "%";
                s.style.top = ((ev.clientY - rect.top) / rect.height * 100) + "%";
                s.style.width = (18 + Math.random() * 28) + "px";
                s.style.height = s.style.width;
                lienzo.appendChild(s);
                efecto("salpicadura");
                count += 1;
                if (count >= meta) { cancelarAyuda(); resolve(); }
            });
            vigilar(function () { return mano(lienzo); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar(r.tipo, lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoLaboratorio(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const wrap = document.createElement("div");
        wrap.className = "estaciones";
        const estaciones = {};
        ["A", "B"].forEach(function (id) {
            const est = document.createElement("div");
            est.className = "estacion-mezcla";
            est.dataset.id = id;
            const etiqueta = document.createElement("span");
            etiqueta.className = "estacion-etiqueta";
            etiqueta.textContent = "Estación " + id;
            est.appendChild(etiqueta);
            const vaso = document.createElement("div");
            vaso.className = "vaso";
            vaso.appendChild(crearImg(elemento("vaso").img));
            est.appendChild(vaso);
            wrap.appendChild(est);
            estaciones[id] = { el: est, gotas: [], vaso: vaso };
        });
        lienzo.appendChild(wrap);
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const pipetas = [
            { id: "pip_rojo", color: "rojo", img: "gota_roja" },
            { id: "pip_amarillo", color: "amarillo", img: "gota_amarilla" },
            { id: "pip_azul", color: "azul", img: "gota_azul" },
            { id: "pip_verde", color: "verde", img: "gota_verde" }
        ];
        const nodos = {};
        pipetas.forEach(function (p) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "pieza pipeta-pieza";
            b.dataset.id = p.id;
            b.dataset.color = p.color;
            b.setAttribute("aria-label", "Pipeta " + p.color);
            b.appendChild(crearImg(elemento("pipeta").img));
            const gota = document.createElement("span");
            gota.className = "pipeta-gota";
            gota.appendChild(crearImg(elemento(p.img).img));
            b.appendChild(gota);
            bandeja.appendChild(b);
            nodos[p.id] = b;
        });
        caja.appendChild(lienzo);
        caja.appendChild(bandeja);
        $id("estacion").appendChild(caja);

        let hechos = 0;
        const meta = r.meta || 2;
        const hechosClaves = {};
        const hecho = new Promise(function (resolve) {
            function pintarVaso(est) {
                if (!est.gotas.length) {
                    est.vaso.style.background = "";
                    return;
                }
                if (est.gotas.length === 1) {
                    est.vaso.style.background = L.hexDe(est.gotas[0]);
                    est.vaso.style.opacity = "0.55";
                    return;
                }
                est.vaso.style.opacity = "1";
            }
            function soltarEn(color, estacionId) {
                const est = estaciones[estacionId];
                if (!est || est.el.classList.contains("hecha")) return false;
                est.gotas.push(color);
                pintarVaso(est);
                if (est.gotas.length < 2) { efecto("burbujas"); return false; }
                const res = L.resultadoMezcla(est.gotas[0], est.gotas[1]);
                const clave = L.claveMezcla(est.gotas[0], est.gotas[1]);
                const mezcla = (r.mezclas || []).find(function (m) {
                    return L.claveMezcla(m.a, m.b) === clave && (!m.estacion || m.estacion === estacionId);
                });
                if (!res || !mezcla || hechosClaves[clave]) {
                    est.gotas = [];
                    pintarVaso(est);
                    efecto("error");
                    return false;
                }
                // Marrón u otras opcionales: se muestran y se reinician sin ocupar la estación.
                if (mezcla.opcional) {
                    est.vaso.style.background = L.hexDe(res);
                    est.vaso.style.opacity = "1";
                    efecto("burbujas");
                    efecto("mezcla");
                    particulas(centroDe(est.el).x, centroDe(est.el).y);
                    setTimeout(function () {
                        if (est.el.classList.contains("hecha")) return;
                        est.gotas = [];
                        pintarVaso(est);
                    }, 700);
                    return false;
                }
                hechosClaves[clave] = true;
                est.el.classList.add("hecha");
                est.el.style.background = L.hexDe(res);
                est.vaso.style.background = L.hexDe(res);
                est.vaso.style.opacity = "1";
                efecto("burbujas");
                efecto("mezcla");
                hechos += 1;
                particulas(centroDe(est.el).x, centroDe(est.el).y);
                if (hechos >= meta) { cancelarAyuda(); resolve(); return true; }
                return false;
            }
            Object.keys(nodos).forEach(function (id) {
                const nodo = nodos[id];
                nodo.addEventListener("pointerdown", function (ev) {
                    if (demoActiva || !vivo(gen)) return;
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
                        const zonas = Object.keys(estaciones).map(function (sid) {
                            const c = centroDe(estaciones[sid].el);
                            return { id: sid, x: c.x, y: c.y };
                        });
                        const cerca = L.huecoMasCercano({ x: e.clientX, y: e.clientY }, zonas, 140);
                        if (!cerca) return;
                        soltarEn(nodo.dataset.color, cerca);
                    }
                    nodo.addEventListener("pointermove", mover);
                    nodo.addEventListener("pointerup", soltar);
                    nodo.addEventListener("pointercancel", soltar);
                });
            });
            vigilar(function () { return mano(nodos.pip_rojo); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("laboratorio", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoTemperatura(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const zonas = {};
        ["calido", "frio"].forEach(function (z) {
            const el = document.createElement("div");
            el.className = "zona-temp " + z;
            el.dataset.id = z;
            el.appendChild(crearImg(elemento(z === "calido" ? "sol" : "copo").img));
            lienzo.appendChild(el);
            zonas[z] = el;
        });
        const bandeja = document.createElement("div");
        bandeja.className = "bandeja";
        const nodos = {};
        const orden = L.mezclar(r.piezas || []);
        orden.forEach(function (p) {
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
            function colocar(id, zonaId) {
                const res = L.evaluarTemperatura(r, puestos, id, zonaId);
                const nodo = nodos[id];
                if (res.estado !== "bien" && res.estado !== "completo") {
                    nodo.style.transform = "";
                    efecto("error");
                    return;
                }
                puestos = res.colocadas;
                nodo.classList.add("puesta");
                nodo.style.transform = "";
                zonas[zonaId].appendChild(nodo);
                efecto(zonaId === "calido" ? "fuego" : "hielo");
                if (res.estado === "completo") {
                    Object.keys(zonas).forEach(function (z) { zonas[z].classList.add("llena"); });
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
                        if (r.toqueColoca && (!movio || tap)) { colocar(id, pieza.zona); return; }
                        const zs = Object.keys(zonas).map(function (zid) {
                            const c = centroDe(zonas[zid]);
                            return { id: zid, x: c.x, y: c.y };
                        });
                        const cerca = L.huecoMasCercano({ x: e.clientX, y: e.clientY }, zs, 150);
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
        festejar("temperatura", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoVolumen(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo";
        const imgWrap = document.createElement("div");
        imgWrap.className = "manzana-img";
        const img = crearImg(elemento("manzana_bn").img);
        imgWrap.appendChild(img);
        lienzo.appendChild(imgWrap);
        const sombra = Object.assign(document.createElement("div"), { className: "sombra-zona" });
        const brillo = Object.assign(document.createElement("div"), { className: "brillo-zona" });
        lienzo.appendChild(sombra);
        lienzo.appendChild(brillo);
        const zona = document.createElement("div");
        zona.className = "zona-manzana";
        lienzo.appendChild(zona);
        const barra = document.createElement("div");
        barra.className = "barra-tonos";
        let tono = null;
        ["oscuro", "claro"].forEach(function (t) {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "tono-btn " + t;
            b.textContent = t === "oscuro" ? "Oscuro" : "Claro";
            b.addEventListener("click", function () {
                tono = t;
                Array.prototype.forEach.call(barra.children, function (c) { c.classList.toggle("activo", c === b); });
                efecto("suave");
            });
            barra.appendChild(b);
        });
        caja.appendChild(lienzo);
        caja.appendChild(barra);
        $id("estacion").appendChild(caja);

        let hechos = [];
        const hecho = new Promise(function (resolve) {
            zona.addEventListener("pointerdown", function (ev) {
                if (!tono || demoActiva || !vivo(gen)) return;
                ev.preventDefault();
                callar();
                const rect = zona.getBoundingClientRect();
                const yRel = (ev.clientY - rect.top) / rect.height;
                // Oscuro = sombra abajo; claro = brillo arriba.
                if (tono === "oscuro" && yRel < 0.45) { efecto("error"); return; }
                if (tono === "claro" && yRel > 0.55) { efecto("error"); return; }
                const res = L.evaluarVolumen(r, hechos, tono);
                if (res.estado === "mal" || res.estado === "puesta") { efecto("suave"); return; }
                hechos = res.hechos;
                if (tono === "oscuro") sombra.classList.add("visible");
                if (tono === "claro") brillo.classList.add("visible");
                efecto("destello");
                if (res.estado === "completo") {
                    img.src = asset(elemento("manzana_pintada").img);
                    cancelarAyuda();
                    resolve();
                }
            });
            vigilar(function () { return mano(barra.firstChild); }, 5000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("volumen", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function retoAbstracto(r, gen) {
        const caja = document.createElement("div");
        caja.className = "est-col";
        const lienzo = document.createElement("div");
        lienzo.className = "lienzo blanco";
        const paleta = document.createElement("div");
        paleta.className = "paleta-colores";
        const colores = r.colores || ["morado", "naranja", "azul", "verde"];
        let colorActivo = colores[0];
        colores.forEach(function (c, i) {
            const s = document.createElement("button");
            s.type = "button";
            s.className = "swatch" + (i === 0 ? " activo" : "");
            s.style.background = L.hexDe(c);
            s.setAttribute("aria-label", c);
            s.addEventListener("click", function () {
                colorActivo = c;
                Array.prototype.forEach.call(paleta.querySelectorAll(".swatch"), function (x) { x.classList.remove("activo"); });
                s.classList.add("activo");
                efecto("suave");
            });
            paleta.appendChild(s);
        });
        // Pincel decorativo de la paleta (recurso del pack).
        const pincelHint = document.createElement("div");
        pincelHint.className = "pincel-hint";
        pincelHint.appendChild(crearImg(elemento("pincel").img));
        paleta.appendChild(pincelHint);
        caja.appendChild(lienzo);
        caja.appendChild(paleta);
        $id("estacion").appendChild(caja);

        let count = 0;
        const usados = {};
        const meta = r.meta || 10;
        const minColores = Math.min(4, colores.length);
        let listo = false;
        const hecho = new Promise(function (resolve) {
            function revisar() {
                if (listo) return;
                if (count >= meta && Object.keys(usados).length >= minColores) {
                    listo = true;
                    cancelarAyuda();
                    resolve();
                }
            }
            let pintando = false;
            lienzo.addEventListener("pointerdown", function (ev) {
                if (demoActiva || !vivo(gen) || listo) return;
                ev.preventDefault();
                callar();
                pintando = true;
                try { lienzo.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
                const rect = lienzo.getBoundingClientRect();
                const trazo = document.createElement("div");
                trazo.className = "trazo-libre";
                trazo.style.background = L.hexDe(colorActivo);
                trazo.style.left = ((ev.clientX - rect.left) / rect.width * 100) + "%";
                trazo.style.top = ((ev.clientY - rect.top) / rect.height * 100) + "%";
                trazo.style.width = "22px";
                trazo.style.height = "22px";
                lienzo.appendChild(trazo);
                usados[colorActivo] = true;
                efecto("salpicadura");
                count += 1;
                function mover(e) {
                    if (!pintando || listo) return;
                    const t = document.createElement("div");
                    t.className = "trazo-libre";
                    t.style.background = L.hexDe(colorActivo);
                    t.style.left = ((e.clientX - rect.left) / rect.width * 100) + "%";
                    t.style.top = ((e.clientY - rect.top) / rect.height * 100) + "%";
                    t.style.width = (14 + Math.random() * 18) + "px";
                    t.style.height = t.style.width;
                    lienzo.appendChild(t);
                    count += 1;
                }
                function soltar() {
                    pintando = false;
                    lienzo.removeEventListener("pointermove", mover);
                    lienzo.removeEventListener("pointerup", soltar);
                    revisar();
                    if (!listo && Object.keys(usados).length < minColores) {
                        const falta = Array.prototype.find.call(paleta.querySelectorAll(".swatch"), function (s) {
                            return !usados[s.getAttribute("aria-label")];
                        });
                        vigilar(function () { return mano(falta || lienzo); }, 4000);
                    }
                }
                lienzo.addEventListener("pointermove", mover);
                lienzo.addEventListener("pointerup", soltar);
            });
            vigilar(function () { return mano(lienzo); }, 6000);
        });
        decirLineas(r.consigna);
        await hecho;
        if (!vivo(gen)) return;
        festejar("abstracto", lienzo);
        await sleep(300);
        await decirLineas(r.acierto, { estado: "acierto" });
    }

    async function jugarReto(r, gen) {
        if (r.tipo === "mezcla") return retoMezcla(r, gen);
        if (r.tipo === "huellas") return retoHuellas(r, gen);
        if (r.tipo === "clasifica") return retoClasifica(r, gen);
        if (r.tipo === "salpicadura" || r.tipo === "abstracto") return r.tipo === "abstracto" ? retoAbstracto(r, gen) : retoSalpicadura(r, gen);
        if (r.tipo === "laboratorio") return retoLaboratorio(r, gen);
        if (r.tipo === "temperatura") return retoTemperatura(r, gen);
        if (r.tipo === "volumen") return retoVolumen(r, gen);
        return retoSalpicadura(r, gen);
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
        try {
            await PedniaTutorial.activarDemo();
            const t = textos();
            const est = $id("estacion");
            est.innerHTML = "";
            const caja = document.createElement("div");
            caja.className = "est-col";
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
                    efecto("mezcla");
                    particulas(centroDe(hueco).x, centroDe(hueco).y);
                }
            });
            if (!vivo(gen) || !demoActiva) return;
            await decir({ voz: "zoe", texto: t.demostracionAcierto }, { estado: "acierto", minMs: 700 });
            await decir({ voz: "zoe", texto: t.demostracionFin }, { minMs: 700 });
            if (!vivo(gen) || !demoActiva) return;
            est.innerHTML = "";
            iniciarReto(gen);
        } finally {
            demoActiva = false;
            if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
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
        const introBruto = readText("../../../intro.json");
        if (!bruto || !introBruto) { console.error("[ElMundoDeLosColores] no se pudo leer la configuración"); return; }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        const sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        const errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ElMundoDeLosColores]", errores);
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
