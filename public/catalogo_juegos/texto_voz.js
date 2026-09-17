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

    function obtenerUrlTts(texto, personaje) {
        var t = textoPlano(texto);
        var pj = String(personaje || "zoe").toLowerCase() === "zeus" ? "zeus" : "zoe";
        if (!t) return Promise.resolve(null);
        var key = claveTts(t, pj);
        if (Object.prototype.hasOwnProperty.call(ttsCache, key)) {
            return Promise.resolve(ttsCache[key]);
        }
        if (ttsPendientes[key]) return ttsPendientes[key];

        ttsPendientes[key] = fetch(URL_TTS + "?" + new URLSearchParams({
            texto: t,
            personaje: pj,
            rate: String(ttsRatePct())
        }), {
            headers: { Accept: "audio/mpeg" }
        }).then(function (res) {
            var tipo = (res.headers.get("content-type") || "").toLowerCase();
            if (!res.ok || tipo.indexOf("audio") < 0) throw new Error("tts");
            return res.blob();
        }).then(function (blob) {
            if (!blob || !blob.size) {
                ttsCache[key] = null;
                return null;
            }
            var src = URL.createObjectURL(blob);
            ttsCache[key] = src;
            return src;
        }).catch(function () {
            ttsCache[key] = null;
            return null;
        }).finally(function () {
            delete ttsPendientes[key];
        });
        return ttsPendientes[key];
    }

    function encolarTts(texto, personaje) {
        ttsCola.push({ texto: texto, personaje: personaje });
        bombearColaTts();
    }

    function bombearColaTts() {
        if (ttsColaAndando) return;
        var sig = ttsCola.shift();
        if (!sig) return;
        ttsColaAndando = true;
        obtenerUrlTts(sig.texto, sig.personaje).finally(function () {
            ttsColaAndando = false;
            bombearColaTts();
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
            var fb = accesibilidad().feedback || {};
            var textos = (config && config.textos) || {};
            ["zoe", "zeus"].forEach(function (pj) {
                Object.keys(textos).forEach(function (k) {
                    if (typeof textos[k] === "string" && textos[k]) encolarTts(textos[k], pj);
                });
                if (fb.acierto && fb.acierto.texto) encolarTts(fb.acierto.texto, pj);
                if (fb.error && fb.error.texto) encolarTts(fb.error.texto, pj);
            });
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

    function hablarNavegador(texto, personaje, token, onEnd) {
        if (!global.speechSynthesis) {
            if (typeof onEnd === "function") onEnd();
            return;
        }
        var u = new SpeechSynthesisUtterance(texto);
        var voice = vozNavegadorEspanol();
        u.lang = (voice && voice.lang) ? voice.lang : "es-CO";
        if (voice) u.voice = voice;
        u.rate = ttsRate();
        u.pitch = personaje === "zeus" ? 0.75 : 1.15;
        u.onend = function () {
            if (token === ttsToken && typeof onEnd === "function") onEnd();
        };
        u.onerror = function () {
            if (token === ttsToken && typeof onEnd === "function") onEnd();
        };
        try {
            global.speechSynthesis.speak(u);
            if (global.speechSynthesis.paused) global.speechSynthesis.resume();
        } catch (e) {
            if (typeof onEnd === "function") onEnd();
        }
    }

    function reproducirUrlTts(src, texto, personaje, token, onEnd) {
        if (!ttsPlayer) ttsPlayer = new Audio();
        ttsPlayer.onended = function () {
            if (typeof onEnd === "function") onEnd();
        };
        ttsPlayer.onerror = function () {
            // Blob inválido / revocado: invalidar caché y caer a voz del navegador.
            olvidarTts(src);
            if (token !== ttsToken) return;
            hablarNavegador(texto, personaje, token, onEnd);
        };
        ttsPlayer.src = src;
        try { ttsPlayer.playbackRate = 1; } catch (e) { /* noop */ }
        var p = ttsPlayer.play();
        if (p && typeof p.catch === "function") {
            p.catch(function () {
                if (token !== ttsToken) return;
                hablarNavegador(texto, personaje, token, onEnd);
            });
        }
    }

    function hablar(texto, personaje) {
        return new Promise(function (resolve) {
            var t = textoPlano(texto);
            if (!t) {
                resolve();
                return;
            }

            ttsToken += 1;
            var myToken = ttsToken;
            detenerReproduccionTts();
            notificarTtsFin();
            ttsResolvers.push(resolve);

            var pj = String(personaje || "zoe").toLowerCase() === "zeus" ? "zeus" : "zoe";
            var safety = null;
            var done = function () {
                if (myToken !== ttsToken) return;
                if (safety) {
                    clearTimeout(safety);
                    safety = null;
                }
                detenerReproduccionTts();
                notificarTtsFin();
            };
            safety = setTimeout(done, 15000);
            aplicarVolumenFondo(Math.min(VOLUMEN_DUCK, VOLUMEN_FONDO));

            var cached = ttsCache[claveTts(t, pj)];
            if (cached) {
                reproducirUrlTts(cached, t, pj, myToken, done);
                return;
            }

            obtenerUrlTts(t, pj).then(function (src) {
                if (myToken !== ttsToken) return;
                if (src) reproducirUrlTts(src, t, pj, myToken, done);
                else hablarNavegador(t, pj, myToken, done);
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
