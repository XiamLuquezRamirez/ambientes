/* ¿Quién usa qué? — shell DOM + orquestación Phaser 4 / GSAP */
(function () {
    'use strict';

    var L = window.QuienUsaQueLogica;
    var Fx = window.QuienUsaQueFx;
    var CACHE = '20261028p4';
    var introConfig = null;
    var gameConfig = null;
    var cerrado = false;
    var introTimers = [];
    var audioFondo = null;
    var nivelElegido = null;
    var indiceReto = 0;
    var juegoTerminado = false;
    var rondaGen = 0;
    var tokenDialogo = 0;
    var demoActiva = false;
    var esperandoFeedback = false;
    var aceptaInput = false;
    var phaserListo = null;
    var audioCache = Object.create(null);
    var retoCompletoResolve = null;

    function readText(ruta) {
        var xhr = new XMLHttpRequest();
        var sep = ruta.indexOf('?') === -1 ? '?' : '&';
        xhr.open('GET', ruta + sep + 'v=' + CACHE, false);
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : null;
    }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function $id(id) { return document.getElementById(id); }
    function textos() { return (gameConfig && gameConfig.textos) || {}; }
    function acc() { return (gameConfig && gameConfig.accesibilidad) || {}; }
    function elemento(id) { return (gameConfig.elementos || {})[id] || {}; }
    function vivo(gen) { return gen === rondaGen && !juegoTerminado; }
    function sfx() { return window.QuienUsaQueSfx || null; }
    function asset(url) { return !url || url.indexOf('?v=') !== -1 ? url : url + '?v=' + CACHE; }

    function volumenFondoPct() {
        var n = Number(acc().volumenFondo);
        return isFinite(n) ? Math.max(0, Math.min(100, n)) : 20;
    }
    function aplicarVolumenCalibrado(pct) {
        var n = Math.max(0, Math.min(100, Number(pct) || 0));
        if (!gameConfig.accesibilidad) gameConfig.accesibilidad = {};
        gameConfig.accesibilidad.volumenFondo = n;
        if (typeof TextoVoz !== 'undefined' && TextoVoz.definirVolumenFondo) TextoVoz.definirVolumenFondo(n / 100);
        else if (audioFondo) audioFondo.volume = n / 100;
        var icono = document.querySelector('#btn-menu-vol i');
        if (icono) icono.className = n <= 0 ? 'fa-solid fa-volume-xmark' : (n < 40 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high');
    }
    function setMenuVol(abierto) {
        var panel = $id('menu-vol-panel');
        var btn = $id('btn-menu-vol');
        if (!panel || !btn) return;
        panel.hidden = !abierto;
        btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    }
    function enlazarMenuVol() {
        var slider = $id('rango-volumen');
        var val = $id('vol-val');
        var pct = volumenFondoPct();
        if (slider) slider.value = String(pct);
        if (val) val.textContent = String(pct);
        aplicarVolumenCalibrado(pct);
        var btn = $id('btn-menu-vol');
        if (btn) btn.addEventListener('click', function (ev) { ev.stopPropagation(); setMenuVol($id('menu-vol-panel').hidden); });
        var cerrar = $id('btn-cerrar-vol');
        if (cerrar) cerrar.addEventListener('click', function () { setMenuVol(false); });
        if (slider) slider.addEventListener('input', function () {
            if (val) val.textContent = slider.value;
            aplicarVolumenCalibrado(Number(slider.value));
        });
        document.addEventListener('pointerdown', function (ev) {
            var menu = $id('menu-vol');
            if (!menu || menu.contains(ev.target)) return;
            setMenuVol(false);
        });
    }
    function aplicarLetterSpacing() {
        var n = Number(acc().letterSpacing);
        document.documentElement.style.setProperty('--mc-letter-spacing', (isFinite(n) && n >= 0 ? n : 2) + 'px');
    }
    function reproducirAudio(ruta, volumen, loop) {
        if (!ruta) return null;
        try {
            var audio = audioCache[ruta] || new Audio(ruta);
            audioCache[ruta] = audio;
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
            audio.loop = !!loop;
            audio.volume = volumen != null ? volumen : 0.8;
            var p = audio.play();
            if (p && p.catch) p.catch(function () {});
            if (loop) audioFondo = audio;
            return audio;
        } catch (e) { return null; }
    }
    function asegurarAudioFondo() {
        if (audioFondo) {
            var p = audioFondo.play();
            if (p && p.catch) p.catch(function () {});
            return audioFondo;
        }
        var vol = (typeof TextoVoz !== 'undefined' && TextoVoz.VOLUMEN_FONDO != null)
            ? TextoVoz.VOLUMEN_FONDO : volumenFondoPct() / 100;
        return reproducirAudio(gameConfig.audios.fondo, vol, true);
    }

    function nivelDeSesion() {
        if (!window.PedniaEdad || PedniaEdad.esPreviewCatalogo()) return null;
        var edad = PedniaEdad.edadSesion();
        return edad != null ? PedniaEdad.resolverNivel(gameConfig.niveles || [], edad) : null;
    }
    function conversacionInicial() {
        var nivel = nivelDeSesion();
        return (nivel && nivel.bienvenida) || [
            { personaje: 1, texto: '¡Bienvenido al taller de utilería del teatro!' },
            { personaje: 0, texto: 'Hoy vamos a descubrir quién usa cada herramienta.' }
        ];
    }
    function aplicarTema(tema) {
        document.body.classList.toggle('tema-taller', tema === 'taller');
        document.body.classList.toggle('tema-laboratorio', tema === 'laboratorio');
    }
    function cambiarEscena(clave) {
        var url = gameConfig.escenas && gameConfig.escenas[clave];
        if (!url) return;
        var capas = document.querySelectorAll('#escena-fondo .escena-capa');
        if (!capas.length) return;
        var activa = document.querySelector('#escena-fondo .escena-capa.activa') || capas[0];
        var otra = activa === capas[0] ? capas[1] : capas[0];
        if (!otra) {
            activa.src = asset(url);
            activa.classList.add('activa');
            return;
        }
        otra.src = asset(url);
        otra.classList.add('activa');
        activa.classList.remove('activa');
    }
    function cancelarIntroPendiente() {
        introTimers.forEach(function (id) { clearTimeout(id); });
        introTimers = [];
    }
    function sincronizarDialogoIntro3d() {
        if (introConfig) introConfig.conversacion = conversacionInicial();
        if (!window.INTRO_CONFIG) return;
        if (!window.INTRO_CONFIG.dialogo) window.INTRO_CONFIG.dialogo = {};
        window.INTRO_CONFIG.dialogo.lineas = conversacionInicial().map(function (linea) {
            var id = Number(linea.personaje) === 1 ? 'zoe' : 'zeus';
            return {
                personaje: id,
                nombre: id === 'zoe' ? 'Zoe' : 'Zeus',
                color: id === 'zoe' ? '#8ec5ff' : '#f0c14d',
                texto: String(linea.texto || '')
            };
        });
    }
    function mostrarIntro3d() {
        var root = $id('intro3d-root');
        if (root) root.hidden = false;
        document.body.classList.add('intro3d-activa');
        window.dispatchEvent(new CustomEvent('intro3d-start'));
    }
    function destruirIntro3d() {
        document.body.classList.remove('intro3d-activa');
        var root = $id('intro3d-root');
        if (!root) return;
        setTimeout(function () {
            root.hidden = true;
            if (window.__introPhaser) {
                try { window.__introPhaser.destroy(true); } catch (e) { /* noop */ }
                window.__introPhaser = null;
            }
            if (typeof window.__intro3dDispose === 'function') window.__intro3dDispose();
            root.remove();
        }, 400);
    }

    function avatarDe(voz, hablando) {
        var base = '../../images/' + (voz === 'zeus' ? 'zeus' : 'zoe');
        return base + (hablando ? '_hablando.gif' : '_normal.gif');
    }
    function pintarDialogo(voz, texto, estado) {
        var dialogo = $id('dialogo');
        var avatar = $id('dialogo-avatar');
        if (!dialogo || !avatar) return;
        dialogo.dataset.voz = voz;
        dialogo.classList.toggle('es-acierto', estado === 'acierto');
        avatar.src = avatarDe(voz, true);
        avatar.alt = voz === 'zeus' ? 'Zeus' : 'Zoe';
        $id('enunciado').textContent = texto;
        if (Fx && Fx.gsapDialogoIn) Fx.gsapDialogoIn();
    }
    function silenciarAvatar() {
        var dialogo = $id('dialogo');
        var avatar = $id('dialogo-avatar');
        if (!dialogo || !avatar) return;
        avatar.src = avatarDe(dialogo.dataset.voz === 'zeus' ? 'zeus' : 'zoe', false);
    }
    function decir(linea, opts) {
        opts = opts || {};
        if (!linea || !linea.texto) return Promise.resolve();
        var token = ++tokenDialogo;
        var voz = linea.voz === 'zeus' ? 'zeus' : 'zoe';
        var mostrado = false;
        var mostrar = function () {
            if (mostrado || token !== tokenDialogo) return;
            mostrado = true;
            pintarDialogo(voz, linea.texto, opts.estado);
        };
        var respaldo = setTimeout(mostrar, 3500);
        var p = null;
        try {
            if (typeof TextoVoz !== 'undefined') p = TextoVoz.hablar(linea.texto, voz, { onInicio: mostrar });
        } catch (e) { p = null; }
        return Promise.race([
            Promise.all([Promise.resolve(p).catch(function () {}), sleep(opts.minMs || 700)]),
            sleep(12000)
        ]).then(function () {
            clearTimeout(respaldo);
            mostrar();
            if (token === tokenDialogo) silenciarAvatar();
        });
    }
    function decirLineas(x, opts) {
        var lista = L.lineas(x);
        return lista.reduce(function (p, linea) {
            return p.then(function () { return decir(linea, opts); });
        }, Promise.resolve());
    }

    function elegirNivel() {
        var botones = '';
        gameConfig.niveles.forEach(function (nivel, i) {
            botones += '<div class="col-12 text-center mb-2"><button type="button" class="btn btn-' +
                (i ? 'primary' : 'success') + ' btn-eleccion" onclick="confirmarNivel(\'' + nivel.id +
                '\')"><strong>' + nivel.edad + '</strong><br><small>' + nivel.titulo + '</small></button></div>';
        });
        if (typeof TextoVoz !== 'undefined') TextoVoz.hablar(textos().eligeNivel || 'Elige tu edad', 'zoe');
        Swal.fire({
            title: textos().eligeNivel || 'Elige tu edad',
            html: '<div class="row justify-content-center">' + botones + '</div>',
            showConfirmButton: false, allowOutsideClick: false, allowEscapeKey: false, heightAuto: false, width: 440
        });
    }
    function mostrarIntroActiva() {
        return window.PedniaTutorial ? PedniaTutorial.mostrarIntroActiva(acc()) : !!acc().mostrarIntro;
    }

    function pintarProgreso(actual) {
        var cont = $id('progreso');
        if (!cont || !nivelElegido) return;
        var total = nivelElegido.retos.length;
        if (cont.children.length !== total) {
            cont.innerHTML = '';
            for (var i = 0; i < total; i++) {
                var p = document.createElement('span');
                p.className = 'progreso-punto';
                p.innerHTML = '<i class="fa-solid fa-star"></i>';
                cont.appendChild(p);
            }
        }
        Array.prototype.forEach.call(cont.children, function (p, i) {
            var eraHecho = p.classList.contains('hecho');
            p.classList.toggle('hecho', i < actual);
            p.classList.toggle('actual', i === actual);
            if (i < actual && !eraHecho && Fx && Fx.gsapEstrella) Fx.gsapEstrella(p);
        });
    }

    function callbacksPhaser() {
        return {
            puedeInteractuar: function () {
                return aceptaInput && !esperandoFeedback && !juegoTerminado && !demoActiva;
            },
            onAcierto: function (payload) {
                esperandoFeedback = true;
                aceptaInput = false;
                if (window.PedniaQuienUsaQue) PedniaQuienUsaQue.setInteractivo(false);
                var reto = payload && payload.reto;
                return decirLineas(reto && reto.acierto, { estado: 'acierto', minMs: 700 }).then(function () {
                    esperandoFeedback = false;
                });
            },
            onError: function (payload) {
                esperandoFeedback = true;
                aceptaInput = false;
                if (window.PedniaQuienUsaQue) PedniaQuienUsaQue.setInteractivo(false);
                var reto = payload && payload.reto;
                var tipo = payload && payload.tipo;
                var linea = reto && (tipo === 'orden' ? reto.errorOrden
                    : tipo === 'apunte' ? reto.errorApunte
                    : tipo === 'salto' ? reto.errorSalto
                    : tipo === 'ritmo' ? reto.casi
                    : reto.error);
                return decirLineas(linea, { minMs: 600 }).then(function () {
                    esperandoFeedback = false;
                    if (!juegoTerminado) {
                        aceptaInput = true;
                        if (window.PedniaQuienUsaQue) PedniaQuienUsaQue.setInteractivo(true);
                    }
                });
            },
            onRetoCompleto: function () {
                if (retoCompletoResolve) {
                    var r = retoCompletoResolve;
                    retoCompletoResolve = null;
                    r();
                }
                return Promise.resolve();
            },
            onEscenaLista: function () { return Promise.resolve(); },
            onFaseApunte: function (payload) {
                if (payload && payload.pregunta) {
                    return decir({ voz: 'zoe', texto: payload.pregunta }, { minMs: 500 });
                }
                return Promise.resolve();
            }
        };
    }

    function ensurePhaser() {
        if (window.PedniaQuienUsaQue && PedniaQuienUsaQue.listo()) {
            PedniaQuienUsaQue.setCallbacks(callbacksPhaser());
            return Promise.resolve();
        }
        if (phaserListo) return phaserListo;
        phaserListo = PedniaQuienUsaQue.montar({
            parent: 'phaser-juego',
            gameConfig: gameConfig,
            callbacks: callbacksPhaser()
        });
        return phaserListo;
    }

    function esperarRetoCompleto() {
        return new Promise(function (resolve) {
            retoCompletoResolve = resolve;
        });
    }

    async function jugarReto(reto, gen) {
        aceptaInput = false;
        esperandoFeedback = false;
        await ensurePhaser();
        if (!vivo(gen)) return;

        await (Fx && Fx.gsapWipe ? Fx.gsapWipe(function () {}) : Promise.resolve());
        if (!vivo(gen)) return;

        await PedniaQuienUsaQue.cargarReto(reto);
        if (!vivo(gen)) return;

        await decirLineas(reto.consigna, { minMs: 800 });
        if (!vivo(gen)) return;

        aceptaInput = true;
        PedniaQuienUsaQue.setInteractivo(true);
        await esperarRetoCompleto();
        aceptaInput = false;
        if (window.PedniaQuienUsaQue) PedniaQuienUsaQue.setInteractivo(false);
    }

    async function iniciarReto(gen) {
        demoActiva = false;
        if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
        if (!vivo(gen)) return;
        var r = nivelElegido.retos[indiceReto];
        if (!r) {
            granCierre(gen);
            return;
        }
        pintarProgreso(indiceReto);
        await jugarReto(r, gen);
        if (!vivo(gen)) return;
        pintarProgreso(indiceReto + 1);
        await sleep(350);
        indiceReto += 1;
        iniciarReto(gen);
    }

    async function iniciarDemo(gen) {
        if (!nivelElegido || nivelElegido.tema === 'laboratorio') {
            demoActiva = true;
            try {
                if (window.PedniaTutorial && PedniaTutorial.activarDemo) await PedniaTutorial.activarDemo();
                await decir({ voz: 'zoe', texto: textos().demostracionLab }, { minMs: 1100 });
                if (vivo(gen) && demoActiva) await decir({ voz: 'zoe', texto: textos().demostracionFin }, { minMs: 700 });
            } finally {
                demoActiva = false;
                if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
            }
            if (vivo(gen)) iniciarReto(gen);
            return;
        }

        demoActiva = true;
        var paso = false;
        try {
            if (window.PedniaTutorial && PedniaTutorial.activarDemo) await PedniaTutorial.activarDemo();
            await ensurePhaser();
            var reto0 = nivelElegido.retos[0];
            await PedniaQuienUsaQue.cargarReto(reto0);
            await decir({ voz: 'zoe', texto: textos().demostracion }, { minMs: 1100 });
            if (vivo(gen) && demoActiva) {
                aceptaInput = false;
                await PedniaQuienUsaQue.demoLlevar();
                await decir({ voz: 'zoe', texto: textos().demostracionAcierto }, { estado: 'acierto', minMs: 700 });
                await decir({ voz: 'zoe', texto: textos().demostracionFin }, { minMs: 700 });
            }
            if (vivo(gen)) {
                paso = true;
                iniciarReto(gen);
            }
        } finally {
            demoActiva = false;
            if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
            if (!paso && vivo(gen)) iniciarReto(gen);
        }
    }

    async function granCierre(gen) {
        aceptaInput = false;
        var tarima = $id('concierto-tarima');
        var conc = $id('concierto');
        tarima.innerHTML = '';
        conc.classList.remove('desfile');
        (nivelElegido.galeria || []).forEach(function (id, i) {
            var m = document.createElement('div');
            m.className = 'marco-mini desfile-item';
            m.style.setProperty('--i', String(i));
            var lab = document.createElement('span');
            lab.className = 'marco-etiqueta';
            lab.textContent = elemento(id).nombre || id;
            var img = document.createElement('img');
            img.src = asset(elemento(id).img);
            img.alt = '';
            m.appendChild(img);
            m.appendChild(lab);
            tarima.appendChild(m);
        });
        conc.hidden = false;
        conc.classList.add('desfile');
        if (Fx && Fx.gsapConciertoItems) Fx.gsapConciertoItems();
        if (sfx()) sfx().sonar('aplausos');
        await decirLineas(nivelElegido.desfile, { minMs: 900 });
        await sleep(1000);
        if (gen !== rondaGen) return;
        juegoTerminado = true;
        if (sfx()) sfx().sonar('fanfarria');
        await decirLineas(nivelElegido.cierre, { estado: 'acierto', minMs: 800 });
        if (gen !== rondaGen) return;
        mostrarCierre();
    }

    function mostrarCierre() {
        var primera = L.lineas(nivelElegido.cierre)[0] || { texto: '¡Excelente!' };
        var texto = $id('texto_final');
        if (texto) texto.textContent = primera.texto;
        var ins = nivelElegido.insignia || {};
        var trofeo = document.querySelector('#victoria img.trofeo');
        if (ins.img && trofeo) {
            trofeo.src = asset(ins.img);
            trofeo.alt = ins.nombre;
            trofeo.classList.add('insignia');
            if (Fx && Fx.gsapInsigniaPop) Fx.gsapInsigniaPop(trofeo);
            trofeo.addEventListener('click', function () {
                trofeo.classList.add('gira');
                setTimeout(function () { trofeo.classList.remove('gira'); }, 900);
                if (sfx()) sfx().sonar('chispas');
            });
        }
        reproducirAudio(gameConfig.audios.cierre, 0.9, false);
        if (ins.sonido) setTimeout(function () { if (sfx()) sfx().sonar(ins.sonido); }, 2200);
        setTimeout(function () {
            var fin = $id('final');
            if (fin) { fin.hidden = false; fin.style.display = 'block'; }
            if (typeof iniciarSecuenciaVictoria === 'function') iniciarSecuenciaVictoria();
        }, 350);
    }

    window.confirmarNivel = function confirmarNivel(id) {
        nivelElegido = gameConfig.niveles.find(function (n) { return String(n.id) === String(id); });
        Swal.close();
        if (!nivelElegido) return;
        rondaGen += 1;
        var gen = rondaGen;
        juegoTerminado = false;
        indiceReto = 0;
        demoActiva = false;
        esperandoFeedback = false;
        aceptaInput = false;
        if (window.PedniaTutorial && PedniaTutorial.detenerDemo) PedniaTutorial.detenerDemo();
        if (typeof TextoVoz !== 'undefined') TextoVoz.detener();
        if (sfx()) sfx().detener();
        aplicarTema(nivelElegido.tema);
        var conc = $id('concierto');
        if (conc) conc.hidden = true;
        cambiarEscena(nivelElegido.escena);
        pintarProgreso(-1);
        if (mostrarIntroActiva()) iniciarDemo(gen);
        else iniciarReto(gen);
    };

    function empezarJuegoTrasIntro() {
        if (cerrado) return;
        cerrado = true;
        cancelarIntroPendiente();
        if (typeof TextoVoz !== 'undefined') TextoVoz.detener();
        asegurarAudioFondo();
        if (typeof TextoVoz !== 'undefined') TextoVoz.volumenFondo(TextoVoz.VOLUMEN_FONDO);
        $('#fondo_blanco').stop(true, true).hide();
        destruirIntro3d();
        document.body.classList.remove('esperando-inicio');
        document.body.classList.add('en-juego');
        var pantalla = $id('pantalla-inicio');
        if (pantalla) { pantalla.classList.add('is-out'); pantalla.hidden = true; }
        $('#principal').css('display', 'flex').hide().fadeIn(700);
        if (window.PedniaEdad) {
            PedniaEdad.iniciarNivel({
                niveles: gameConfig.niveles || [],
                elegirManual: elegirNivel,
                onElegido: function (nivel) { if (nivel) window.confirmarNivel(nivel.id); }
            });
        } else elegirNivel();
    }

    function empecemosJuego() {
        var pantalla = $id('pantalla-inicio');
        if (!pantalla || pantalla.classList.contains('is-out')) return;
        var btn = $id('btn-empecemos');
        if (btn) btn.disabled = true;
        if (typeof TextoVoz !== 'undefined') TextoVoz.desbloquear();
        if (sfx()) sfx().desbloquear();
        asegurarAudioFondo();
        sincronizarDialogoIntro3d();
        if (typeof TextoVoz !== 'undefined' && TextoVoz.precargar) TextoVoz.precargar();
        pantalla.classList.add('is-out');
        mostrarIntro3d();
        var oculto = false;
        var ocultar = function () { if (oculto) return; oculto = true; pantalla.hidden = true; };
        pantalla.addEventListener('animationend', function (ev) {
            if (ev.animationName === 'disuelve') ocultar();
        });
        setTimeout(ocultar, 1200);
    }
    window.cerrar_anuncio = function () { empezarJuegoTrasIntro(); };

    $(document).ready(function () {
        var bruto = readText('config.json');
        var introBruto = readText('../../intro.json');
        if (!bruto || !introBruto) {
            console.error('[QuienUsaQue] no se pudo leer la configuración');
            return;
        }
        gameConfig = JSON.parse(bruto);
        introConfig = JSON.parse(introBruto);
        introConfig.conversacion = conversacionInicial();
        aplicarLetterSpacing();
        var sesion = nivelDeSesion();
        if (sesion) aplicarTema(sesion.tema);
        cambiarEscena((sesion || gameConfig.niveles[0]).escena);
        var errores = L.validarConfig(gameConfig);
        if (errores.length) console.warn('[QuienUsaQue]', errores);

        var btn = $id('btn-empecemos');
        if (btn) {
            btn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); empecemosJuego(); });
            btn.addEventListener('click', empecemosJuego);
        }
        try {
            TextoVoz.iniciar(gameConfig, introConfig, {
                obtenerAudioFondo: function () { return audioFondo; },
                volumenFondo: volumenFondoPct() / 100,
                frasesExtra: [
                    textos().eligeNivel, textos().demostracion, textos().demostracionAcierto,
                    textos().demostracionFin, textos().demostracionLab
                ].filter(Boolean)
            });
        } catch (e) { console.warn(e); }
        enlazarMenuVol();
        if (window.PedniaMenuAcc) PedniaMenuAcc.iniciar(gameConfig, aplicarLetterSpacing);
        sincronizarDialogoIntro3d();

        var omitir = $id('btn-omitir-intro3d');
        if (omitir) omitir.addEventListener('click', function () {
            if (cerrado) return;
            var root = $id('intro3d-root');
            if (!root || root.hidden) empezarJuegoTrasIntro();
            else window.dispatchEvent(new CustomEvent('intro3d-omitir'));
        });
        var seguir = $id('btn-continuar-intro3d');
        if (seguir) seguir.addEventListener('click', function (ev) {
            ev.preventDefault();
            empezarJuegoTrasIntro();
        });
        window.addEventListener('victory-continue', empezarJuegoTrasIntro);
        window.addEventListener('message', function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (ev.data && ev.data.type === 'pednia:perfil') window.__PEDNIA_PERFIL__ = ev.data.perfil;
        });
    });
})();
