/**
 * Menú de accesibilidad de Multisensorial.
 * Ofrece las opciones que el juego puede aplicar de verdad.
 * En la vista del niño, pin-accesibilidad.js pide el PIN antes de abrir el panel.
 */
(function () {
    "use strict";

    var TOGGLES = [
        { key: "mostrarFeedBack", label: "Mostrar feedback", defecto: true },
        { key: "altoContraste", label: "Alto contraste", defecto: false },
        { key: "mostrarIntro", label: "Mostrar intro (demostración)", defecto: true },
        {
            key: "verBotonRepetir",
            label: "Botón escuchar otra vez",
            defecto: true,
            cuando: function () {
                return !!(document.getElementById("btn-escuchar") || document.getElementById("btn-repetir"));
            }
        },
        {
            key: "barraTiempo",
            label: "Barra de tiempo",
            defecto: true,
            cuando: function () { return !!document.getElementById("barra-tiempo"); }
        },
        { key: "animaciones_opciones", label: "Animar objetos", defecto: true },
        { key: "efectosSonido", label: "Efectos de sonido", defecto: true },
        { key: "mostrarNombres", label: "Mostrar nombres", defecto: true },
        {
            key: "mostrarProgreso",
            label: "Mostrar progreso",
            defecto: true,
            cuando: function () {
                return !!document.querySelector("#progreso, #insignias, #progreso-escena, .progreso, .hud-progreso, .progreso-escena, .objeto-progreso, .hud-insignias");
            }
        }
    ];

    var rutasEfecto = [];
    var audioEnganchado = false;
    var animacionEnganchada = false;
    var swalEnganchado = false;

    function accDe(config) {
        if (!config.accesibilidad) config.accesibilidad = {};
        return config.accesibilidad;
    }

    function marcado(acc, op) {
        if (Object.prototype.hasOwnProperty.call(acc, op.key)) return !!acc[op.key];
        return !!op.defecto;
    }

    function nombreArchivo(ruta) {
        if (typeof ruta !== "string" || !ruta) return "";
        var limpio = ruta.split("?")[0].split("#")[0];
        var partes = limpio.split("/");
        return partes[partes.length - 1] || "";
    }

    function registrarRutas(config) {
        rutasEfecto = [];
        var audios = (config && config.audios) || {};
        ["acierto", "error", "cierre"].forEach(function (clave) {
            var nombre = nombreArchivo(audios[clave]);
            if (nombre && rutasEfecto.indexOf(nombre) < 0) rutasEfecto.push(nombre);
        });
        var efectos = audios.efectos;
        if (efectos && typeof efectos === "object") {
            Object.keys(efectos).forEach(function (clave) {
                var nombre = nombreArchivo(efectos[clave]);
                if (nombre && rutasEfecto.indexOf(nombre) < 0) rutasEfecto.push(nombre);
            });
        }
    }

    function esRutaEfecto(src) {
        var nombre = nombreArchivo(src || "");
        return !!nombre && rutasEfecto.indexOf(nombre) >= 0;
    }

    function engancharAudio() {
        if (audioEnganchado || !window.HTMLAudioElement) return;
        audioEnganchado = true;
        var original = HTMLAudioElement.prototype.play;
        HTMLAudioElement.prototype.play = function () {
            if (document.body.classList.contains("sin-efectos") && esRutaEfecto(this.currentSrc || this.src)) {
                return Promise.resolve();
            }
            return original.apply(this, arguments);
        };
    }

    function envolverSfx() {
        Object.keys(window).forEach(function (clave) {
            var objeto;
            try { objeto = window[clave]; } catch (e) { return; }
            if (!objeto || typeof objeto.sonar !== "function" || objeto.sonar.__pedniaAcc) return;
            var original = objeto.sonar;
            var envuelta = function () {
                if (document.body.classList.contains("sin-efectos")) return false;
                return original.apply(this, arguments);
            };
            envuelta.__pedniaAcc = true;
            objeto.sonar = envuelta;
        });
    }

    function engancharAnimacion() {
        if (animacionEnganchada || !window.Element || !Element.prototype.animate) return;
        animacionEnganchada = true;
        var original = Element.prototype.animate;
        Element.prototype.animate = function (frames, opts) {
            if (!document.body.classList.contains("sin-animaciones")) {
                return original.apply(this, arguments);
            }
            var corto = typeof opts === "number"
                ? { duration: 16 }
                : Object.assign({}, opts || {}, { duration: 16, delay: 0 });
            return original.call(this, frames, corto);
        };
    }

    function engancharSwal() {
        if (swalEnganchado || !window.Swal || typeof Swal.fire !== "function" || Swal.fire.__pedniaAcc) return;
        swalEnganchado = true;
        var original = Swal.fire;
        var envuelta = function (opts) {
            if (document.body.classList.contains("sin-feedback") && opts && opts.imageUrl) {
                return Promise.resolve({ isDismissed: true });
            }
            return original.apply(this, arguments);
        };
        envuelta.__pedniaAcc = true;
        Swal.fire = envuelta;
    }

    function aplicar(config) {
        var acc = accDe(config);
        var root = document.documentElement;
        registrarRutas(config);
        envolverSfx();
        engancharSwal();

        function activo(key) {
            for (var i = 0; i < TOGGLES.length; i++) {
                if (TOGGLES[i].key === key) return marcado(acc, TOGGLES[i]);
            }
            return false;
        }

        document.body.classList.toggle("alto-contraste", activo("altoContraste"));
        document.body.classList.toggle("sin-feedback", !activo("mostrarFeedBack"));
        document.body.classList.toggle("sin-repetir", !activo("verBotonRepetir"));
        document.body.classList.toggle("sin-barra-tiempo", !activo("barraTiempo"));
        document.body.classList.toggle("sin-animaciones", !activo("animaciones_opciones"));
        document.body.classList.toggle("sin-efectos", !activo("efectosSonido"));
        document.body.classList.toggle("sin-nombres", !activo("mostrarNombres"));
        document.body.classList.toggle("sin-progreso", !activo("mostrarProgreso"));

        var estilo = acc.altoContrasteEstilo || {};
        if (estilo.borde) root.style.setProperty("--acc-borde", String(estilo.borde));
        if (estilo.fondo) root.style.setProperty("--acc-fondo", String(estilo.fondo));

        var letras = Number(acc.letterSpacing);
        root.style.setProperty("--mc-letter-spacing", (isFinite(letras) && letras >= 0 ? letras : 2) + "px");
    }

    function cerrarVolumen() {
        var panel = document.getElementById("menu-vol-panel");
        var btn = document.getElementById("btn-menu-vol");
        if (panel) panel.hidden = true;
        if (btn) btn.setAttribute("aria-expanded", "false");
    }

    function setAbierto(abierto) {
        var panel = document.getElementById("menu-acc-panel");
        var btn = document.getElementById("btn-menu-acc");
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        if (abierto) cerrarVolumen();
    }

    function casilla(acc, op, onCambio, config) {
        var lab = document.createElement("label");
        lab.className = "menu-acc-op";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = marcado(acc, op);
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(" " + op.label));
        input.addEventListener("change", function () {
            acc[op.key] = input.checked;
            aplicar(config);
            if (typeof onCambio === "function") onCambio();
        });
        return lab;
    }

    function rango(acc, config, onCambio, opts) {
        var lab = document.createElement("label");
        lab.className = "menu-acc-op menu-acc-rango";
        var actual = Number(acc[opts.key]);
        var valor = isFinite(actual) ? actual : opts.defecto;
        valor = Math.max(opts.min, Math.min(opts.max, valor));
        lab.innerHTML = "<span>" + opts.label + " <strong>" + valor + "</strong></span>";
        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = String(opts.min);
        slider.max = String(opts.max);
        slider.step = String(opts.step);
        slider.value = String(valor);
        slider.addEventListener("input", function () {
            var n = Number(slider.value);
            acc[opts.key] = n;
            lab.querySelector("strong").textContent = String(n);
            aplicar(config);
            if (typeof onCambio === "function") onCambio();
        });
        lab.appendChild(slider);
        return lab;
    }

    function pintar(config, onCambio) {
        var ops = document.getElementById("menu-acc-ops");
        if (!ops) return;
        var acc = accDe(config);
        ops.innerHTML = "";
        TOGGLES.forEach(function (op) {
            if (typeof op.cuando === "function" && !op.cuando()) return;
            ops.appendChild(casilla(acc, op, onCambio, config));
        });
        ops.appendChild(rango(acc, config, onCambio, {
            key: "letterSpacing", label: "Espaciado de letras", min: 0, max: 10, step: 1, defecto: 2
        }));
        ops.appendChild(rango(acc, config, onCambio, {
            key: "rate", label: "Velocidad de la voz", min: -50, max: 100, step: 5, defecto: 5
        }));
    }

    function iniciar(config, onCambio) {
        var menu = document.getElementById("menu-acc");
        if (!menu || !config || menu.dataset.listo === "1") return;
        menu.dataset.listo = "1";
        engancharAudio();
        engancharAnimacion();
        var btn = document.getElementById("btn-menu-acc");
        var cerrar = document.getElementById("btn-cerrar-acc");
        if (btn) {
            btn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                var panel = document.getElementById("menu-acc-panel");
                setAbierto(!!(panel && panel.hidden));
            });
        }
        if (cerrar) cerrar.addEventListener("click", function () { setAbierto(false); });
        document.addEventListener("pointerdown", function (ev) {
            if (menu.contains(ev.target)) return;
            setAbierto(false);
        });
        aplicar(config);
        pintar(config, onCambio);
    }

    window.PedniaMenuAcc = {
        iniciar: iniciar,
        aplicar: aplicar,
        cerrar: function () { setAbierto(false); }
    };
})();
