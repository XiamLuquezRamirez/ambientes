/*
 * Salida "puertas del aula" de la pantalla ¡Empecemos! (Polimotor). Va con inicio-puertas.css.
 * Cargar en el <head>, después de inicio-fondo.js y antes de los scripts de la intro 3D.
 *
 * 1. Crea las dos hojas de la puerta en la portada y deja #intro3d-root visible debajo
 *    (z-index 3500 < 4000), para que la escena three.js ya esté dibujada al abrir.
 * 2. Al pulsar ¡Empecemos! con el aula ya cargada, el clic sigue al juego sin espera (este
 *    añade .is-out y las puertas abren). Si el aula o los personajes aún no han cargado,
 *    retiene el clic (puertas cerradas; "Preparando el aula…" si tarda más de AVISO_TRAS_MS)
 *    hasta que estén listos o pasen ESPERA_MAX_MS, y luego lo deja pasar.
 * 3. Retiene dos cuadros el evento intro3d-start: crear el Phaser de la intro tarda ~40 ms y
 *    retrasaría el primer cuadro de la apertura.
 *
 * Transición: data-transicion en la etiqueta <script> — "puertas" (por defecto) o
 * "acercamiento" (sin hojas: la portada crece y se desvanece mientras el aula se acerca).
 */
(function () {
  'use strict';

  var guion = document.currentScript;
  var TRANSICION = (guion && guion.dataset.transicion) === 'acercamiento' ? 'acercamiento' : 'puertas';
  document.documentElement.classList.add('transicion-' + TRANSICION);

  var ESPERA_MAX_MS = 4000;
  /* Margen tras la descarga del .glb del aula para que three.js lo procese y lo pinte. */
  var MARGEN_AULA_MS = 250;
  /* "Preparando el aula…" solo si la espera dura más que esto (evita un destello corto). */
  var AVISO_TRAS_MS = 300;

  /* url sin query → fin de su descarga. Solo cuenta el del aula: los juegos descargan otros .glb
     (guías 3D, escenarios) en cualquier momento y no deben retrasar ni hacer parpadear la portada. */
  var glbDescargados = {};

  function vigilarDescargasGlb() {
    if (!window.PerformanceObserver) return;
    try {
      new PerformanceObserver(function (lista) {
        lista.getEntries().forEach(function (e) {
          if (!/\.glb(\?|#|$)/i.test(e.name)) return;
          var url = e.name.split(/[?#]/)[0];
          if (!glbDescargados[url]) glbDescargados[url] = e.responseEnd || performance.now();
        });
      }).observe({ type: 'resource', buffered: true });
    } catch (e) { /* noop */ }
  }

  /* La escena expone window.__intro3dDebug (intro3d/js/three-scene.js). */
  function aulaLista() {
    if (!document.getElementById('intro3d-root')) return true;
    var info = null;
    try { info = window.__intro3dDebug && window.__intro3dDebug(); } catch (e) { info = null; }
    if (!info) return false;
    /* Cada personaje con su modelo en escena (o falló y la escena lo da por listo). */
    var personajes = (info.actores || []).every(function (a) {
      return a.x !== null || a.estado === 'listo';
    });
    if (!personajes) return false;
    /* El aula no avisa al cargar: se mira que su .glb ya se haya descargado. */
    if (!info.modeloAula) return true;
    var aula = String(info.modeloAula).split(/[?#]/)[0].replace(/^\.?\//, '');
    var fin = null;
    Object.keys(glbDescargados).some(function (url) {
      if (url.slice(-aula.length) !== aula) return false;
      fin = glbDescargados[url];
      return true;
    });
    return fin !== null && performance.now() - fin >= MARGEN_AULA_MS;
  }

  function prepararPuertas() {
    var pantalla = document.getElementById('pantalla-inicio');
    if (!pantalla || pantalla.dataset.transicion) return;
    pantalla.dataset.transicion = TRANSICION;

    if (TRANSICION === 'acercamiento') {
      pantalla.classList.add('con-acercamiento');
    } else {
      pantalla.classList.add('con-puertas');
      ['izq', 'der'].forEach(function (lado) {
        var hoja = document.createElement('div');
        hoja.className = 'inicio-puerta inicio-puerta--' + lado;
        hoja.setAttribute('aria-hidden', 'true');
        pantalla.insertBefore(hoja, pantalla.firstChild);
      });
    }

    var btn = document.getElementById('btn-empecemos');
    if (btn && !pantalla.querySelector('.inicio-preparando')) {
      var aviso = document.createElement('p');
      aviso.className = 'inicio-preparando';
      aviso.setAttribute('aria-live', 'polite');
      aviso.textContent = 'Preparando el aula…';
      btn.parentNode.insertBefore(aviso, btn.nextSibling);
    }

    var root = document.getElementById('intro3d-root');
    if (root) root.hidden = false;
  }

  /*
   * La intro (intro3d/js/intro.js) arranca con un destello blanco al 65 % que se apaga en 650 ms.
   * Sale cuando Phaser crea la escena VictoryIntro, unos cuadros (o más, en equipos lentos)
   * después del clic; con un tiempo fijo caía justo al final de la transición como un resplandor.
   * Su capa queda oculta hasta DESTELLO_MS después de que la escena esté activa de verdad.
   */
  var DESTELLO_MS = 700;
  var DESTELLO_MAX_MS = 4000;

  function ocultarDestelloIntro() {
    var html = document.documentElement;
    if (html.classList.contains('intro-sin-destello')) return;
    html.classList.add('intro-sin-destello');
    var desde = performance.now();
    var mostrar = function () { html.classList.remove('intro-sin-destello'); };
    (function esperarEscena() {
      var juego = window.__introPhaser;
      var activa = false;
      try { activa = !!(juego && juego.scene && juego.scene.isActive('VictoryIntro')); } catch (e) { activa = false; }
      if (activa) { setTimeout(mostrar, DESTELLO_MS); return; }
      if (performance.now() - desde >= DESTELLO_MAX_MS) { mostrar(); return; }
      setTimeout(esperarEscena, 30);
    })();
  }

  function marcarApertura() {
    document.documentElement.classList.add('puertas-abriendo');
    ocultarDestelloIntro();
  }

  function retenerClic() {
    var dejarPasar = false;
    document.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest && ev.target.closest('#btn-empecemos');
      if (!btn || dejarPasar) return;
      var pantalla = btn.closest('.pantalla-inicio');
      if (!pantalla || pantalla.classList.contains('is-out')) return;

      /* Aula lista (lo normal): el clic sigue al juego en el acto y las puertas abren ya. */
      if (aulaLista()) {
        marcarApertura();
        return;
      }

      ev.stopImmediatePropagation();
      ev.preventDefault();
      if (pantalla.dataset.puertas === 'esperando') return;
      pantalla.dataset.puertas = 'esperando';

      btn.classList.remove('puertas-pulsado');
      void btn.offsetWidth;
      btn.classList.add('puertas-pulsado');

      var desde = performance.now();
      var revisar = function () {
        var espera = performance.now() - desde;
        if (aulaLista() || espera >= ESPERA_MAX_MS) {
          pantalla.classList.remove('puertas-esperando');
          btn.classList.remove('puertas-pulsado');
          marcarApertura();
          dejarPasar = true;
          btn.click();
          dejarPasar = false;
          return;
        }
        if (espera >= AVISO_TRAS_MS) pantalla.classList.add('puertas-esperando');
        setTimeout(revisar, 50);
      };
      revisar();
    }, true);
  }

  function diferirArranqueIntro() {
    var retenido = false;
    window.addEventListener('intro3d-start', function (ev) {
      if (retenido || ev.pedniaDiferido) return;
      retenido = true;
      ev.stopImmediatePropagation();
      var lanzado = false;
      var lanzar = function () {
        if (lanzado) return;
        lanzado = true;
        var nuevo = new CustomEvent('intro3d-start', { detail: ev.detail });
        nuevo.pedniaDiferido = true;
        window.dispatchEvent(nuevo);
      };
      requestAnimationFrame(function () { requestAnimationFrame(lanzar); });
      setTimeout(lanzar, 300);
    });
  }

  vigilarDescargasGlb();
  retenerClic();
  diferirArranqueIntro();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepararPuertas);
  } else {
    prepararPuertas();
  }
})();
