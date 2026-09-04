/**
 * kiosco-perfil.js — Lee #kiosco-perfil-params, aplica clases y expone window.PedniaPerfil.
 * No honra las claves listadas en `noop` (sin superficie en el kiosco).
 */
(function () {
    'use strict';

    const NOOP_DEFAULT = [
        'audio_fondo',
        'audio_btn',
        'ra_inicio',
        'ra_velocidad',
        'ra_contenido',
        'idioma',
        'cooperativo',
        'recordatorio_postura',
        'login_tipo',
        'teclado_grande',
        'modo_aula_automatico',
    ];

    function leerPayload() {
        const el = document.getElementById('kiosco-perfil-params');
        if (!el) return null;
        const bruto = (el.textContent || '').trim();
        if (!bruto) return null;
        try {
            return JSON.parse(bruto);
        } catch (e) {
            return null;
        }
    }

    function quitarClasesPerfil() {
        const html = document.documentElement;
        const quitar = [];
        html.classList.forEach(function (c) {
            if (c.indexOf('kiosco-perfil--') === 0) quitar.push(c);
        });
        quitar.forEach(function (c) { html.classList.remove(c); });
        html.setAttribute('data-kiosco-perfil', '0');
    }

    function aplicarPayload(payload) {
        const datos = payload && typeof payload === 'object' ? payload : {};
        const vals = datos.valores && typeof datos.valores === 'object' ? datos.valores : {};
        const listaNoop = Array.isArray(datos.noop) ? datos.noop : NOOP_DEFAULT;
        const on = !!datos.activo;

        quitarClasesPerfil();
        if (on && Array.isArray(datos.clases) && datos.clases.length) {
            document.documentElement.classList.add.apply(document.documentElement.classList, datos.clases);
            document.documentElement.setAttribute('data-kiosco-perfil', '1');
        }

        window.PedniaPerfil.activo = on;
        window.PedniaPerfil.valores = vals;
        window.PedniaPerfil.tipo = datos.tipo || null;
        window.PedniaPerfil.perfilId = datos.perfil_id || 0;
        window.PedniaPerfil.noop = listaNoop;
    }

    function recargarDesdeDom() {
        aplicarPayload(leerPayload() || {});
        montarCursorGrande();
    }

    const data = leerPayload() || {};
    const valores = data.valores && typeof data.valores === 'object' ? data.valores : {};
    const noop = Array.isArray(data.noop) ? data.noop : NOOP_DEFAULT;
    const activo = !!data.activo;

    window.PedniaPerfil = {
        activo: activo,
        valores: valores,
        tipo: data.tipo || null,
        perfilId: data.perfil_id || 0,
        noop: noop,
        v: function (clave, fallback) {
            if (!this.activo || !Object.prototype.hasOwnProperty.call(this.valores, clave)) {
                return fallback;
            }
            const val = this.valores[clave];
            return val === undefined || val === null ? fallback : val;
        },
        honra: function (clave) {
            return this.activo && this.noop.indexOf(clave) === -1;
        },
        recargar: recargarDesdeDom,
    };

    aplicarPayload(data);

    let cursorListo = false;

    function montarCursorGrande() {
        const on = !!(window.PedniaPerfil && window.PedniaPerfil.activo && window.PedniaPerfil.valores.cursor_grande);
        let punto = document.querySelector('.kiosco-perfil-cursor');
        if (!on) {
            if (punto) punto.style.display = 'none';
            return;
        }
        if (!punto) {
            punto = document.createElement('div');
            punto.className = 'kiosco-perfil-cursor';
            punto.setAttribute('aria-hidden', 'true');
            document.body.appendChild(punto);
        }
        if (cursorListo) return;
        cursorListo = true;
        document.addEventListener('pointermove', function (e) {
            if (!window.PedniaPerfil || !window.PedniaPerfil.activo || !window.PedniaPerfil.valores.cursor_grande) {
                punto.style.display = 'none';
                return;
            }
            const player = e.target && e.target.closest
                ? e.target.closest('.rn-player, #vnDispositivo')
                : null;
            if (!player) {
                punto.style.display = 'none';
                return;
            }
            punto.style.display = 'block';
            punto.style.left = e.clientX + 'px';
            punto.style.top = e.clientY + 'px';
        }, { passive: true });
    }

    function inyectarFiltrosDaltonismo() {
        if (document.getElementById('kiosco-filtros-color')) return;
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('id', 'kiosco-filtros-color');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.innerHTML = [
            '<filter id="kiosco-filtro-protanopia">',
            '<feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/>',
            '</filter>',
            '<filter id="kiosco-filtro-deuteranopia">',
            '<feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/>',
            '</filter>',
        ].join('');
        document.body.appendChild(svg);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            inyectarFiltrosDaltonismo();
            montarCursorGrande();
        });
    } else {
        inyectarFiltrosDaltonismo();
        montarCursorGrande();
    }
})();
