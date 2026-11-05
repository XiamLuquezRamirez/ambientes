/* Constructores del Espacio — progresión por mundos y viaje espacial. */
(function () {
    "use strict";

    var L = window.CoheteEstelarLogica;
    var S = window.CoheteEstelarSfx;
    var PH = window.ConstructoresEspacioPhaser;

    var gameConfig = null;
    var audioFondo = null;
    var nivel = null;
    var mundos = [];
    var longitudes = [];
    var indiceMundo = 0;
    var estado = null;
    var viajando = false;
    var juegoTerminado = false;
    var arrancado = false;
    var vozGen = 0;
    var ultimaLinea = null;

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
        var i2 = document.querySelector("#btn-volumen-cohete i");
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

    function pintarBocadillo(voz, texto) {
        var el = $id(voz === "zeus" ? "bocadillo-zeus-texto" : "bocadillo-zoe-texto");
        if (el && texto) el.textContent = texto;
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

    function plantilla(clave, datos) {
        var base = (gameConfig.dialogos && gameConfig.dialogos[clave]) || "";
        return base.replace(/\{(\w+)\}/g, function (_, k) {
            return datos && datos[k] != null ? datos[k] : "";
        });
    }

    /* ---------- Mundo actual ---------- */

    function mundoActual() { return mundos[indiceMundo] || {}; }

    function puedeInteractuar() {
        return !viajando && !juegoTerminado && !!estado && !L.completado(estado);
    }

    function colocar(bloqueId) {
        if (!puedeInteractuar()) return;
        var res = L.colocarBloque(estado, bloqueId);

        if (!res.ok) {
            if (res.motivo === "fuera-de-orden") {
                sfxSonar("error");
                if (PH) PH.rechazar(bloqueId);
                decirYa({ voz: "zeus", texto: plantilla("fueraDeOrden", { n: res.esperado }) });
            } else {
                sfxSonar("error");
            }
            return;
        }

        if (PH) PH.encajar(bloqueId, res.slot);
        sfxSonar("bloque");
        anunciarNumero(res.orden);
        actualizarProgreso();
        actualizarLanzar();

        var gen = estado;
        if (res.completo) {
            if (PH) PH.marcarListo();
            var ac = mundoActual().acierto || { voz: "zoe", texto: "¡El cohete está listo!" };
            setTimeout(function () { if (estado === gen) decirYa(ac); }, 500);
        } else {
            var siguiente = L.numeroEsperado(estado);
            if (siguiente != null) {
                setTimeout(function () {
                    /* el estado cambia al viajar: no pisar el mundo nuevo */
                    if (estado === gen && puedeInteractuar()) {
                        pintarBocadillo("zeus", plantilla("siguiente", { n: siguiente }));
                    }
                }, 650);
            }
        }
    }

    function anunciarNumero(n) {
        if (!audioInstrucciones() || !window.TextoVoz) return;
        TextoVoz.hablar(L.palabraNumero(n), "zoe");
    }

    function actualizarProgreso() {
        var n = estado ? L.cuantosColocados(estado) : 0;
        var meta = estado ? estado.meta : 0;
        var bar = $id("barra-progreso-rel");
        if (bar) bar.style.width = meta ? Math.round((n / meta) * 100) + "%" : "0%";
        var cont = $id("contador-bloques");
        if (cont) cont.textContent = n + "/" + meta;
    }

    function actualizarLanzar() {
        var btn = $id("btn-lanzar");
        if (!btn || !estado) return;
        var listo = L.secuenciaCorrecta(estado);
        btn.disabled = !listo || viajando || juegoTerminado;
        btn.classList.toggle("completo", listo);
    }

    function esUltimoMundo() { return indiceMundo >= mundos.length - 1; }

    function intentarLanzar() {
        if (!estado || viajando || juegoTerminado) return;
        if (!L.secuenciaCorrecta(estado)) {
            sfxSonar("error");
            if (PH) PH.senalarFaltantes();
            decirYa({ voz: "zeus", texto: plantilla("incompleto", {}) });
            return;
        }

        viajando = true;
        actualizarLanzar();
        sfxSonar("despegue");

        if (esUltimoMundo()) {
            juegoTerminado = true;
            document.body.classList.add("viaje-final");
            if (PH && typeof PH.viajeFinal === "function") {
                setTimeout(secuenciaVictoria, 10000);
                PH.viajeFinal(secuenciaVictoria);
            } else if (PH) {
                PH.despegar(secuenciaVictoria);
            } else {
                setTimeout(secuenciaVictoria, 900);
            }
            return;
        }

        var destino = mundos[indiceMundo + 1];
        decirYa({ voz: "zoe", texto: plantilla("despegue", { mundo: destino.nombre }) });

        var siguiente = indiceMundo + 1;
        var est = L.crearEstado(destino, longitudes[siguiente], Math.random, false);

        if (PH) {
            var aterrizado = false;
            document.body.classList.add("viaje-final");
            var llegar = function () {
                if (aterrizado) return;
                aterrizado = true;
                document.body.classList.remove("viaje-final");
                indiceMundo = siguiente;
                estado = est;
                viajando = false;
                presentarMundo();
            };
            /* red de seguridad: si una animación se interrumpe, no dejar el
               juego bloqueado para siempre. El crucero dura unos 4,5 s. */
            setTimeout(llegar, 11000);
            PH.viajar({
                ambiente: destino.ambiente || {},
                meta: est.meta,
                total: est.total,
                secuencia: est.secuencia,
                indiceDestino: siguiente
            }, llegar);
        } else {
            indiceMundo = siguiente;
            estado = est;
            viajando = false;
            presentarMundo();
        }
    }

    function presentarMundo() {
        var m = mundoActual();
        var titulo = $id("titulo-reto-cohete");
        if (titulo) titulo.textContent = m.titulo || m.nombre || "";
        var etiqueta = $id("mundo-actual");
        if (etiqueta) etiqueta.textContent = m.nombre || "";

        actualizarProgreso();
        actualizarLanzar();

        var gen = estado;
        decirYa(m.bienvenida || { voz: "zoe", texto: "¡Llegamos!" })
            .then(function () {
                if (estado !== gen) return null;
                return decir({
                    voz: "zeus",
                    texto: plantilla("pedir", {
                        n: estado.meta,
                        desde: estado.secuencia[0],
                        hasta: estado.secuencia[estado.secuencia.length - 1]
                    })
                });
            })
            .then(function () {
                if (estado !== gen) return;
                var n = L.numeroEsperado(estado);
                if (n != null) pintarBocadillo("zeus", plantilla("siguiente", { n: n }));
            })
            .catch(function () {});
    }

    var victoriaMostrada = false;

    function secuenciaVictoria() {
        if (victoriaMostrada) return;
        victoriaMostrada = true;
        document.body.classList.remove("viaje-final");
        var texto = (nivel && nivel.cierre && nivel.cierre[0] && nivel.cierre[0].texto)
            || "¡Excelente! ¡Visitaste todos los mundos del espacio!";

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
    }

    /* ---------- Arranque ---------- */

    function iniciarPartida() {
        mundos = gameConfig.mundos || [];
        longitudes = L.repartirLongitudes(mundos.length, Math.random);
        indiceMundo = 0;
        juegoTerminado = false;
        viajando = false;

        var primero = mundos[0] || {};
        /* El primer mundo arranca siempre en el 1: es la toma de contacto. */
        estado = L.crearEstado(primero, longitudes[0], Math.random, true);

        var colores = L.PALETA.map(function (h) { return parseInt(String(h).replace("#", ""), 16); });

        var montaje = PH ? PH.montar({
            parent: "phaser-juego",
            total: estado.total,
            colores: colores,
            mundos: mundos,
            callbacks: {
                puedeInteractuar: puedeInteractuar,
                onSoltarEnCohete: colocar,
                onSoltarFuera: function () { sfxSonar("regreso"); },
                onAgarrar: function () { sfxSonar("numero"); }
            }
        }) : Promise.resolve();

        Promise.resolve(montaje).then(function () {
            if (PH) {
                PH.prepararMundo({
                    meta: estado.meta,
                    total: estado.total,
                    secuencia: estado.secuencia,
                    ambiente: primero.ambiente || {},
                    instantaneo: true
                });
                PH.marcarMinimapa(0);
            }
            presentarMundo();
        });
    }

    function enlazarUI() {
        var btn = $id("btn-lanzar");
        if (btn) btn.addEventListener("click", intentarLanzar);

        var btnP = $id("btn-pregunta-cohete");
        if (btnP) btnP.addEventListener("click", function () {
            if (!estado) return;
            var n = L.numeroEsperado(estado);
            if (n != null) decirYa({ voz: "zeus", texto: plantilla("siguiente", { n: n }) });
            else if (ultimaLinea) decirYa(ultimaLinea);
        });

        var btnV = $id("btn-volumen-cohete");
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
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenPct() / 100
            });
        }
        aplicarPreferencias();
        enlazarUI();
        conectarArranque();
        aplicarVolumen(volumenPct());
    });
})();
