/**
 * script.js — El Pinball de Gravedad Mágica
 *
 * Flujo, igual que el resto de Polimotor:
 *   portada «¡Empecemos!» → intro 3D compartida (Zeus y Zoe; Omitir / CONTINUAR) → edad →
 *   presentación (la mesa se enciende, Zoe explica) → demostración automática →
 *   «¡Comenzar a jugar!» → tres rondas → celebración en la propia mesa → resumen final.
 *
 * No dibuja (mesa.js) ni decide la física (reglas.js): ordena el flujo, las voces y el HUD.
 */
(function () {
    "use strict";

    var cfg = null;
    var introConfig = null;
    var estado = null;
    var mesa = null;
    var R = null;
    var S = null;

    var FASE = {
        CARGA: "carga", PRESENTACION: "presentacion", DEMO: "demo", ESPERA: "espera",
        JUGANDO: "jugando", TRANSICION: "transicion", FINAL: "final"
    };
    var fase = FASE.CARGA;

    var rondaIndice = 0;
    var puntosTotales = 0;
    var golpesTotales = 0;
    var bucleId = null;
    var ultimoTick = 0;
    var relojSeguro = null;
    var temporizadorAyuda = null;
    var ultimoAviso = 0;
    var esperandoRelanzar = false;
    var msSinBola = 0;
    var cerrado = false;
    var vozActiva = null;

    function $(id) { return document.getElementById(id); }
    function texto(id, v) { var el = $(id); if (el) el.textContent = v; }
    function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function aleatorio(l) { return l && l.length ? l[Math.floor(Math.random() * l.length)] : ""; }
    function plantilla(t, d) { return (t || "").replace(/\{(\w+)\}/g, function (_, k) { return d[k] !== undefined ? d[k] : ""; }); }
    function acc() { return cfg.accesibilidad || (cfg.accesibilidad = {}); }
    /** Zoe y Zeus 3D (guia-3d.js, módulo que puede tardar en cargar). */
    /** Zoe 3D solo está en pantalla durante la presentación y la demo (guia-3d.js). */
    function zoe3d() { return window.Guia3D && window.Guia3D.listo() ? window.Guia3D : null; }
    function gesto(quien, nombre) { if (quien === "zoe" && zoe3d()) zoe3d().gesto(nombre); }
    function animarHabla(quien, on) { if (quien === "zoe" && zoe3d()) zoe3d().hablar(on); }
    /** El cielo del campamento reacciona a lo que pasa en la mesa (fondo.js). */
    function cielo(tipo, datos) { if (window.FondoPinball) window.FondoPinball.evento(tipo, datos); }

    // ------------------------------------------------------------------ arranque

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();

    function leerJson(ruta) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", ruta, false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 400) return JSON.parse(xhr.responseText);
        } catch (e) { console.warn("[pinball] no se pudo leer " + ruta, e); }
        return null;
    }

    /**
     * Modo ligero para tabletas con poca memoria (p. ej. 4 GB): menos resolución, sin sombras
     * difuminadas en la mesa y cielo a 30 cuadros. Se activa por la memoria o los núcleos del
     * equipo, o solo si durante el juego los cuadros tardan demasiado.
     */
    function detectarLigero() {
        var mem = navigator.deviceMemory;
        var nucleos = navigator.hardwareConcurrency;
        var tactil = (navigator.maxTouchPoints || 0) > 0;
        return !!((mem && mem <= 4) || (nucleos && nucleos <= 4) || (tactil && (!mem || mem <= 6)));
    }

    function activarLigero() {
        if (window.__pinballLigero && mesa && mesa.ligero) return;
        window.__pinballLigero = true;
        document.body.classList.add("ligero");
        if (mesa) { mesa.ligero = true; acomodar(); }
        if (window.FondoPinball && window.FondoPinball.ligero) window.FondoPinball.ligero(true);
    }

    var muestrasCuadro = [];
    function vigilarRendimiento(dt) {
        if (window.__pinballLigero) return;
        muestrasCuadro.push(dt);
        if (muestrasCuadro.length < 120) return;
        var media = muestrasCuadro.reduce(function (a, b) { return a + b; }, 0) / muestrasCuadro.length;
        muestrasCuadro = [];
        if (media > 24) activarLigero();     // menos de ~40 cuadros por segundo sostenidos
    }

    window.__pinballLigero = detectarLigero();

    function iniciar() {
        cfg = leerJson("config.json?v=20261120t");
        if (!cfg) { console.error("[pinball] sin config.json"); return; }
        introConfig = leerJson("../../intro.json") || {};
        introConfig.conversacion = cfg.textos.conversacion || [];
        R = window.ReglasPinball;
        S = window.SonidosPinball;

        sincronizarDialogoIntro3d();
        if (window.TextoVoz) {
            TextoVoz.iniciar(cfg, introConfig, { obtenerAudioFondo: function () { return null; }, volumenFondo: 0.2 });
        }

        estado = R.crearEstado(cfg);
        mesa = window.MesaPinball.crear($("mesa"), cfg);
        if (window.__pinballLigero) activarLigero();
        enlazarControles();
        enlazarMenus();
        aplicarAccesibilidad();
        pintarHud();

        var on = function (id, fn) { var b = $(id); if (b) b.addEventListener("click", fn); };
        on("btn-empecemos", empecemos);
        on("btn-omitir-intro3d", omitirIntro3d);
        on("btn-continuar-intro3d", function (ev) { ev.preventDefault(); empezarJuegoTrasIntro(); });
        on("btn-otra-vez", function () { location.reload(); });
        on("btn-al-menu", function () { history.back(); });
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);

        window.addEventListener("resize", function () { setTimeout(acomodar, 60); });
        document.addEventListener("visibilitychange", function () { ultimoTick = 0; });
        window.addEventListener("pagehide", function () {
            if (S) { S.musica(false); S.ambiente(false); S.pararRodadura(); }
            if (window.TextoVoz && TextoVoz.vaciar) TextoVoz.vaciar();
        });
    }

    // ------------------------------------------------------------------ intro 3D compartida

    function sincronizarDialogoIntro3d() {
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        var conversacion = cfg.textos.conversacion || [];
        var personajes = window.INTRO_CONFIG.personajes || [];
        var colores = window.INTRO_CONFIG.dialogo.colores || {};
        window.INTRO_CONFIG.dialogo.lineas = conversacion.map(function (linea) {
            var i = Number(linea.personaje);
            var def = personajes[isFinite(i) ? i : 0] || personajes[0] || {};
            var id = def.id || (i === 1 ? "zoe" : "zeus");
            var nombre = (introConfig && introConfig.personajes && introConfig.personajes[i] && introConfig.personajes[i].nombre)
                || (id === "zoe" ? "Zoe" : "Zeus");
            var plano = window.TextoVoz && TextoVoz.textoPlano ? TextoVoz.textoPlano(linea.texto) : linea.texto;
            return { personaje: id, nombre: nombre, color: colores[id] || (id === "zoe" ? "#8ec5ff" : "#f0c14d"), texto: plano };
        });
    }

    function empecemos() {
        var pantalla = $("pantalla-inicio");
        var btn = $("btn-empecemos");
        if (!pantalla || pantalla.hidden || pantalla.classList.contains("is-out")) return;
        if (btn) btn.disabled = true;
        if (window.TextoVoz) { TextoVoz.desbloquear(); if (TextoVoz.precargar) TextoVoz.precargar(); }
        if (S) { S.desbloquear(); S.ambiente(true); }
        if (window.VolumenPolimotor && VolumenPolimotor.iniciar) {
            VolumenPolimotor.iniciar({ sonidos: S, fondoPorDefecto: acc().volumenFondo || 35, efectosPorDefecto: 85 });
        }
        sincronizarDialogoIntro3d();
        pantalla.classList.add("is-out");
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () {
            if (oculto) return;
            oculto = true;
            pantalla.hidden = true;
            document.body.classList.remove("esperando-inicio");
        };
        pantalla.addEventListener("animationend", function (ev) { if (ev.animationName === "inicioDisuelve") ocultar(); });
        setTimeout(ocultar, 1250);
    }

    function mostrarIntro3d() {
        var root = $("intro3d-root");
        if (!root) { setTimeout(empezarJuegoTrasIntro, 1300); return; }
        root.hidden = false;
        document.body.classList.add("intro3d-activa");
        window.dispatchEvent(new CustomEvent("intro3d-start"));
    }

    function destruirIntro3d() {
        document.body.classList.remove("intro3d-activa");
        var root = $("intro3d-root");
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
        var root = $("intro3d-root");
        if (!root || root.hidden) { empezarJuegoTrasIntro(); return; }
        window.dispatchEvent(new CustomEvent("intro3d-omitir"));
    }

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        if (window.TextoVoz) TextoVoz.detener();
        destruirIntro3d();
        var p = $("principal");
        if (p) { p.classList.remove("aparece"); void p.offsetWidth; p.classList.add("aparece"); }
        if (S) S.musica(true);
        iniciarPartida();
    }

    function iniciarPartida() {
        if (!window.PedniaEdad) { presentar(); return; }
        PedniaEdad.iniciarNivel({
            niveles: cfg.niveles || [],
            elegirManual: elegirNivel,
            onElegido: function () { presentar(); }
        });
    }

    function elegirNivel() {
        var botones = "";
        (cfg.niveles || []).forEach(function (n) {
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-success btn-eleccion" onclick="confirmarNivel(\'' + n.id + '\')">' +
                "<strong>" + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
        });
        var titulo = cfg.textos.eligeNivel || "Elige tu edad";
        if (window.TextoVoz) TextoVoz.hablar(titulo, "zoe");
        Swal.fire({ title: titulo, html: '<hr><div class="row justify-content-center">' + botones + "</div><hr>", showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, scrollbarPadding: false, width: 420 });
    }

    window.confirmarNivel = function (id) {
        var nivel = (cfg.niveles || []).find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (nivel) presentar();
    };

    // ------------------------------------------------------------------ mesa, tamaño y bucle

    /**
     * Ajusta la mesa inclinada al espacio y acopla la consola de los botones a su pie: mismo
     * ancho que el borde inferior de la máquina y pegada a él, como el panel de mandos de un
     * pinball real.
     */
    function acomodar() {
        if (!mesa) return;
        window.MesaPinball.redimensionar(mesa);
        var r = $("mesa").getBoundingClientRect();
        var consola = $("controles-palancas");
        if (!consola || !r.width) return;
        consola.style.left = Math.round(r.left) + "px";
        consola.style.width = Math.round(r.width) + "px";
        consola.style.top = Math.round(r.bottom - 3) + "px";
        consola.classList.add("acoplada");
        document.documentElement.style.setProperty("--hueco-lado", Math.round(r.left) + "px");
    }

    function arrancarBucle() {
        if (bucleId !== null) return;
        ultimoTick = 0;
        bucleId = requestAnimationFrame(tick);
        if (!relojSeguro) {
            // Respaldo: si el navegador deja de entregar cuadros (pestaña o panel oculto,
            // ahorro de energía) aunque diga estar visible, el intervalo mantiene viva la
            // partida. Solo actúa cuando rAF lleva más de 120 ms sin llegar.
            relojSeguro = setInterval(function () {
                if (performance.now() - ultimoCuadro < 120) return;
                pasoLogico(33);
                window.MesaPinball.dibujar(mesa, estado, 33);
            }, 33);
        }
    }

    var ultimoCuadro = 0;

    function tick(ahora) {
        bucleId = requestAnimationFrame(tick);
        ultimoCuadro = performance.now();
        if (!ultimoTick) ultimoTick = ahora;
        var dt = Math.min(40, ahora - ultimoTick);
        ultimoTick = ahora;
        if (fase === FASE.JUGANDO) vigilarRendimiento(ahora - (tick.ultimo || ahora));
        tick.ultimo = ahora;
        pasoLogico(dt);
        window.MesaPinball.dibujar(mesa, estado, dt);
    }

    function pasoLogico(dt) {
        if (fase !== FASE.JUGANDO && fase !== FASE.DEMO && fase !== FASE.FINAL && fase !== FASE.PRESENTACION) return;

        // Red de seguridad: jugando sin bola es un estado muerto; la bola vuelve pase lo que pase.
        if (fase === FASE.JUGANDO && (!estado.bola || !estado.bola.viva)) {
            msSinBola += dt;
            if (msSinBola > ((cfg.juego.rescateMs || 1400) + 900)) {
                msSinBola = 0;
                esperandoRelanzar = false;
                lanzar();
            }
        } else {
            msSinBola = 0;
        }

        var eventos = R.avanzar(estado, dt, cfg);
        for (var i = 0; i < eventos.length; i++) atenderEvento(eventos[i]);

        if (estado.bola && estado.bola.viva && S) {
            var v = Math.sqrt(estado.bola.vx * estado.bola.vx + estado.bola.vy * estado.bola.vy);
            S.rodar(Math.min(1, v / estado.velocidadMaxima));
        }
        if (fase === FASE.JUGANDO) vigilarAviso();
    }

    function lanzar() {
        R.lanzarBola(estado);
        if (S) S.lanzamiento();
    }

    function atenderEvento(ev) {
        var M = window.MesaPinball;
        var jugando = fase === FASE.JUGANDO;
        switch (ev.tipo) {
            case "muro":
                if (S) S.rebote(ev.fuerza);
                if (ev.fuerza > 350) M.chispas(mesa, ev.x, ev.y, "#c5b3ff", 5);
                break;
            case "rampa":
                if (S) S.metalico();
                cielo("bumper", { color: "#b197fc" });
                mesa.lucesCarril = 1;
                M.chispas(mesa, ev.x, ev.y, "#b197fc", 6);
                break;
            case "rebotador":
                if (S) S.rebote(500);
                M.chispas(mesa, ev.x, ev.y, ev.color, 10);
                if (jugando) sumarPuntos(R.puntuar(estado, ev, cfg));
                break;
            case "bumper":
                if (S) S.bumper(ev.nota);
                M.chispas(mesa, ev.x, ev.y, ev.color, 16);
                cielo("bumper", { color: ev.color });
                mesa.flashMesa = Math.min(1, mesa.flashMesa + 0.4);
                if (jugando) sumarPuntos(R.puntuar(estado, ev, cfg));
                break;
            case "diana":
                if (S) S.diana();
                M.chispas(mesa, ev.x, ev.y, ev.color, 24);
                mesa.flashMesa = Math.min(1, mesa.flashMesa + 0.6);
                cielo("diana", { color: ev.color });
                if (jugando) { sumarPuntos(R.puntuar(estado, ev, cfg)); mensajeBreve(aleatorio(cfg.textos.diana)); gesto("zeus", "celebra"); }
                break;
            case "aro":
                if (S) S.estrella();
                M.chispas(mesa, ev.x, ev.y, "#ffd43b", 20);
                cielo("aro");
                mesa.flashMesa = Math.min(1, mesa.flashMesa + 0.5);
                if (jugando) sumarPuntos(R.puntuar(estado, ev, cfg));
                break;
            case "caida":
                atenderCaida();
                break;
            case "salidaTubo":
                // La bola cae a la mesa por la boca del tubo.
                if (S) S.metalico();
                M.chispas(mesa, ev.x, ev.y, ev.lado === "izquierda" ? "#3bc9db" : "#ff4fd8", 18);
                cielo("golpe", { lado: ev.lado });
                break;
            case "antiatasco":
                M.chispas(mesa, ev.x, ev.y, "#3bc9db", 8);
                break;
        }
    }

    // ------------------------------------------------------------------ caída y rescate

    /** La bola cae: animación amable, ánimo de Zoe y relanzamiento. Nunca reinicia ni resta. */
    function atenderCaida() {
        if (esperandoRelanzar) return;
        esperandoRelanzar = true;
        if (S) { S.pararRodadura(); S.caida(); }
        window.MesaPinball.chispas(mesa, estado.ancho / 2, estado.alto - 40, "#74c0fc", 18);
        cielo("caida");

        if (fase === FASE.DEMO || fase === FASE.PRESENTACION) {
            setTimeout(function () { esperandoRelanzar = false; lanzar(); }, 500);
            return;
        }
        if (fase !== FASE.JUGANDO) { esperandoRelanzar = false; return; }

        // El relanzamiento va ANTES de la voz: si la voz falla, la bola vuelve igual.
        setTimeout(function () {
            esperandoRelanzar = false;
            if (fase !== FASE.JUGANDO) return;
            if (S) S.rescate();
            lanzar();
        }, cfg.juego.rescateMs || 1400);
        decirRapido(aleatorio(cfg.textos.caida), "zoe", 2);
        gesto("zoe", "saluda");
    }

    // ------------------------------------------------------------------ avisos de anticipación

    /** «¡Ahí viene por la izquierda!» en la nube de Zeus, antes de que la bola llegue. */
    function vigilarAviso() {
        var ronda = rondaActual();
        if (!ronda || ronda.avisos === false) return;
        var lado = R.ladoDeAviso(estado, cfg.juego);
        if (!lado) return;
        var ahora = Date.now();
        if (ahora - ultimoAviso < 2400) return;
        ultimoAviso = ahora;
        mesa.aviso = { lado: lado, ms: 1300 };
        parpadearBoton(lado);
        cielo("aviso", { lado: lado });
        gesto("zeus", "senala");
        var largo = lado === "izquierda" ? cfg.textos.avisoIzquierdaLargo : cfg.textos.avisoDerechaLargo;
        var corto = lado === "izquierda" ? cfg.textos.avisoIzquierda : cfg.textos.avisoDerecha;
        nube("zeus", largo || corto, 2000);
        decirRapido(corto, "zeus", 1);
    }

    // ------------------------------------------------------------------ controles

    function enlazarControles() {
        [["btn-palanca-izq", "izquierda"], ["btn-palanca-der", "derecha"]].forEach(function (par) {
            var btn = $(par[0]);
            if (!btn) return;
            // pointerdown, no click: la palanca responde al contacto, sin retraso.
            btn.addEventListener("pointerdown", function (e) { e.preventDefault(); golpear(par[1]); });
            btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        });
        document.addEventListener("keydown", function (e) {
            if (e.repeat) return;
            var k = (e.key || "").toLowerCase();
            if (k === "arrowleft" || k === "a") { e.preventDefault(); golpear("izquierda"); }
            else if (k === "arrowright" || k === "d") { e.preventDefault(); golpear("derecha"); }
        });
        var canvas = $("mesa");
        canvas.addEventListener("pointerdown", function (e) {
            if (fase !== FASE.JUGANDO) return;
            var r = canvas.getBoundingClientRect();
            golpear(e.clientX < r.left + r.width / 2 ? "izquierda" : "derecha");
        });
    }

    /** Acciona una palanca. Tocar lejos de la bola nunca se castiga. */
    function golpear(lado) {
        if (document.body.classList.contains("demo-lock")) return;
        if (fase !== FASE.JUGANDO) return;
        animarBoton(lado);
        var res = R.activarFlipper(estado, lado);
        if (res.golpeo) {
            if (S) { S.flipper(lado); S.punto(); }
            var f = estado.flippers[lado];
            window.MesaPinball.chispas(mesa, f.pivoteX + Math.cos(f.angulo) * f.largo,
                f.pivoteY + Math.sin(f.angulo) * f.largo, lado === "izquierda" ? "#ff6b3d" : "#ffd43b", 14);
            sumarPuntos(R.puntuar(estado, { tipo: "flipper" }, cfg));
            cielo("golpe", { lado: lado });
            if (estado.racha >= 3) cielo("racha", { n: estado.racha });
            if (estado.golpes % 2 === 0) { mensajeBreve(aleatorio(cfg.textos.acierto)); gesto("zoe", "celebra"); }
            pintarHud();
            programarAyuda();
            comprobarFinDeRonda();
        } else if (S) {
            S.flipperVacio(lado);   // sonido suave, sin castigo
        }
    }

    function botonDe(lado) { return $(lado === "izquierda" ? "btn-palanca-izq" : "btn-palanca-der"); }

    function animarBoton(lado) {
        var b = botonDe(lado);
        if (!b) return;
        b.classList.add("pulsado");
        setTimeout(function () { b.classList.remove("pulsado"); }, 160);
    }

    function parpadearBoton(lado) {
        var b = botonDe(lado);
        if (!b) return;
        b.classList.remove("avisando");
        void b.offsetWidth;
        b.classList.add("avisando");
        setTimeout(function () { b.classList.remove("avisando"); }, 1300);
    }

    function resaltarBoton(lado, on) {
        var b = botonDe(lado);
        if (b) b.classList.toggle("resaltado", !!on);
    }

    // ------------------------------------------------------------------ HUD

    function pintarHud() {
        var total = (cfg.rondas || []).length;
        var ronda = rondaActual();
        var objetivo = ronda ? (ronda.golpesObjetivo || 6) : 0;
        texto("ronda-texto", plantilla(cfg.textos.rondaDe, { n: rondaIndice + 1, t: total }));
        texto("golpes-texto", plantilla(cfg.textos.golpesDe, { n: estado.golpes, t: objetivo }));
        pintarMarcador();
        var cont = $("golpes-puntos");
        if (cont) {
            var html = "";
            for (var i = 0; i < objetivo; i++) html += '<span class="punto-golpe' + (i < estado.golpes ? " lleno" : "") + '"></span>';
            cont.innerHTML = html;
        }
    }

    /** Marcador LED de 8 dígitos: los ceros de la izquierda quedan apagados. */
    function pintarMarcador() {
        var el = $("marcador-num");
        if (!el) return;
        var s = String(Math.min(99999999, puntosTotales));
        var ceros = 8 - s.length;
        el.innerHTML = '<span class="apagado">' + "0".repeat(ceros) + "</span>" + s;
    }

    function sumarPuntos(n) {
        if (!n) return;
        puntosTotales += n;
        pintarMarcador();
        var suma = $("marcador-suma");
        if (suma) {
            suma.textContent = "+" + n;
            suma.hidden = false;
            suma.style.animation = "none";
            void suma.offsetWidth;
            suma.style.animation = "";
            clearTimeout(suma._t);
            suma._t = setTimeout(function () { suma.hidden = true; }, 700);
        }
    }

    function mensajeBreve(t) {
        var el = $("mensaje");
        if (!el || !t) return;
        el.textContent = t;
        el.hidden = false;
        el.classList.remove("entra");
        void el.offsetWidth;
        el.classList.add("entra");
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.hidden = true; }, 1500);
    }

    function mostrarCartel(titulo, sub, ms) {
        return new Promise(function (resolver) {
            var el = $("cartel");
            if (!el) return resolver();
            texto("cartel-titulo", titulo || "");
            texto("cartel-sub", sub || "");
            $("cartel-sub").hidden = !sub;
            el.hidden = false;
            void el.offsetWidth;
            el.classList.add("visible");
            setTimeout(function () {
                el.classList.remove("visible");
                setTimeout(function () { el.hidden = true; resolver(); }, 320);
            }, ms || 1600);
        });
    }

    // ------------------------------------------------------------------ voz, Zoe y Zeus

    function nube(quien, t, ms) {
        var caja = $(quien === "zeus" ? "nube-zeus" : "nube-zoe");
        var span = $(quien === "zeus" ? "nube-zeus-texto" : "nube-zoe-texto");
        if (!caja || !span) return;
        if (!t) { caja.hidden = true; return; }
        span.textContent = t;
        caja.hidden = false;
        clearTimeout(caja._t);
        caja._t = setTimeout(function () { caja.hidden = true; }, ms || Math.min(8000, 1800 + t.length * 60));
    }

    function feedbackActivo() { return cfg.mostrarFeedBack !== false; }

    /**
     * Habla con la voz de Zoe o Zeus y muestra su nube. Siempre resuelve: si la voz no llega
     * (sin TTS en el servidor estático, por ejemplo), resuelve cuando se habría terminado de leer.
     */
    function hablar(t, quien) {
        if (!t) return Promise.resolve();
        quien = quien === "zeus" ? "zeus" : "zoe";
        var duracion = Math.min(9000, 1400 + t.length * 62);
        nube(quien, t, duracion + 600);
        animarHabla(quien, true);
        var fin = function () { animarHabla(quien, false); if (S) S.agachar(false); };
        var voz = Promise.resolve();
        if (feedbackActivo() && window.TextoVoz) {
            if (S) S.agachar(true);
            try { voz = Promise.resolve(TextoVoz.hablar(t, quien)).catch(function () {}); } catch (e) { voz = Promise.resolve(); }
        }
        // Si la voz falla al instante, se espera igual el tiempo de lectura.
        var p = Promise.all([voz, esperar(Math.min(duracion, 2200))])
            .then(function () { return Promise.race([voz, esperar(duracion)]); })
            .then(fin, fin);
        vozActiva = p;
        p.then(function () { if (vozActiva === p) vozActiva = null; });
        return p;
    }

    /** Frases cortas de la partida: no se encima sobre otra voz de igual o más prioridad. */
    var prioridadActiva = 0;
    function decirRapido(t, quien, prioridad) {
        if (!t) return;
        if (vozActiva && (prioridad || 1) <= prioridadActiva) { nube(quien, t, 1800); return; }
        if (vozActiva && window.TextoVoz && TextoVoz.detener) TextoVoz.detener();
        prioridadActiva = prioridad || 1;
        hablar(t, quien).then(function () { prioridadActiva = 0; });
    }

    // ------------------------------------------------------------------ presentación y demo

    function presentar() {
        fase = FASE.PRESENTACION;
        document.body.classList.remove("esperando-inicio");
        acomodar();
        setTimeout(acomodar, 300);   // las fuentes y el título terminan de cargar
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(acomodar);
        R.aplicarRonda(estado, rondaActual());
        arrancarBucle();
        pintarHud();

        // Las luces de los bumpers se encienden una a una.
        estado.bumpers.forEach(function (b, i) {
            setTimeout(function () { b.brillo = 1; if (S) S.bumper(b.nota); }, 500 + i * 350);
        });
        mesa.etiquetas = true;
        lanzar();

        var entrada = window.Guia3D ? window.Guia3D.entrar().catch(function () { return false; }) : Promise.resolve(false);
        Promise.all([mostrarCartel(cfg.textos.tituloIntro, cfg.textos.subtituloIntro, 1800), entrada])
            .then(function () { gesto("zoe", "senala"); return hablar(cfg.textos.introZoe, "zoe"); })
            .then(function () { return correrDemo(); })
            .then(function () {
                mesa.etiquetas = false;
                // Zoe se despide y sale: la partida se juega sin personajes en pantalla.
                nube("zoe", "");
                return window.Guia3D ? window.Guia3D.salir() : null;
            })
            .then(function () { return esperarBotonComenzar(); })
            .then(function () { return iniciarRonda(0); });
    }

    function correrDemo() {
        if (acc().mostrarIntro === false || !window.DemoPinball) { estado.bola = null; return Promise.resolve(); }
        fase = FASE.DEMO;
        document.body.classList.add("demo-lock");
        return (window.PedniaOmitirDemo ? window.PedniaOmitirDemo.correr(window.DemoPinball.ejecutar, apiDemo()) : window.DemoPinball.ejecutar(apiDemo()))
            .catch(function (e) { console.warn("[pinball] demo interrumpida", e); })
            .then(function () {
                document.body.classList.remove("demo-lock");
                manoFuera();
                resaltarBoton("izquierda", false);
                resaltarBoton("derecha", false);
                estado.bola = null;
                fase = FASE.ESPERA;
            });
    }

    function apiDemo() {
        return {
            estado: estado,
            cfg: cfg,
            esperar: esperar,
            sigueViva: function () { return !!(estado.bola && estado.bola.viva); },
            lanzar: lanzar,
            /**
             * Deja la bola cayendo justo sobre la palanca: el golpe que enseña la demo siempre
             * acierta. Una demostración donde la palanca falla enseña lo contrario.
             */
            colocarEnPalanca: function (lado) {
                if (!estado.bola || !estado.bola.viva) R.lanzarBola(estado, Math.random, true);
                estado.bola.enTubo = null;
                var f = estado.flippers[lado];
                var p = R.puntaFlipper(f);
                estado.bola.x = (f.pivoteX + p.x) / 2;
                estado.bola.y = f.pivoteY - 70;
                estado.bola.vx = lado === "izquierda" ? -40 : 40;
                estado.bola.vy = 180;
                estado.bola.estela.length = 0;
                mesa.aviso = { lado: lado, ms: 900 };
            },
            activarFlipper: function (lado) {
                animarBoton(lado);
                var res = R.activarFlipper(estado, lado);
                if (S) { if (res.golpeo) S.flipper(lado); else S.flipperVacio(lado); }
                return res;
            },
            manoSobre: manoSobre,
            manoFuera: manoFuera,
            resaltarBoton: resaltarBoton,
            decir: hablar
        };
    }

    function manoSobre(lado) {
        var b = botonDe(lado);
        var mano = $("mano-demo");
        if (!b || !mano) return;
        var r = b.querySelector(".arcade").getBoundingClientRect();
        mano.style.left = (r.left + r.width * 0.45) + "px";
        mano.style.top = (r.top + r.height * 0.4) + "px";
        mano.hidden = false;
        mano.classList.add("tocando");
    }

    function manoFuera() {
        var mano = $("mano-demo");
        if (!mano) return;
        mano.classList.remove("tocando");
        mano.hidden = true;
    }

    function esperarBotonComenzar() {
        return new Promise(function (resolver) {
            var wrap = $("comenzar-wrap");
            var btn = $("btn-comenzar");
            if (!wrap || !btn) return resolver();
            var et = btn.querySelector(".btn-comenzar-texto");
            if (et && cfg.textos.botonComenzar) et.textContent = cfg.textos.botonComenzar;
            wrap.hidden = false;
            btn.focus();
            btn.addEventListener("click", function alPulsar() {
                btn.removeEventListener("click", alPulsar);
                wrap.hidden = true;
                if (S) S.desbloquear();
                resolver();
            });
        });
    }

    // ------------------------------------------------------------------ rondas

    function rondaActual() { return (cfg.rondas || [])[rondaIndice] || null; }

    function iniciarRonda(indice) {
        rondaIndice = indice;
        estado.golpes = 0;
        estado.bola = null;
        esperandoRelanzar = false;
        fase = FASE.TRANSICION;
        var ronda = rondaActual();
        R.aplicarRonda(estado, ronda);
        acomodar();
        setTimeout(acomodar, 200);
        arrancarBucle();
        pintarHud();
        var intro = (cfg.textos.rondaInicio || [])[indice];
        return mostrarCartel(plantilla(cfg.textos.rondaSiguienteTitulo, { n: indice + 1 }), ronda ? ronda.nombre : "", 1500)
            .then(function () { return intro ? hablar(intro.texto, intro.pj) : null; })
            .then(function () {
                fase = FASE.JUGANDO;
                lanzar();
                programarAyuda();
            });
    }

    function comprobarFinDeRonda() {
        if (!R.rondaCompleta(estado, rondaActual())) return;
        fase = FASE.TRANSICION;
        golpesTotales += estado.golpes;
        limpiarAyuda();
        if (S) S.pararRodadura();
        sumarPuntos((cfg.puntos && cfg.puntos.rondaCompleta) || 100);
        estado.bola = null;
        var total = (cfg.rondas || []).length;
        if (S) S.estrella();
        cielo("ronda");
        gesto("zoe", "celebra");
        gesto("zeus", "celebra");
        mostrarCartel(plantilla(cfg.textos.rondaListaTitulo, { n: rondaIndice + 1 }),
            plantilla(cfg.textos.rondaListaSub, { c: estado.golpes }), 1700)
            .then(function () {
                if (rondaIndice + 1 < total) {
                    return hablar(cfg.textos.rondaLista, "zoe").then(function () { return iniciarRonda(rondaIndice + 1); });
                }
                return celebracionFinal();
            });
    }

    function programarAyuda() {
        limpiarAyuda();
        if (acc().ayudaAutomatica === false) return;
        temporizadorAyuda = setTimeout(function () {
            if (fase !== FASE.JUGANDO) return;
            decirRapido(aleatorio(cfg.textos.ayuda), "zoe", 1);
            temporizadorAyuda = setTimeout(programarAyuda, cfg.juego.ayudaRepetirMs || 13000);
        }, cfg.juego.ayudaMs || 11000);
    }

    function limpiarAyuda() {
        if (temporizadorAyuda) { clearTimeout(temporizadorAyuda); temporizadorAyuda = null; }
    }

    // ------------------------------------------------------------------ celebración final

    /** La mesa se convierte en máquina de celebración: no es un simple modal. */
    function celebracionFinal() {
        fase = FASE.FINAL;
        limpiarAyuda();
        document.body.classList.add("celebrando");
        cielo("celebrar");
        gesto("zoe", "final");
        gesto("zeus", "final");
        var M = window.MesaPinball;

        // 1. Último impulso hacia los bumpers.
        R.lanzarBola(estado, Math.random, true);
        estado.bola.x = estado.ancho / 2;
        estado.bola.y = estado.flippers.izquierda.pivoteY - 120;
        estado.bola.vx = 120;
        estado.bola.vy = -estado.velocidadMaxima;
        if (S) S.lanzamiento();
        ["izquierda", "derecha"].forEach(function (l, i) {
            setTimeout(function () { R.activarFlipper(estado, l); animarBoton(l); }, 200 + i * 200);
        });

        return esperar(800)
            .then(function () {
                // 2-4. Bumpers, dianas y rampas en secuencia.
                estado.bumpers.forEach(function (b, i) {
                    setTimeout(function () { b.brillo = 1; if (S) S.bumper(b.nota); M.chispas(mesa, b.x, b.y, b.color, 22); }, i * 220);
                });
                estado.dianas.forEach(function (d, i) {
                    setTimeout(function () { d.encendida = true; d.brillo = 1; if (S) S.diana(); M.chispas(mesa, d.x, d.y, d.color, 18); }, 900 + i * 240);
                });
                setTimeout(function () { mesa.lucesCarril = 1; estado.rampas.forEach(function (r) { r.brillo = 1; }); }, 1500);
                return esperar(1900);
            })
            .then(function () {
                // 6-8. La bola al centro, la máquina encendida y lluvia de estrellas.
                estado.bola = null;
                mesa.celebrando = true;
                mesa.flashMesa = 1;
                if (estado.aro) estado.aro.brillo = 1;
                M.estrellasCelebracion(mesa, 80);
                if (S) { S.pararRodadura(); S.victoria(); }
                return esperar(700);
            })
            .then(function () {
                var t = $("trofeo");
                if (t) { t.hidden = false; t.classList.add("entra"); }
                if (S) S.estrella();
                gesto("zoe", "celebra");
                gesto("zeus", "celebra");
                nube("zeus", cfg.textos.finalZeus, 5000);
                return hablar(cfg.textos.final, "zoe");
            })
            .then(mostrarPanelFinal);
    }

    function mostrarPanelFinal() {
        var panel = $("final-panel");
        if (!panel) return;
        var objetivoTotal = (cfg.rondas || []).reduce(function (s, r) { return s + (r.golpesObjetivo || 0); }, 0);
        var copia = Object.assign({}, estado, { golpes: golpesTotales });
        var n = R.estrellas(copia, objetivoTotal);
        texto("final-titulo", cfg.textos.finalTitulo || "");
        texto("final-sub", cfg.textos.finalSub || "");
        texto("res-puntos", String(puntosTotales));
        texto("res-golpes", String(golpesTotales));
        texto("res-racha", String(estado.mejorRacha));
        texto("res-rondas", String((cfg.rondas || []).length));
        var est = panel.querySelectorAll("#final-estrellas i");
        for (var i = 0; i < est.length; i++) {
            est[i].classList.toggle("apagada", i >= n);
            if (i < n) (function (k) { setTimeout(function () { est[k].classList.add("brilla"); if (S) S.estrella(); }, 280 * k); })(i);
        }
        var otra = $("btn-otra-vez");
        var menu = $("btn-al-menu");
        if (otra && cfg.textos.botonOtraVez) otra.querySelector("span").textContent = cfg.textos.botonOtraVez;
        if (menu && cfg.textos.botonMenu) menu.querySelector("span").textContent = cfg.textos.botonMenu;
        panel.hidden = false;
        void panel.offsetWidth;
        panel.classList.add("visible");
        if (otra) otra.focus();
    }

    // ------------------------------------------------------------------ menús

    function enlazarMenus() {
        var pares = [["btn-menu-acc", "menu-acc-panel"], ["btn-menu-vol", "menu-vol-panel"]];
        pares.forEach(function (p) {
            var btn = $(p[0]);
            var panel = $(p[1]);
            if (!btn || !panel) return;
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                var abrir = panel.hidden;
                pares.forEach(function (q) {
                    var o = $(q[1]);
                    var b = $(q[0]);
                    if (o) o.hidden = true;
                    if (b) b.setAttribute("aria-expanded", "false");
                });
                panel.hidden = !abrir;
                btn.setAttribute("aria-expanded", abrir ? "true" : "false");
            });
            // volumen.js puede rehacer el contenido del panel: se delega el cierre.
            panel.addEventListener("click", function (e) {
                if (e.target.closest(".panel-cerrar, #btn-cerrar-menu-acc, #btn-cerrar-menu-vol")) {
                    panel.hidden = true;
                    btn.setAttribute("aria-expanded", "false");
                }
                e.stopPropagation();
            });
            panel.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        });
        document.addEventListener("pointerdown", function () {
            pares.forEach(function (p) {
                var panel = $(p[1]);
                var btn = $(p[0]);
                if (panel && !panel.hidden) { panel.hidden = true; if (btn) btn.setAttribute("aria-expanded", "false"); }
            });
        });
        pintarMenuAcc();
    }

    function pintarMenuAcc() {
        var cont = $("menu-acc-ops");
        if (!cont) return;
        var a = acc();
        var opciones = [
            { clave: "altoContraste", etiqueta: "Alto contraste", icono: "fa-circle-half-stroke" },
            { clave: "menosEfectos", etiqueta: "Menos efectos", icono: "fa-wand-magic-sparkles" },
            { clave: "mostrarProgreso", etiqueta: "Mostrar progreso", icono: "fa-list-check" },
            { clave: "ayudaAutomatica", etiqueta: "Ayuda automática", icono: "fa-hand-sparkles" },
            { clave: "mostrarIntro", etiqueta: "Mostrar demostración", icono: "fa-play" }
        ];
        cont.innerHTML = "";
        opciones.forEach(function (op) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "panel-op";
            b.setAttribute("aria-pressed", a[op.clave] ? "true" : "false");
            b.innerHTML = '<i class="fa-solid ' + op.icono + '"></i><span>' + op.etiqueta + "</span>";
            b.addEventListener("click", function (e) {
                e.stopPropagation();
                a[op.clave] = !a[op.clave];
                b.setAttribute("aria-pressed", a[op.clave] ? "true" : "false");
                aplicarAccesibilidad();
            });
            cont.appendChild(b);
        });
    }

    function aplicarAccesibilidad() {
        var a = acc();
        document.body.classList.toggle("alto-contraste", !!a.altoContraste);
        document.body.classList.toggle("sin-progreso", a.mostrarProgreso === false);
        if (mesa) mesa.menosEfectos = !!a.menosEfectos;
        if (window.FondoPinball) window.FondoPinball.menosEfectos(!!a.menosEfectos);
        if (a.letterSpacing !== undefined) {
            document.documentElement.style.setProperty("--hc-letter-spacing", (Number(a.letterSpacing) / 2) + "px");
        }
    }

    // Expuesto para las pruebas automatizadas.
    window.__pinball = {
        estado: function () { return estado; },
        fase: function () { return fase; },
        golpear: golpear,
        irARonda: function (i) {
            cerrado = true;
            document.body.classList.remove("demo-lock", "esperando-inicio", "intro3d-activa");
            var pi = $("pantalla-inicio"); if (pi) pi.hidden = true;
            var ir = $("intro3d-root"); if (ir) ir.hidden = true;
            mesa.etiquetas = false;
            return iniciarRonda(i);
        },
        presentar: presentar,
        forzarFinal: celebracionFinal
    };

})();
