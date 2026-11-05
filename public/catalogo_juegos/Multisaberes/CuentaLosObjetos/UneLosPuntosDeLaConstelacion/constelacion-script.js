/**
 * Orquestación del juego "Une los puntos de la constelación".
 *
 * Archivo propio y no el script.js de CompletaElDibujo: ese está copiado byte
 * a byte en los ocho subjuegos de la categoría, así que tocarlo los rompería
 * todos. Aquí solo vive el pegamento entre el shell compartido (intro3d, TTS,
 * accesibilidad, victoria) y el motor Phaser de constelacion/.
 */
(function () {
    "use strict";

    var J = window.ConstelacionJuego;
    var P = window.ConstelacionProgreso;
    var N = window.ConstelacionNiveles;

    var JUEGO_SLUG = "conecta-las-estrellas-del-cohete-espacial-unir-puntos";

    var gameConfig = null;
    var introConfig = null;
    var cerrado = false;
    var audioFondo = null;
    var progreso = null;
    var nivelEnCurso = null;
    var enMapa = false;
    var montado = false;
    /* En viaje entre mundos: bloquea el botón MAPA y la elección de planeta
       hasta que la nave aterriza y arranca el nivel siguiente. */
    var viajando = false;

    function $id(id) { return document.getElementById(id); }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }

    function dialogos() { return (gameConfig && gameConfig.dialogos) || {}; }

    function sfx() { return window.ConstelacionSfx || null; }

    function volumenFondoPct() {
        var acc = (gameConfig && gameConfig.accesibilidad) || {};
        var n = Number(acc.volumenFondo);
        return isFinite(n) ? n : 20;
    }

    // ------------------------------------------------------------------
    // Lectura de config (igual que el resto del catálogo: XHR sincrónico
    // sobre un JSON junto al index, para no depender de fetch ni de módulos)
    // ------------------------------------------------------------------

    function leerTexto(ruta) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", ruta, false);
            xhr.send(null);
            return xhr.status >= 200 && xhr.status < 400 ? xhr.responseText : null;
        } catch (e) {
            return null;
        }
    }

    function reproducirAudio(src, volumen, enBucle) {
        if (!src) return null;
        try {
            var a = new Audio(src);
            a.volume = volumen == null ? 0.2 : volumen;
            a.loop = !!enBucle;
            var p = a.play();
            if (p && p.catch) p.catch(function () {});
            return a;
        } catch (e) {
            return null;
        }
    }

    function asegurarAudioFondo() {
        if (audioFondo) {
            var p = audioFondo.play();
            if (p && p.catch) p.catch(function () {});
            return audioFondo;
        }
        var vol = (typeof TextoVoz !== "undefined" && TextoVoz.VOLUMEN_FONDO != null)
            ? TextoVoz.VOLUMEN_FONDO
            : volumenFondoPct() / 100;
        audioFondo = reproducirAudio((gameConfig.audios || {}).fondo, vol, true);
        return audioFondo;
    }

    // ------------------------------------------------------------------
    // Diálogos de Zeus y Zoe sobre el canvas
    // ------------------------------------------------------------------

    var tokenDialogo = 0;

    function hablar(texto, voz, alTerminar) {
        if (!texto) { if (alTerminar) alTerminar(); return; }
        tokenDialogo += 1;
        var mio = tokenDialogo;
        var quien = voz === "zoe" ? "zoe" : "zeus";

        var burbuja = $id("bocadillo-" + quien + "-texto");
        if (burbuja) burbuja.textContent = texto;
        var cont = $id("pj-" + quien);
        if (cont) cont.classList.add("hablando");

        function cerrar() {
            if (mio !== tokenDialogo) return;
            if (cont) cont.classList.remove("hablando");
            if (alTerminar) alTerminar();
        }

        var prometido = null;
        try {
            if (typeof TextoVoz !== "undefined") {
                /* hablar() devuelve una Promise y solo admite onInicio: el
                   final se recoge del then, no de un callback. */
                prometido = TextoVoz.hablar(texto, quien);
            }
        } catch (e) {
            prometido = null;
        }
        if (prometido && prometido.then) {
            prometido.then(cerrar, cerrar);
        } else {
            /* Sin TTS (preview sin endpoint, o sin red) el juego no puede
               quedarse esperando: se cierra por tiempo estimado. */
            setTimeout(cerrar, Math.min(7000, 1400 + texto.length * 55));
        }
    }

    function callar() {
        tokenDialogo += 1;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
    }

    function plantilla(txt, datos) {
        return String(txt || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? datos[k] : m;
        });
    }

    // ------------------------------------------------------------------
    // HUD
    // ------------------------------------------------------------------

    function pintarHud(datos) {
        var titulo = $id("titulo-nivel");
        if (titulo && nivelEnCurso) titulo.textContent = nivelEnCurso.titulo;

        var cont = $id("contador-estrellas");
        if (cont && datos) cont.textContent = datos.hechas + "/" + datos.total;

        var barra = $id("barra-progreso-rel");
        if (barra && datos && datos.total) {
            barra.style.width = Math.round((datos.hechas / datos.total) * 100) + "%";
        }

        var pista = $id("pista-numero");
        if (pista && datos) {
            pista.textContent = datos.completo ? "¡Listo!" : "Busca el " + datos.esperado;
        }
    }

    function pintarMedallas() {
        var caja = $id("medallas-niveles");
        if (!caja || !progreso) return;
        caja.innerHTML = "";
        N.NIVELES.forEach(function (niv) {
            var est = progreso.niveles[niv.id] || {};
            var punto = document.createElement("span");
            punto.className = "medalla-nivel" +
                (est.completado ? " es-completo" : "") +
                (est.desbloqueado ? " es-abierto" : " es-cerrado") +
                (nivelEnCurso && nivelEnCurso.id === niv.id ? " es-actual" : "");
            punto.textContent = String(niv.id);
            punto.title = niv.planeta.nombre;
            caja.appendChild(punto);
        });
    }

    // ------------------------------------------------------------------
    // Flujo de niveles
    // ------------------------------------------------------------------

    function botonMapa(visible) {
        var b = $id("btn-mapa");
        if (b) b.hidden = !visible;
    }

    function arrancarNivel(nivelId) {
        enMapa = false;
        callar();
        var res = J.jugarNivel(nivelId);
        if (!res) return;
        nivelEnCurso = res.nivel;
        P.registrarIntento(N.total(), nivelId);
        progreso = P.leer(N.total());
        pintarMedallas();
        pintarHud(J.datosEstado());
        botonMapa(true);

        var d = dialogos();
        var texto = nivelId === 1
            ? (d.inicio || "")
            : plantilla(d.inicioNivel, { n: res.estrellas.length, nivel: nivelId });
        hablar(texto, "zeus");
    }

    /** Deja el HUD en estado de mapa: aquí no hay nivel en curso. */
    function hudDeMapa(enViaje) {
        nivelEnCurso = null;
        var titulo = $id("titulo-nivel");
        if (titulo) titulo.textContent = "MAPA ESTELAR";
        var cont = $id("contador-estrellas");
        if (cont) cont.textContent = "—";
        var barra = $id("barra-progreso-rel");
        if (barra) barra.style.width = "0%";
        var pista = $id("pista-numero");
        if (pista) pista.textContent = enViaje ? "Viajando…" : "Elige un planeta";
    }

    /**
     * Mapa en modo consulta: lo abre el niño con el botón MAPA y elige planeta.
     */
    function abrirMapa() {
        enMapa = true;
        viajando = false;
        callar();
        progreso = P.leer(N.total());
        botonMapa(false);
        hudDeMapa(false);
        pintarMedallas();

        J.mostrarMapa(progreso, function (nivelId) {
            if (sfx()) sfx().tono("boton");
            arrancarNivel(nivelId);
        }, null, null);

        hablar(dialogos().mapa, "zoe");
    }

    /**
     * Transición entre niveles: se muestra el mapa, la nave viaja del mundo
     * recién completado al siguiente y al llegar arranca ese nivel sola. El
     * niño no tiene que elegir nada — el juego avanza con él.
     */
    function viajarAlSiguiente(desdeNivel, haciaNivel) {
        enMapa = true;
        viajando = true;
        callar();
        progreso = P.leer(N.total());
        botonMapa(false);
        hudDeMapa(true);
        pintarMedallas();

        /* Durante el viaje los planetas no responden al toque: si el niño
           tocara otro mundo a media animación se solaparían dos niveles. */
        var mapa = J.mostrarMapa(progreso, null, haciaNivel, desdeNivel);

        /* Red de seguridad: el aviso de llegada lo dispara un temporizador de
           la escena, y si esta se destruye o pausa a media animación nunca
           llegaría. Sin esto el juego se quedaría atascado en el mapa. */
        var espera = ((mapa && mapa.duracionViaje) || 1700) + 2500;
        setTimeout(function () {
            if (!viajando) return;
            viajando = false;
            arrancarNivel(haciaNivel);
        }, espera);

        hablar(plantilla(dialogos().desbloqueo, { nivel: haciaNivel }), "zoe");
    }

    /** Cierre del juego: insignia y victoria 3D compartida. */
    function terminarJuego() {
        callar();
        var nivelCfg = (gameConfig.niveles || [])[0] || {};
        var cierre = nivelCfg.cierre || [];
        var texto = $id("texto_final");
        if (texto && cierre[0]) texto.textContent = cierre[0].texto || "";

        var trofeo = document.querySelector("#victoria .trofeo");
        if (trofeo && nivelCfg.insignia && nivelCfg.insignia.img) {
            trofeo.src = nivelCfg.insignia.img;
        }

        if (sfx()) sfx().tono("victoria");
        hablar(cierre[0] && cierre[0].texto, (cierre[0] && cierre[0].voz) || "zeus");

        /* final.js exige que #final esté visible ANTES de llamar: si no, las
           cortinas se quedan cerradas y tapan la pantalla. */
        var fin = $id("final");
        if (fin) fin.hidden = false;
        if (typeof window.iniciarSecuenciaVictoria === "function") {
            window.iniciarSecuenciaVictoria();
        }
    }

    // ------------------------------------------------------------------
    // Montaje del motor
    // ------------------------------------------------------------------

    function montarJuego(alEstarListo) {
        if (montado) { if (alEstarListo) alEstarListo(); return; }
        montado = true;

        J.montar("phaser-juego", {
            listo: function () {
                if (alEstarListo) alEstarListo();
            },
            nivelListo: function (d) {
                /* El motor avisa del nivel que acaba de montar: así el HUD
                   queda bien aunque se entre por el mapa o se reinicie. */
                if (d && d.nivel) nivelEnCurso = d.nivel;
                pintarMedallas();
                pintarHud(J.datosEstado());
            },
            conexion: function (d) {
                if (sfx()) sfx().tono("conexion", d.numero);
                pintarHud(J.datosEstado());
            },
            error: function (d) {
                if (sfx()) sfx().tono("error");
                pintarHud(J.datosEstado());
                hablar(plantilla(dialogos().error, { n: d.esperado }), "zeus");
            },
            fueraDeTurno: function (d) {
                if (sfx()) sfx().tono("error");
                hablar(plantilla(dialogos().error, { n: d.esperado }), "zeus");
            },
            completo: function (d) {
                if (sfx()) sfx().tono("completo");
                var r = P.completar(N.total(), d.nivel, {
                    errores: d.errores,
                    tiempoSeg: d.tiempoSeg
                });
                progreso = r.estado;
                pintarMedallas();
                pintarHud(J.datosEstado());
                hablar(dialogos().completo, "zoe");
            },
            pasoNave: function (d) {
                if (!sfx()) return;
                if (d.paso === "motores") sfx().tono("motores");
                if (d.paso === "despegue") sfx().tono("despegue");
            },
            /* La nave del nivel terminó su despegue: toca mostrar el mapa y
               viajar al mundo siguiente. */
            naveDespego: function (d) {
                progreso = P.leer(N.total());
                if (P.todosCompletados(progreso, N.total())) {
                    terminarJuego();
                    return;
                }
                var siguiente = Number(d.nivel) + 1;
                if (progreso.niveles[siguiente] && progreso.niveles[siguiente].desbloqueado) {
                    viajarAlSiguiente(Number(d.nivel), siguiente);
                } else {
                    abrirMapa();
                }
            },
            /* La nave aterrizó en el planeta nuevo: se entra al nivel sin
               pedirle nada al niño. */
            naveLlego: function (d) {
                if (!viajando) return;
                viajando = false;
                arrancarNivel(d.nivel);
            }
        });
    }

    /** Llamado por PedniaEdad tras resolver el nivel de edad (único: 5-6). */
    window.confirmarNivel = function () {
        montarJuego(function () {
            /* El progreso no sobrevive a la recarga: toda partida empieza en
               el nivel 1, sin pantalla intermedia. */
            progreso = P.reiniciar(N.total());
            arrancarNivel(1);
        });
    };

    // ------------------------------------------------------------------
    // Shell compartido
    // ------------------------------------------------------------------

    function conversacionInicial() {
        return (textos().conversacion || []).slice();
    }

    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (linea) {
            var id = Number(linea.personaje) === 1 ? "zoe" : "zeus";
            return {
                personaje: id,
                nombre: id === "zoe" ? "Zoe" : "Zeus",
                color: id === "zoe" ? "#8ec5ff" : "#f0c14d",
                texto: String(linea.texto || "")
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
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) {
                try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                window.__introPhaser = null;
            }
            if (typeof window.__intro3dDispose === "function") window.__intro3dDispose();
            root.remove();
        }, 400);
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.detener();
        asegurarAudioFondo();
        if (typeof TextoVoz !== "undefined") TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        if (window.jQuery) window.jQuery("#fondo_blanco").stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        var pantalla = $id("pantalla-inicio");
        if (pantalla) { pantalla.classList.add("is-out"); pantalla.hidden = true; }
        var principal = $id("principal");
        if (principal) principal.style.display = "block";

        /* Un solo nivel de edad (5-6): PedniaEdad resuelve sin preguntar nada
           cuando la lista trae una sola entrada. */
        if (window.PedniaEdad) {
            window.PedniaEdad.iniciarNivel({
                niveles: gameConfig.niveles || [],
                onElegido: function (nivel) { window.confirmarNivel(nivel && nivel.id); }
            });
        } else {
            window.confirmarNivel("5-6");
        }
    }

    function empecemosJuego() {
        var pantalla = $id("pantalla-inicio");
        if (!pantalla || pantalla.classList.contains("is-out")) return;
        var btn = $id("btn-empecemos");
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== "undefined") TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== "undefined" && TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
        };
        pantalla.addEventListener("animationend", function (ev) {
            if (ev.animationName === "disuelve") ocultar();
        });
        setTimeout(ocultar, 1200);
    }

    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    function enlazarMenuVol() {
        var rango = $id("rango-volumen");
        var val = $id("vol-val");
        if (!rango) return;
        rango.value = String(volumenFondoPct());
        if (val) val.textContent = String(volumenFondoPct());
        rango.addEventListener("input", function () {
            var n = Number(rango.value);
            if (val) val.textContent = String(n);
            if (audioFondo) audioFondo.volume = n / 100;
            if (typeof TextoVoz !== "undefined" && TextoVoz.definirVolumenFondo) {
                TextoVoz.definirVolumenFondo(n / 100);
            }
        });
    }

    function enlazarBotones() {
        var mapa = $id("btn-mapa");
        if (mapa) mapa.addEventListener("click", function () {
            if (enMapa || viajando) return;
            if (sfx()) sfx().tono("boton");
            abrirMapa();
        });

        var repetir = $id("btn-pregunta");
        if (repetir) repetir.addEventListener("click", function () {
            var d = J.datosEstado();
            if (!d) { hablar(dialogos().mapa, "zoe"); return; }
            hablar(plantilla(dialogos().pista, { n: d.esperado }), "zeus");
        });

        var vol = $id("btn-volumen");
        if (vol) vol.addEventListener("click", function () {
            var panel = $id("menu-vol-panel");
            if (panel) panel.hidden = !panel.hidden;
        });
    }

    // ------------------------------------------------------------------
    // Arranque
    // ------------------------------------------------------------------

    function iniciar() {
        var bruto = leerTexto("config.json");
        var introBruto = leerTexto("../../../intro.json");
        if (!bruto) {
            console.error("[Constelacion] no se pudo leer config.json");
            return;
        }
        gameConfig = JSON.parse(bruto);
        introConfig = introBruto ? JSON.parse(introBruto) : {};

        progreso = P.leer(N.total());
        pintarMedallas();

        var btn = $id("btn-empecemos");
        if (btn) {
            btn.addEventListener("pointerdown", function (ev) {
                ev.preventDefault();
                empecemosJuego();
            });
            btn.addEventListener("click", empecemosJuego);
        }

        try {
            if (typeof TextoVoz !== "undefined") {
                TextoVoz.iniciar(gameConfig, introConfig, {
                    obtenerAudioFondo: function () { return audioFondo; },
                    volumenFondo: volumenFondoPct() / 100,
                    frasesExtra: [
                        dialogos().inicio, dialogos().error,
                        dialogos().completo, dialogos().mapa
                    ].filter(Boolean)
                });
            }
        } catch (e) {
            console.warn(e);
        }

        enlazarMenuVol();
        enlazarBotones();
        if (window.PedniaMenuAcc) window.PedniaMenuAcc.iniciar(gameConfig, function () {});
        sincronizarDialogoIntro3d();

        var omitir = $id("btn-omitir-intro3d");
        if (omitir) omitir.addEventListener("click", function () {
            if (cerrado) return;
            var root = $id("intro3d-root");
            if (!root || root.hidden) empezarJuegoTrasIntro();
            else window.dispatchEvent(new CustomEvent("intro3d-omitir"));
        });

        var seguir = $id("btn-continuar-intro3d");
        if (seguir) seguir.addEventListener("click", function (ev) {
            ev.preventDefault();
            empezarJuegoTrasIntro();
        });

        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
            }
        });

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
})();
