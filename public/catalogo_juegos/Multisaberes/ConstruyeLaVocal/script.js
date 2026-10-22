/* Construye la vocal — Multisaberes */
(function () {
    "use strict";

    var L = window.ConstruyeVocalLogica;
    var Sfx = window.ConstruccionSfx;

    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var audioCache = Object.create(null);

    var nivel = null;
    var ronda = null;
    var estado = { ultimaFinal: null };
    var indice = 0;
    var completados = 0;
    var fallosSeguidos = 0;
    var fase = "";
    var rondaGen = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var cerrado = false;
    var demoActiva = false;
    var introTimers = [];
    var gesto = null;
    var siluetaVisible = true;

    function $id(id) { return document.getElementById(id); }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function readText(ruta) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }

    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function reducir() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            || document.body.classList.contains("sin-animaciones");
    }

    function volumenPct() {
        var n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }

    function aplicarVolumen(pct) {
        var n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        var vol = n / 100;
        if (window.TextoVoz && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(vol);
        } else if (audioFondo) {
            audioFondo.volume = vol;
        }
        var icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0
                ? "fa-solid fa-volume-xmark"
                : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function duck(bajo) {
        if (!window.TextoVoz) return;
        var base = volumenPct() / 100;
        TextoVoz.volumenFondo(bajo ? Math.min(0.04, base) : base);
    }

    function aplicarLetterSpacing() {
        var n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty("--mc-letter-spacing", (isFinite(n) && n >= 0 ? n : 2) + "px");
    }

    function esEspacio(n) {
        return String((n && n.edad) || "").indexOf("5") === 0;
    }

    function aplicarTema(n) {
        var escenario = $id("escenario");
        if (n && escenario) {
            escenario.classList.toggle("edad-3", String(n.id) === "3");
            escenario.classList.toggle("edad-5", String(n.id) === "5");
        }
    }

    function temaInicial() {
        var edad = window.PedniaEdad ? PedniaEdad.edadSesion() : null;
        return { edad: edad != null && edad >= 5 ? "5-6 años" : "3-4 años", id: edad != null && edad >= 5 ? "5" : "3" };
    }

    function asegurarFondo() {
        var ruta = gameConfig.audios && gameConfig.audios.fondo;
        if (!ruta) return;
        if (!audioFondo) {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
        }
        audioFondo.volume = volumenPct() / 100;
        var p = audioFondo.play();
        if (p && p.catch) p.catch(function () {});
    }

    function playArchivo(ruta) {
        return new Promise(function (resolve) {
            if (!ruta) { resolve(); return; }
            var audio = audioCache[ruta] || new Audio(ruta);
            audioCache[ruta] = audio;
            var fin = function () { resolve(); };
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
            audio.onended = fin;
            audio.onerror = fin;
            var p = audio.play();
            if (p && p.catch) p.catch(fin);
            setTimeout(fin, 12000);
        });
    }

    function despertarAudio() {
        if (window.TextoVoz) TextoVoz.desbloquear();
        if (Sfx) Sfx.desbloquear();
        asegurarFondo();
    }

    function efecto(nombre) {
        // Celebración/construcción del doc; sin beep de error (el reintento es visual).
        if (!nombre || !Sfx || acc().efectosSonido === false) return;
        if (nombre === "suave" || nombre === "alerta") return;
        Sfx.sonar(nombre);
    }

    function textos() {
        return (gameConfig && gameConfig.textos) || {};
    }

    function gif(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        if (hablando) return "../../images/" + quien + "_hablando.gif";
        return "../../img/" + quien + "_normal.gif";
    }

    function marcarHablando(voz, hablando) {
        var id = voz === "zeus" ? "pj-zeus-img" : "pj-zoe-img";
        var inicioId = voz === "zeus" ? "inicio-zeus" : "inicio-zoe";
        var img = $id(id);
        var inicio = $id(inicioId);
        if (img) img.src = gif(voz, hablando);
        if (inicio) inicio.src = gif(voz, hablando);
        var avatar = $id("dialogo-avatar");
        var dialogo = $id("dialogo");
        if (avatar && dialogo && dialogo.classList.contains("visible")) {
            avatar.src = gif(voz, hablando);
        }
    }

    function pintarDialogo(voz, texto, estadoDialogo) {
        var enunciado = $id("enunciado");
        if (!enunciado) return;
        enunciado.dataset.voz = voz || "";
        enunciado.classList.toggle("es-acierto", estadoDialogo === "acierto");
        enunciado.classList.toggle("es-error", estadoDialogo === "error");
        enunciado.textContent = texto || "";
    }

    function limpiarDialogo() {
        var enunciado = $id("enunciado");
        if (!enunciado) return;
        enunciado.classList.remove("es-acierto", "es-error");
        enunciado.textContent = "";
        enunciado.dataset.voz = "";
    }

    function decir(linea, estadoDialogo) {
        if (!linea) return Promise.resolve();
        despertarAudio();
        var voz = "zoe";
        if (linea.voz) voz = linea.voz === "zeus" ? "zeus" : "zoe";
        else if (linea.personaje === 0) voz = "zeus";
        var texto = String(linea.texto || "").trim();
        if (!texto) return Promise.resolve();
        // Doc: voz, no texto que el niño tenga que leer.
        if (!document.body.classList.contains("sin-feedback")
            && !document.body.classList.contains("esperando-inicio")) {
            pintarDialogo(voz, texto, estadoDialogo);
        }
        marcarHablando(voz, true);
        duck(true);
        var promesa = window.TextoVoz
            ? Promise.resolve(TextoVoz.hablar(texto, voz, { esperarTtsMs: 600 }))
            : sleep(900);
        return Promise.resolve(promesa).catch(function () {}).then(function () {
            marcarHablando(voz, false);
            duck(false);
            limpiarDialogo();
        });
    }

    function celebrarPersonajes(on) {
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            var el = $id(id);
            if (el) el.classList.toggle("celebra", !!on);
        });
    }

    function pintarProgreso() {
        var box = $id("progreso");
        var ports = $id("portales");
        var total = (nivel && nivel.retos ? nivel.retos.length : 0) || 0;
        var mostrar = acc().mostrarProgreso !== false && total > 0;
        if (ports) ports.hidden = true;
        if (!box) return;
        box.hidden = !mostrar;
        if (!mostrar) {
            box.innerHTML = "";
            return;
        }
        box.innerHTML = '<i class="fa-solid fa-star"></i> ' +
            Math.min(completados, total) + " / " + total;
    }

    function formaDef(id) {
        return L.defForma(gameConfig, id) || { img: "", w: 40, h: 40 };
    }

    function slotsVacios() {
        return Array.prototype.slice.call(document.querySelectorAll("#slots .slot:not(.lleno)")).map(function (el) {
            return {
                id: el.dataset.slot,
                forma: el.dataset.forma,
                rot: Number(el.dataset.rot || 0),
                el: el
            };
        });
    }

    function limpiarTablero() {
        var slots = $id("slots");
        var colocadas = $id("colocadas");
        var banda = $id("cinta-banda");
        var flotante = $id("zona-flotante");
        var tablero = $id("tablero");
        var flash = $id("modelo-flash");
        var pista = $id("btn-pista");
        var maquina = $id("maquina");
        var galeria = $id("galeria-vocales");
        if (slots) slots.innerHTML = "";
        if (colocadas) colocadas.innerHTML = "";
        if (banda) banda.innerHTML = "";
        if (flotante) flotante.innerHTML = "";
        if (tablero) {
            tablero.classList.remove("completa", "salta", "gira", "ilumina", "cascada", "portal", "modelo-oculto");
            document.querySelectorAll("#portales .portal.destello").forEach(function (p) {
                p.classList.remove("destello");
            });
        }
        if (flash) {
            flash.hidden = true;
            flash.textContent = "";
        }
        if (pista) {
            pista.hidden = true;
            pista.disabled = false;
        }
        if (maquina) maquina.classList.remove("ok", "trabajando");
        if (galeria) {
            galeria.hidden = true;
            galeria.innerHTML = "";
            galeria.classList.remove("visible", "elige");
        }
        $id("cinta").classList.remove("moviendo", "pausada", "ilumina-cinta");
        $id("capa-efectos").innerHTML = "";
        siluetaVisible = true;
        fallosSeguidos = 0;
    }

    function ponerColocada(forma, rot, slotId) {
        var capa = $id("colocadas");
        if (!capa) return null;
        var prev = capa.querySelector('[data-slot="' + slotId + '"]');
        if (prev) prev.remove();
        var img = document.createElement("img");
        img.className = "colocada";
        img.src = formaDef(forma).img;
        img.alt = "";
        img.draggable = false;
        img.dataset.slot = slotId || forma;
        img.dataset.forma = forma;
        if (rot) img.style.transform = "rotate(" + rot + "deg)";
        capa.appendChild(img);
        return img;
    }

    function pintarSlots(r) {
        var cont = $id("slots");
        var capa = $id("colocadas");
        cont.innerHTML = "";
        if (capa) capa.innerHTML = "";
        (r.fijos || []).forEach(function (forma) {
            ponerColocada(forma, 0, "fijo-" + forma);
        });
        var puestos = {};
        (r.faltan || []).forEach(function (id) { puestos[id] = true; });
        (r.slots || []).forEach(function (s) {
            var el = document.createElement("div");
            el.className = "slot";
            el.dataset.slot = s.id;
            el.dataset.forma = s.forma;
            el.dataset.rot = String(s.rot || 0);
            el.style.left = s.x + "%";
            el.style.top = s.y + "%";
            el.style.width = s.w + "%";
            el.style.height = s.h + "%";
            if (!puestos[s.id]) {
                el.classList.add("lleno");
                ponerColocada(s.forma, s.rot || 0, s.id);
            }
            cont.appendChild(el);
        });
    }

    function crearBotonPieza(p, r, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pieza" + (r.flotar && !reducir() ? " flota" : "");
        btn.dataset.id = p.id;
        btn.dataset.forma = p.forma;
        btn.dataset.rot = String(p.rot || 0);
        btn.style.animationDelay = (idx * 0.18) + "s";
        var img = document.createElement("img");
        img.src = formaDef(p.forma).img;
        img.alt = "";
        img.draggable = false;
        // scale CSS + rotación: no pisar el scale del stylesheet con solo rotate.
        var rot = Number(p.rot || 0);
        if (rot) img.style.transform = "rotate(" + rot + "deg) scale(1.45)";
        btn.appendChild(img);
        // Badge de giro solo si el reto lo pide o la pieza ya viene rotada.
        var necesitaGiro = (r.rotar && r.rotar.indexOf(p.forma) !== -1) || Number(p.rot || 0) !== 0;
        if (necesitaGiro) {
            var rotBtn = document.createElement("span");
            rotBtn.className = "badge-rot";
            rotBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
            rotBtn.title = "Girar";
            rotBtn.addEventListener("pointerdown", function (ev) {
                ev.stopPropagation();
                ev.preventDefault();
                girarPieza(btn);
            });
            btn.appendChild(rotBtn);
        }
        return btn;
    }

    function pintarPiezas(r) {
        var banda = $id("cinta-banda");
        var flotante = $id("zona-flotante");
        banda.innerHTML = "";
        if (flotante) flotante.innerHTML = "";
        var cinta = $id("cinta");
        cinta.classList.toggle("moviendo", !!r.cinta && !reducir());
        var lista = (r.piezas || []).slice();
        var nDisp = Math.min(r.dispersar || 0, lista.length);
        var sueltas = nDisp ? lista.splice(0, nDisp) : [];
        var posiciones = [
            { left: "2%", top: "8%" },
            { left: "78%", top: "18%" },
            { left: "6%", top: "55%" },
            { left: "82%", top: "58%" }
        ];
        sueltas.forEach(function (p, idx) {
            var btn = crearBotonPieza(p, r, idx);
            btn.classList.add("suelta");
            var pos = posiciones[idx % posiciones.length];
            btn.style.left = pos.left;
            btn.style.top = pos.top;
            if (flotante) flotante.appendChild(btn);
            else banda.appendChild(btn);
        });
        lista.forEach(function (p, idx) {
            banda.appendChild(crearBotonPieza(p, r, idx + sueltas.length));
        });
    }

    function girarPieza(btn) {
        if (!btn || btn.classList.contains("usada") || fase !== "jugar") return;
        var rot = L.normRot(Number(btn.dataset.rot || 0) + 90);
        btn.dataset.rot = String(rot);
        var img = btn.querySelector("img");
        if (img) img.style.transform = "rotate(" + rot + "deg) scale(1.45)";
    }

    function aplicarSilueta(r, visible) {
        var img = $id("silueta");
        var tablero = $id("tablero");
        if (img) {
            img.src = r.silueta || "";
            img.style.filter = r.color ? "drop-shadow(0 0 1px " + r.color + ")" : "";
        }
        siluetaVisible = visible !== false;
        if (tablero) tablero.classList.toggle("modelo-oculto", !siluetaVisible);
    }

    function siluetaDe(vocal) {
        var def = (gameConfig.vocales || {})[vocal] || {};
        return def.silueta || "";
    }

    function pintarVocalGrafica(contenedor, vocal, claseExtra) {
        if (!contenedor) return;
        contenedor.innerHTML = "";
        var src = siluetaDe(vocal);
        if (src) {
            var img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.draggable = false;
            if (claseExtra) img.className = claseExtra;
            contenedor.appendChild(img);
            return;
        }
        contenedor.textContent = vocal || "";
    }

    async function flashModelo(vocal) {
        var flash = $id("modelo-flash");
        if (!flash) return;
        flash.hidden = false;
        pintarVocalGrafica(flash, vocal, "modelo-flash-img");
        await sleep(reducir() ? 600 : 1600);
        flash.hidden = true;
        flash.innerHTML = "";
    }

    function chispas(el, n) {
        if (!el || reducir()) return;
        var r = el.getBoundingClientRect();
        var capa = $id("capa-efectos");
        var i;
        for (i = 0; i < (n || 10); i++) {
            var s = document.createElement("span");
            s.className = "chispa";
            s.style.left = (r.left + r.width / 2) + "px";
            s.style.top = (r.top + r.height / 2) + "px";
            var ang = (Math.PI * 2 * i) / (n || 10);
            s.style.setProperty("--dx", (Math.cos(ang) * 50) + "px");
            s.style.setProperty("--dy", (Math.sin(ang) * 50) + "px");
            capa.appendChild(s);
            setTimeout(function (node) { node.remove(); }, 750, s);
        }
    }

    function mostrarPistaSlots() {
        document.querySelectorAll("#slots .slot:not(.lleno)").forEach(function (el) {
            el.classList.add("pista");
        });
        setTimeout(function () {
            document.querySelectorAll("#slots .slot.pista").forEach(function (el) {
                el.classList.remove("pista");
            });
        }, 1600);
    }

    function puedeJugar() {
        return fase === "jugar" && !juegoTerminado && !demoActiva;
    }

    function rectSlot(el) {
        return el.getBoundingClientRect();
    }

    function slotEn(x, y) {
        var mejor = null;
        var mejorDist = Infinity;
        slotsVacios().forEach(function (s) {
            var r = rectSlot(s.el);
            if (!L.cercaPunto(x, y, r, 1.35)) return;
            var cx = r.left + r.width / 2;
            var cy = r.top + r.height / 2;
            var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d < mejorDist) {
                mejorDist = d;
                mejor = s;
            }
        });
        return mejor;
    }

    function fijarEnSlot(piezaBtn, slotInfo, opts) {
        opts = opts || {};
        var img = ponerColocada(piezaBtn.dataset.forma, piezaBtn.dataset.rot || 0, slotInfo.id);
        if (img && (piezaBtn.dataset.forma === "punto_i" || opts.cae)) img.classList.add("cae");
        slotInfo.el.classList.add("lleno");
        slotInfo.el.classList.remove("destino", "pista");
        piezaBtn.classList.add("usada");
        efecto("construir");
        chispas(slotInfo.el, 8);
    }

    function retoCompleto() {
        return slotsVacios().length === 0;
    }

    function iluminarCascada() {
        var llenos = Array.prototype.slice.call(document.querySelectorAll("#slots .slot.lleno"));
        llenos.sort(function (a, b) {
            return parseFloat(a.style.top) - parseFloat(b.style.top);
        });
        llenos.forEach(function (el, i) {
            setTimeout(function () {
                el.classList.add("brillo");
                setTimeout(function () { el.classList.remove("brillo"); }, 450);
            }, i * 220);
        });
        return sleep(llenos.length * 220 + 400);
    }

    function mostrarGaleria(elegida) {
        var galeria = $id("galeria-vocales");
        if (!galeria) return Promise.resolve();
        galeria.hidden = false;
        galeria.classList.add("visible");
        galeria.innerHTML = "";
        L.VOCALES.forEach(function (v) {
            var span = document.createElement("span");
            span.className = "galeria-item" + (elegida && elegida === v ? " elegida" : "");
            span.dataset.vocal = v;
            pintarVocalGrafica(span, v, "galeria-silueta");
            galeria.appendChild(span);
        });
        return sleep(reducir() ? 400 : 1100);
    }

    async function celebrarFinalEspecial(gen, ac) {
        if (ac.efecto === "maquina" || ac.galeria) {
            var maq = $id("maquina");
            if (maq) {
                maq.classList.add("ok", "trabajando");
            }
            $id("cinta").classList.add("ilumina-cinta");
            await mostrarGaleria(ronda && ronda.vocal);
            if (!vivo(gen)) return;
        }
        if (ac.efecto === "portales") {
            document.querySelectorAll("#portales .portal").forEach(function (p) {
                p.classList.add("activo");
            });
            await mostrarGaleria(ronda && ronda.vocal);
        }
    }

    async function onAciertoReto(gen) {
        fase = "celebrar";
        var tablero = $id("tablero");
        var ac = (ronda && ronda.acierto) || {};
        var fx = ac.efecto || "ilumina";
        if (fx === "cascada") {
            await iluminarCascada();
            if (!vivo(gen)) return;
            tablero.classList.add("completa", "ilumina");
        } else if (fx === "portal") {
            tablero.classList.add("completa", "ilumina", "portal");
            var ports = document.querySelectorAll("#portales .portal");
            if (ports[completados]) ports[completados].classList.add("activo", "destello");
        } else {
            tablero.classList.add("completa", fx === "maquina" || fx === "portales" ? "ilumina" : fx);
        }
        if ($id("maquina")) $id("maquina").classList.add("ok");
        if (fx === "ilumina" || fx === "portal" || ronda.vocal === "u") {
            $id("cinta").classList.add("ilumina-cinta");
        }
        efecto(ac.sonido || "celebracion");
        celebrarPersonajes(true);
        chispas(tablero, 16);
        await celebrarFinalEspecial(gen, ac);
        if (!vivo(gen)) return;
        if (ac.texto) await decir({ voz: ac.voz || "zoe", texto: ac.texto }, "acierto");
        else await sleep(reducir() ? 300 : 700);
        celebrarPersonajes(false);
        if (!vivo(gen)) return;
        if (ronda && ronda.esFinal) estado.ultimaFinal = ronda.vocal;
        completados += 1;
        pintarProgreso();
        indice += 1;
        await sleep(reducir() ? 200 : 450);
        if (!vivo(gen)) return;
        if (!nivel.retos[indice]) granCierre(gen);
        else presentar(gen);
    }

    function resaltarHuecosCorrectos() {
        mostrarPistaSlots();
    }

    function volarFantasma(ghost, hastaEl, ms) {
        return new Promise(function (resolve) {
            if (!ghost || !hastaEl) {
                if (ghost) ghost.remove();
                resolve();
                return;
            }
            var dest = hastaEl.getBoundingClientRect();
            var cx = dest.left + dest.width / 2;
            var cy = dest.top + dest.height / 2;
            ghost.style.transition = "left " + ms + "ms ease, top " + ms + "ms ease, opacity " + ms + "ms ease, transform " + ms + "ms ease";
            requestAnimationFrame(function () {
                ghost.style.left = cx + "px";
                ghost.style.top = cy + "px";
                ghost.style.opacity = "0.35";
                ghost.style.transform = "translate(-50%, -50%) scale(0.7)";
            });
            setTimeout(function () {
                ghost.remove();
                resolve();
            }, ms + 20);
        });
    }

    async function snapYFijar(piezaBtn, slotInfo, ghost, gen) {
        if (ghost) {
            ghost.classList.add("imantada");
            await volarFantasma(ghost, slotInfo.el, reducir() ? 160 : 280);
        }
        fijarEnSlot(piezaBtn, slotInfo, { cae: piezaBtn.dataset.forma === "punto" });
        piezaBtn.classList.remove("arrastrando");
        $id("cinta").classList.remove("pausada");
        if (retoCompleto()) await onAciertoReto(gen);
        else fase = "jugar";
    }

    async function devolverConAnimacion(g) {
        var ghost = g.ghost;
        g.ghost = null;
        if (ghost) await volarFantasma(ghost, g.pieza, reducir() ? 180 : 360);
        g.pieza.classList.remove("arrastrando");
        $id("cinta").classList.remove("pausada");
        document.querySelectorAll("#slots .slot.destino").forEach(function (el) {
            el.classList.remove("destino");
        });
    }

    async function intentarColocar(piezaBtn, slotInfo, gen, ghost) {
        if (!piezaBtn || !slotInfo) {
            if (ghost) ghost.remove();
            return;
        }
        if (L.encaja(piezaBtn.dataset.forma, piezaBtn.dataset.rot, slotInfo)) {
            fallosSeguidos = 0;
            await snapYFijar(piezaBtn, slotInfo, ghost, gen);
            return;
        }
        fallosSeguidos += 1;
        efecto("alerta");
        await devolverConAnimacion({ ghost: ghost, pieza: piezaBtn });
        resaltarHuecosCorrectos();
        if (ronda && ronda.pistaTrasFallos && fallosSeguidos >= ronda.pistaTrasFallos) {
            aplicarSilueta(ronda, true);
            fallosSeguidos = 0;
        }
        fase = "jugar";
    }

    function limpiarDestinos() {
        document.querySelectorAll("#slots .slot.destino").forEach(function (el) {
            el.classList.remove("destino");
        });
    }

    function enlazarArrastre() {
        function moverGesto(ev) {
            if (!gesto || gesto.id !== ev.pointerId) return;
            var dx = ev.clientX - gesto.x0;
            var dy = ev.clientY - gesto.y0;
            if (!gesto.arrastra && L.clasificarGesto(dx, dy) === "arrastre") {
                gesto.arrastra = true;
                var r = gesto.pieza.getBoundingClientRect();
                var g = document.createElement("img");
                g.className = "fantasma";
                g.src = gesto.pieza.querySelector("img").src;
                g.style.width = r.width + "px";
                g.style.height = r.height + "px";
                g.style.left = ev.clientX + "px";
                g.style.top = ev.clientY + "px";
                g.style.transform = "translate(-50%, -50%) rotate(" + (gesto.pieza.dataset.rot || 0) + "deg)";
                $id("capa-efectos").appendChild(g);
                gesto.ghost = g;
                gesto.pieza.classList.add("arrastrando");
            }
            if (!gesto.ghost) return;
            gesto.ghost.style.left = ev.clientX + "px";
            gesto.ghost.style.top = ev.clientY + "px";
            limpiarDestinos();
            var s = slotEn(ev.clientX, ev.clientY);
            if (s && L.encaja(gesto.pieza.dataset.forma, gesto.pieza.dataset.rot, s)) {
                s.el.classList.add("destino");
                gesto.ghost.classList.add("imantada");
            } else if (gesto.ghost) {
                gesto.ghost.classList.remove("imantada");
            }
        }

        function terminarGesto(ev) {
            if (!gesto || gesto.id !== ev.pointerId) return;
            var g = gesto;
            gesto = null;
            document.removeEventListener("pointermove", moverGesto);
            document.removeEventListener("pointerup", terminarGesto);
            document.removeEventListener("pointercancel", terminarGesto);
            try { g.pieza.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
            limpiarDestinos();
            if (ev.type !== "pointerup") {
                if (g.ghost) g.ghost.remove();
                g.pieza.classList.remove("arrastrando");
                $id("cinta").classList.remove("pausada");
                return;
            }
            if (!g.arrastra) {
                $id("cinta").classList.remove("pausada");
                // Giro solo con el badge: un tap no debe rotar (evita giros accidentales).
                return;
            }
            if (!vivo(g.gen) && !demoActiva) {
                devolverConAnimacion(g);
                return;
            }
            var slot = slotEn(ev.clientX, ev.clientY);
            if (!slot) {
                devolverConAnimacion(g);
                return;
            }
            if (demoActiva) {
                if (L.encaja(g.pieza.dataset.forma, g.pieza.dataset.rot, slot)) {
                    snapYFijar(g.pieza, slot, g.ghost, g.gen);
                } else {
                    devolverConAnimacion(g);
                }
                return;
            }
            fase = "resolver";
            intentarColocar(g.pieza, slot, g.gen, g.ghost);
        }

        function iniciarDesdePieza(ev, pieza) {
            if (ev.target.closest(".badge-rot")) return;
            if (!pieza || pieza.classList.contains("usada")) return;
            if (!puedeJugar() && !demoActiva) return;
            if (demoActiva && !pieza.dataset.demoOk) return;
            if (gesto) return;
            gesto = {
                pieza: pieza,
                id: ev.pointerId,
                x0: ev.clientX,
                y0: ev.clientY,
                arrastra: false,
                ghost: null,
                gen: rondaGen
            };
            $id("cinta").classList.add("pausada");
            document.addEventListener("pointermove", moverGesto);
            document.addEventListener("pointerup", terminarGesto);
            document.addEventListener("pointercancel", terminarGesto);
            try { pieza.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        }

        $id("cinta").addEventListener("pointerdown", function (ev) {
            iniciarDesdePieza(ev, ev.target.closest(".pieza"));
        });
        var flotante = $id("zona-flotante");
        if (flotante) {
            flotante.addEventListener("pointerdown", function (ev) {
                iniciarDesdePieza(ev, ev.target.closest(".pieza"));
            });
        }
    }

    async function presentar(gen) {
        if (!vivo(gen)) return;
        var reto = nivel.retos[indice];
        if (!reto) { granCierre(gen); return; }
        fase = "presentacion";
        limpiarDialogo();
        limpiarTablero();
        ronda = L.preparar(reto, gameConfig, estado, Math.random);
        if (!ronda) { granCierre(gen); return; }

        if (ronda.cincoSiluetas) {
            var galeria = $id("galeria-vocales");
            if (galeria) {
                galeria.hidden = false;
                galeria.classList.add("visible", "elige");
                galeria.innerHTML = "";
                L.VOCALES.forEach(function (v) {
                    var span = document.createElement("span");
                    span.className = "galeria-item silueta-mini" + (v === ronda.vocal ? " elegida" : "");
                    span.dataset.vocal = v;
                    pintarVocalGrafica(span, v, "galeria-silueta");
                    galeria.appendChild(span);
                });
                await sleep(reducir() ? 500 : 1400);
                if (!vivo(gen)) return;
                galeria.querySelectorAll(".galeria-item:not(.elegida)").forEach(function (el) {
                    el.classList.add("apagada");
                });
                await sleep(reducir() ? 200 : 500);
                if (!vivo(gen)) return;
                galeria.hidden = true;
                galeria.classList.remove("elige");
            }
        }

        aplicarSilueta(ronda, true);
        pintarSlots(ronda);
        pintarPiezas(ronda);
        pintarProgreso();

        var pistaBtn = $id("btn-pista");
        if (pistaBtn) {
            // Bombilla: solo cuando el modelo se oculta (final 5-6).
            pistaBtn.hidden = !ronda.modeloBreve;
        }

        if (ronda.modeloBreve) {
            await flashModelo(ronda.vocal);
            if (!vivo(gen)) return;
            aplicarSilueta(ronda, false);
        }

        efecto("alerta");
        if (ronda.presenta) await decir(ronda.presenta);
        if (!vivo(gen)) return;
        fase = "jugar";
    }

    function prepararInsignia() {
        var ins = nivel.insignia || {};
        var trofeo = document.querySelector("#victoria img.trofeo");
        if (!trofeo || !ins.img) return;
        trofeo.src = ins.img;
        trofeo.alt = ins.nombre || "";
        trofeo.classList.add("insignia");
    }

    function granCierre(gen) {
        if (!vivo(gen) && juegoTerminado) return;
        fase = "";
        juegoTerminado = true;
        celebrarPersonajes(true);
        var cierre = nivel.cierre || { voz: "zoe", texto: "¡Eres un gran constructor de vocales!" };
        var texto = $id("texto_final");
        if (texto) texto.textContent = cierre.texto;
        prepararInsignia();
        if (esEspacio(nivel)) {
            document.querySelectorAll("#portales .portal").forEach(function (p) {
                p.classList.add("activo");
            });
        } else {
            var maq = $id("maquina");
            if (maq) maq.classList.add("ok", "trabajando");
            mostrarGaleria(null);
        }
        if (gameConfig.audios && gameConfig.audios.cierre) playArchivo(gameConfig.audios.cierre);
        despertarAudio();
        if (window.TextoVoz) {
            TextoVoz.hablar(cierre.texto, cierre.voz === "zeus" ? "zeus" : "zoe", { esperarTtsMs: 600 });
        }
        setTimeout(function () {
            var caja = $id("final");
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof iniciarSecuenciaVictoria === "function") iniciarSecuenciaVictoria();
            else if (typeof iniciarVictoria === "function") iniciarVictoria();
        }, 500);
    }

    function conversacionInicial() {
        var n = null;
        if (window.PedniaEdad && !PedniaEdad.esPreviewCatalogo()) {
            var edad = PedniaEdad.edadSesion();
            if (edad != null) n = PedniaEdad.resolverNivel(gameConfig.niveles || [], edad);
        }
        return (n && n.bienvenida) || [];
    }

    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        introTimers = [];
    }

    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        var conversacion = conversacionInicial();
        var personajesCfg = window.INTRO_CONFIG.personajes || [];
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            var indicePj = Number(linea.personaje);
            var def = personajesCfg[isFinite(indicePj) ? indicePj : 0] || personajesCfg[0] || {};
            var id = def.id || (indicePj === 1 ? "zoe" : "zeus");
            return {
                personaje: id,
                nombre: id === "zoe" ? "Zoe" : "Zeus",
                color: (window.INTRO_CONFIG.dialogo.colores && window.INTRO_CONFIG.dialogo.colores[id]) || "#fff",
                texto: String(linea.texto || "").trim()
            };
        });
    }

    function mostrarIntro3d() {
        var root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        var root = $id("intro3d-root");
        if (!root) return;
        root.classList.add("is-closing");
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) {
                try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                window.__introPhaser = null;
            }
            if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
            root.remove();
        }, 450);
    }

    function omitirIntro3d() {
        if (cerrado) return;
        var root = $id("intro3d-root");
        if (!root || root.hidden) {
            empezarJuegoTrasIntro();
            return;
        }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        cancelarIntroPendiente();
        if (window.TextoVoz) TextoVoz.detener();
        despertarAudio();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        var principal = $id("principal");
        if (principal) {
            principal.style.display = "flex";
            if (window.jQuery) jQuery(principal).hide().fadeIn(800);
        }
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: (gameConfig && gameConfig.niveles) || [],
                elegirManual: elegirNivel,
                onElegido: function (n) {
                    if (n) window.confirmarNivel(n.id);
                }
            });
        } else {
            window.confirmarNivel(gameConfig.niveles[0].id);
        }
    }

    function empecemosJuego() {
        var pantalla = $id("pantalla-inicio");
        var btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        despertarAudio();
        sincronizarDialogoIntro3d();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            pantalla.style.display = "none";
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "sale" || ev.animationName === "inicioDisuelve") ocultar();
        });
        setTimeout(ocultar, 1250);
    }

    window.cerrar_anuncio = function cerrar_anuncio() {
        empezarJuegoTrasIntro();
    };

    function mostrarIntroActiva() {
        return window.PedniaTutorial
            ? PedniaTutorial.mostrarIntroActiva(acc())
            : !!acc().mostrarIntro;
    }

    function detenerDemo() {
        demoActiva = false;
        if (window.PedniaTutorial) PedniaTutorial.detenerDemo();
        else document.body.classList.remove("demo-activa");
    }

    async function iniciarDemo(gen) {
        var d = gameConfig.demo || {};
        if (!d.vocal || !window.PedniaTutorial) {
            await bienvenidaYJuego(gen);
            return;
        }
        demoActiva = true;
        fase = "";
        aplicarTema(nivel);
        pintarProgreso();
        await PedniaTutorial.activarDemo();
        var t = textos();
        var retoDemo = {
            vocal: d.vocal,
            faltan: d.faltan || ["pata"],
            piezas: d.piezas || ["pata_u", "barra_corta"],
            cinta: false
        };
        ronda = L.preparar(retoDemo, gameConfig, {}, Math.random);
        limpiarTablero();
        aplicarSilueta(ronda, true);
        pintarSlots(ronda);
        pintarPiezas(ronda);
        var correcta = document.querySelector('#cinta-banda .pieza[data-forma="' + (d.piezas && d.piezas[0] ? d.piezas[0] : "pata_u") + '"]');
        if (correcta) correcta.dataset.demoOk = "1";
        await decir({ voz: "zoe", texto: t.demostracion || "¡Arrastra la pieza hasta el hueco!" });
        if (!vivo(gen) || !demoActiva) return;
        var cancelado = function () { return !demoActiva || !vivo(gen); };
        var slotEl = document.querySelector("#slots .slot:not(.lleno)");
        if (correcta && slotEl && window.PedniaTutorial) {
            var desde = correcta.getBoundingClientRect();
            var hasta = slotEl.getBoundingClientRect();
            await PedniaTutorial.animarMano({
                punto: correcta,
                holdMs: 400,
                cancelado: cancelado,
                arrastre: {
                    dx: (hasta.left + hasta.width / 2) - (desde.left + desde.width / 2),
                    dy: (hasta.top + hasta.height / 2) - (desde.top + desde.height / 2),
                    durMs: reducir() ? 200 : 800,
                    soltarEnDestino: true
                },
                onPresionar: function () {
                    if (slotEl && correcta) fijarEnSlot(correcta, {
                        id: slotEl.dataset.slot,
                        forma: slotEl.dataset.forma,
                        rot: Number(slotEl.dataset.rot || 0),
                        el: slotEl
                    });
                }
            });
        }
        if (!vivo(gen) || !demoActiva) return;
        efecto("celebracion");
        await decir({ voz: "zoe", texto: t.demostracionAcierto || "¡Así se construye!" }, "acierto");
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: t.demostracionFin || "¡Ahora te toca a ti!" });
        detenerDemo();
        if (!vivo(gen)) return;
        limpiarTablero();
        await bienvenidaYJuego(gen);
    }

    async function bienvenidaYJuego(gen) {
        aplicarTema(nivel);
        pintarProgreso();
        var lineas = nivel.bienvenida || [];
        var i;
        for (i = 0; i < lineas.length; i++) {
            if (!vivo(gen)) return;
            await decir(lineas[i]);
        }
        if (!vivo(gen)) return;
        presentar(gen);
    }

    function elegirNivel() {
        var botones = "";
        gameConfig.niveles.forEach(function (n, i) {
            var color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color + ' btn-eleccion" onclick="confirmarNivel(\'' + n.id + '\')"><strong>' + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
        });
        despertarAudio();
        if (window.TextoVoz) {
            TextoVoz.hablar(textos().eligeNivel || "Elige tu edad", "zoe", { esperarTtsMs: 600 });
        }
        if (!window.Swal) {
            window.confirmarNivel(gameConfig.niveles[0].id);
            return;
        }
        Swal.fire({
            title: textos().eligeNivel || "Elige tu edad",
            html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>",
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            heightAuto: false,
            scrollbarPadding: false,
            width: 460
        });
    }

    window.confirmarNivel = function confirmarNivel(id) {
        if (arrancado) return;
        nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
        if (!nivel) return;
        arrancado = true;
        if (window.Swal) Swal.close();
        if (window.TextoVoz) TextoVoz.detener();
        rondaGen += 1;
        juegoTerminado = false;
        indice = 0;
        completados = 0;
        estado = { ultimaFinal: null };
        limpiarTablero();
        if (window.TextoVoz && typeof TextoVoz.encolarFrases === "function") {
            var frases = [];
            (nivel.bienvenida || []).forEach(function (l) { if (l.texto) frases.push(l.texto); });
            TextoVoz.encolarFrases(frases);
        }
        aplicarTema(nivel);
        document.body.classList.toggle("sin-feedback", acc().mostrarFeedBack === false);
        if (mostrarIntroActiva()) iniciarDemo(rondaGen);
        else bienvenidaYJuego(rondaGen);
    };

    function enlazarVolumen() {
        var btn = $id("btn-menu-vol");
        var cerrar = $id("btn-cerrar-vol");
        var slider = $id("rango-volumen");
        var panel = $id("menu-vol-panel");
        function setAbierto(abierto) {
            if (!panel || !btn) return;
            panel.hidden = !abierto;
            btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        }
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                setAbierto(panel.hidden);
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setAbierto(false); });
        if (slider) {
            slider.value = String(volumenPct());
            var val = $id("vol-val");
            if (val) val.textContent = slider.value;
            slider.addEventListener("input", function () {
                if (val) val.textContent = slider.value;
                aplicarVolumen(slider.value);
            });
        }
        document.addEventListener("pointerdown", function (ev) {
            var menu = $id("menu-vol");
            if (!menu || menu.contains(ev.target)) return;
            setAbierto(false);
        });
        aplicarVolumen(volumenPct());
    }

    function enlazarPista() {
        var btn = $id("btn-pista");
        if (!btn) return;
        btn.addEventListener("click", function () {
            if (!ronda || fase !== "jugar") return;
            btn.disabled = true;
            aplicarSilueta(ronda, true);
            flashModelo(ronda.vocal).then(function () {
                if (ronda && ronda.modeloBreve) aplicarSilueta(ronda, false);
                btn.disabled = false;
            });
        });
    }

    function lineasDelNivel(n) {
        var out = [];
        (n.bienvenida || []).forEach(function (l) { if (l.texto) out.push(l.texto); });
        (n.retos || []).forEach(function (r) {
            if (r.presenta && r.presenta.texto) out.push(r.presenta.texto);
            if (r.acierto && r.acierto.texto) out.push(r.acierto.texto);
        });
        if (n.cierre && n.cierre.texto) out.push(n.cierre.texto);
        return out;
    }

    document.addEventListener("DOMContentLoaded", function () {
        var crudo = readText("config.json?v=20261020f");
        gameConfig = JSON.parse(crudo);
        try { introConfig = JSON.parse(readText("../../intro.json")); } catch (e) { introConfig = {}; }
        var errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn("[ConstruyeLaVocal]", errores);
        aplicarLetterSpacing();
        aplicarTema(temaInicial());
        document.body.classList.toggle("sin-feedback", acc().mostrarFeedBack === false);
        if (window.TextoVoz) {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenPct() / 100,
                frasesExtra: [textos().eligeNivel, textos().demostracion, textos().demostracionAcierto, textos().demostracionFin].filter(Boolean)
            });
        }
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        enlazarVolumen();
        enlazarArrastre();
        enlazarPista();
        sincronizarDialogoIntro3d();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        var btnOmitir = $id("btn-omitir-intro3d");
        if (btnOmitir) btnOmitir.addEventListener("click", omitirIntro3d);
        var btnContinuar = $id("btn-continuar-intro3d");
        if (btnContinuar) {
            btnContinuar.addEventListener("click", function (ev) {
                ev.preventDefault();
                empezarJuegoTrasIntro();
            });
        }
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("pagehide", function () {
            if (window.TextoVoz) TextoVoz.vaciar();
        });
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
