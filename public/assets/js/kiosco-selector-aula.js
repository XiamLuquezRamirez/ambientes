(function () {
    var raiz = document.querySelector('.selector-aula');
    if (!raiz) return;

    var lista = raiz.querySelector('.selector-aula__pupitres');
    var atras = document.getElementById('aulaAtras');
    var adelante = document.getElementById('aulaAdelante');
    var anuncio = document.getElementById('aulaPagina');
    var voz = document.getElementById('aulaVoz');
    var porPagina = 6;
    var pagina = 0;
    var items = lista ? Array.prototype.slice.call(lista.querySelectorAll('.pupitre')) : [];
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
        var cols = 3;
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

    if (voz && window.speechSynthesis) {
        voz.addEventListener('click', function () {
            window.speechSynthesis.cancel();
            var frase = new SpeechSynthesisUtterance('¿Quién eres? Busca tu foto y tócala.');
            frase.lang = 'es-CO';
            frase.rate = 0.95;
            window.speechSynthesis.speak(frase);
        });
    }

    pintar();
})();
