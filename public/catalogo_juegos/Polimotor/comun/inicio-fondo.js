(function () {
  'use strict';

  function aplicarColor() {
    var color = '';
    try {
      color = new URLSearchParams(window.location.search).get('color') || '';
    } catch (e) {
      return;
    }

    color = color.trim();
    if (color && color.charAt(0) !== '#') color = '#' + color;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return;

    document.documentElement.style.setProperty('--juego-color', color);
  }

  /* Radio del arco en em: más grande = curva más suave. Igual para todas las líneas. */
  var RADIO_ARCO_EM = 40;

  /*
   * Coloca cada línea del título sobre un arco (centro arriba, puntas abajo, letras
   * giradas según la tangente). Las líneas dependen del ancho, así que se mide tras el layout;
   * transform no altera el layout, por eso las mediciones son estables entre llamadas.
   */
  function arquearTitulo(titulo) {
    var letras = titulo.querySelectorAll('.inicio-titulo-letra');
    if (!letras.length) return;

    var tamFuente = parseFloat(window.getComputedStyle(titulo).fontSize) || 1;
    var lineas = {};
    Array.prototype.forEach.call(letras, function (span) {
      var clave = Math.round(span.offsetTop);
      (lineas[clave] = lineas[clave] || []).push(span);
    });

    Object.keys(lineas).forEach(function (clave) {
      var fila = lineas[clave];
      var izquierda = fila[0].offsetLeft;
      var ultima = fila[fila.length - 1];
      var centro = (izquierda + ultima.offsetLeft + ultima.offsetWidth) / 2;

      fila.forEach(function (span) {
        var x = (span.offsetLeft + span.offsetWidth / 2 - centro) / tamFuente;
        var x2 = Math.min(x * x, RADIO_ARCO_EM * RADIO_ARCO_EM);
        var caida = RADIO_ARCO_EM - Math.sqrt(RADIO_ARCO_EM * RADIO_ARCO_EM - x2);
        var giro = Math.asin(Math.max(-1, Math.min(1, x / RADIO_ARCO_EM))) * 180 / Math.PI;
        span.style.setProperty('--arco-y', caida.toFixed(3) + 'em');
        span.style.setProperty('--arco-r', giro.toFixed(2) + 'deg');
      });
    });
  }

  /*
   * Título en curva: cada letra en un span; las palabras en bloques sin corte para que
   * el salto de línea sea entre palabras.
   */
  function mostrarTitulo() {
    document.documentElement.classList.remove(CLASE_PENDIENTE);
  }

  function curvarTitulo() {
    var titulo = document.querySelector('.pantalla-inicio .inicio-kicker');
    if (titulo && titulo.dataset.curvo === '1') return;
    if (!titulo) {
      mostrarTitulo();
      return;
    }

    var texto = titulo.textContent.trim().replace(/\s+/g, ' ');
    if (!texto) {
      mostrarTitulo();
      return;
    }

    titulo.dataset.curvo = '1';
    titulo.setAttribute('aria-label', texto);
    titulo.textContent = '';

    texto.split(' ').forEach(function (palabra, p) {
      if (p > 0) titulo.appendChild(document.createTextNode(' '));

      var bloque = document.createElement('span');
      bloque.className = 'inicio-titulo-palabra';
      bloque.setAttribute('aria-hidden', 'true');

      Array.from(palabra).forEach(function (letra) {
        var span = document.createElement('span');
        span.className = 'inicio-titulo-letra';
        span.textContent = letra;
        bloque.appendChild(span);
      });

      titulo.appendChild(bloque);
    });

    var tiempoMaximo = new Promise(function (resolver) { setTimeout(resolver, ESPERA_FUENTE_MS); });
    Promise.race([fuenteLista, tiempoMaximo]).then(function () {
      arquearTitulo(titulo);
      mostrarTitulo();
    });

    var espera = null;
    window.addEventListener('resize', function () {
      clearTimeout(espera);
      espera = setTimeout(function () { arquearTitulo(titulo); }, 120);
    });
  }

  /*
   * Botón "Volver" de la pantalla de inicio. Dentro del banco de juegos (?volver=1) le pide
   * al padre que cierre el juego; abierto solo, vuelve en el historial. En otros iframes
   * (experiencias, vista previa) no hay quién lo cierre, así que no se muestra.
   */
  function prepararVolver() {
    var btn = document.getElementById('btn-inicio-volver');
    if (!btn || btn.dataset.listo === '1') return;
    btn.dataset.listo = '1';

    var enIframe = window.parent !== window;
    var pedidoPorBanco = false;
    try {
      pedidoPorBanco = new URLSearchParams(window.location.search).get('volver') === '1';
    } catch (e) { /* noop */ }

    if (enIframe ? !pedidoPorBanco : window.history.length <= 1) return;

    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (btn.dataset.saliendo === '1') return;
      btn.dataset.saliendo = '1';
      /* Salir en el mismo clic quita el iframe antes de que se vea el hundido del botón. */
      btn.classList.add('is-pulsado');
      setTimeout(function () { btn.classList.remove('is-pulsado'); }, PULSADO_MS);
      setTimeout(function () {
        if (enIframe) {
          window.parent.postMessage({ type: 'pednia:salir-juego' }, window.location.origin);
        } else {
          window.history.back();
        }
      }, PULSADO_MS + REBOTE_MS);
    });
  }

  function prepararPantallaInicio() {
    prepararVolver();
    curvarTitulo();
  }

  aplicarColor();

  /*
   * El título se oculta desde el <head> hasta quedar arqueado con la fuente final, para
   * que no se vea plano y luego "salte". La descarga de la fuente arranca ya mismo.
   */
  var CLASE_PENDIENTE = 'inicio-titulo-pendiente';
  var ESPERA_FUENTE_MS = 800;
  /* Igual a la transición de 0.15s de .pin-btn: hundido y vuelta antes de salir. */
  var PULSADO_MS = 150;
  var REBOTE_MS = 150;
  document.documentElement.classList.add(CLASE_PENDIENTE);
  setTimeout(mostrarTitulo, ESPERA_FUENTE_MS + 400);

  var fuenteLista = (document.fonts && document.fonts.load)
    ? document.fonts.load('700 1em "Fredoka Inicio"').catch(function () {})
    : Promise.resolve();

  /*
   * No esperar a DOMContentLoaded: los juegos cargan scripts pesados al final del <body>
   * (Three.js, intro, juego) y eso retrasa el evento ~0.5 s. Se curva en cuanto el parser
   * deja atrás el título (ya existe #btn-empecemos, que va después).
   */
  if (document.readyState === 'loading' && window.MutationObserver) {
    var observador = new MutationObserver(function () {
      if (document.querySelector('.pantalla-inicio #btn-empecemos')) {
        observador.disconnect();
        prepararPantallaInicio();
      }
    });
    observador.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      observador.disconnect();
      prepararPantallaInicio();
    });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepararPantallaInicio);
  } else {
    prepararPantallaInicio();
  }
})();
