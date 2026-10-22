(function (global) {
    var VOLUMEN_FONDO = 0.2;
    var VOLUMEN_DUCK = 0.05;
    var URL_TTS = "/juegos/tts";

    var config = {};
    var intro = {};
    var opciones = {};

    var ttsToken = 0;
    var ttsPlayer = null;
    var ttsResolvers = [];
    var ttsCache = Object.create(null);
    var ttsPendientes = Object.create(null);
    var ttsCola = [];
    var ttsColaAndando = false;

    function accesibilidad() {
        return (config && config.accesibilidad) || {};
    }

    function audioFondoActual() {
        if (typeof opciones.obtenerAudioFondo === "function") {
            return opciones.obtenerAudioFondo();
        }
        return opciones.audioFondo || null;
    }

    function textoPlano(html) {
        if (!html) return "";
        var tmp = document.createElement("div");
        tmp.innerHTML = html;
        return String(tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
    }

    function notificarTtsFin() {
        var pendientes = ttsResolvers.slice();
        ttsResolvers = [];
        pendientes.forEach(function (fn) {
            try { fn(); } catch (e) { /* noop */ }
        });
    }

    function aplicarVolumenFondo(vol) {
        var audio = audioFondoActual();
        if (!audio) return;
        try { audio.volume = vol; } catch (e) { /* noop */ }
    }

    function definirVolumenFondo(vol) {
        var n = Number(vol);
        if (!isFinite(n)) return VOLUMEN_FONDO;
        VOLUMEN_FONDO = Math.max(0, Math.min(1, n));
        aplicarVolumenFondo(VOLUMEN_FONDO);
        return VOLUMEN_FONDO;
    }

    function esBlobTts(src) {
        return typeof src === "string" && src.indexOf("blob:") === 0;
    }

    function olvidarTts(src) {
        if (!src) return;
        Object.keys(ttsCache).forEach(function (k) {
            if (ttsCache[k] === src) delete ttsCache[k];
        });
        if (esBlobTts(src)) {
            try { URL.revokeObjectURL(src); } catch (e) { /* noop */ }
        }
    }

    function vaciarCacheTts() {
        Object.keys(ttsCache).forEach(function (k) {
            var src = ttsCache[k];
            delete ttsCache[k];
            if (esBlobTts(src)) {
                try { URL.revokeObjectURL(src); } catch (e) { /* noop */ }
            }
        });
    }

    function detenerReproduccionTts() {
        // No revocar blobs aquí: la precarga sirve precisamente para reusar
        // la misma frase (feedback, consignas) sin volver a pegarle a /juegos/tts.
        if (ttsPlayer) {
            try {
                ttsPlayer.onended = null;
                ttsPlayer.onerror = null;
                ttsPlayer.pause();
                ttsPlayer.removeAttribute("src");
                try { ttsPlayer.load(); } catch (e2) { /* noop */ }
            } catch (e) { /* noop */ }
        }
        if (global.speechSynthesis) {
            try { global.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        }
        aplicarVolumenFondo(VOLUMEN_FONDO);
    }

    function detenerVoz() {
        ttsToken += 1;
        detenerReproduccionTts();
        notificarTtsFin();
    }

    function ttsRatePct() {
        var n = Number(accesibilidad().rate);
        if (!isFinite(n)) n = 5;
        return Math.max(-50, Math.min(100, n));
    }

    function ttsRate() {
        return Math.max(0.5, Math.min(1.5, 1 + ttsRatePct() / 100));
    }

    function personajeDeIndice(index) {
        var p = intro && intro.personajes ? intro.personajes[index] : null;
        return String((p && p.nombre) || "").toLowerCase().indexOf("zeus") >= 0 ? "zeus" : "zoe";
    }

    function claveTts(texto, personaje) {
        var pj = String(personaje || "zoe").toLowerCase() === "zeus" ? "zeus" : "zoe";
        return pj + "\n" + ttsRatePct() + "\n" + textoPlano(texto);
    }

    function obtenerUrlTts(texto, personaje, urgente) {
        var t = textoPlano(texto);
        var pj = String(personaje || "zoe").toLowerCase() === "zeus" ? "zeus" : "zoe";
        if (!t) return Promise.resolve(null);
        var key = claveTts(t, pj);
        if (ttsCache[key]) return Promise.resolve(ttsCache[key]);
        if (ttsPendientes[key]) return ttsPendientes[key];

        ttsPendientes[key] = new Promise(function (resolve) {
            var item = { texto: t, personaje: pj, key: key, resolve: resolve };
            if (urgente) ttsCola.unshift(item);
            else ttsCola.push(item);
            bombearColaTts();
        }).finally(function () {
            delete ttsPendientes[key];
        });
        return ttsPendientes[key];
    }

    function esperar(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function fetchTts(texto, personaje, maxIntentos) {
        var intentos = 0;
        var tope = Math.max(1, Number(maxIntentos) || 3);
        function una() {
            intentos += 1;
            return fetch(URL_TTS + "?" + new URLSearchParams({
                texto: texto,
                personaje: personaje,
                rate: String(ttsRatePct())
            }), {
                headers: { Accept: "audio/mpeg" }
            }).then(function (res) {
                var tipo = (res.headers.get("content-type") || "").toLowerCase();
                if (!res.ok || tipo.indexOf("audio") < 0) {
                    var err = new Error("tts " + res.status);
                    err.status = res.status;
                    throw err;
                }
                return res.blob();
            }).then(function (blob) {
                if (!blob || !blob.size) throw new Error("tts vacio");
                var src = URL.createObjectURL(blob);
                ttsCache[claveTts(texto, personaje)] = src;
                return src;
            }).catch(function (err) {
                if (intentos >= tope) return null;
                var status = err && err.status;
                var espera = (status === 429 || status === 502) ? 2500 * intentos : 900 * intentos;
                return esperar(espera).then(una);
            });
        }
        return una();
    }

    /** Fetch fuera de cola: para hablar() sin esperar la precarga. */
    function fetchTtsDirecto(texto, personaje, maxIntentos) {
        return fetchTts(texto, personaje, maxIntentos || 1);
    }

    function encolarTts(texto, personaje) {
        obtenerUrlTts(texto, personaje, false);
    }

    function bombearColaTts() {
        if (ttsColaAndando) return;
        var sig = ttsCola.shift();
        if (!sig) return;
        ttsColaAndando = true;
        var trabajo = ttsCache[sig.key]
            ? Promise.resolve(ttsCache[sig.key])
            : fetchTts(sig.texto, sig.personaje);
        trabajo.then(function (src) {
            if (typeof sig.resolve === "function") sig.resolve(src);
        }).finally(function () {
            var pausa = ttsCache[sig.key] ? 0 : 120;
            setTimeout(function () {
                ttsColaAndando = false;
                bombearColaTts();
            }, pausa);
        });
    }

    function precargarVocesConocidas() {
        var textos = (config && config.textos) || {};
        var lineasIntro = (textos.conversacion && textos.conversacion.length)
            ? textos.conversacion
            : ((intro && intro.conversacion) || (config && config.conversacion) || []);
        if (Array.isArray(lineasIntro)) {
            lineasIntro.forEach(function (linea) {
                encolarTts(linea.texto, personajeDeIndice(linea.personaje));
            });
        }
        var fb = accesibilidad().feedback || {};
        ["zoe", "zeus"].forEach(function (pj) {
            Object.keys(textos).forEach(function (k) {
                if (typeof textos[k] === "string" && textos[k]) encolarTts(textos[k], pj);
            });
            if (fb.acierto && fb.acierto.texto) encolarTts(fb.acierto.texto, pj);
            if (fb.error && fb.error.texto) encolarTts(fb.error.texto, pj);
        });
    }

    function encolarFrases(lista) {
        if (!lista || !lista.length) return;
        lista.forEach(function (f) {
            if (!f) return;
            if (typeof f === "string") encolarTts(f, "zoe");
            else if (f.texto) encolarTts(f.texto, f.personaje || "zoe");
        });
    }

    function vozNavegadorEspanol() {
        if (!global.speechSynthesis) return null;
        var voices = global.speechSynthesis.getVoices() || [];
        var best = null;
        var bestScore = -1;
        voices.forEach(function (v) {
            var lang = String(v.lang || "").toLowerCase().replace("_", "-");
            var name = String(v.name || "").toLowerCase();
            if (!(lang.indexOf("es") === 0 || /spanish|español/.test(name))) return;
            var score = 10;
            if (lang.indexOf("co") >= 0) score += 20;
            else if (lang.indexOf("mx") >= 0) score += 16;
            if (/google|natural|neural/.test(name)) score += 12;
            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        });
        return best;
    }

    function hablarNavegador(texto, personaje, token, onEnd, onInicio) {
        if (!global.speechSynthesis) {
            if (typeof onInicio === "function") onInicio();
            if (typeof onEnd === "function") onEnd();
            return;
        }
        var u = new SpeechSynthesisUtterance(texto);
        var voice = vozNavegadorEspanol();
        u.lang = (voice && voice.lang) ? voice.lang : "es-CO";
        if (voice) u.voice = voice;
        u.rate = ttsRate();
        u.pitch = personaje === "zeus" ? 0.75 : 1.15;
        u.onstart = function () {
            if (token === ttsToken && typeof onInicio === "function") onInicio();
        };
        u.onend = function () {
            if (token === ttsToken && typeof onEnd === "function") onEnd();
        };
        u.onerror = function () {
            if (token === ttsToken && typeof onInicio === "function") onInicio();
            if (token === ttsToken && typeof onEnd === "function") onEnd();
        };
        try {
            global.speechSynthesis.speak(u);
            if (global.speechSynthesis.paused) global.speechSynthesis.resume();
            // Algunos navegadores no disparan onstart: avisar al encolar.
            setTimeout(function () {
                if (token === ttsToken && typeof onInicio === "function") onInicio();
            }, 0);
        } catch (e) {
            if (typeof onInicio === "function") onInicio();
            if (typeof onEnd === "function") onEnd();
        }
    }

    function aplicarDuracionObjetivo(player, duracionMs) {
        if (!player) return;
        var objetivo = Number(duracionMs);
        if (!isFinite(objetivo) || objetivo <= 0) {
            try { player.playbackRate = 1; } catch (e) { /* noop */ }
            return;
        }
        var aplicar = function () {
            if (!(player.duration > 0)) return;
            var rate = (player.duration * 1000) / objetivo;
            try { player.playbackRate = Math.max(0.7, Math.min(1.25, rate)); } catch (e2) { /* noop */ }
        };
        if (player.readyState >= 1 && player.duration > 0) aplicar();
        else {
            player.addEventListener("loadedmetadata", aplicar, { once: true });
        }
    }

    function textoConteo(segundos) {
        var mapa = { 1: "uno", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco" };
        var n = Math.max(1, Math.min(5, Math.floor(Number(segundos) || 3)));
        var partes = [];
        var i;
        for (i = n; i >= 1; i--) partes.push(mapa[i] || String(i));
        return partes.join(". ") + ".";
    }

    function reproducirUrlTts(src, texto, personaje, token, onEnd, duracionMs, onInicio) {
        if (!ttsPlayer) ttsPlayer = new Audio();
        var inicioAvisado = false;
        var avisarInicio = function () {
            if (inicioAvisado || token !== ttsToken) return;
            inicioAvisado = true;
            if (typeof onInicio === "function") onInicio();
        };
        ttsPlayer.onended = function () {
            if (typeof onEnd === "function") onEnd();
        };
        ttsPlayer.onerror = function () {
            // Blob inválido / revocado: invalidar caché y caer a voz del navegador.
            olvidarTts(src);
            if (token !== ttsToken) return;
            hablarNavegador(texto, personaje, token, onEnd, onInicio);
        };
        ttsPlayer.src = src;
        aplicarDuracionObjetivo(ttsPlayer, duracionMs);
        var p = ttsPlayer.play();
        if (p && typeof p.then === "function") {
            p.then(avisarInicio).catch(function () {
                if (token !== ttsToken) return;
                hablarNavegador(texto, personaje, token, onEnd, onInicio);
            });
        } else {
            avisarInicio();
        }
    }

    function hablar(texto, personaje, opts) {
        return new Promise(function (resolve) {
            var t = textoPlano(texto);
            opts = opts || {};
            var onInicio = typeof opts.onInicio === "function" ? opts.onInicio : null;
            var inicioHecho = false;
            var avisarInicio = function () {
                if (inicioHecho) return;
                inicioHecho = true;
                if (onInicio) onInicio();
            };

            if (!t) {
                avisarInicio();
                resolve();
                return;
            }

            var duracionMs = opts.duracionMs != null ? Number(opts.duracionMs) : null;
            // Si el servidor TTS tarda, no congelar el juego: voz del navegador y cachear después.
            // fallbackNavegador:false → solo voz del personaje (servidor); si falla, onSinServidor o silencio.
            var fallbackNavegador = opts.fallbackNavegador !== false;
            var onSinServidor = typeof opts.onSinServidor === "function" ? opts.onSinServidor : null;
            var esperarTtsMs = opts.esperarTtsMs != null ? Number(opts.esperarTtsMs) : 700;
            if (!isFinite(esperarTtsMs) || esperarTtsMs < 0) esperarTtsMs = 700;
            if (!fallbackNavegador) esperarTtsMs = Math.max(esperarTtsMs, 12000);

            ttsToken += 1;
            var myToken = ttsToken;
            detenerReproduccionTts();
            notificarTtsFin();
            ttsResolvers.push(resolve);

            var pj = String(personaje || "zoe").toLowerCase() === "zeus" ? "zeus" : "zoe";
            var key = claveTts(t, pj);
            var safety = null;
            var timerRapido = null;
            var yaHablo = false;
            var done = function () {
                if (myToken !== ttsToken) return;
                if (safety) {
                    clearTimeout(safety);
                    safety = null;
                }
                if (timerRapido) {
                    clearTimeout(timerRapido);
                    timerRapido = null;
                }
                avisarInicio();
                detenerReproduccionTts();
                notificarTtsFin();
            };
            safety = setTimeout(done, Math.max(20000, (isFinite(duracionMs) ? duracionMs : 0) + 4000));
            aplicarVolumenFondo(Math.min(VOLUMEN_DUCK, VOLUMEN_FONDO));

            function sinServidor() {
                if (myToken !== ttsToken || yaHablo) return;
                yaHablo = true;
                if (timerRapido) {
                    clearTimeout(timerRapido);
                    timerRapido = null;
                }
                if (onSinServidor) {
                    Promise.resolve(onSinServidor()).catch(function () {}).then(done);
                    return;
                }
                if (fallbackNavegador) {
                    hablarNavegador(t, pj, myToken, done, avisarInicio);
                    return;
                }
                done();
            }

            function hablarCon(src) {
                if (myToken !== ttsToken || yaHablo) {
                    return;
                }
                if (!src) {
                    sinServidor();
                    return;
                }
                yaHablo = true;
                if (timerRapido) {
                    clearTimeout(timerRapido);
                    timerRapido = null;
                }
                reproducirUrlTts(src, t, pj, myToken, done, duracionMs, avisarInicio);
            }

            var cached = ttsCache[key];
            if (cached) {
                hablarCon(cached);
                return;
            }

            // Voz inmediata si el TTS no llega a tiempo (solo si se permite fallback de navegador).
            if (fallbackNavegador) {
                timerRapido = setTimeout(function () {
                    sinServidor();
                }, esperarTtsMs);
            }

            // Fetch directo, sin meterse detrás de la precarga.
            var intentosTts = opts.intentosTts != null ? Number(opts.intentosTts) : 1;
            if (!isFinite(intentosTts) || intentosTts < 1) intentosTts = 1;
            fetchTtsDirecto(t, pj, intentosTts).then(function (src) {
                if (src) ttsCache[key] = src;
                if (myToken !== ttsToken) return;
                if (yaHablo) return;
                hablarCon(src);
            }).catch(function () {
                if (myToken !== ttsToken || yaHablo) return;
                sinServidor();
            });
        });
    }

    function desbloquearAudioTts() {
        if (!ttsPlayer) ttsPlayer = new Audio();
        try {
            ttsPlayer.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
            var p = ttsPlayer.play();
            if (p && typeof p.catch === "function") p.catch(function () { /* noop */ });
        } catch (e) { /* noop */ }
        if (global.speechSynthesis) {
            try { global.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        }
    }

    function iniciar(configJson, introJson, extras) {
        config = configJson || {};
        intro = introJson || {};
        opciones = extras || {};
        if (opciones.volumenFondo != null) VOLUMEN_FONDO = Number(opciones.volumenFondo);
        if (opciones.volumenDuck != null) VOLUMEN_DUCK = Number(opciones.volumenDuck);
        if (opciones.urlTts) URL_TTS = String(opciones.urlTts);
        return api;
    }

    var api = {
        iniciar: iniciar,
        precargar: precargarVocesConocidas,
        encolarFrases: encolarFrases,
        hablar: hablar,
        textoConteo: textoConteo,
        detener: detenerVoz,
        desbloquear: desbloquearAudioTts,
        vaciar: vaciarCacheTts,
        personajeDeIndice: personajeDeIndice,
        volumenFondo: aplicarVolumenFondo,
        definirVolumenFondo: definirVolumenFondo
    };

    Object.defineProperty(api, "VOLUMEN_FONDO", {
        get: function () { return VOLUMEN_FONDO; }
    });

    global.TextoVoz = api;
})(window);
