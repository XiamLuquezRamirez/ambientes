/* La huerta mágica de conteo — reto 1 manzanas, reto 2 conejos/zanahorias. */
(function () {
    "use strict";

    var L = window.CuentaLosObjetosLogica;
    var gameConfig = null;
    var introConfig = null;
    var audioFondo = null;
    var nivel = null;
    var ronda = null;
    var indice = 0;
    var rondaGen = 0;
    var juegoTerminado = false;
    var arrancado = false;
    var cerrado = false;
    var demoActiva = false;
    var vozGen = 0;
    var colaVoz = Promise.resolve();
    var reloj = null;
    var pausaTimer = null;
    var alSeguir = null;
    var ultimaLinea = null;

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

    function perfil() {
        if (window.PedniaEdad && typeof PedniaEdad.perfil === "function") return PedniaEdad.perfil() || {};
        return window.__PEDNIA_PERFIL__ || {};
    }

    function valores() { return perfil().valores || {}; }

    function juegos() { return valores().juegos || {}; }

    function pref(clave, defecto) {
        var a = acc();
        if (Object.prototype.hasOwnProperty.call(a, clave)) return a[clave];
        var grupos = juegos();
        var nombres = Object.keys(grupos);
        var i;
        for (i = 0; i < nombres.length; i++) {
            var grupo = grupos[nombres[i]];
            if (grupo && typeof grupo === "object" && Object.prototype.hasOwnProperty.call(grupo, clave)) return grupo[clave];
        }
        var v = valores();
        if (Object.prototype.hasOwnProperty.call(v, clave)) return v[clave];
        return defecto;
    }

    function px(valor, defecto) {
        var n = Number(valor);
        if (!isFinite(n) || n <= 0) n = defecto;
        return n + "px";
    }

    function reducir() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            || document.body.classList.contains("sin-animaciones")
            || document.body.classList.contains("sin-decoracion");
    }

    /** Vuelo a la canasta: no usar sin-decoracion (solo nubes del fondo). */
    function reducirMovimiento() {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            || document.body.classList.contains("sin-animaciones");
    }

    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }

    function textos() { return (gameConfig && gameConfig.textos) || {}; }

    function sfx() { return window.CuentaObjetosSfx || null; }

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
        var icono = document.querySelector("#btn-menu-vol i");
        if (icono) {
            icono.className = n <= 0 ? "fa-solid fa-volume-xmark" : (n < 40 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high");
        }
    }

    function audioInstrucciones() {
        var v = pref("audio_instruc", "automático");
        return !(v === false || v === "no" || v === "ninguno" || v === "off" || v === "desactivado");
    }

    function efectosActivos() {
        return pref("efectosSonido", true) !== false && pref("refuerzo_sonido", true) !== false
            && !document.body.classList.contains("sin-efectos");
    }

    function aplicarPreferencias() {
        var root = document.documentElement;
        var contraste = String(pref("contraste", "estándar"));
        var vel = Number(pref("anim_speed", 100));
        if (!isFinite(vel) || vel <= 0) vel = 100;
        root.style.setProperty("--font-size", px(pref("font_size", 22), 22));
        root.style.setProperty("--btn-size", px(pref("btn_size", 72), 72));
        root.style.setProperty("--btn-gap", px(pref("btn_spacing", 12), 12));
        root.style.setProperty("--manzana", px(pref("tamanoImagen", 68), 68));
        root.style.setProperty("--opcion-w", px(pref("anchoOpcion", 160), 160));
        root.style.setProperty("--letra-btn", px(pref("tamanoLetraBotones", 40), 40));
        root.style.setProperty("--hitbox", px(Math.max(0, Number(pref("hitboxExtra", 0)) || 0), 0));
        root.style.setProperty("--trans", px(pref("trans_ms", 200), 200).replace("px", "ms"));
        root.style.setProperty("--anim-ms", Math.round(700 * 100 / vel) + "ms");
        var letras = Number(acc().letterSpacing);
        root.style.setProperty("--mc-letter-spacing", (isFinite(letras) && letras >= 0 ? letras : 2) + "px");
        document.body.dataset.fondo = String(pref("fondo_pantalla", "crema"));
        document.body.dataset.color = String(pref("modo_color", "normal"));
        document.body.classList.toggle("contraste-alto", contraste === "alto" || pref("altoContraste") === true);
        document.body.classList.toggle("contraste-maximo", contraste === "máximo");
        document.body.classList.toggle("cursor-grande", !!pref("cursor_grande", false));
        document.body.classList.toggle("lectura-facil", !!pref("lectura_facil", false));
        document.body.classList.toggle("bordes-juego", !!pref("juego_bordes", false));
        document.body.classList.toggle("resaltar-objetivo", !!pref("resaltarObjetivo", false));
        document.body.classList.toggle("resaltar-destino", !!pref("resaltarDestino", false));
        document.body.classList.toggle("sin-decoracion", pref("anim_decorativas") === false);
        document.body.classList.toggle("sin-flotantes", pref("elementos_flotantes") === false);
        document.body.classList.toggle("sin-nombres", pref("mostrarNombres", false) !== true);
        document.body.classList.toggle("sin-error", pref("error_visible") === false);
        document.body.classList.toggle("progreso-prominente", String(pref("progreso", "")).indexOf("prominente") !== -1);
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

    function playArchivo(ruta) {
        return new Promise(function (resolve) {
            if (!ruta || !efectosActivos()) { resolve(); return; }
            var audio = new Audio(ruta);
            var fin = function () { resolve(); };
            audio.onended = fin;
            audio.onerror = fin;
            var p = audio.play();
            if (p && p.catch) p.catch(fin);
            setTimeout(fin, 4000);
        });
    }

    function clickSuave() {
        if (pref("audio_btn", true) === false) return;
        var tono = sfx();
        if (tono) tono.sonar("numero");
    }

    function vozDe(linea) {
        if (!linea) return "zoe";
        if (linea.voz === "zeus" || linea.voz === "zoe") return linea.voz;
        return Number(linea.personaje) === 0 ? "zeus" : "zoe";
    }

    function gifPj(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        /* normal vive en img/; hablando en images/ (igual que otros Multisaberes). */
        if (hablando) return "../../../images/" + quien + "_hablando.gif";
        return "../../../img/" + quien + "_normal.gif";
    }

    function marcarHablando(voz, hablando) {
        var quien = voz === "zeus" ? "zeus" : "zoe";
        var img = document.querySelector("#pj-" + quien + " .pj-img, #pj-" + quien + " img");
        if (img) img.src = gifPj(quien, !!hablando);
        var avatar = $id("dialogo-avatar");
        if (avatar) avatar.src = gifPj(quien, !!hablando);
        if (window.PersonajesJuego) {
            if (hablando && typeof PersonajesJuego.hablar === "function") PersonajesJuego.hablar(quien);
            else if (!hablando && typeof PersonajesJuego.callar === "function") PersonajesJuego.callar(quien);
        }
    }

    function mostrarEnunciado(texto, voz) {
        var p = $id("enunciado");
        if (p) p.textContent = texto || "";
        document.body.classList.toggle("habla-zeus", voz === "zeus");
        document.body.classList.toggle("habla-zoe", voz !== "zeus");
        ultimaLinea = { texto: texto || "", voz: voz || "zoe" };
    }

    function decir(linea) {
        var texto = (linea && linea.texto) || "";
        var voz = vozDe(linea);
        mostrarEnunciado(texto, voz);
        marcarHablando(voz, !!texto);
        var sub = ronda && ronda.seccion ? ronda.seccion.querySelector(".subtitulo-conteo") : null;
        if (sub) {
            var forzar = !audioInstrucciones() || pref("subtitulos") === true;
            sub.hidden = !forzar;
            sub.textContent = forzar ? texto : "";
        }
        var fin = function () { marcarHablando(voz, false); };
        if (!texto) {
            fin();
            return sleep(280);
        }
        if (!audioInstrucciones() || !window.TextoVoz) {
            return sleep(Math.min(2200, 480 + texto.length * 38)).then(fin);
        }
        var veces = pref("repeticion_audio") === true ? 2 : 1;
        var p = TextoVoz.hablar(texto, voz);
        if (veces < 2) return Promise.resolve(p).then(fin);
        return Promise.resolve(p).then(function () { return TextoVoz.hablar(texto, voz); }).then(fin);
    }

    function decirEnCola(linea) {
        var gen = vozGen;
        colaVoz = colaVoz.then(function () {
            if (gen !== vozGen) return null;
            return decir(linea);
        }).catch(function () { return null; });
        return colaVoz;
    }

    function decirYa(linea) {
        vozGen += 1;
        if (window.TextoVoz && TextoVoz.detener) TextoVoz.detener();
        var gen = vozGen;
        var p = decir(linea);
        colaVoz = Promise.resolve(p).then(function () {
            if (gen !== vozGen) return null;
            return null;
        });
        return p;
    }

    function seccionDe(reto) {
        var id = reto && reto.id;
        var propia = id ? document.querySelector('.reto[data-listo="1"][data-reto="' + id + '"]') : null;
        return propia || document.querySelector('.reto[data-listo="1"]');
    }

    function sufijo(seccion) {
        return String((seccion && seccion.id) || "").replace("reto-", "");
    }

    function mostrarSolo(seccion) {
        document.querySelectorAll(".reto").forEach(function (el) {
            var activa = el === seccion;
            el.hidden = !activa;
            el.setAttribute("aria-hidden", activa ? "false" : "true");
        });
    }

    function esConejos(reto) {
        return L.esRetoConejos(reto);
    }

    function esPollitos(reto) {
        return L.esRetoPollitos(reto);
    }

    function crearRonda(reto, esDemo) {
        var conejos = esConejos(reto);
        var pollitos = esPollitos(reto);
        var cantidad;
        if (conejos) {
            cantidad = L.cantidadDe(reto) || 5;
        } else if (pollitos) {
            cantidad = L.cantidadDe(reto) || 2;
        } else if (esDemo && L.respuestaDe(reto)) {
            cantidad = L.respuestaDe(reto);
        } else {
            cantidad = L.cantidadAleatoria(Math.random);
        }
        var prefijo = conejos ? "zanahoria" : (pollitos ? "pollito" : "manzana");
        var fijas = L.opcionesFijas(reto);
        var correcto = cantidad;
        if (conejos || pollitos) {
            var nCfg = Number(reto && reto.correcto);
            if (isFinite(nCfg) && nCfg > 0) correcto = Math.floor(nCfg);
        }
        var seccion = seccionDe(reto);
        return {
            reto: reto,
            demo: !!esDemo,
            conejos: conejos,
            pollitos: pollitos,
            fase: "presentacion",
            manzanas: L.crearObjetos(cantidad, prefijo),
            visibles: cantidad,
            pagina: 0,
            opciones: fijas || L.opcionesDe(reto, pref("opciones_max", 3), Math.random, correcto),
            correcto: correcto,
            intentos: 0,
            ayuda: 0,
            seleccion: null,
            opcionesEntraron: false,
            seccion: seccion
        };
    }

    function imgObjetoConteo() {
        if (ronda && ronda.pollitos) {
            var p = gameConfig.elementos && gameConfig.elementos.pollito;
            return (p && p.img) || "img/pollito.svg";
        }
        if (ronda && ronda.conejos) {
            var z = gameConfig.elementos && gameConfig.elementos.zanahoria;
            return (z && z.img) || "img/zanahoria.png";
        }
        var el = gameConfig.elementos && gameConfig.elementos.manzana;
        return (el && el.img) || "img/manzana.png";
    }

    function imgCascaron() {
        var c = gameConfig.elementos && gameConfig.elementos.cascaron;
        return (c && c.img) || "img/cascaron.svg";
    }

    function idCajaObjetos() {
        if (!ronda || !ronda.seccion) return "";
        var s = sufijo(ronda.seccion);
        if (ronda.pollitos) return "pollitos-" + s;
        if (ronda.conejos) return "zanahorias-" + s;
        return "manzanas-" + s;
    }

    function claseObjetoConteo() {
        if (ronda && ronda.pollitos) return "pollito";
        if (ronda && ronda.conejos) return "zanahoria";
        return "manzana";
    }

    function etiquetaObjetoConteo() {
        if (ronda && ronda.pollitos) return "Pollito";
        if (ronda && ronda.conejos) return "Zanahoria";
        return "Manzana";
    }

    function ocultarOpcionesHastaResponder() {
        /* En todos los retos: las opciones solo tras terminar de contar. */
        return true;
    }

    function animacionesUi() {
        if (pref("animaciones_opciones", true) === false) return false;
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
        if (document.body.classList.contains("sin-animaciones")) return false;
        return true;
    }

    function imgHuevo() {
        var h = gameConfig.elementos && gameConfig.elementos.huevo;
        return (h && h.img) || "img/huevo.svg";
    }

    function marcarAnimLista(id) {
        if (!ronda || !id) return;
        var i;
        for (i = 0; i < ronda.manzanas.length; i++) {
            if (ronda.manzanas[i].id === id) {
                ronda.manzanas[i].animLista = true;
                return;
            }
        }
    }

    function pintarProgreso() {
        if (!ronda) return;
        var banner = ronda.seccion && ronda.seccion.querySelector(".banner-reto");
        var nombre = (ronda.reto && ronda.reto.titulo) || "Recolecta las manzanas";
        if (banner) banner.textContent = "RETO " + (sufijo(ronda.seccion) || "1") + ": " + String(nombre).toUpperCase();
    }

    function pintarManzanas() {
        if (!ronda || !ronda.seccion) return;
        var caja = $id(idCajaObjetos());
        var pager = $id("pager-" + sufijo(ronda.seccion));
        var ind = $id("pagina-" + sufijo(ronda.seccion));
        if (!caja) return;
        var vista = L.pagina(ronda.manzanas, ronda.visibles, ronda.pagina);
        ronda.pagina = vista.pagina;
        caja.innerHTML = "";
        var etiqueta = etiquetaObjetoConteo();
        var clase = claseObjetoConteo();
        vista.items.forEach(function (manzana, i) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = clase + " slot-" + i + (manzana.contada ? " contada" : "");
            btn.dataset.id = manzana.id;
            if (manzana.orden) btn.dataset.orden = String(manzana.orden);
            btn.setAttribute("aria-pressed", manzana.contada ? "true" : "false");
            btn.setAttribute("aria-label", etiqueta + (manzana.contada ? ", contada, " + manzana.orden : ""));
            if (ronda.pollitos) {
                var huevo = document.createElement("img");
                huevo.className = "huevo";
                huevo.src = imgHuevo();
                huevo.alt = "";
                huevo.draggable = false;
                btn.appendChild(huevo);
                var casIzq = document.createElement("img");
                casIzq.className = "cascaron cascaron-izq";
                casIzq.src = imgHuevo();
                casIzq.alt = "";
                casIzq.draggable = false;
                btn.appendChild(casIzq);
                var casDer = document.createElement("img");
                casDer.className = "cascaron cascaron-der";
                casDer.src = imgHuevo();
                casDer.alt = "";
                casDer.draggable = false;
                btn.appendChild(casDer);
            }
            var img = document.createElement("img");
            img.className = ronda.pollitos ? "pollito-img" : "";
            img.src = imgObjetoConteo();
            img.alt = "";
            img.draggable = false;
            btn.appendChild(img);
            if (manzana.contada) {
                btn.classList.add("contada");
                var esAnimando = ronda.objetoAnimando === manzana.id;
                if (ronda.conejos && !esAnimando) {
                    btn.classList.add("sacada");
                    if (manzana.animLista) btn.classList.add("sacada-fija");
                }
                if (ronda.pollitos && !esAnimando) {
                    btn.classList.add("nacido");
                    if (manzana.animLista) btn.classList.add("nacido-fijo");
                }
                var badge = document.createElement("span");
                badge.className = "orden";
                badge.textContent = String(manzana.orden);
                btn.appendChild(badge);
            }
            if (!ronda.conejos && !ronda.pollitos) {
                btn.addEventListener("pointerdown", function () { armarZoom(btn, manzana); });
                btn.addEventListener("pointerup", soltarZoom);
                btn.addEventListener("pointercancel", soltarZoom);
            }
            btn.addEventListener("click", function () { alTocarManzana(manzana.id); });
            caja.appendChild(btn);
        });
        if (pager) pager.hidden = true;
        if (ind) ind.textContent = "";
        aplicarPistaVisual();
    }

    function pintarOpciones() {
        if (!ronda || !ronda.seccion) return;
        var caja = $id("opciones-" + sufijo(ronda.seccion));
        if (!caja) return;
        var habilitadas = ronda.fase === "seleccion_respuesta" || ronda.fase === "respuesta_incorrecta";
        if (ocultarOpcionesHastaResponder()) {
            caja.hidden = !habilitadas;
            if (!habilitadas) {
                caja.innerHTML = "";
                return;
            }
        } else {
            caja.hidden = false;
        }
        var revelar = L.revelarRespuesta(ronda.intentos, pref("intentos_max", 3));
        var atenuar = L.atenuarOpciones(ronda.intentos, pref("respuestasMaximasAntesDeAtenuar", 2));
        var tonos = ["tono-rosa", "tono-verde", "tono-azul"];
        var animarEntrada = habilitadas && !ronda.opcionesEntraron && animacionesUi();
        if (habilitadas) ronda.opcionesEntraron = true;
        caja.innerHTML = "";
        caja.classList.toggle("opciones-entran", !!animarEntrada);
        var botones = [];
        ronda.opciones.forEach(function (n, i) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "opcion " + tonos[i % tonos.length];
            btn.dataset.valor = String(n);
            btn.innerHTML = '<span class="opcion-gloss" aria-hidden="true"></span><span class="opcion-num">' + String(n) + "</span>";
            btn.disabled = !habilitadas || ronda.demo;
            if (revelar && n === ronda.correcto) btn.classList.add("revelada");
            if (atenuar && n !== ronda.correcto) btn.classList.add("atenuada");
            if (ronda.seleccion === n && n !== ronda.correcto) btn.classList.add("err");
            if (ronda.seleccion === n && n === ronda.correcto) btn.classList.add("ok");
            btn.addEventListener("click", function () { alElegir(n); });
            caja.appendChild(btn);
            botones.push({ el: btn, i: i });
        });
        if (animarEntrada && botones.length) {
            void caja.offsetWidth;
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    if (!ronda) return;
                    botones.forEach(function (par) {
                        par.el.classList.add("opcion-entra");
                        par.el.style.animationDelay = (par.i * 110) + "ms";
                    });
                });
            });
        }
    }

    var zoomTimer = null;

    function armarZoom(btn, manzana) {
        if (!pref("zoomLongPress", false) || pref("modoTap", false)) return;
        clearTimeout(zoomTimer);
        zoomTimer = setTimeout(function () {
            btn.dataset.zoom = "1";
            var zoom = $id("zoom");
            var img = $id("zoom-img");
            if (img) img.src = imgObjetoConteo();
            if (zoom) zoom.hidden = false;
            manzana.zoom = true;
        }, 650);
    }

    function soltarZoom() { clearTimeout(zoomTimer); }

    function cerrarZoom() {
        var zoom = $id("zoom");
        if (zoom) zoom.hidden = true;
    }

    function alTocarManzana(id) {
        if (!ronda || ronda.demo || juegoTerminado) return;
        if (ronda.fase !== "en_conteo" && ronda.fase !== "respuesta_incorrecta") return;
        var sel = '.' + claseObjetoConteo() + '[data-id="' + id + '"]';
        var btn = ronda.seccion && ronda.seccion.querySelector(sel);
        if (btn && btn.dataset.zoom === "1") {
            btn.dataset.zoom = "";
            return;
        }
        var resultado = L.tocar(ronda.manzanas, id);
        clickSuave();
        if (!resultado.ok) {
            if (btn) {
                btn.classList.remove("rebote");
                void btn.offsetWidth;
                btn.classList.add("contada");
            }
            return;
        }
        ronda.fase = "en_conteo";
        if (ronda.conejos || ronda.pollitos) {
            ronda.objetoAnimando = id;
        }
        pintarManzanas();
        pintarProgreso();
        var recien = ronda.seccion.querySelector('.' + claseObjetoConteo() + '[data-id="' + id + '"]');
        if (recien) encenderManzana(recien);
        if (ronda.conejos && recien) {
            /* Evitar que .contada la suba antes del temblor + salida. */
            recien.classList.remove("sacada");
            desenterrarZanahoria(recien);
        }
        if (ronda.pollitos && recien) {
            recien.classList.remove("nacido");
            nacerPollito(recien);
        }
        refuerzoPaso(resultado.numero);
        if (ronda.pollitos) {
            decirEnCola({ voz: "zoe", texto: "¡Pío!" });
        } else {
            decirEnCola({ voz: "zoe", texto: L.textoNumero(resultado.numero) });
        }
        if (resultado.completo) {
            /* Conejos/pollitos: esperar animación; manzanas: breve. */
            var esperaPregunta = 420;
            if (ronda.conejos) esperaPregunta = reducirMovimiento() ? 220 : 1100;
            else if (ronda.pollitos) esperaPregunta = reducirMovimiento() ? 260 : 1100;
            window.setTimeout(function () {
                if (!ronda || ronda.fase !== "en_conteo") return;
                ronda.fase = "seleccion_respuesta";
                document.body.classList.add("listo-para-responder");
                pintarOpciones();
                var pregunta = (ronda.conejos || ronda.pollitos)
                    ? ((ronda.reto && ronda.reto.pregunta) || { voz: "zeus", texto: L.PREGUNTA_TOTAL })
                    : { voz: "zeus", texto: L.PREGUNTA_TOTAL };
                decirEnCola(pregunta);
            }, esperaPregunta);
            return;
        }
        var vista = L.pagina(ronda.manzanas, ronda.visibles, ronda.pagina);
        var quedanAqui = vista.items.some(function (m) { return !m.contada; });
        if (!quedanAqui && ronda.manzanas.length > ronda.visibles) {
            var siguiente = L.paginaConPendientes(ronda.manzanas, ronda.visibles, ronda.pagina + 1);
            ronda.pagina = siguiente.pagina;
            pintarManzanas();
        }
    }

    /** Estrellas solo al tocar (animación corta); no van fijas en la manzana. */
    function encenderManzana(btn) {
        if (!btn) return;
        btn.classList.add("contada", "brilla-toque");
        window.setTimeout(function () { btn.classList.remove("brilla-toque"); }, 500);
        if (reducir()) return;
        var i;
        for (i = 0; i < 8; i++) {
            var estrella = document.createElement("i");
            estrella.className = "estrella-vuelo";
            estrella.style.setProperty("--ang", (i * 45) + "deg");
            estrella.style.setProperty("--d", (28 + (i % 3) * 12) + "px");
            btn.appendChild(estrella);
        }
        window.setTimeout(function () {
            btn.querySelectorAll(".estrella-vuelo").forEach(function (el) { el.remove(); });
        }, 700);
    }

    function refuerzoPaso(numero) {
        var modo = String(pref("refuerzo", "al completar"));
        var toca = modo === "cada paso" || (modo === "cada 2 pasos" && numero % 2 === 0);
        if (!toca || pref("refuerzo_visual") === false) return;
        if (reducir() || pref("refuerzo_tipo") === "solo_texto") return;
        celebrarPersonajes();
    }

    function alElegir(valor) {
        if (!ronda || ronda.demo || juegoTerminado) return;
        if (ronda.fase !== "seleccion_respuesta" && ronda.fase !== "respuesta_incorrecta") return;
        ronda.seleccion = valor;
        if (L.evaluar(ronda.correcto, valor) === "correcto") acertar();
        else fallar();
    }

    function umbrales() {
        return {
            automaticas: pref("pistaPorFallos", true) !== false,
            erroresAntesDePista: pref("erroresAntesDePista", 2),
            fallosPista1: pref("fallosPista1", 2),
            fallosPista2: pref("fallosPista2", 3)
        };
    }

    function nivelPistaActual() {
        var auto = L.nivelPista(ronda.intentos, umbrales());
        return Math.max(auto, ronda.ayuda || 0);
    }

    function aplicarPistaVisual() {
        if (!ronda || !ronda.seccion) return;
        var nivelP = nivelPistaActual();
        var pista = $id("pista-" + sufijo(ronda.seccion));
        ronda.seccion.querySelectorAll("." + claseObjetoConteo()).forEach(function (el) { el.classList.remove("pista-brillo"); });
        if (pista && nivelP < 2) {
            pista.hidden = true;
            pista.textContent = "";
        }
        if (nivelP === 1) {
            var pendiente = ronda.seccion.querySelector("." + claseObjetoConteo() + ":not(.contada)");
            if (pendiente) pendiente.classList.add("pista-brillo");
        }
        if (nivelP === 2 && pista) {
            pista.hidden = false;
            pista.textContent = ronda.pollitos
                ? "Toca los pollitos uno por uno."
                : (ronda.conejos ? "Toca las zanahorias una por una." : "Toca las manzanas una por una.");
        }
        if (nivelP === 3 && pista) {
            pista.hidden = false;
            var llevas = L.contadas(ronda.manzanas);
            pista.textContent = ronda.pollitos
                ? ("Llevas " + llevas + " pollitos.")
                : (ronda.conejos
                    ? ("Llevas " + llevas + " zanahorias.")
                    : ("Llevas " + llevas + " manzanas."));
        }
        if (nivelP >= 4 && pista) {
            pista.hidden = false;
            pista.textContent = ronda.pollitos
                ? "Mira: tocamos cada pollito una vez."
                : (ronda.conejos ? "Mira: tocamos cada zanahoria una vez." : "Mira: tocamos cada manzana una vez.");
            var primera = ronda.seccion.querySelector("." + claseObjetoConteo() + ":not(.contada)")
                || ronda.seccion.querySelector("." + claseObjetoConteo());
            if (primera) primera.classList.add("pista-brillo");
        }
    }

    function pedirAyuda() {
        if (!ronda || ronda.demo || juegoTerminado) return;
        ronda.ayuda = Math.min(4, (ronda.ayuda || 0) + 1);
        aplicarPistaVisual();
        if (ronda.ayuda >= 2) decirYa({ voz: "zeus", texto: $id("pista-" + sufijo(ronda.seccion)).textContent });
    }

    function fallar() {
        ronda.intentos += 1;
        ronda.fase = "respuesta_incorrecta";
        pintarOpciones();
        aplicarPistaVisual();
        var tono = sfx();
        if (tono && efectosActivos()) tono.sonar("error");
        var espera = Number(pref("feedback_demora_ms", 0)) || 0;
        var linea = (ronda.reto && ronda.reto.errorOtro) || { voz: "zeus", texto: L.textoError() };
        window.setTimeout(function () {
            if (!ronda) return;
            decirYa(linea);
            mostrarFeedback("error");
            ronda.fase = "seleccion_respuesta";
            pintarOpciones();
        }, espera);
    }

    function acertar() {
        ronda.fase = "respuesta_correcta";
        detenerReloj();
        pintarOpciones();
        var ruta = gameConfig.audios && (gameConfig.audios.acierto || (gameConfig.audios.efectos && gameConfig.audios.efectos.recompensa));
        if (pref("refuerzo_sonido", true) !== false) playArchivo(ruta);
        var linea = (ronda.reto && ronda.reto.acierto) || { voz: "zoe", texto: L.textoAcierto(ronda.correcto) };
        decirYa(linea);
        var vueloMs = celebrar();
        var espera = reducirMovimiento() ? 400 : Math.max(2200, vueloMs + 450);
        window.setTimeout(function () {
            if (!vivo(rondaGen)) return;
            continuarTrasAcierto();
        }, espera);
    }

    function celebrarPersonajes() {
        if (reducir() || pref("refuerzo_visual") === false || pref("refuerzo_tipo") === "solo_texto") return;
        ["pj-zoe", "pj-zeus"].forEach(function (id) {
            var el = $id(id);
            if (!el) return;
            el.classList.remove("celebra");
            void el.offsetWidth;
            el.classList.add("celebra");
        });
        if (window.PersonajesJuego) {
            if (typeof PersonajesJuego.hablar === "function") {
                PersonajesJuego.hablar("zoe");
                PersonajesJuego.hablar("zeus");
            }
            window.setTimeout(function () {
                if (typeof PersonajesJuego.callar === "function") {
                    PersonajesJuego.callar("zoe");
                    PersonajesJuego.callar("zeus");
                }
            }, 1600);
        }
    }

    function celebrar() {
        celebrarPersonajes();
        if (ronda && ronda.conejos) {
            return celebrarConejos();
        }
        if (ronda && ronda.pollitos) {
            return celebrarPollitos();
        }
        if (pref("refuerzo_visual") === false) {
            return soltarEnCanasta(true);
        }
        return soltarEnCanasta(reducirMovimiento());
    }

    function limpiarObjetoAnimando(btn) {
        if (!ronda || !btn || !btn.dataset.id) return;
        if (ronda.objetoAnimando === btn.dataset.id) ronda.objetoAnimando = null;
    }

    function nacerPollito(btn) {
        if (!btn) return;
        btn.classList.remove("rompe", "nace", "nacido", "nacido-fijo");
        void btn.offsetWidth;
        if (reducirMovimiento()) {
            btn.classList.add("nacido", "nacido-fijo", "contado-vivo");
            marcarAnimLista(btn.dataset.id);
            limpiarObjetoAnimando(btn);
            return;
        }
        btn.classList.add("rompe");
        window.setTimeout(function () {
            if (!btn.isConnected) return;
            btn.classList.add("nace", "contado-vivo");
            var pio = document.createElement("span");
            pio.className = "pio-globo";
            pio.textContent = "¡Pío!";
            btn.appendChild(pio);
            window.setTimeout(function () {
                if (pio.parentNode) pio.remove();
            }, 900);
            window.setTimeout(function () {
                if (!btn.isConnected) return;
                btn.classList.add("nacido", "nacido-fijo");
                btn.classList.remove("rompe");
                marcarAnimLista(btn.dataset.id);
                limpiarObjetoAnimando(btn);
            }, 780);
        }, 320);
    }

    function celebrarPollitos() {
        if (!ronda || !ronda.seccion) return 0;
        var instant = pref("refuerzo_visual") === false || reducirMovimiento();
        var pollitos = ronda.seccion.querySelectorAll(".pollito");
        pollitos.forEach(function (p) {
            p.classList.add("baila");
        });
        if (!instant) {
            window.setTimeout(function () {
                pollitos.forEach(function (p) {
                    if (p.isConnected) p.classList.remove("baila");
                });
            }, 2200);
        }
        return instant ? 400 : 2200;
    }

    function imgConejo(feliz) {
        var els = gameConfig.elementos || {};
        if (feliz) {
            var f = els.conejoFeliz;
            return (f && f.img) || "img/conejo_feliz.png";
        }
        var n = els.conejo;
        return (n && n.img) || "img/conejo.png";
    }

    function lanzarTierra(btn) {
        if (!btn || reducirMovimiento()) return;
        var i;
        for (i = 0; i < 5; i++) {
            var terron = document.createElement("span");
            terron.className = "terron";
            terron.style.setProperty("--tx", ((i - 2) * 14) + "px");
            terron.style.setProperty("--ty", (-18 - (i % 3) * 10) + "px");
            terron.style.setProperty("--delay", (i * 0.03) + "s");
            btn.appendChild(terron);
            (function (el) {
                window.setTimeout(function () { if (el.parentNode) el.remove(); }, 700);
            })(terron);
        }
    }

    /** Temblor fuerte y luego sale de la tierra. */
    function desenterrarZanahoria(btn) {
        if (!btn) return;
        btn.classList.remove("tiembla-saca", "sacada", "sacada-fija");
        void btn.offsetWidth;
        if (reducirMovimiento()) {
            btn.classList.add("sacada", "sacada-fija");
            marcarAnimLista(btn.dataset.id);
            limpiarObjetoAnimando(btn);
            return;
        }
        btn.classList.add("tiembla-saca");
        window.setTimeout(function () {
            if (!btn.isConnected) return;
            btn.classList.remove("tiembla-saca");
            void btn.offsetWidth;
            btn.classList.add("sacada", "sacada-fija");
            lanzarTierra(btn);
            marcarAnimLista(btn.dataset.id);
            limpiarObjetoAnimando(btn);
        }, 560);
    }

    function celebrarConejos() {
        if (!ronda || !ronda.seccion) return 0;
        var instant = pref("refuerzo_visual") === false || reducirMovimiento();
        var wrap = ronda.seccion.querySelector(".conejo-wrap");
        var conejo = ronda.seccion.querySelector(".conejo");
        var premio = ronda.seccion.querySelector(".conejo-premio");
        var estrellas = ronda.seccion.querySelector(".conejo-estrellas");
        var zanahorias = ronda.seccion.querySelectorAll(".zanahoria.contada");
        var i;
        if (conejo) {
            conejo.src = imgConejo(true);
            conejo.classList.add("conejo-feliz");
        }
        if (premio) {
            premio.hidden = false;
            premio.src = imgObjetoConteo();
        }
        if (wrap) {
            wrap.classList.remove("festeja");
            void wrap.offsetWidth;
            wrap.classList.add("festeja");
        }
        if (estrellas && !instant) {
            estrellas.innerHTML = "";
            for (i = 0; i < 10; i++) {
                var s = document.createElement("span");
                s.className = "conejo-estrella";
                s.style.setProperty("--a", (i * 36) + "deg");
                s.style.setProperty("--d", (24 + (i % 4) * 14) + "px");
                s.style.setProperty("--delay", (i * 0.05) + "s");
                estrellas.appendChild(s);
            }
            window.setTimeout(function () {
                if (estrellas.isConnected) estrellas.innerHTML = "";
            }, 1400);
        }
        zanahorias.forEach(function (z, idx) {
            window.setTimeout(function () {
                if (z.isConnected) z.classList.add("comida");
            }, instant ? 0 : 180 + idx * 120);
        });
        return instant ? 400 : 2200;
    }

    function resetConejoEscena(seccion) {
        if (!seccion) return;
        var wrap = seccion.querySelector(".conejo-wrap");
        var conejo = seccion.querySelector(".conejo");
        var premio = seccion.querySelector(".conejo-premio");
        if (wrap) wrap.classList.remove("festeja");
        if (conejo) {
            conejo.classList.remove("conejo-feliz");
            conejo.src = imgConejo(false);
        }
        if (premio) premio.hidden = true;
    }

    function aterrizarEnCanasta(btn, canasta) {
        btn.classList.remove("vuela-a-canasta");
        btn.style.cssText = "";
        btn.classList.add("en-cesta", "aterriza");
        if (canasta) canasta.appendChild(btn);
        window.setTimeout(function () {
            if (btn.isConnected) btn.classList.remove("aterriza");
        }, 420);
    }

    /** Brillo y chispas cuando la última manzana llega a la canasta. */
    function brillarCanastaLlena(wrap) {
        if (!wrap || reducirMovimiento()) return;
        wrap.classList.remove("canasta-llena");
        void wrap.offsetWidth;
        wrap.classList.add("canasta-llena");
        var i;
        for (i = 0; i < 8; i++) {
            var chispa = document.createElement("span");
            chispa.className = "canasta-chispa";
            chispa.style.setProperty("--a", (i * 45) + "deg");
            chispa.style.setProperty("--d", (18 + (i % 3) * 10) + "px");
            wrap.appendChild(chispa);
            (function (el) {
                window.setTimeout(function () { if (el.parentNode) el.remove(); }, 950);
            })(chispa);
        }
        window.setTimeout(function () {
            if (wrap.isConnected) wrap.classList.remove("canasta-llena");
        }, 1500);
    }

    /**
     * Lleva las manzanas a la canasta en arco, encogiéndose; al llegar quedan
     * pequeñas en #canasta-N y la canasta brilla.
     * @returns {number} duración total aprox. en ms
     */
    function soltarEnCanasta(instantaneo) {
        if (!ronda || !ronda.seccion) return 0;
        var canasta = $id("canasta-" + sufijo(ronda.seccion));
        var wrap = ronda.seccion.querySelector(".canasta-wrap");
        var botones = Array.prototype.slice.call(ronda.seccion.querySelectorAll(".manzana:not(.en-cesta)"));
        if (!botones.length) return 0;
        var destino = canasta || wrap;
        var destRect = destino ? destino.getBoundingClientRect() : null;
        var scaleFin = 0.28;
        var minTotal = 2000;
        var n = botones.length;
        var vuelo = 1200;
        var paso = n <= 1 ? 0 : Math.max(320, Math.ceil((minTotal - vuelo) / (n - 1)));
        var totalMs = (n - 1) * paso + vuelo;
        if (totalMs < minTotal) vuelo += minTotal - totalMs;
        totalMs = (n - 1) * paso + vuelo;

        if (instantaneo || !destRect) {
            botones.forEach(function (btn) {
                btn.classList.remove("cae", "vuela-a-canasta", "brilla-toque");
                btn.style.cssText = "";
                btn.classList.add("en-cesta");
                if (canasta) canasta.appendChild(btn);
            });
            brillarCanastaLlena(wrap);
            return 0;
        }

        var pendientes = botones.length;

        botones.forEach(function (btn, i) {
            btn.classList.remove("cae", "brilla-toque");
            btn.style.animation = "none";
            void btn.offsetWidth;
            var from = btn.getBoundingClientRect();
            var dx = destRect.left + destRect.width * 0.5 - from.width * scaleFin * 0.5 - from.left;
            var dy = destRect.top + destRect.height * 0.32 - from.height * scaleFin * 0.5 - from.top;
            var arco = Math.min(88, Math.max(44, Math.abs(dy) * 0.24));
            var mx = dx * 0.48;
            var my = dy * 0.38 - arco;
            var inicio = i * paso;

            /*
             * .escena tiene transform: la manzana no puede volar en position:fixed
             * dentro de ese contenedor. Se mueve al body con coords de viewport.
             */
            document.body.appendChild(btn);
            btn.classList.add("vuela-a-canasta");
            btn.style.position = "fixed";
            btn.style.left = from.left + "px";
            btn.style.top = from.top + "px";
            btn.style.width = from.width + "px";
            btn.style.height = from.height + "px";
            btn.style.zIndex = String(900 + i);
            btn.style.margin = "0";
            btn.style.right = "auto";
            btn.style.bottom = "auto";
            btn.style.transform = "translate(0px, 0px) scale(1)";
            btn.style.transition = "none";
            void btn.offsetWidth;

            var terminado = false;
            function alFin() {
                if (terminado || btn.classList.contains("en-cesta")) return;
                terminado = true;
                if (btn.getAnimations) {
                    btn.getAnimations().forEach(function (a) { a.cancel(); });
                }
                aterrizarEnCanasta(btn, canasta);
                pendientes -= 1;
                if (pendientes === 0) brillarCanastaLlena(wrap);
            }

            var keyframes = [
                { transform: "translate(0px, 0px) scale(1)" },
                { transform: "translate(" + mx + "px, " + my + "px) scale(0.55)" },
                { transform: "translate(" + dx + "px, " + dy + "px) scale(" + scaleFin + ")" }
            ];

            window.setTimeout(function () {
                if (!btn.isConnected || btn.classList.contains("en-cesta")) return;
                if (btn.animate) {
                    var anim = btn.animate(keyframes, {
                        duration: vuelo,
                        easing: "cubic-bezier(0.28, 0.85, 0.32, 1)",
                        fill: "forwards"
                    });
                    anim.finished.then(alFin).catch(alFin);
                    return;
                }
                btn.style.transition = "transform " + vuelo + "ms cubic-bezier(0.28, 0.85, 0.32, 1)";
                btn.style.transform = "translate(" + dx + "px, " + dy + "px) scale(" + scaleFin + ")";
                window.setTimeout(alFin, vuelo);
            }, inicio);
        });

        return totalMs + 350;
    }

    function mostrarFeedback(tipo) {
        if (pref("mostrarFeedBack", true) === false || !window.Swal) return;
        var fb = pref("feedback", {}) || {};
        var item = fb[tipo] || {};
        var gif = item.gif || (tipo === "error" ? "../../../images/incorrecto.gif" : "../../../images/correcto.gif");
        var duracion = Number(fb.duracion) || 1600;
        Swal.fire({
            position: "center",
            showConfirmButton: false,
            timer: duracion,
            imageUrl: gif,
            imageWidth: 180,
            imageHeight: 180,
            heightAuto: false,
            scrollbarPadding: false,
            width: 320
        });
    }

    function volverAContar() {
        if (!ronda || ronda.demo || juegoTerminado) return;
        if (ronda.fase === "respuesta_correcta" || ronda.fase === "celebracion") return;
        L.reiniciarConteo(ronda.manzanas);
        ronda.seleccion = null;
        ronda.fase = "en_conteo";
        ronda.pagina = 0;
        ronda.opcionesEntraron = false;
        ronda.objetoAnimando = null;
        document.body.classList.remove("listo-para-responder");
        if (ronda.conejos) {
            resetConejoEscena(ronda.seccion);
            ronda.seccion.querySelectorAll(".zanahoria").forEach(function (z) {
                z.classList.remove("comida", "sacada", "tiembla-saca");
            });
        } else if (ronda.pollitos) {
            ronda.seccion.querySelectorAll(".pollito").forEach(function (p) {
                p.classList.remove("rompe", "nace", "nacido", "contado-vivo", "baila");
            });
        } else {
            var canasta = $id("canasta-" + sufijo(ronda.seccion));
            if (canasta) canasta.innerHTML = "";
        }
        pintarManzanas();
        pintarOpciones();
        pintarProgreso();
        decirYa({
            voz: "zeus",
            texto: ronda.pollitos
                ? "Toca cada pollito, uno por uno."
                : (ronda.conejos ? "Toca cada zanahoria, una por una." : "Toca cada manzana, una por una.")
        });
    }

    function cambiarPagina(dir) {
        if (!ronda) return;
        var vista = L.pagina(ronda.manzanas, ronda.visibles, ronda.pagina + dir);
        ronda.pagina = vista.pagina;
        pintarManzanas();
    }

    function presentar(gen) {
        var reto = nivel.retos[indice];
        if (!reto) { cierre(gen); return; }
        var seccion = seccionDe(reto);
        if (!seccion) {
            console.warn("[CuentaLosObjetos] El reto " + reto.id + " no tiene un div listo.");
            cierre(gen);
            return;
        }
        ronda = crearRonda(reto, false);
        if (!ronda.seccion) { cierre(gen); return; }
        mostrarSolo(ronda.seccion);
        ronda.fase = "presentacion";
        ronda.opcionesEntraron = false;
        if (ronda.conejos) resetConejoEscena(ronda.seccion);
        if (ronda.pollitos && ronda.seccion) {
            ronda.seccion.querySelectorAll(".pollito").forEach(function (p) {
                p.classList.remove("rompe", "nace", "nacido", "contado-vivo", "baila");
            });
        }
        pintarManzanas();
        pintarOpciones();
        pintarProgreso();
        iniciarReloj();
        decirEnCola(reto.presentacion);
        /* Manzanas: instrucción de conteo al inicio. Conejos/pollitos: preguntan después. */
        if (!ronda.conejos && !ronda.pollitos) {
            decirEnCola(reto.pregunta || { voz: "zeus", texto: "Toca cada manzana para contar cuántas hay." });
        }
        colaVoz.then(function () {
            if (!vivo(gen) || !ronda) return;
            ronda.fase = "en_conteo";
        });
    }

    function iniciarReloj() {
        detenerReloj();
    }

    function detenerReloj() {
        if (reloj) window.clearInterval(reloj);
        reloj = null;
    }

    function abrirPausa(texto, luego) {
        if (typeof luego === "function") luego();
    }

    function cerrarPausa() {
        if (pausaTimer) window.clearTimeout(pausaTimer);
        pausaTimer = null;
        var fn = alSeguir;
        alSeguir = null;
        if (fn) fn();
    }

    function continuarTrasAcierto() {
        indice += 1;
        if (!nivel.retos[indice] || !seccionDe(nivel.retos[indice]) || seccionDe(nivel.retos[indice]).dataset.reto !== nivel.retos[indice].id) {
            descansar(function () { cierre(rondaGen); });
            return;
        }
        descansar(function () { presentar(rondaGen); });
    }

    function descansar(luego) {
        if (pref("pausa_entre_bloques") !== true) { luego(); return; }
        var seg = Number(pref("duracion_pausa_seg", 3));
        if (!isFinite(seg) || seg < 0) seg = 3;
        if (pausaTimer) window.clearTimeout(pausaTimer);
        pausaTimer = window.setTimeout(function () {
            pausaTimer = null;
            if (typeof luego === "function") luego();
        }, seg * 1000);
    }

    function cierre(gen) {
        if (!vivo(gen) && juegoTerminado) return;
        juegoTerminado = true;
        detenerReloj();
        ronda = ronda || {};
        ronda.fase = "reto_completado";
        var lineas = (nivel && nivel.cierre) || [];
        var ultima = lineas[lineas.length - 1] || { voz: "zoe", texto: "¡Excelente!" };
        var texto = $id("texto_final");
        if (texto) texto.textContent = ultima.texto || "";
        var ins = nivel && nivel.insignia;
        var trofeo = document.querySelector("#victoria img.trofeo");
        if (trofeo && ins && ins.img) {
            trofeo.src = ins.img;
            trofeo.alt = ins.nombre || "";
        }
        if (gameConfig.audios && gameConfig.audios.cierre) playArchivo(gameConfig.audios.cierre);
        if (window.TextoVoz && audioInstrucciones()) TextoVoz.hablar(ultima.texto, vozDe(ultima));
        window.setTimeout(function () {
            var caja = $id("final");
            if (caja) {
                caja.hidden = false;
                caja.style.display = "block";
            }
            if (typeof window.iniciarSecuenciaVictoria === "function") window.iniciarSecuenciaVictoria();
            else if (typeof window.iniciarVictoria === "function") window.iniciarVictoria();
        }, 400);
    }

    async function correrDemo(gen) {
        var d = gameConfig.demo;
        if (!d || !L.respuestaDe(d)) return;
        demoActiva = true;
        document.body.classList.add("demo-activa");
        ronda = crearRonda(d, true);
        if (!ronda.seccion) { demoActiva = false; return; }
        mostrarSolo(ronda.seccion);
        pintarManzanas();
        pintarOpciones();
        await decir({ voz: "zoe", texto: textos().demostracion || "¡Mira cómo contamos las manzanas!" });
        if (!vivo(gen)) return;
        var i;
        for (i = 0; i < ronda.manzanas.length; i++) {
            L.tocar(ronda.manzanas, ronda.manzanas[i].id);
            pintarManzanas();
            pintarProgreso();
            var demoBtn = ronda.seccion.querySelector('.manzana[data-id="' + ronda.manzanas[i].id + '"]');
            if (demoBtn) encenderManzana(demoBtn);
            await decir({ voz: "zoe", texto: L.textoNumero(i + 1) });
            if (!vivo(gen)) return;
            await sleep(reducir() ? 200 : 500);
        }
        ronda.fase = "seleccion_respuesta";
        ronda.seleccion = ronda.correcto;
        pintarOpciones();
        await decir({ voz: "zoe", texto: L.textoAcierto(ronda.correcto) });
        if (!vivo(gen)) return;
        await decir({ voz: "zoe", texto: textos().demostracionFin || "¡Ahora te toca a ti!" });
        demoActiva = false;
        document.body.classList.remove("demo-activa");
        ronda = null;
    }

    function preloadUrl(url) {
        return new Promise(function (resolve) {
            if (!url) { resolve(); return; }
            var img = new Image();
            img.onload = function () { resolve(); };
            img.onerror = function () { resolve(); };
            img.src = url;
        });
    }

    function urlsEscena() {
        var urls = [];
        document.querySelectorAll(".huerta img, .escena-huerta img, .escena .arbol").forEach(function (el) {
            var src = el.getAttribute("src");
            if (src) urls.push(src);
        });
        var el = gameConfig && gameConfig.elementos;
        if (el) {
            Object.keys(el).forEach(function (k) {
                if (el[k] && el[k].img) urls.push(el[k].img);
            });
        }
        return urls;
    }

    function precargarEscena() {
        var unicas = {};
        urlsEscena().forEach(function (u) { unicas[u] = true; });
        return Promise.all(Object.keys(unicas).map(preloadUrl));
    }

    async function bienvenidaYJuego(gen) {
        /* 1) Escena lista → 2) niños caminan → 3) hablan (como intros Polimotor). */
        if (window.PersonajesJuego && typeof PersonajesJuego.iniciarEntrada === "function") {
            PersonajesJuego.iniciarEntrada();
        } else {
            document.body.classList.remove("esperando-escena");
        }
        window.dispatchEvent(new Event("resize"));
        if (window.PersonajesJuego && typeof PersonajesJuego.entradaCompleta === "function") {
            await PersonajesJuego.entradaCompleta();
        } else {
            await sleep(900);
        }
        if (!vivo(gen)) return;
        await sleep(reducir() ? 120 : 280);
        if (!vivo(gen)) return;
        var lineas = (nivel && nivel.bienvenida) || [];
        var i;
        for (i = 0; i < lineas.length; i++) {
            if (!vivo(gen)) return;
            await decir({ voz: vozDe(lineas[i]), texto: lineas[i].texto });
        }
        if (!vivo(gen)) return;
        var mostrar = window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro;
        if (mostrar) await correrDemo(gen);
        if (!vivo(gen)) return;
        presentar(gen);
    }

    function elegirNivel() {
        if (!window.Swal) {
            window.confirmarNivel(gameConfig.niveles[0].id);
            return;
        }
        var botones = "";
        gameConfig.niveles.forEach(function (n, i) {
            var color = i === 0 ? "success" : "primary";
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' + color + '" onclick="confirmarNivel(\'' + n.id + '\')"><strong>' + n.edad + "</strong><br><small>" + n.titulo + "</small></button></div>";
        });
        if (window.TextoVoz) TextoVoz.hablar(textos().eligeNivel || "Elige tu nivel", "zoe");
        Swal.fire({
            title: textos().eligeNivel || "Elige tu nivel",
            html: '<div class="row justify-content-center">' + botones + "</div>",
            showConfirmButton: false,
            allowOutsideClick: false,
            heightAuto: false,
            width: 460
        });
    }

    window.confirmarNivel = function confirmarNivel(id) {
        if (arrancado) return;
        nivel = (gameConfig.niveles || []).find(function (n) { return String(n.id) === String(id); });
        if (!nivel) return;
        arrancado = true;
        if (window.Swal) Swal.close();
        rondaGen += 1;
        juegoTerminado = false;
        indice = 0;
        document.body.classList.add("pj-entran", "esperando-escena");
        var principal = $id("principal");
        if (principal) principal.style.display = "flex";
        var primera = seccionDe((nivel.retos && nivel.retos[0]) || null);
        if (primera) mostrarSolo(primera);
        precargarEscena().then(function () {
            if (!vivo(rondaGen)) return;
            bienvenidaYJuego(rondaGen);
        });
    };

    function conversacionInicial() {
        return (textos().conversacion || []).slice();
    }

    function sincronizarDialogoIntro3d() {
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        var personajesCfg = window.INTRO_CONFIG.personajes || [];
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (linea) {
            var idx = Number(linea.personaje);
            var def = personajesCfg[isFinite(idx) ? idx : 0] || {};
            var nombre = def.nombre || (idx === 0 ? "Zeus" : "Zoe");
            return { personaje: String(nombre).toLowerCase(), nombre: nombre, texto: String(linea.texto || "").trim() };
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
        if (cerrado) return;
        cerrado = true;
        if (window.TextoVoz) TextoVoz.detener();
        destruirIntro3d();
        document.body.classList.remove("esperando-inicio");
        asegurarFondo();
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: gameConfig.niveles || [],
                elegirManual: elegirNivel,
                onElegido: function (n) { if (n) window.confirmarNivel(n.id); }
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
        var tono = sfx();
        if (tono && tono.desbloquear) tono.desbloquear();
        if (window.TextoVoz && TextoVoz.desbloquear) TextoVoz.desbloquear();
        sincronizarDialogoIntro3d();
        if (window.TextoVoz && TextoVoz.precargar) TextoVoz.precargar();
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

    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    function enlazarVolumen() {
        var btn = $id("btn-menu-vol");
        var panel = $id("menu-vol-panel");
        var slider = $id("rango-volumen");
        function setAbierto(abierto) {
            if (!panel || !btn) return;
            panel.hidden = !abierto;
            btn.setAttribute("aria-expanded", abierto ? "true" : "false");
        }
        if (btn) btn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            setAbierto(panel.hidden);
        });
        var cerrar = $id("btn-cerrar-vol");
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

    /** Nubes SVG: derivan a posiciones aleatorias dentro de cada cielo de huerta. */
    function iniciarNubes() {
        var cielos = document.querySelectorAll(".cielo");
        if (!cielos.length) return;

        function rnd(min, max) {
            return min + Math.random() * (max - min);
        }

        function colocar(nube, animar) {
            var left = rnd(-4, 88);
            var top = rnd(4, 62);
            if (!animar) nube.style.transition = "none";
            else {
                var dur = rnd(7, 16);
                nube.style.transition = "left " + dur.toFixed(1) + "s linear, top " + dur.toFixed(1) + "s linear";
            }
            nube.style.left = left + "%";
            nube.style.top = top + "%";
            if (!animar) {
                void nube.offsetWidth;
                nube.style.transition = "";
            }
            return rnd(6000, 14000);
        }

        cielos.forEach(function (cielo) {
            cielo.querySelectorAll(".nube").forEach(function (nube, i) {
                colocar(nube, false);
                var tick = function () {
                    if (document.body.classList.contains("sin-animaciones")
                        || document.body.classList.contains("sin-decoracion")
                        || document.body.classList.contains("sin-flotantes")) {
                        window.setTimeout(tick, 4000);
                        return;
                    }
                    var espera = colocar(nube, true);
                    window.setTimeout(tick, espera);
                };
                window.setTimeout(tick, 800 + i * 1200 + rnd(0, 2000));
            });
        });
    }

    function enlazarRetos() {
        document.querySelectorAll(".reto").forEach(function (seccion) {
            seccion.addEventListener("click", function (ev) {
                var pag = ev.target.closest(".btn-pag");
                if (!pag || !ronda || ronda.seccion !== seccion) return;
                cambiarPagina(Number(pag.dataset.dir) || 0);
            });
        });
        var btnAyuda = $id("btn-ayuda");
        if (btnAyuda) btnAyuda.addEventListener("click", pedirAyuda);
        var zoomCerrar = $id("zoom-cerrar");
        if (zoomCerrar) zoomCerrar.addEventListener("click", cerrarZoom);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var crudo = readText("config.json?v=20261021a");
        gameConfig = JSON.parse(crudo);
        try { introConfig = JSON.parse(readText("../../../intro.json")); } catch (e) { introConfig = {}; }
        var informe = L.validarConfig(gameConfig);
        if (informe.errores.length) console.warn("[CuentaLosObjetos]", informe.errores);
        if (informe.avisos.length) console.warn("[CuentaLosObjetos]", informe.avisos);
        aplicarPreferencias();
        if (window.TextoVoz) {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenPct() / 100
            });
        }
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarPreferencias);
        enlazarVolumen();
        enlazarRetos();
        iniciarNubes();
        $id("btn-empecemos").addEventListener("click", empecemosJuego);
        var omitir = $id("btn-omitir-intro3d");
        if (omitir) omitir.addEventListener("click", function () {
            var root = $id("intro3d-root");
            if (!root || root.hidden) empezarJuegoTrasIntro();
            else window.dispatchEvent(new CustomEvent("intro3d-omitir"));
        });
        var seguirIntro = $id("btn-continuar-intro3d");
        if (seguirIntro) seguirIntro.addEventListener("click", empezarJuegoTrasIntro);
        window.addEventListener("victory-continue", empezarJuegoTrasIntro);
        window.addEventListener("message", function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === "pednia:perfil") {
                window.__PEDNIA_PERFIL__ = ev.data.perfil;
                aplicarPreferencias();
            }
        });
    });
})();
