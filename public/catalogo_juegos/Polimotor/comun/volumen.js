/**
 * VolumenPolimotor — control único de volumen para todos los juegos de Polimotor.
 *
 * Separa el sonido en dos canales que el niño o el docente regulan por aparte desde el botón
 * de volumen del juego:
 *
 *   - fondo:   música y ambiente en bucle (el zumbido de la escena, la melodía del tema).
 *   - efectos: todo lo que responde a la acción — toques, aciertos, fallos, celebraciones — y
 *              también la voz de Zoe y Zeus, para que las instrucciones nunca queden
 *              inaudibles cuando se baja la música.
 *
 * Un solo archivo gobierna las tres fuentes de audio que usan los juegos:
 *
 *   1. El `sonidos.js` propio de cada juego (Web Audio sintetizado). Expone volumen()/silenciar();
 *      los que además traen buses separados reciben volumenFondo()/volumenEfectos() (ver más abajo).
 *   2. window.PedniaAudio (Howler): música del tema por `agacharMusica` y efectos del sprite.
 *   3. window.TextoVoz: música de fondo del config (definirVolumenFondo) y voz (ttsPlayer).
 *
 * Construye su propio contenido dentro de #menu-vol-panel e inyecta sus estilos, así que funciona
 * igual en los juegos con las clases `panel-flotante`/`panel-op` y en los que usan
 * `menu-acc-panel`/`menu-acc-op`. No hace falta tocar el CSS de cada juego.
 *
 * Las dos preferencias se guardan en localStorage y valen para todos los juegos de Polimotor:
 * lo que el docente ajusta en un juego se respeta en el siguiente. El `config.json` del juego
 * (accesibilidad.volumenFondo) solo da el valor inicial la primera vez.
 *
 * Uso en el juego (ver docs/juegos-volumen-polimotor.md):
 *
 *   VolumenPolimotor.iniciar({
 *       sonidos: window.SonidosTiro,          // opcional: el módulo sonidos.js del juego
 *       fondoPorDefecto: 45,                  // opcional (si no, el del config o 20)
 *       efectosPorDefecto: 80,                // opcional
 *       alCambiar: function (v) { ... }        // opcional: {fondo, efectos, mudo} en 0..100
 *   });
 *
 * Y para consultar el factor que debe aplicar un sonido suelto:
 *   VolumenPolimotor.ganaciaEfectos()  → 0..1    VolumenPolimotor.ganaciaFondo() → 0..1
 */
(function (global) {
    "use strict";

    var CLAVE = "pednia_vol_polimotor";
    var doc = global.document;

    // Estado en 0..100, como el slider.
    var est = { fondo: 20, efectos: 80, mudo: false };
    var sonidos = null;
    var alCambiar = null;
    var iniciado = false;

    function limitar(n, min, max) {
        n = Number(n);
        if (!isFinite(n)) return min;
        return Math.max(min, Math.min(max, n));
    }

    // ------------------------------------------------------------------ preferencia guardada

    function leerGuardado() {
        try {
            var txt = global.localStorage.getItem(CLAVE);
            if (!txt) return null;
            var o = JSON.parse(txt);
            return o && typeof o === "object" ? o : null;
        } catch (e) {
            return null;   // modo privado o almacenamiento lleno: se usa el valor por defecto
        }
    }

    function guardar() {
        try {
            global.localStorage.setItem(CLAVE, JSON.stringify(est));
        } catch (e) { /* noop: sin guardar, el juego sigue funcionando */ }
    }

    // ------------------------------------------------------------------ dos buses en Web Audio

    /*
     * Los `sonidos.js` de Polimotor son 18 archivos escritos por separado: unos tienen buses
     * `maestro`/`efectos`/`amb`, otros un compresor `salida`, y los más simples conectan cada
     * nota directo a `ctx.destination`. Lo único común a todos es que TODO termina en
     * `ctx.destination`.
     *
     * Así que este archivo interpone dos nodos de ganancia delante de `destination`:
     *
     *     nodos de fondo  → ganFondo  ─┐
     *                                  ├→ destination (el real)
     *     nodos de efecto → ganEfectos ┘
     *
     * La intervención se hace en el getter `AudioContext.prototype.destination`, no en connect():
     * los módulos leen `ctx.destination` una sola vez, al armar su mezcla, y guardan esos buses en
     * su closure, donde no se pueden alcanzar después. Interceptando el getter, esa primera
     * lectura ya devuelve el bus de este archivo.
     *
     * El reparto se decide por el momento de la lectura: mientras corre `ambiente()` o `musica()`
     * del módulo (métodos que este archivo envuelve), lo que pida `destination` recibe el bus de
     * fondo; el resto del tiempo, el de efectos. Los nodos de fondo son de larga duración y se
     * crean dentro de esas llamadas, mientras los efectos se disparan en cualquier otro momento,
     * de modo que la ventana reparte bien sin tocar ninguno de los 18 archivos.
     */
    var ganFondo = null, ganEfectos = null, ctxAudio = null;
    var enFondo = 0;             // > 0 mientras se está creando audio de fondo
    var connectParcheado = false;

    /**
     * Prepara los dos buses sobre el contexto que ya creó el juego.
     *
     * Un juego puede usar varios AudioContext a lo largo de la partida (la intro 3D crea el suyo
     * y lo cierra al terminar; luego el juego abre otro), así que los buses se rehacen cada vez
     * que aparece un contexto distinto o el actual queda cerrado: si no, los sliders moverían la
     * ganancia de un contexto muerto y no se oiría ningún cambio.
     */
    var creandoBuses = false;
    function prepararBuses(ctx, destinoReal) {
        if (!ctx || creandoBuses) return false;
        if (ctxAudio === ctx && ctxAudio.state !== "closed" && ganFondo && ganEfectos) return true;
        creandoBuses = true;
        destinoDirecto++;                       // dentro de esta llamada, `destination` es el real
        try {
            var dest = destinoReal || ctx.destination;
            var fondo = ctx.createGain();
            var efectos = ctx.createGain();
            fondo.gain.value = ganaciaFondo();
            efectos.gain.value = ganaciaEfectos();
            var conectar = connect0 || global.AudioNode.prototype.connect;
            conectar.call(fondo, dest);
            conectar.call(efectos, dest);
            ctxAudio = ctx;
            ganFondo = fondo;
            ganEfectos = efectos;
            return true;
        } catch (e) {
            return false;
        } finally {
            destinoDirecto--;
            creandoBuses = false;
        }
    }

    /**
     * Desvía cualquier `connect(destination)` al bus que corresponda. Es la única vía general que
     * sirve para los 18 módulos sin editarlos uno por uno.
     */
    var connect0 = null;

    /** ¿Ese contexto es el de Howler? (lo usa PedniaAudio y se regula por su propia API). */
    function esDeHowler(ctx) {
        var H = global.Howler;
        return !!(H && H.ctx && ctx === H.ctx);
    }

    /**
     * Interviene `AudioContext.prototype.destination` para que devuelva el bus que toca en lugar
     * del destino real.
     *
     * Es la pieza clave: los `sonidos.js` leen `ctx.destination` UNA sola vez, al crear su mezcla
     * (`maestro.connect(ctx.destination)`), y esos buses viven en el closure del módulo, fuera de
     * alcance. Interceptando el getter, esa primera lectura ya entrega el bus de este archivo, y
     * todo lo que cuelgue del módulo queda dentro del canal correspondiente sin tocar su código.
     *
     * Devuelve el destino real para el grafo de Howler (se regula por su API) y para los propios
     * buses, que sí deben llegar a la salida.
     */
    function parchearDestination() {
        if (!global.AudioContext && !global.webkitAudioContext) return;
        [global.AudioContext, global.webkitAudioContext, global.OfflineAudioContext].forEach(function (AC) {
            if (!AC || !AC.prototype || AC.prototype.__volParcheado) return;
            var proto = AC.prototype;
            // El descriptor puede estar en BaseAudioContext, más arriba en la cadena.
            var p = proto, desc = null;
            while (p && !desc) {
                desc = Object.getOwnPropertyDescriptor(p, "destination");
                if (!desc) p = Object.getPrototypeOf(p);
            }
            if (!desc || typeof desc.get !== "function") return;
            var get0 = desc.get;
            try {
                Object.defineProperty(p, "destination", {
                    configurable: true,
                    enumerable: desc.enumerable,
                    get: function () {
                        var real = get0.call(this);
                        try {
                            recordarContexto(this);
                            if (destinoDirecto > 0 || esDeHowler(this)) return real;
                            if (!prepararBuses(this, real)) return real;
                            return enFondo > 0 ? ganFondo : ganEfectos;
                        } catch (e) {
                            return real;
                        }
                    }
                });
                proto.__volParcheado = true;
            } catch (e) { /* sin el parche, el juego suena como antes */ }
        });
    }

    // Mientras es > 0, `destination` entrega el destino real (al conectar los propios buses).
    var destinoDirecto = 0;

    /*
     * Contextos de audio vistos en la página. Se guardan porque un juego puede dejar atrás el
     * contexto de la intro 3D (cerrado) y seguir sonando en otro: cuando eso pasa, los buses se
     * rehacen sobre el contexto vivo, ya que el módulo no vuelve a leer `destination`.
     */
    var contextos = [];
    function recordarContexto(ctx) {
        if (ctx && contextos.indexOf(ctx) < 0) contextos.push(ctx);
    }

    /** Rehace los buses sobre un contexto que siga sonando, si el actual quedó cerrado. */
    function rehacerSobreContextoVivo() {
        for (var i = contextos.length - 1; i >= 0; i--) {
            var c = contextos[i];
            if (c && c.state !== "closed" && !esDeHowler(c)) {
                if (prepararBuses(c)) return true;
            }
        }
        return false;
    }

    function parchearConnect() {
        if (connectParcheado || !global.AudioNode) return;
        connectParcheado = true;
        connect0 = global.AudioNode.prototype.connect;
        parchearDestination();
        registrarContextosNuevos();
    }

    /**
     * Anota cada AudioContext que se cree en la página. Hace falta para rehacer los buses cuando
     * el contexto que los sostenía se cierra (la intro 3D cierra el suyo al entrar al juego) y el
     * módulo de sonidos, que ya leyó `destination`, no vuelve a pedirlo.
     */
    function registrarContextosNuevos() {
        ["AudioContext", "webkitAudioContext"].forEach(function (nombre) {
            var AC = global[nombre];
            if (!AC || AC.__volEnvoltorio) return;
            function Envuelto() {
                var inst = arguments.length
                    ? new (Function.prototype.bind.apply(AC, [null].concat([].slice.call(arguments))))()
                    : new AC();
                recordarContexto(inst);
                return inst;
            }
            Envuelto.prototype = AC.prototype;
            Envuelto.__volEnvoltorio = true;
            try { global[nombre] = Envuelto; } catch (e) { /* noop */ }
        });
    }

    /**
     * Envuelve `ambiente()` y `musica()` del módulo de sonidos para marcar la ventana en la que
     * los nodos creados son de fondo. `musica()` de algunos juegos devuelve un objeto con forma
     * de <audio> que se usa después, así que la ventana se mantiene abierta también sobre sus
     * `play()` y su setter de `volume`.
     */
    function envolverFondo(mod) {
        if (!mod || mod.__volEnvuelto) return;
        try { mod.__volEnvuelto = true; } catch (e) { return; }
        ["ambiente", "musica"].forEach(function (nombre) {
            var original = mod[nombre];
            if (typeof original !== "function") return;
            mod[nombre] = function () {
                enFondo++;
                try {
                    var r = original.apply(this, arguments);
                    if (r && typeof r === "object" && typeof r.play === "function" && !r.__volEnvuelto) {
                        r.__volEnvuelto = true;
                        var play0 = r.play;
                        r.play = function () {
                            enFondo++;
                            try { return play0.apply(this, arguments); }
                            finally { enFondo--; }
                        };
                    }
                    return r;
                } finally {
                    enFondo--;
                }
            };
        });
    }

    // ------------------------------------------------------------------ aplicar a las 3 fuentes

    function ganaciaFondo() { return est.mudo ? 0 : est.fondo / 100; }
    function ganaciaEfectos() { return est.mudo ? 0 : est.efectos / 100; }

    /** Lleva los dos niveles a los buses de Web Audio, con una rampa corta (sin chasquidos). */
    function aplicarBuses() {
        if (!ctxAudio || ctxAudio.state === "closed") {
            // El contexto murió (típico: el de la intro 3D, que se cierra al entrar al juego) y el
            // módulo ya leyó `destination`, así que no volverá a pedirlo por su cuenta. Se busca
            // el contexto vivo y se rehacen los buses sobre él; si no, los sliders no moverían nada.
            rehacerSobreContextoVivo();
            if (!ctxAudio || ctxAudio.state === "closed") return;
        }
        var t = ctxAudio.currentTime;
        try {
            if (ganFondo) ganFondo.gain.setTargetAtTime(ganaciaFondo(), t, 0.05);
            if (ganEfectos) ganEfectos.gain.setTargetAtTime(ganaciaEfectos(), t, 0.05);
        } catch (e) { /* noop */ }
    }

    /**
     * Lleva los dos niveles a cada fuente de audio presente.
     *
     * Con un `sonidos.js` que separa buses (volumenFondo/volumenEfectos) se usa esa vía. Los que
     * solo tienen volumen() reciben el mayor de los dos canales como volumen maestro, y la
     * diferencia entre canales la aplica el juego al pedir cada sonido; así ninguno se queda mudo.
     */
    function aplicar() {
        var vFondo = ganaciaFondo();
        var vEfectos = ganaciaEfectos();

        // 1. sonidos.js del juego.
        //    Unos pocos módulos tienen sus dos buses (`amb` y `efectos`) colgando de un único
        //    compresor: desde fuera no se pueden separar, así que exponen volumenFondo() y
        //    volumenEfectos() y se usan esos. Los demás se reparten solos con los buses de este
        //    archivo, y entonces su volumen propio se deja al máximo para no atenuar dos veces.
        if (sonidos) {
            // Cada método se aplica por separado: hay módulos sin música propia que solo traen
            // volumenEfectos().
            if (typeof sonidos.volumenFondo === "function") sonidos.volumenFondo(est.mudo ? 0 : est.fondo);
            if (typeof sonidos.volumenEfectos === "function") sonidos.volumenEfectos(est.mudo ? 0 : est.efectos);
            if (typeof sonidos.volumen === "function") sonidos.volumen(100);
            if (typeof sonidos.silenciar === "function") sonidos.silenciar(est.mudo);
        }
        aplicarBuses();

        // 2. TextoVoz: música de fondo del config y voz (la voz sigue a Efectos)
        tomarTextoVoz();
        var tv = global.TextoVoz;
        if (tv && tv.__volFijar) tv.__volFijar(vFondo);
        aplicarVozYMedios(vEfectos, vFondo);

        // 3. PedniaAudio (Howler): música del tema por `agachar`; los efectos del sprite se
        //    escalan en envolverPedniaAudio(), que multiplica el volumen de cada llamada.
        var pa = global.PedniaAudio;
        if (pa && pa.activo && typeof pa.agacharMusica === "function") {
            // Sin segundo argumento el factor queda fijo (no se restaura solo).
            pa.agacharMusica(vFondo);
        }
        envolverPedniaAudio();

        if (typeof alCambiar === "function") {
            try { alCambiar({ fondo: est.fondo, efectos: est.efectos, mudo: est.mudo }); } catch (e) { /* noop */ }
        }
    }

    /**
     * El script.js de cada juego sigue llamando a `TextoVoz.definirVolumenFondo()` con su propio
     * porcentaje (su slider antiguo), lo que pisaría el nivel de este archivo. Se envuelve esa
     * función: las llamadas del juego se ignoran y manda el canal Fondo. `__volFijar` es la vía
     * interna que usa aplicar().
     *
     * El "ducking" de TextoVoz (bajar la música mientras habla Zoe) se conserva: lo hace por
     * `volumenFondo()`, que no se toca, y se reaplica al terminar de hablar.
     */
    var tvTomado = false;
    function tomarTextoVoz() {
        var tv = global.TextoVoz;
        if (tvTomado || !tv) return;
        var definir = tv.definirVolumenFondo;
        if (typeof definir !== "function") return;
        tvTomado = true;
        tv.__volFijar = function (v) { return definir.call(tv, v); };
        tv.definirVolumenFondo = function () {
            // Se descarta el valor del juego y se impone el del canal Fondo.
            return definir.call(tv, ganaciaFondo());
        };
    }

    /**
     * Escala los efectos de PedniaAudio (sprite de Howler) con el canal Efectos. Su música y sus
     * efectos salen por el mismo nodo de Howler, así que no se pueden separar en el grafo: el
     * fondo se regula con agacharMusica() y aquí se multiplica el volumen de cada efecto.
     * `archivo()` también pasa por aquí (acierto/error/cierre del config del juego).
     */
    var paEnvuelto = false;
    function envolverPedniaAudio() {
        var pa = global.PedniaAudio;
        if (paEnvuelto || !pa || !pa.activo) return;
        paEnvuelto = true;

        ["efecto", "evento"].forEach(function (nombre) {
            var original = pa[nombre];
            if (typeof original !== "function") return;
            pa[nombre] = function (clave, opts) {
                var o = {};
                if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
                o.vol = (o.vol == null ? 1 : o.vol) * ganaciaEfectos();
                return original.call(this, clave, o);
            };
        });

        var archivo0 = pa.archivo;
        if (typeof archivo0 === "function") {
            pa.archivo = function (ruta, vol, loop) {
                var base = vol == null ? 0.85 : vol;
                // Un archivo en bucle es música de fondo; suelto, es un efecto.
                return archivo0.call(this, ruta, base * (loop ? ganaciaFondo() : ganaciaEfectos()), loop);
            };
        }
    }

    /**
     * La voz de TextoVoz suena por un <audio> interno (ttsPlayer) que no expone API de volumen.
     * Se ajusta el volumen de los elementos de audio de la página: los que están en bucle son
     * música de fondo, el resto son voz o efectos sueltos.
     */
    function aplicarVozYMedios(vEfectos, vFondo) {
        if (!doc) return;
        var medios = doc.querySelectorAll("audio, video");
        for (var i = 0; i < medios.length; i++) {
            var m = medios[i];
            try {
                m.volume = m.loop ? vFondo : vEfectos;
            } catch (e) { /* noop */ }
        }
    }

    // El ttsPlayer se crea después de iniciar, así que se vuelve a aplicar cada vez que un
    // <audio> nuevo empieza a sonar (una sola intercepción, no un temporizador).
    var playParcheado = false;
    function vigilarMediosNuevos() {
        if (playParcheado || !global.HTMLMediaElement) return;
        playParcheado = true;
        var play0 = global.HTMLMediaElement.prototype.play;
        global.HTMLMediaElement.prototype.play = function () {
            try {
                this.volume = this.loop ? ganaciaFondo() : ganaciaEfectos();
            } catch (e) { /* noop */ }
            return play0.apply(this, arguments);
        };
    }

    // ------------------------------------------------------------------ panel del botón de volumen

    /*
     * Estilos del panel de dos canales. Van en el propio archivo (no en comun/interfaz.css) para
     * que baste con cargar volumen.js: un juego que no traiga interfaz.css se ve igual.
     * Complementan los de cada juego (.panel-rango / .menu-acc-rango), sin pisar sus colores.
     */
    var CSS =
        "#menu-vol-panel .vol-canal{display:flex;flex-direction:column;align-items:stretch;gap:6px;cursor:default}" +
        "#menu-vol-panel .vol-canal>span{display:flex;align-items:center;gap:6px;justify-content:space-between;white-space:nowrap}" +
        "#menu-vol-panel .vol-canal>span>i{flex:0 0 auto;opacity:.75}" +
        "#menu-vol-panel .vol-canal>span>strong{margin-left:auto;font-variant-numeric:tabular-nums}" +
        "#menu-vol-panel .vol-canal input[type=range]{width:100%;min-width:150px;height:28px}" +
        "#menu-vol-panel .vol-canal+.vol-canal{margin-top:4px}" +
        // Aspecto base del botón de silenciar para los juegos que no tienen `.boton-neon`
        // (ahí lo dibujaba el navegador, plano). Los que sí la tienen conservan su estilo:
        // estas reglas solo ponen forma y espaciado, no colores de marca.
        "#menu-vol-panel .vol-silencio{margin-top:10px;width:100%;display:flex;align-items:center;" +
        "justify-content:center;gap:8px;padding:9px 14px;border:0;border-radius:999px;cursor:pointer;" +
        "font:inherit;font-weight:700;line-height:1.2}" +
        "#menu-vol-panel .vol-silencio:not(.boton-neon){background:rgba(0,0,0,.08);color:inherit}" +
        "#menu-vol-panel .vol-silencio:not(.boton-neon):hover{background:rgba(0,0,0,.14)}" +
        "#menu-vol-panel .vol-silencio:not(.boton-neon).activo{background:#f59e0b;color:#1f2937}";

    function ponerEstilos() {
        if (!doc || doc.getElementById("vol-polimotor-css")) return;
        var st = doc.createElement("style");
        st.id = "vol-polimotor-css";
        st.textContent = CSS;
        (doc.head || doc.documentElement).appendChild(st);
    }

    /** Devuelve el prefijo de clases que usa este juego: `panel` (nuevos) o `menu-acc` (resto). */
    function prefijoClases() {
        var panel = doc.getElementById("menu-vol-panel");
        if (panel && panel.classList.contains("menu-acc-panel")) return "menu-acc";
        return "panel";
    }

    function construirPanel() {
        var panel = doc.getElementById("menu-vol-panel");
        if (!panel) return false;
        var p = prefijoClases();
        var clsCab = p === "menu-acc" ? "menu-acc-cab" : "panel-cab";
        var clsCerrar = p === "menu-acc" ? "menu-acc-cerrar" : "panel-cerrar";
        var clsOp = p === "menu-acc" ? "menu-acc-op" : "panel-op";
        var clsRango = p === "menu-acc" ? "menu-acc-rango" : "panel-rango";

        // El botón de cerrar conserva el id que ya escucha el juego (btn-cerrar-vol o
        // btn-cerrar-menu-vol), para no romper su enlazado.
        var idCerrar = doc.getElementById("btn-cerrar-menu-vol") ? "btn-cerrar-menu-vol" : "btn-cerrar-vol";

        panel.innerHTML =
            '<div class="' + clsCab + '">' +
                "<strong>Sonido</strong>" +
                '<button type="button" id="' + idCerrar + '" class="' + clsCerrar + '" aria-label="Cerrar">&times;</button>' +
            "</div>" +
            '<label class="' + clsOp + " " + clsRango + ' vol-canal">' +
                '<span><i class="fa-solid fa-music" aria-hidden="true"></i> Música de fondo <strong id="vol-val-fondo">' + est.fondo + "</strong></span>" +
                '<input type="range" id="rango-volumen" min="0" max="100" step="1" value="' + est.fondo + '" aria-label="Volumen de la música de fondo">' +
            "</label>" +
            '<label class="' + clsOp + " " + clsRango + ' vol-canal">' +
                '<span><i class="fa-solid fa-bell" aria-hidden="true"></i> Efectos y voces <strong id="vol-val-efectos">' + est.efectos + "</strong></span>" +
                '<input type="range" id="rango-volumen-efectos" min="0" max="100" step="1" value="' + est.efectos + '" aria-label="Volumen de los efectos y las voces">' +
            "</label>" +
            '<button type="button" id="btn-silencio" class="boton-neon btn-silencio vol-silencio" aria-pressed="' + (est.mudo ? "true" : "false") + '">' +
                '<i class="fa-solid fa-' + (est.mudo ? "volume-high" : "volume-xmark") + '"></i>' +
                "<span>" + (est.mudo ? "Activar sonido" : "Silenciar") + "</span>" +
            "</button>";
        return true;
    }

    function pintarIcono() {
        var icono = doc.querySelector("#btn-menu-vol i");
        if (icono) {
            var max = Math.max(est.fondo, est.efectos);
            icono.className = (est.mudo || max <= 0) ? "fa-solid fa-volume-xmark"
                : (max < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
        var b = doc.getElementById("btn-silencio");
        if (b) {
            b.classList.toggle("activo", est.mudo);
            b.setAttribute("aria-pressed", est.mudo ? "true" : "false");
            var sp = b.querySelector("span");
            if (sp) sp.textContent = est.mudo ? "Activar sonido" : "Silenciar";
            var ic = b.querySelector("i");
            if (ic) ic.className = est.mudo ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
        }
        var vf = doc.getElementById("vol-val-fondo");
        if (vf) vf.textContent = String(est.fondo);
        var ve = doc.getElementById("vol-val-efectos");
        if (ve) ve.textContent = String(est.efectos);
        // Algunos juegos aún tienen un #vol-val del panel antiguo en su HTML.
        var viejo = doc.getElementById("vol-val");
        if (viejo) viejo.textContent = String(est.fondo);
    }

    function enlazar() {
        var sFondo = doc.getElementById("rango-volumen");
        if (sFondo) {
            sFondo.addEventListener("input", function () {
                est.fondo = limitar(sFondo.value, 0, 100);
                if (est.mudo && est.fondo > 0) est.mudo = false;
                aplicar();
                pintarIcono();
                guardar();
            });
        }
        var sEfectos = doc.getElementById("rango-volumen-efectos");
        if (sEfectos) {
            sEfectos.addEventListener("input", function () {
                est.efectos = limitar(sEfectos.value, 0, 100);
                if (est.mudo && est.efectos > 0) est.mudo = false;
                aplicar();
                pintarIcono();
                guardar();
            });
        }
        var mudo = doc.getElementById("btn-silencio");
        if (mudo) {
            mudo.addEventListener("click", function (ev) {
                ev.stopPropagation();
                est.mudo = !est.mudo;
                aplicar();
                pintarIcono();
                guardar();
            });
        }
    }

    /**
     * Varios juegos vuelven a pintar su panel de volumen al abrirlo (su `pintarMenuVol()`), lo que
     * borraría los dos canales y dejaría el slider antiguo. Este observador detecta que el panel
     * perdió el control de efectos y lo reconstruye, así el juego no necesita ningún cambio.
     */
    var observador = null;
    function vigilarPanel() {
        if (observador || !global.MutationObserver) return;
        var panel = doc.getElementById("menu-vol-panel");
        if (!panel) return;
        observador = new global.MutationObserver(function () {
            if (doc.getElementById("rango-volumen-efectos")) return;   // intacto
            observador.disconnect();
            construirPanel();
            enlazar();
            pintarIcono();
            observador.observe(panel, { childList: true, subtree: true });
        });
        observador.observe(panel, { childList: true, subtree: true });
    }

    // ------------------------------------------------------------------ API

    var API = {
        /**
         * Arranca el control. Lee la preferencia guardada (o los valores por defecto), reconstruye
         * el panel del botón de volumen con los dos controles y aplica los niveles.
         */
        iniciar: function (opciones) {
            opciones = opciones || {};
            sonidos = opciones.sonidos || null;
            alCambiar = opciones.alCambiar || null;

            var guardado = leerGuardado();
            est.fondo = limitar(guardado && guardado.fondo != null ? guardado.fondo
                : (opciones.fondoPorDefecto != null ? opciones.fondoPorDefecto : 20), 0, 100);
            est.efectos = limitar(guardado && guardado.efectos != null ? guardado.efectos
                : (opciones.efectosPorDefecto != null ? opciones.efectosPorDefecto : 80), 0, 100);
            est.mudo = !!(guardado && guardado.mudo);

            if (!iniciado) {
                ponerEstilos();
                construirPanel();
                enlazar();
                vigilarMediosNuevos();
                iniciado = true;
            }
            envolverFondo(sonidos);
            vigilarPanel();
            aplicar();
            pintarIcono();
            return API;
        },

        /** Vuelve a enganchar el `sonidos.js` del juego si se crea después de iniciar. */
        usarSonidos: function (mod) {
            sonidos = mod || null;
            envolverFondo(sonidos);
            aplicar();
            return API;
        },

        /** Reaplica los niveles (p. ej. al reanudar el juego o tras crear audios nuevos). */
        refrescar: function () {
            aplicar();
            pintarIcono();
            return API;
        },

        ganaciaFondo: ganaciaFondo,
        ganaciaEfectos: ganaciaEfectos,

        /**
         * Los dos nodos de ganancia y el contexto, para inspeccionar o medir el reparto
         * (p. ej. enganchar un analizador a un bus y comprobar qué suena por cuál).
         */
        buses: function () {
            return { ctx: ctxAudio, fondo: ganFondo, efectos: ganEfectos };
        },

        /** Niveles actuales en 0..100 más el estado de silencio. */
        estado: function () {
            return { fondo: est.fondo, efectos: est.efectos, mudo: est.mudo };
        },

        fondo: function (pct) {
            est.fondo = limitar(pct, 0, 100);
            aplicar();
            pintarIcono();
            guardar();
            var s = doc.getElementById("rango-volumen");
            if (s) s.value = String(est.fondo);
            return API;
        },

        efectos: function (pct) {
            est.efectos = limitar(pct, 0, 100);
            aplicar();
            pintarIcono();
            guardar();
            var s = doc.getElementById("rango-volumen-efectos");
            if (s) s.value = String(est.efectos);
            return API;
        },

        silenciar: function (on) {
            est.mudo = !!on;
            aplicar();
            pintarIcono();
            guardar();
            return API;
        },

        silenciado: function () { return est.mudo; }
    };

    global.VolumenPolimotor = API;

    // El desvío de `connect(destination)` se instala al cargar el archivo, antes de que el juego
    // cree sus nodos: un nodo conectado antes del parche se quedaría fuera de los dos buses.
    // Por eso volumen.js va en el HTML antes del sonidos.js del juego y de script.js.
    parchearConnect();

    // ------------------------------------------------------------------ arranque automático

    /*
     * Los 35 juegos ya traen su propio código de volumen en script.js (un solo slider que movía
     * todo junto). En vez de editar los 35, este archivo arranca solo DESPUÉS de que el juego
     * haya montado su panel, lo reconstruye con los dos canales y vuelve a enlazar los controles.
     * Lo que el juego hubiera dejado enganchado al slider antiguo desaparece con el `innerHTML`.
     *
     * El `sonidos.js` del juego se detecta por el nombre global (`Sonidos*`): cada juego usa el
     * suyo (SonidosTiro, SonidosComer, SonidosArdilla…) y no hay un nombre único que valga para
     * todos. Un juego puede llamar a `VolumenPolimotor.iniciar({...})` por su cuenta y entonces
     * este arranque automático no hace nada.
     */
    function buscarModuloSonidos() {
        var nombres = Object.keys(global).filter(function (k) {
            return /^Sonidos[A-Z]/.test(k) && global[k] && typeof global[k] === "object";
        });
        return nombres.length ? global[nombres[0]] : null;
    }

    /** Valor inicial del fondo: el que el juego dejó en su panel (viene de config.json). */
    function fondoDelJuego() {
        var s = doc && doc.getElementById("rango-volumen");
        var n = s ? Number(s.value) : NaN;
        return isFinite(n) ? n : 20;
    }

    function arrancar() {
        if (iniciado) return;                       // el juego ya lo inició por su cuenta
        if (!doc.getElementById("menu-vol-panel")) return;
        API.iniciar({
            sonidos: buscarModuloSonidos(),
            fondoPorDefecto: fondoDelJuego(),
            efectosPorDefecto: 80
        });
        vigilarAudioDelJuego();
    }

    /*
     * Reaplica los niveles mientras el juego monta su audio.
     *
     * Al arrancar, el juego todavía no ha creado nada: su `sonidos.js` suele armar la mezcla al
     * primer sonido, y la intro 3D cierra su AudioContext al entrar a la partida. Si solo se
     * aplicara una vez, el nivel guardado quedaría escrito en un contexto que ya no suena y el
     * juego entraría a todo volumen aunque el panel marcara el valor correcto (justo lo que pasaba
     * al salir de un juego y entrar a otro).
     *
     * Por eso se revisa cada poco durante los primeros segundos y se reaplica cuando cambia algo
     * relevante: aparece el módulo de sonidos, nace un AudioContext, o el que sostenía los buses
     * se cierra. Después se vigila de vez en cuando por si el juego crea audio más tarde (una
     * celebración, un cambio de ronda).
     */
    var vigilanciaPuesta = false;
    function vigilarAudioDelJuego() {
        if (vigilanciaPuesta) return;
        vigilanciaPuesta = true;
        var huellaPrevia = "";
        var vueltas = 0;

        function revisar() {
            vueltas++;
            // Si el módulo de sonidos aparece después del arranque, se engancha ahora.
            if (!sonidos) {
                var mod = buscarModuloSonidos();
                if (mod) {
                    sonidos = mod;
                    envolverFondo(sonidos);
                }
            }
            // Huella del estado del audio: cambia cuando nace o muere un contexto, o cuando
            // aparecen TextoVoz / PedniaAudio.
            var huella = contextos.map(function (c) { return c.state; }).join(",") +
                "|" + (ctxAudio ? ctxAudio.state : "-") +
                "|" + (global.TextoVoz ? "tv" : "") + (global.PedniaAudio && global.PedniaAudio.tieneTema && global.PedniaAudio.tieneTema() ? "pa" : "") +
                "|" + (sonidos ? "s" : "");
            if (huella !== huellaPrevia) {
                huellaPrevia = huella;
                aplicar();
            }
            // Los primeros 12 s cada 400 ms (es cuando el juego monta su audio); luego cada 3 s.
            global.setTimeout(revisar, vueltas < 30 ? 400 : 3000);
        }
        revisar();
    }

    // Tras `load` el script.js del juego ya pintó su panel; el pequeño margen extra cubre a los
    // que lo montan dentro de una promesa (la carga de config.json).
    if (doc && typeof global.addEventListener === "function") {
        global.addEventListener("load", function () {
            global.setTimeout(arrancar, 350);
            // Segundo intento para los juegos que arman el panel al cerrar la intro 3D.
            global.setTimeout(function () {
                if (!iniciado) arrancar();
            }, 2000);
        });
    }
})(window);
