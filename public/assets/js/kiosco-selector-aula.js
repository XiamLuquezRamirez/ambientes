(function () {
    function init() {
    var raiz = document.querySelector('.selector-aula');
    if (!raiz || raiz.dataset.aulaLista === '1') return;
    raiz.dataset.aulaLista = '1';

    var lista = raiz.querySelector('.selector-aula__lista');
    var atras = document.getElementById('aulaAtras');
    var adelante = document.getElementById('aulaAdelante');
    var anuncio = document.getElementById('aulaPagina');
    var voz = document.getElementById('aulaVoz');
    var porPagina = 8;
    var pagina = 0;
    var items = lista ? Array.prototype.slice.call(lista.querySelectorAll('.marco-nino')) : [];
    var paginas = Math.max(1, Math.ceil(items.length / porPagina));

    var animando = false;
    var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paso = 90;
    var mov = 320;
    var pausa = 60;

    function grupo(indice) {
        return items.slice(indice * porPagina, (indice + 1) * porPagina);
    }

    function anunciar() {
        if (atras) atras.disabled = animando || pagina <= 0;
        if (adelante) adelante.disabled = animando || pagina >= paginas - 1;
        if (anuncio) {
            anuncio.textContent = items.length
                ? ('Página ' + (pagina + 1) + ' de ' + paginas)
                : '';
        }
    }

    function pintar() {
        items.forEach(function (el, i) {
            var visible = i >= pagina * porPagina && i < (pagina + 1) * porPagina;
            el.hidden = !visible;
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.width = '';
            el.style.height = '';
            el.style.transform = '';
            el.style.opacity = '';
            el.style.transition = '';
            el.style.visibility = '';
            el.style.zIndex = '';
            el.removeAttribute('aria-hidden');
        });
        raiz.classList.remove('selector-aula--pasando');
        anunciar();
    }

    function espera(n) {
        return Math.max(0, n - 1) * paso + mov;
    }

    function ordenHorizontal(els, desdeLaDerecha) {
        var cols = 4;
        var orden = [];
        var i;
        var fila;
        for (i = 0; i < els.length; i += cols) {
            fila = els.slice(i, i + cols);
            if (desdeLaDerecha) fila.reverse();
            orden = orden.concat(fila);
        }
        return orden;
    }

    function ir(delta) {
        if (animando || !lista) return;
        var destino = pagina + delta;
        if (destino < 0 || destino >= paginas) return;
        if (reducir) {
            pagina = destino;
            pintar();
            return;
        }

        animando = true;
        raiz.classList.add('selector-aula--pasando');
        anunciar();

        var salen = grupo(pagina).slice();
        var entran = grupo(destino).slice();
        var haciaAdelante = delta > 0;
        var viaje = Math.round(window.innerWidth);
        var saleX = haciaAdelante ? -viaje : viaje;
        var entraX = -saleX;
        var ordenSalida = ordenHorizontal(salen, !haciaAdelante);
        var ordenEntrada = ordenHorizontal(entran, haciaAdelante);
        var transSalida = 'transform ' + mov + 'ms cubic-bezier(0.4, 0, 1, 1)';
        var transEntrada = 'transform ' + mov + 'ms cubic-bezier(0, 0, 0.2, 1)';

        ordenSalida.forEach(function (el, i) {
            window.setTimeout(function () {
                el.style.zIndex = String(2 + i);
                el.style.transition = transSalida;
                el.style.transform = 'translateX(' + saleX + 'px)';
                el.setAttribute('aria-hidden', 'true');
            }, i * paso);
        });

        window.setTimeout(function () {
            salen.forEach(function (el) {
                el.hidden = true;
            });
            entran.forEach(function (el) {
                el.hidden = false;
                el.style.transition = 'none';
                el.style.opacity = '1';
                el.style.transform = 'translateX(' + entraX + 'px)';
                el.setAttribute('aria-hidden', 'true');
            });
            void lista.offsetWidth;
            ordenEntrada.forEach(function (el, i) {
                window.setTimeout(function () {
                    el.style.zIndex = String(2 + i);
                    el.style.transition = transEntrada;
                    el.style.transform = 'translateX(0)';
                    el.removeAttribute('aria-hidden');
                }, i * paso);
            });
        }, espera(ordenSalida.length) + pausa);

        window.setTimeout(function () {
            pagina = destino;
            animando = false;
            pintar();
        }, espera(salen.length) + pausa + espera(entran.length) + 50);
    }

    if (atras) {
        atras.addEventListener('click', function () {
            ir(-1);
        });
    }
    if (adelante) {
        adelante.addEventListener('click', function () {
            ir(1);
        });
    }

    /* Deslizar: el dedo hacia la izquierda pasa adelante, como un carrusel. */
    var DESLIZAR_MIN_PX = 60;
    /* Más que esto ya no cuenta como toque: el click que sigue no abre la ficha. */
    var TOQUE_MAX_PX = 12;
    var RUEDA_MIN = 60;
    /* El touchpad sigue mandando eventos por inercia: un gesto pasa una sola página. */
    var RUEDA_QUIETA_MS = 250;
    var gesto = null;
    var anularClick = false;
    var ruedaAcumulada = 0;
    var ruedaUsada = false;
    var timerRueda = 0;

    function confirmaAbierta() {
        return !!(confirma && !confirma.hidden);
    }

    raiz.addEventListener('pointerdown', function (ev) {
        anularClick = false;
        if (!ev.isPrimary || ev.button > 0 || confirmaAbierta() || paginas < 2) {
            gesto = null;
            return;
        }
        gesto = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    });

    raiz.addEventListener('pointerup', function (ev) {
        if (!gesto || ev.pointerId !== gesto.id) return;
        var dx = ev.clientX - gesto.x;
        var dy = ev.clientY - gesto.y;
        gesto = null;
        if (Math.abs(dx) > TOQUE_MAX_PX || Math.abs(dy) > TOQUE_MAX_PX) anularClick = true;
        if (Math.abs(dx) >= DESLIZAR_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            ir(dx < 0 ? 1 : -1);
        }
    });

    raiz.addEventListener('pointercancel', function () {
        gesto = null;
    });

    raiz.addEventListener('click', function (ev) {
        if (!anularClick) return;
        anularClick = false;
        ev.preventDefault();
        ev.stopPropagation();
    }, true);

    /* Con mouse, arrastrar una foto inicia el drag nativo y se pierde el pointerup. */
    raiz.addEventListener('dragstart', function (ev) {
        ev.preventDefault();
    });

    raiz.addEventListener('wheel', function (ev) {
        if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY)) return;
        ev.preventDefault();
        if (confirmaAbierta() || paginas < 2) return;

        clearTimeout(timerRueda);
        timerRueda = window.setTimeout(function () {
            ruedaAcumulada = 0;
            ruedaUsada = false;
        }, RUEDA_QUIETA_MS);

        if (ruedaUsada) return;
        ruedaAcumulada += ev.deltaX;
        if (Math.abs(ruedaAcumulada) >= RUEDA_MIN) {
            ruedaUsada = true;
            ir(ruedaAcumulada > 0 ? 1 : -1);
        }
    }, { passive: false });

    var INSTRUCCION = 'Vamos a buscar quién eres. Mira muy bien las fotos que aparecen en la pantalla y encuentra la tuya. Cuando la encuentres, haz clic sobre ella para comenzar.';
    var INDICACION_BOTONES = 'Toca el botón verde para continuar. De lo contrario, toca el botón rojo para cancelar.';
    var INICIO_VOZ_MS = 500;
    /* La entonación la decide la voz del sistema; subir el tono es lo único que se controla. */
    var TONO_PREGUNTA = 1.25;
    var timerInstruccion = 0;

    /* partes: texto o lista de { texto, tono }; se encolan y suenan seguidas. */
    function hablar(partes) {
        clearTimeout(timerInstruccion);
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        [].concat(partes).forEach(function (parte) {
            var frase = new SpeechSynthesisUtterance(typeof parte === 'string' ? parte : parte.texto);
            frase.lang = 'es-CO';
            frase.rate = 0.95;
            if (parte.tono) frase.pitch = parte.tono;
            window.speechSynthesis.speak(frase);
        });
    }

    function callar() {
        clearTimeout(timerInstruccion);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    function aulaActiva() {
        return raiz.isConnected && !raiz.hasAttribute('data-kiosco-saliente');
    }

    /* Sin un toque previo (F5 o URL directa) Chrome rechaza speak(); llegando desde /inicio sí suena. */
    function leerInstruccion() {
        if (!items.length) return;

        function programar() {
            timerInstruccion = window.setTimeout(function () {
                if (aulaActiva() && !confirmaAbierta()) hablar(INSTRUCCION);
            }, INICIO_VOZ_MS);
        }

        /* Montada debajo (inicio o PIN siguen encima animando su salida): se habla cuando quedan retiradas. */
        var pane = document.getElementById('kioscoPane');
        if (pane && pane.getAttribute('data-kiosco-superponiendo') === 'debajo') {
            document.addEventListener('kiosco:superposicion-terminada', programar, { once: true });
            return;
        }
        programar();
    }

    if (voz) {
        voz.addEventListener('click', function () {
            hablar(INSTRUCCION);
        });
    }

    var volver = raiz.querySelector('.selector-aula__volver');
    if (volver) {
        volver.addEventListener('click', callar);
    }

    var confirma = document.getElementById('aulaConfirma');
    var confirmaNo = document.getElementById('aulaConfirmaNo');
    var confirmaOk = document.getElementById('aulaConfirmaOk');
    var confirmaVoz = document.getElementById('aulaConfirmaVoz');
    var confirmaVelo = document.getElementById('aulaConfirmaVelo');
    var confirmaFoto = document.getElementById('aulaConfirmaFoto');
    var confirmaNombre = document.getElementById('aulaConfirmaNombre');
    var preguntaActual = '';
    var fichaOrigen = null;
    var pinUrl = '';
    var precargaPin = null;
    var yendoAlPin = false;

    function hablarConfirma() {
        hablar([
            { texto: preguntaActual, tono: TONO_PREGUNTA },
            INDICACION_BOTONES,
        ]);
    }

    function abrirConfirma(card) {
        if (!confirma || !card) return;
        var nombre = card.getAttribute('data-nombre') || '';
        var foto = card.querySelector('.marco-nino__foto');
        var img = foto ? foto.querySelector('img') : null;
        var iniciales = foto ? foto.querySelector('.marco-nino__iniciales') : null;
        fichaOrigen = card;
        var color = card.style.getPropertyValue('--marco') || '#ee6747';
        var caja = confirma ? confirma.querySelector('.aula-confirma__caja') : null;
        if (caja) caja.style.setProperty('--marco', color);
        if (confirmaFoto) {
            confirmaFoto.innerHTML = '';
            if (img) confirmaFoto.appendChild(img.cloneNode(true));
            else if (iniciales) confirmaFoto.appendChild(iniciales.cloneNode(true));
        }
        if (confirmaNombre) {
            var nombreEl = card.querySelector('.marco-nino__nombre');
            confirmaNombre.innerHTML = nombreEl ? nombreEl.innerHTML : '';
        }
        pinUrl = card.getAttribute('data-pin') || '';
        precargaPin = (pinUrl && window.KioscoNav && typeof window.KioscoNav.precargar === 'function')
            ? window.KioscoNav.precargar(pinUrl)
            : null;
        preguntaActual = nombre ? ('¿Eres ' + nombre + '?') : '¿Eres tú?';
        if (alTerminarCierre) alTerminarCierre();
        cerrando = false;
        confirma.classList.remove('aula-confirma--sale');
        confirma.classList.remove('aula-confirma--entra');
        raiz.classList.add('selector-aula--confirma');
        confirma.hidden = false;
        if (caja) void caja.offsetWidth;
        confirma.classList.add('aula-confirma--entra');
        hablarConfirma();
        if (confirmaNo) confirmaNo.focus({ preventScroll: true });
    }

    var cerrando = false;
    var alTerminarCierre = null;

    function cerrarConfirma() {
        if (!confirma || confirma.hidden || cerrando || yendoAlPin) return;
        callar();
        var caja = confirma.querySelector('.aula-confirma__caja');
        var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!caja || reducir) {
            confirma.hidden = true;
            confirma.classList.remove('aula-confirma--sale');
            confirma.classList.remove('aula-confirma--entra');
            raiz.classList.remove('selector-aula--confirma');
            if (fichaOrigen) fichaOrigen.focus();
            return;
        }
        cerrando = true;
        confirma.classList.add('aula-confirma--sale');
        var listo = false;
        var timer = 0;
        function terminar(ev) {
            if (ev && ev.target !== caja) return;
            if (listo || !cerrando) return;
            listo = true;
            clearTimeout(timer);
            caja.removeEventListener('animationend', terminar);
            alTerminarCierre = null;
            cerrando = false;
            confirma.hidden = true;
            confirma.classList.remove('aula-confirma--sale');
            confirma.classList.remove('aula-confirma--entra');
            raiz.classList.remove('selector-aula--confirma');
            if (fichaOrigen) fichaOrigen.focus();
        }
        alTerminarCierre = function () {
            listo = true;
            clearTimeout(timer);
            caja.removeEventListener('animationend', terminar);
            alTerminarCierre = null;
        };
        caja.addEventListener('animationend', terminar);
        timer = setTimeout(terminar, 420);
    }

    if (lista) {
        lista.addEventListener('click', function (ev) {
            var card = ev.target.closest('.marco-nino');
            if (!card || card.hidden) return;
            ev.preventDefault();
            abrirConfirma(card);
        });
    }
    if (confirmaNo) {
        confirmaNo.addEventListener('click', cerrarConfirma);
    }
    if (confirmaVelo) {
        confirmaVelo.addEventListener('click', cerrarConfirma);
    }
    if (confirmaVoz) {
        confirmaVoz.addEventListener('click', hablarConfirma);
    }
    function irAlPin() {
        if (yendoAlPin || !pinUrl || pinUrl === '#') return;
        yendoAlPin = true;
        callar();
        confirma.classList.add('aula-confirma--yendo');
        if (confirmaOk) confirmaOk.disabled = true;
        if (confirmaNo) confirmaNo.disabled = true;

        var sinMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var navegar = (window.KioscoNav && typeof window.KioscoNav.ir === 'function')
            ? window.KioscoNav.ir(pinUrl, false, { debajo: true, precarga: precargaPin })
            : Promise.reject();

        navegar.then(function () {
            var saliente = document.querySelector('#kioscoPane > .selector-aula[data-kiosco-saliente]');
            if (!saliente || sinMovimiento) {
                if (window.KioscoNav && typeof window.KioscoNav.terminarSuperposicion === 'function') {
                    window.KioscoNav.terminarSuperposicion();
                }
                return;
            }
            saliente.classList.add('is-desvaneciendo');
            window.setTimeout(function () {
                window.KioscoNav.terminarSuperposicion();
            }, 560);
        }).catch(function () {
            window.location.href = pinUrl;
        });
    }

    if (confirmaOk) {
        confirmaOk.addEventListener('click', irAlPin);
    }
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && confirma && !confirma.hidden) cerrarConfirma();
    });

    if (lista) pintar();
    leerInstruccion();
    }

    window.KioscoSelectorAula = { init: init };
    init();
})();
