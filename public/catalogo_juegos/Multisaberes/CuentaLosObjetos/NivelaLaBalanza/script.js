/* Nivela la balanza — rondas de equilibrio en la estación de carga espacial. */
(function () {
    "use strict";

    var L = window.NivelaBalanzaLogica;
    var S = window.NivelaBalanzaSfx;
    var PH = window.NivelaBalanzaPhaser;

    var gameConfig = null;
    var audioFondo = null;
    var nivel = null;
    var retos = [];
    var indiceReto = 0;
    var estado = null;
    var rondaGen = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var vozGen = 0;
    var ultimaLinea = null;
    var comprobando = false;

    function $id(id) { return document.getElementById(id); }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function readText(ruta) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }

    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }

    function perfil() {
        if (window.PedniaEdad && typeof PedniaEdad.perfil === "function") return PedniaEdad.perfil() || {};
        return window.__PEDNIA_PERFIL__ || {};
    }

    function pref(clave, defecto) {
        var a = acc();
        if (Object.prototype.hasOwnProperty.call(a, clave)) return a[clave];
        var v = perfil().valores || {};
        if (Object.prototype.hasOwnProperty.call(v, clave)) return v[clave];
        return defecto;
    }

    function audioInstrucciones() {
        var v = pref("audio_instruc", "automático");
        return !(v === false || v === "no" || v === "ninguno" || v === "off" || v === "desactivado");
    }

    function efectosActivos() {
        return pref("efectosSonido", true) !== false && pref("refuerzo_sonido", true) !== false
            && !document.body.classList.contains("sin-efectos");
    }

    function sfxSonar(tipo) { if (S && efectosActivos()) S.sonar(tipo); }

    function volumenPct() {
        var n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }

    function aplicarVolumen(pct) {
        var n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        var vol = n / 100;
        if (window.TextoVoz && typeof TextoVoz.definirVolumenFondo === "function") TextoVoz.definirVolumenFondo(vol);
        else if (audioFondo) audioFondo.volume = vol;
        var clase = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        var i1 = document.querySelector("#btn-menu-vol i");
        if (i1) i1.className = clase;
        var i2 = document.querySelector("#btn-volumen-balanza i");
        if (i2) i2.className = clase;
        var val = $id("vol-val");
        if (val) val.textContent = String(n);
    }

    function aplicarPreferencias() {
        if (window.PedniaMenuAcc) PedniaMenuAcc.aplicar(gameConfig);
    }

    function asegurarFondo() {
        if (pref("audio_fondo", true) === false) {
            if (audioFondo) audioFondo.pause();
            return;
        }
        var ruta = gameConfig.audios && gameConfig.audios.fondo;
        if (!ruta) return;
        if (!audioFondo) {
            audioFondo = new Audio(ruta);
            audioFondo.loop = true;
        }
        audioFondo.volume = volumenPct() / 100;
        if (window.TextoVoz && typeof TextoVoz.definirVolumenFondo === "function") {
            TextoVoz.definirVolumenFondo(audioFondo.volume);
        }
        var p = audioFondo.play();
        if (p && p.catch) p.catch(function () {});
    }

    /* ---------- Diálogo ---------- */

    function vozDe(linea) {
        if (!linea) return "zoe";
        if (linea.voz === "zeus" || linea.voz === "zoe") return linea.voz;
        return Number(linea.personaje) === 0 ? "zeus" : "zoe";
    }

    function marcarHabla(voz, activo) {
        document.body.classList.toggle("habla-zoe", activo && voz === "zoe");
        document.body.classList.toggle("habla-zeus", activo && voz === "zeus");
    }

    /**
     * Solo se ve el bocadillo del que habla: con los dos fijos en pantalla se
     * quedaba el mensaje anterior del otro personaje, de otro momento del juego.
     */
    function pintarBocadillo(voz, texto) {
        var el = $id(voz === "zeus" ? "bocadillo-zeus-texto" : "bocadillo-zoe-texto");
        if (el && texto) el.textContent = texto;
        document.body.classList.toggle("turno-zoe", voz === "zoe");
        document.body.classList.toggle("turno-zeus", voz === "zeus");
    }

    function decir(linea) {
        var texto = (linea && linea.texto) || "";
        var voz = vozDe(linea);
        pintarBocadillo(voz, texto);
        marcarHabla(voz, !!texto);
        ultimaLinea = { texto: texto, voz: voz };
        if (!texto) return sleep(200);
        var fin = function () { marcarHabla(voz, false); };
        if (!audioInstrucciones() || !window.TextoVoz) {
            return sleep(Math.min(2400, 480 + texto.length * 38)).then(fin);
        }
        return Promise.resolve(TextoVoz.hablar(texto, voz)).then(fin, fin);
    }

    function decirYa(linea) {
        vozGen += 1;
        if (window.TextoVoz && TextoVoz.detener) TextoVoz.detener();
        return decir(linea);
    }

    function dialogo(clave, datos) {
        var base = (gameConfig.dialogos && gameConfig.dialogos[clave]) || "";
        return L.plantilla(base, datos);
    }

    /* ---------- Ronda ---------- */

    function retoActual() { return retos[indiceReto] || {}; }

    function puedeInteractuar() {
        return !juegoTerminado && !!estado;
    }

    function actualizarProgreso() {
        var c = L.conteo(estado);
        var bar = $id("barra-progreso-rel");
        if (bar) bar.style.width = c.izquierda ? Math.round((c.derecha / c.izquierda) * 100) + "%" : "0%";
        var cont = $id("contador-cristales");
        if (cont) cont.textContent = c.derecha + "/" + c.izquierda;
    }

    /** Un cambio en los platillos: recalcula balanza, progreso y el botón. */
    /**
     * El botón se habilita en cuanto hay carga, sin delatar si la cantidad es
     * correcta: comprobar es parte del reto, no una consecuencia de acertar.
     */
    function actualizarComprobar() {
        var btn = $id("btn-comprobar");
        if (!btn) return;
        var c = L.conteo(estado);
        var listo = !juegoTerminado && c.derecha > 0;
        btn.disabled = !listo;
        btn.classList.toggle("activo", listo);
    }

    function trasCambio() {
        var c = L.conteo(estado);
        if (PH) PH.actualizarBalanza(c.izquierda, c.derecha);
        actualizarProgreso();
        actualizarComprobar();
    }

    /** Respuesta del niño: aquí se decide si la ronda está superada. */
    function comprobar() {
        if (!puedeInteractuar() || comprobando) return;
        var c = L.conteo(estado);
        if (!c.derecha) return;

        if (L.esVictoria(c.izquierda, c.derecha)) {
            comprobando = true;
            ganarRonda();
            return;
        }

        sfxSonar("error");
        if (PH) PH.senalarDesequilibrio();
        var reto = retoActual();
        decirYa(c.derecha > c.izquierda
            ? (reto.errorMuchos || { voz: "zoe", texto: dialogo("sobran", { n: c.derecha - c.izquierda }) })
            : (reto.errorPocos || { voz: "zoe", texto: dialogo("faltan", { n: c.izquierda - c.derecha }) }));
    }

    function alColocar(id) {
        if (!puedeInteractuar()) return;
        if (!L.colocar(estado, id)) return;
        if (PH) PH.colocarCristal(id);
        sfxSonar("colocar");
        trasCambio();
    }

    function alRetirar(id) {
        if (!puedeInteractuar()) return;
        if (!L.retirar(estado, id)) return;
        if (PH) PH.retirarCristal(id);
        sfxSonar("retirar");
        trasCambio();
    }

    function ganarRonda() {
        var reto = retoActual();
        var c = L.conteo(estado);
        if (PH) PH.habilitarArrastre(false);
        var btn = $id("btn-comprobar");
        if (btn) { btn.disabled = true; btn.classList.remove("activo"); }
        sfxSonar("equilibrio");

        decirYa(reto.acierto || { voz: "zeus", texto: dialogo("equilibrio", { n: c.izquierda }) });

        var promesa = PH ? PH.celebrarRonda(c.izquierda) : Promise.resolve();
        Promise.resolve(promesa).then(function () {
            indiceReto += 1;
            if (indiceReto >= retos.length) {
                secuenciaVictoria();
            } else {
                iniciarRonda();
            }
        });
    }

    function iniciarRonda() {
        var reto = retoActual();
        rondaGen += 1;
        var gen = rondaGen;
        estado = L.crearEstado(reto);
        comprobando = false;

        var titulo = $id("titulo-reto-balanza");
        if (titulo) titulo.textContent = (reto.titulo || "").toUpperCase();

        actualizarProgreso();
        actualizarComprobar();

        if (PH) PH.habilitarArrastre(false);

        var preparado = PH
            ? PH.prepararRonda({ objetivo: estado.objetivo, idsDeposito: estado.deposito.slice() })
            : Promise.resolve();

        Promise.resolve(preparado)
            .then(function () {
                if (gen !== rondaGen) return null;
                return decirYa(reto.presentacion || { voz: "zeus", texto: "" });
            })
            .then(function () {
                if (gen !== rondaGen) return null;
                var linea = reto.pregunta || { voz: "zoe", texto: "" };
                return decir({
                    voz: vozDe(linea),
                    texto: L.plantilla(linea.texto, { cantidad: estado.objetivo })
                });
            })
            .then(function () {
                if (gen !== rondaGen) return;
                if (PH) PH.habilitarArrastre(true);
            })
            .catch(function () {});
    }

    /* ---------- Victoria ---------- */

    var victoriaMostrada = false;

    function secuenciaVictoria() {
        if (victoriaMostrada) return;
        victoriaMostrada = true;
        juegoTerminado = true;

        var promesa = PH ? PH.celebrarFinal() : Promise.resolve();
        Promise.resolve(promesa).then(function () {
            sfxSonar("cofre");
            var total = PH ? PH.totalCofre() : 0;
            var base = (nivel && nivel.cierre && nivel.cierre[0] && nivel.cierre[0].texto)
                || "¡Excelente! ¡Nivelaste todas las balanzas!";
            var texto = base + " ¡Conseguiste " + total + " cristales!";

            var t = $id("texto_final");
            if (t) t.textContent = texto;

            if (audioInstrucciones() && window.TextoVoz) {
                try { TextoVoz.hablar(texto, "zeus"); } catch (e) {}
            }
            var cierre = gameConfig.audios && gameConfig.audios.cierre;
            if (cierre && efectosActivos()) {
                try { var a = new Audio(cierre); a.volume = 0.6; a.play().catch(function () {}); } catch (e) {}
            }

            /* final.js exige #final visible antes de cerrar las cortinas. */
            var final = $id("final");
            if (final) final.hidden = false;
            if (typeof window.iniciarSecuenciaVictoria === "function") {
                window.iniciarSecuenciaVictoria();
            }
        });
    }

    /* ---------- Arranque ---------- */

    function iniciarPartida() {
        retos = L.retosValidos(nivel);
        indiceReto = 0;
        juegoTerminado = false;
        victoriaMostrada = false;

        var montaje = PH ? PH.montar({
            parent: "phaser-juego",
            callbacks: {
                puedeInteractuar: puedeInteractuar,
                onColocar: alColocar,
                onRetirar: alRetirar,
                onSoltarFuera: function () { sfxSonar("regreso"); },
                onAgarrar: function () { sfxSonar("agarrar"); },
                onImpacto: function () { sfxSonar("impacto"); },
                onGema: function () { sfxSonar("gema"); }
            }
        }) : Promise.resolve();

        Promise.resolve(montaje).then(function () {
            var bienvenida = (nivel && nivel.bienvenida) || [];
            var cadena = Promise.resolve();
            bienvenida.forEach(function (linea) {
                cadena = cadena.then(function () { return decir(linea); });
            });
            cadena.then(iniciarRonda).catch(function () {});
        });
    }

    function enlazarUI() {
        var btnC = $id("btn-comprobar");
        if (btnC) btnC.addEventListener("click", comprobar);

        var btnP = $id("btn-pregunta-balanza");
        if (btnP) btnP.addEventListener("click", function () {
            if (!estado) return;
            var reto = retoActual();
            var linea = reto.pregunta;
            if (linea) {
                decirYa({
                    voz: vozDe(linea),
                    texto: L.plantilla(linea.texto, { cantidad: estado.objetivo })
                });
            } else if (ultimaLinea) {
                decirYa(ultimaLinea);
            }
        });

        var btnV = $id("btn-volumen-balanza");
        if (btnV) btnV.addEventListener("click", function () {
            var fab = $id("btn-menu-vol");
            if (fab) fab.click();
        });

        var rango = $id("rango-volumen");
        if (rango) rango.addEventListener("input", function () { aplicarVolumen(rango.value); });
    }

    function conversacionInicial() {
        return ((gameConfig.textos && gameConfig.textos.conversacion) || []).slice();
    }

    function sincronizarDialogoIntro3d() {
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        var personajesCfg = window.INTRO_CONFIG.personajes || [];
        var colores = (window.INTRO_CONFIG.dialogo && window.INTRO_CONFIG.dialogo.colores) || {};
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (linea) {
            var idx = Number(linea.personaje);
            var def = personajesCfg[isFinite(idx) ? idx : 0] || {};
            var id = def.id || (idx === 1 ? "zoe" : "zeus");
            var nombre = def.nombre || (id === "zoe" ? "Zoe" : "Zeus");
            var plano = (window.TextoVoz && TextoVoz.textoPlano)
                ? TextoVoz.textoPlano(linea.texto)
                : String(linea.texto || "").trim();
            return {
                personaje: id,
                nombre: nombre,
                color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"),
                texto: plano
            };
        });
    }

    function mostrarIntro3d() {
        if (typeof window.Phaser === "undefined") {
            empezarJuegoTrasIntro();
            return;
        }
        var root = $id("intro3d-root");
        if (root) root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        var root = $id("intro3d-root");
        if (!root) return;
        root.hidden = true;
        if (window.__introPhaser) {
            try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
            window.__introPhaser = null;
        }
        if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
    }

    function empezarJuegoTrasIntro() {
        if (arrancado) return;
        arrancado = true;
        if (window.TextoVoz && TextoVoz.detener) TextoVoz.detener();
        destruirIntro3d();
        var inicio = $id("pantalla-inicio");
        if (inicio) inicio.hidden = true;
        document.body.classList.remove("esperando-inicio");

        var niveles = gameConfig.niveles || [];
        if (window.PedniaEdad && typeof PedniaEdad.iniciarNivel === "function") {
            PedniaEdad.iniciarNivel({
                niveles: niveles,
                onElegido: function (n) {
                    nivel = n || niveles[0];
                    aplicarPreferencias();
                    asegurarFondo();
                    iniciarPartida();
                }
            });
        } else {
            nivel = niveles[0];
            aplicarPreferencias();
            asegurarFondo();
            iniciarPartida();
        }
    }

    function empecemosJuego() {
        var pantalla = $id("pantalla-inicio");
        var btn = $id("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (window.TextoVoz && TextoVoz.desbloquear) TextoVoz.desbloquear();
        if (window.TextoVoz && TextoVoz.precargar) TextoVoz.precargar();
        sincronizarDialogoIntro3d();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            pantalla.style.display = "none";
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "inicioDisuelve") ocultar();
        });
        window.setTimeout(ocultar, 1250);
    }

    function cargarConfig() {
        gameConfig = JSON.parse(readText("config.json"));
        if (window.PedniaPerfilJuego) {
            try { gameConfig = PedniaPerfilJuego.aplicar(gameConfig); } catch (e) {}
        }
    }

    function conectarArranque() {
        var btn = $id("btn-empecemos");
        if (btn) btn.addEventListener("click", empecemosJuego);
        var omitir = $id("btn-omitir-intro3d");
        if (omitir) omitir.addEventListener("click", function () {
            var root = $id("intro3d-root");
            if (!root || root.hidden) empezarJuegoTrasIntro();
            else window.dispatchEvent(new CustomEvent("intro3d-omitir"));
        });
        var cont = $id("btn-continuar-intro3d");
        if (cont) cont.addEventListener("click", empezarJuegoTrasIntro);
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.cerrar_anuncio = empezarJuegoTrasIntro;
    }

    document.addEventListener("DOMContentLoaded", function () {
        cargarConfig();
        var introCfg = {};
        try { introCfg = JSON.parse(readText("../../../intro.json")) || {}; } catch (e) { introCfg = {}; }
        if (window.TextoVoz && typeof TextoVoz.iniciar === "function") {
            TextoVoz.iniciar(gameConfig, introCfg, {
                obtenerAudioFondo: function () { return audioFondo; }
            });
        }
        aplicarVolumen(volumenPct());
        enlazarUI();
        conectarArranque();
    });
})();
