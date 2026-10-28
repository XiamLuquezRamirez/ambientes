/**
 * pednia-audio.js — Audio compartido de los juegos (Howler.js, local en assets/vendor/howler).
 *
 * Tres canales:
 *   - música:  fondo en bucle (streaming HTML5, con fundidos y "ducking" cuando habla el personaje).
 *   - efectos: un sprite por tema/ambiente (un solo archivo, respuesta inmediata al toque).
 *   - archivos sueltos del juego (acierto/error/cierre del config) como respaldo.
 *
 * Temas por ambiente: cada tema define su sprite y qué suena en cada evento del juego.
 * Un juego elige su tema en config.json → audios.tema (p. ej. "polimotor").
 *
 * Sin Howler (o si falla) los juegos siguen con su audio original: PedniaAudio.activo === false.
 * No usa Math.random (los juegos lo usan para barajar): variación con generador propio.
 */
(function (global) {
    'use strict';

    var Howl = global.Howl;
    var Howler = global.Howler;
    var activo = !!(Howl && Howler);

    // Carpeta de este archivo → rutas de los temas relativas a shared/.
    var base = (function () {
        var s = global.document.currentScript;
        var src = s && s.src ? s.src : '';
        return src.replace(/[^/]*$/, '');
    })();

    var TEMAS = {
        // Cancha: bote, silbato suave, red, aplausos y ovación (sintetizados, sin licencias).
        polimotor: {
            // Bucle de 33 s (116 BPM): marimba, guitarra apagada, bajo, batería y palmas de tribuna.
            // ?v= cambia al regenerar los archivos (la tablet no se queda con la copia vieja).
            musica: 'audio/polimotor/musica.wav?v=20261028d',
            efectos: 'audio/polimotor/efectos.wav?v=20261028g',
            // Mapa en ms que imprime scripts/audio/sintetizar_polimotor.py (0.45 s de silencio entre sonidos).
            // Ningún efecto lleva tonos puros (se comprueba con scripts/audio/detectar_pitidos.py).
            sprite: {
                bote: [0, 615],
                agarrar: [1065, 130],
                soltar: [1645, 495],
                fallo: [2590, 775],
                regreso: [3815, 500],
                vuelo: [4765, 460],
                red: [5675, 895],
                aplausos: [7020, 1875],
                ovacion: [9345, 3575],
                encaje: [13370, 595],
                tic: [14415, 120],
                redoble: [14985, 2475]
            },
            // Evento del juego → efectos (nombre o {e, vol, retraso en s}).
            eventos: {
                // Coordinación visual
                acierto: ['vuelo'],
                enRed: ['red', { e: 'aplausos', retraso: 0.12 }],
                error: ['fallo'],
                regreso: ['regreso'],
                agarrar: ['agarrar'],
                soltar: ['soltar'],
                bote: ['bote'],
                // Redoble + platillo y la ovación encima. NO usar victory.mp3 (fanfarria de tonos
                // puros 1–2.6 kHz = el "pitido" que seguía oyéndose al terminar).
                victoria: ['redoble', { e: 'ovacion', retraso: 0.9 }],
                // Rompecabezas
                encaje: ['encaje', { e: 'aplausos', vol: 0.35, retraso: 0.15 }],
                tic: ['tic'],
                // Genéricos para el resto de juegos de Polimotor
                correcto: ['encaje', { e: 'aplausos', vol: 0.35, retraso: 0.15 }],
                aparece: [{ e: 'bote', vol: 0.5 }]
            }
        }
    };

    var tema = null;
    var sprite = null;
    var musica = null;
    var archivos = {};
    var aplazados = [];

    var semilla = 20261028;
    function azar() {
        semilla = (semilla * 1664525 + 1013904223) >>> 0;
        return semilla / 4294967296;
    }

    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ---------------- Carga robusta ----------------

    function aBase64(buf) {
        var bytes = new Uint8Array(buf);
        var partes = [];
        for (var i = 0; i < bytes.length; i += 0x8000) {
            partes.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
        }
        return global.btoa(partes.join(''));
    }

    /**
     * Descarga un audio (con reintentos) y lo entrega como data URI para que Howler lo
     * decodifique en Web Audio SIN hacer su propia petición. Si la petición de Howler falla
     * (p. ej. el servidor corta la conexión mientras carga la intro 3D), Howler cae en
     * silencio a modo HTML5: ahí los sprites se cortan con un temporizador impreciso y se
     * cuela el sonido siguiente del archivo (eso producía el "pitido"). listo(dataUri, ext)
     * o, si se agotan los intentos, fallo().
     */
    function cargarComoDatos(url, intentos, listo, fallo) {
        var ext = (/\.([a-z0-9]+)(?:\?|$)/i.exec(url) || [0, 'wav'])[1].toLowerCase();
        if (!global.fetch || !global.btoa || Howler.usingWebAudio === false) { fallo(); return; }
        // Límite de 15 s por intento: si el servidor corta la conexión a mitad de la descarga
        // sin avisar, la promesa quedaba pendiente para siempre y la música nunca arrancaba.
        var ctrl = global.AbortController ? new global.AbortController() : null;
        var limite = global.setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
        // Los reintentos saltan la caché con una dirección propia: si una descarga anterior de
        // la misma URL quedó colgada, Chrome hace esperar a las siguientes (bloqueo de caché).
        var reintento = intentos < 5;
        var destino = reintento ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'r=' + intentos + '-' + Date.now() : url;
        var opciones = { cache: reintento ? 'no-store' : 'default' };
        if (ctrl) opciones.signal = ctrl.signal;
        global.fetch(destino, opciones).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.arrayBuffer();
        }).then(function (buf) {
            global.clearTimeout(limite);
            var mime = ext === 'mp3' ? 'mpeg' : ext;
            listo('data:audio/' + mime + ';base64,' + aBase64(buf), ext);
        }).catch(function () {
            global.clearTimeout(limite);
            if (intentos > 0) {
                // Espera creciente: 0.8 s, 1.6 s, 2.4 s…
                var espera = 800 * (6 - Math.min(5, intentos));
                global.setTimeout(function () { cargarComoDatos(url, intentos - 1, listo, fallo); }, espera);
            } else {
                fallo();
            }
        });
    }

    // ---------------- Música: adaptador con la forma de un <audio> ----------------
    // Los juegos y TextoVoz manejan el fondo con .volume / .playbackRate / play() / pause();
    // este objeto los traduce a Howler con fundidos suaves.
    // corto = bucle del tema: Web Audio (bucle perfecto, sin hueco al reiniciar); ahí cambiar
    // la velocidad también sube el tono, así que el "acelerón" del juego se suaviza a la mitad.
    // Archivo largo del juego: streaming HTML5 (no se decodifica entero en memoria).
    function crearMusica(ruta, corto) {
        var h = null;      // el Howl llega cuando el archivo está descargado
        var id = null;
        var pedida = false;
        var pausada = false;
        var vol = 0.2;
        var tasa = 1;
        var ducking = 1;   // multiplicador temporal (celebración)

        function tasaReal() { return (corto && h && h._webAudio) ? 1 + (tasa - 1) * 0.5 : tasa; }

        function aplicar(ms) {
            if (!h || id === null) return;
            var destino = vol * ducking;
            if (h.playing(id)) {
                h.fade(h.volume(id), destino, ms == null ? 220 : ms, id);
            } else {
                h.volume(destino, id);
            }
        }

        // Arranca solo con el archivo ya cargado: si se pide antes, Howler lo encola y esa
        // cola puede quedarse atascada (la música no arrancaba).
        // Nada de volume()/rate()/fade() antes de que la reproducción empiece de verdad
        // (Howler los encola y en HTML5 se quedaban atascados: música sonando a volumen 0).
        function arrancar() {
            if (!h || id !== null || !pedida || h.state() !== 'loaded') return;
            var webAudio = !!h._webAudio;
            h.volume(webAudio ? 0 : vol * ducking);   // volumen del Howl antes de play
            if (webAudio) {
                // FALLO DEL NAVEGADOR (Chrome, reproducido): con loop + loopEnd = duración exacta
                // del buffer + start(…, duración), tras la primera vuelta el bucle se queda en
                // ~10 muestras → tono puro de ~4.9 kHz continuo (el "pitido iiiii" a los ~33 s).
                // El bucle termina 5 ms antes del final y desaparece. (_sprite es interno de
                // Howler 2.2.4, versión fija en assets/vendor.)
                h._sprite.pedniaBucle = [0, Math.max(10, Math.floor(h.duration() * 1000) - 5)];
                id = h.play('pedniaBucle');
            } else {
                id = h.play();
            }
            h.once('play', function () {
                if (pausada) { h.pause(id); return; }
                h.rate(tasaReal(), id);
                if (webAudio) h.fade(0, vol * ducking, 700, id);
                else aplicar(0);
            }, id);
        }

        function usar(howl) {
            h = howl;
            if (h.state() === 'loaded') arrancar();
            else h.once('load', arrancar);
        }

        if (corto) {
            cargarComoDatos(ruta, 5, function (datos, ext) {
                usar(new Howl({ src: [datos], format: [ext], html5: false, loop: true, volume: 0 }));
            }, function () {
                usar(new Howl({ src: [ruta], html5: true, loop: true, volume: 0 }));
            });
        } else {
            usar(new Howl({ src: [ruta], html5: true, loop: true, volume: 0, preload: true }));
        }

        var adaptador = {
            loop: true,
            get volume() { return vol; },
            set volume(v) {
                vol = limitar(Number(v) || 0, 0, 1);
                aplicar();
            },
            get playbackRate() { return tasa; },
            set playbackRate(r) {
                tasa = limitar(Number(r) || 1, 0.5, 2);
                if (h && id !== null) h.rate(tasaReal(), id);
            },
            get paused() { return id === null || pausada; },
            play: function () {
                if (id === null) {
                    // Si ya se pidió (aunque siga cargando), no se lanza otra copia.
                    pausada = false;
                    pedida = true;
                    arrancar();
                } else if (pausada) {
                    pausada = false;
                    h.play(id);
                    aplicar(400);
                }
                return Promise.resolve();
            },
            pause: function () {
                pausada = true;
                if (h && id !== null) h.pause(id);
            },
            // Baja la música durante un momento (celebración) y la devuelve.
            agachar: function (factor, segundos) {
                ducking = factor;
                aplicar(350);
                if (segundos) {
                    global.setTimeout(function () { ducking = 1; aplicar(900); }, segundos * 1000);
                }
            }
        };
        return adaptador;
    }

    // ---------------- Efectos ----------------

    // El sprite siempre en Web Audio (corte exacto de cada efecto): ver cargarComoDatos().
    function cargarSprite(t) {
        cargarComoDatos(base + t.efectos, 5, function (datos, ext) {
            if (tema !== t) return;
            sprite = new Howl({ src: [datos], format: [ext], sprite: t.sprite, html5: false, preload: true });
        }, function () {
            if (tema !== t) return;
            sprite = new Howl({ src: [base + t.efectos], sprite: t.sprite, html5: false, preload: true });
        });
    }

    function sonarEfecto(nombre, vol, tasa) {
        if (!sprite || !tema || !tema.sprite[nombre]) return false;
        // Un efecto que llega antes de que cargue el sprite no se encola (llegaría tarde).
        if (sprite.state() !== 'loaded') return true;
        var id = sprite.play(nombre);
        sprite.volume(limitar(vol == null ? 1 : vol, 0, 1), id);
        if (tasa && tasa !== 1) sprite.rate(tasa, id);
        return true;
    }

    var PedniaAudio = {
        activo: activo,

        /**
         * Carga el tema del juego (config.audios.tema). Sin tema en el config se deduce del
         * ambiente por la carpeta del juego (…/Polimotor/… → "polimotor"). "ninguno" lo apaga.
         * Devuelve true si quedó listo.
         */
        usarTema: function (nombre) {
            if (!activo) return false;
            var clave = String(nombre || '').toLowerCase();
            if (clave === 'ninguno') return false;
            if (!clave) {
                var m = /\/catalogo_juegos\/([^/]+)\//i.exec(global.location.pathname);
                clave = m ? m[1].toLowerCase() : '';
            }
            var t = TEMAS[clave];
            if (!t) return false;
            if (tema === t) return true;
            tema = t;
            cargarSprite(t);
            return true;
        },

        tieneTema: function () { return !!tema; },

        /**
         * Música de fondo con la misma forma que un <audio> (para el juego y TextoVoz).
         * Si el tema trae su propia música, esa reemplaza a la del config (`ruta`).
         */
        musica: function (ruta) {
            if (!activo) return null;
            var delTema = tema && tema.musica ? base + tema.musica : null;
            var final = delTema || ruta;
            if (!final) return null;
            if (!musica || musica.__ruta !== final) {
                musica = crearMusica(final, !!delTema);
                musica.__ruta = final;
            }
            return musica;
        },

        /** Un efecto del sprite. opts: { vol, tasa, variar (0..1: leve cambio de tono/volumen) }. */
        efecto: function (nombre, opts) {
            if (!activo) return false;
            opts = opts || {};
            var v = opts.vol == null ? 1 : opts.vol;
            var r = opts.tasa || 1;
            if (opts.variar) {
                r *= 1 + (azar() - 0.5) * 0.16 * opts.variar;
                v *= 1 - azar() * 0.2 * opts.variar;
            }
            return sonarEfecto(nombre, v, r);
        },

        /**
         * Evento del juego según el tema. Devuelve true si el tema lo cubre (el juego ya
         * no necesita su sonido original). opts.retraso: segundos antes de sonar.
         */
        evento: function (nombre, opts) {
            if (!activo || !tema || !tema.eventos[nombre]) return false;
            opts = opts || {};
            var lista = tema.eventos[nombre];
            lista.forEach(function (item) {
                var e = typeof item === 'string' ? { e: item } : item;
                var ret = (e.retraso || 0) + (opts.retraso || 0);
                var vol = (e.vol == null ? 1 : e.vol) * (opts.vol == null ? 1 : opts.vol);
                if (ret > 0) {
                    aplazados.push(global.setTimeout(function () { sonarEfecto(e.e, vol, opts.tasa); }, ret * 1000));
                } else {
                    sonarEfecto(e.e, vol, opts.tasa);
                }
            });
            return true;
        },

        /** Cancela los efectos programados con retraso (p. ej. al salir del juego). */
        cancelarPendientes: function () {
            aplazados.forEach(function (t) { global.clearTimeout(t); });
            aplazados = [];
        },

        /** Archivo suelto (acierto/error/cierre del config) con caché, como el juego original. */
        archivo: function (ruta, vol, loop) {
            if (!activo || !ruta) return false;
            var h = archivos[ruta];
            if (!h) {
                h = new Howl({ src: [ruta], preload: true });
                archivos[ruta] = h;
            }
            var sonar = function () {
                h.stop();
                var id = h.play();
                h.volume(vol == null ? 0.85 : vol, id);
                h.loop(!!loop, id);
            };
            if (h.state() === 'loaded') sonar();
            else h.once('load', sonar);
            return true;
        },

        /** Baja la música un rato (celebraciones). */
        agacharMusica: function (factor, segundos) {
            if (musica) musica.agachar(factor, segundos);
        }
    };

    global.PedniaAudio = PedniaAudio;

    // ---------------- Diagnóstico (solo con ?diagaudio en la dirección) ----------------
    // Registra cada 250 ms qué suena (copias de música/efectos, volumen, posición) y cualquier
    // tono fijo en la salida, más los eventos del juego. Se guarda en localStorage
    // ('pednia_diag_audio') para leerlo aunque la página se recargue. No afecta al juego.
    if (activo && /[?&]diagaudio/.test(global.location.search)) {
        var CLAVE = 'pednia_diag_audio';
        var reg = [];
        var t0 = Date.now();
        var anotar = function (tipo, datos) {
            reg.push([((Date.now() - t0) / 1000).toFixed(2), tipo, datos]);
            if (reg.length > 4000) reg.shift();
        };
        ['evento', 'efecto', 'archivo', 'musica', 'agacharMusica'].forEach(function (k) {
            var original = PedniaAudio[k];
            PedniaAudio[k] = function () {
                var args = Array.prototype.slice.call(arguments).map(function (a) {
                    return typeof a === 'string' ? a.split('/').pop() : a;
                });
                anotar(k, JSON.stringify(args));
                return original.apply(this, arguments);
            };
        });
        if (global.speechSynthesis) {
            var hablar0 = global.speechSynthesis.speak.bind(global.speechSynthesis);
            global.speechSynthesis.speak = function (u) { anotar('voz', String(u.text).slice(0, 50)); return hablar0(u); };
        }
        var play0 = global.HTMLMediaElement.prototype.play;
        global.HTMLMediaElement.prototype.play = function () {
            var s = String(this.currentSrc || this.src || '');
            if (s.indexOf('data:') !== 0) anotar('media', s.split('/').pop().slice(0, 60) + ' loop=' + this.loop);
            return play0.apply(this, arguments);
        };
        var an = null;
        var datos = null;
        var ultimoEstado = '';
        global.setInterval(function () {
            if (!an && Howler.ctx && Howler.masterGain) {
                an = Howler.ctx.createAnalyser();
                an.fftSize = 8192;
                an.smoothingTimeConstant = 0;
                Howler.masterGain.connect(an);
                datos = new Float32Array(an.frequencyBinCount);
                anotar('diag', 'analizador conectado, ' + Howler.ctx.sampleRate + ' Hz');
            }
            var estado = Howler._howls.map(function (h) {
                var tipo = (h._sprite && h._sprite.encaje) ? 'efectos'
                    : (String(h._src).indexOf('data:') === 0 ? 'musica' : String(h._src).split('/').pop().slice(0, 30));
                var sonando = h._sounds.filter(function (s) { return !s._paused; }).map(function (s) {
                    var pos = 0;
                    try { pos = h.seek(s._id); } catch (e) { /* noop */ }
                    return 'v' + s._volume.toFixed(2) + ' r' + s._rate + ' @' + (typeof pos === 'number' ? pos.toFixed(1) : '?');
                });
                return tipo + (h._webAudio ? '(wa)' : '(h5)') + '[' + sonando.length + ']' + (sonando.length ? ' ' + sonando.join(' | ') : '');
            }).join(' ;; ');
            var resumen = estado.replace(/@[\d.]+/g, '');
            if (resumen !== ultimoEstado) { anotar('estado', estado); ultimoEstado = resumen; }
            if (an) {
                an.getFloatFrequencyData(datos);
                var hz = Howler.ctx.sampleRate / an.fftSize;
                var i0 = Math.floor(200 / hz);
                var i1 = Math.min(datos.length - 41, Math.floor(20000 / hz));
                var bi = i0;
                for (var i = i0; i < i1; i++) if (datos[i] > datos[bi]) bi = i;
                var vec = Array.prototype.slice.call(datos, bi - 40, bi + 40).sort(function (a, b) { return a - b; });
                var prom = datos[bi] - vec[40];
                if (datos[bi] > -95 && prom > 20) anotar('tono', Math.round(bi * hz) + ' Hz ' + datos[bi].toFixed(0) + ' dB +' + prom.toFixed(0));
            }
        }, 250);
        global.setInterval(function () {
            try { global.localStorage.setItem(CLAVE, JSON.stringify(reg)); } catch (e) { /* noop */ }
        }, 1000);
        global.PedniaDiag = { registro: function () { return reg; } };
        var marca = global.document.createElement('div');
        marca.textContent = 'DIAG AUDIO';
        marca.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;font:11px monospace;' +
            'background:#b91c1c;color:#fff;padding:2px 6px;border-radius:4px;pointer-events:none;opacity:.8';
        (global.document.body || global.document.documentElement).appendChild(marca);
    }
})(window);
