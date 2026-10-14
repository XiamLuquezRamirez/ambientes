/**
 * Antes de abrir el menú de accesibilidad pide el PIN de 4 dígitos de un docente.
 * El PIN no sale del servidor: este archivo solo muestra el pad y envía los dígitos.
 */
(function () {
    'use strict';

    var URL = '/juegos/pin-accesibilidad';
    var abierto = false;
    var digitos = '';
    var enviando = false;

    function cabeceras() {
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        var meta = null;
        try {
            var doc = window.parent && window.parent !== window ? window.parent.document : document;
            meta = doc.querySelector('meta[name="csrf-token"]');
        } catch (e) {
            meta = null;
        }
        if (meta && meta.content) {
            headers['X-CSRF-TOKEN'] = meta.content;
            return headers;
        }
        var coincidencia = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        if (coincidencia) headers['X-XSRF-TOKEN'] = decodeURIComponent(coincidencia[1]);
        return headers;
    }

    function estilos() {
        if (document.getElementById('pin-acc-estilos')) return;
        var estilo = document.createElement('style');
        estilo.id = 'pin-acc-estilos';
        estilo.textContent = [
            '.pin-acc{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(6,12,10,.72);padding:24px;}',
            '.pin-acc[hidden]{display:none;}',
            '.pin-acc-caja{width:min(420px,100%);background:#fff;color:#14221c;border-radius:28px;padding:28px 24px 22px;box-shadow:0 24px 60px rgba(0,0,0,.28);font-family:Nunito,sans-serif;}',
            '.pin-acc-titulo{margin:0;text-align:center;font-size:28px;font-weight:800;}',
            '.pin-acc-ayuda{margin:6px 0 18px;text-align:center;font-size:16px;color:#4b5563;}',
            '.pin-acc-puntos{display:flex;justify-content:center;gap:16px;margin-bottom:18px;}',
            '.pin-acc-punto{width:18px;height:18px;border-radius:50%;border:3px solid #0f6e56;background:transparent;}',
            '.pin-acc-punto.lleno{background:#0f6e56;}',
            '.pin-acc-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}',
            '.pin-acc-tecla{height:72px;border:0;border-radius:18px;background:#eef6f3;color:#14221c;font-size:32px;font-weight:800;cursor:pointer;}',
            '.pin-acc-tecla:active{background:#d5ebe4;}',
            '.pin-acc-tecla.ancho{grid-column:span 2;}',
            '.pin-acc-error{min-height:22px;margin:12px 0 0;text-align:center;color:#b42318;font-weight:700;}',
            '.pin-acc-cancelar{display:block;margin:10px auto 0;padding:0;border:0;background:transparent;line-height:0;cursor:pointer;}',
            '.pin-acc-cancelar img{display:block;height:64px;width:auto;max-width:100%;pointer-events:none;}',
            '.pin-acc-cancelar:active{transform:translateY(2px);}',
        ].join('');
        document.head.appendChild(estilo);
    }

    function pintar() {
        var puntos = document.querySelectorAll('.pin-acc-punto');
        puntos.forEach(function (punto, i) {
            punto.classList.toggle('lleno', i < digitos.length);
        });
    }

    function mensaje(texto) {
        var el = document.getElementById('pin-acc-error');
        if (el) el.textContent = texto || '';
    }

    function cerrar() {
        var modal = document.getElementById('pin-acc');
        if (modal) modal.hidden = true;
        abierto = false;
        digitos = '';
        enviando = false;
        pintar();
        mensaje('');
    }

    function asegurarModal() {
        estilos();
        if (document.getElementById('pin-acc')) return;
        var modal = document.createElement('div');
        modal.id = 'pin-acc';
        modal.className = 'pin-acc';
        modal.hidden = true;
        modal.innerHTML = [
            '<div class="pin-acc-caja" role="dialog" aria-modal="true" aria-labelledby="pin-acc-titulo">',
            '<h2 class="pin-acc-titulo" id="pin-acc-titulo">PIN del docente</h2>',
            '<p class="pin-acc-ayuda">Ingresa los 4 dígitos</p>',
            '<div class="pin-acc-puntos" aria-hidden="true">',
            '<span class="pin-acc-punto"></span><span class="pin-acc-punto"></span>',
            '<span class="pin-acc-punto"></span><span class="pin-acc-punto"></span>',
            '</div>',
            '<div class="pin-acc-pad">',
            tecla('1'), tecla('2'), tecla('3'),
            tecla('4'), tecla('5'), tecla('6'),
            tecla('7'), tecla('8'), tecla('9'),
            tecla('borrar', '←', ''), tecla('0'), tecla('limpiar', 'C', ''),
            '</div>',
            '<p class="pin-acc-error" id="pin-acc-error"></p>',
            '<button type="button" class="pin-acc-cancelar" data-pin="cerrar" aria-label="Cancelar"><img src="/assets/images/selector-aula/cancelar.png" alt=""></button>',
            '</div>',
        ].join('');
        modal.addEventListener('click', function (e) {
            if (e.target === modal) cerrar();
        });
        document.body.appendChild(modal);
    }

    function tecla(accion, texto, clase) {
        var visible = texto || accion;
        var extra = clase === undefined ? '' : ' ' + clase;
        return '<button type="button" class="pin-acc-tecla' + extra + '" data-pin="' + accion + '">' + visible + '</button>';
    }

    function abrir(alAceptar) {
        asegurarModal();
        digitos = '';
        enviando = false;
        pintar();
        mensaje('');
        var modal = document.getElementById('pin-acc');
        modal.hidden = false;
        abierto = true;
        modal._alAceptar = alAceptar;
    }

    function agregar(numero) {
        if (enviando || digitos.length >= 4) return;
        digitos += numero;
        pintar();
        mensaje('');
        if (digitos.length === 4) enviar();
    }

    function enviar() {
        if (enviando) return;
        enviando = true;
        mensaje('Comprobando…');
        var pin = digitos;
        fetch(URL, {
            method: 'POST',
            credentials: 'same-origin',
            headers: cabeceras(),
            body: JSON.stringify({ pin: pin }),
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                return { status: res.status, data: data };
            });
        }).then(function (resultado) {
            enviando = false;
            if (resultado.status === 200 && resultado.data && resultado.data.ok) {
                var seguir = document.getElementById('pin-acc')._alAceptar;
                cerrar();
                if (typeof seguir === 'function') seguir();
                return;
            }
            digitos = '';
            pintar();
            mensaje((resultado.data && resultado.data.message) || 'PIN incorrecto.');
        }).catch(function () {
            enviando = false;
            digitos = '';
            pintar();
            mensaje('No se pudo comprobar el PIN.');
        });
    }

    document.addEventListener('click', function (e) {
        var teclaPin = e.target.closest ? e.target.closest('[data-pin]') : null;
        if (teclaPin && abierto) {
            var accion = teclaPin.getAttribute('data-pin');
            if (accion === 'cerrar') cerrar();
            else if (accion === 'borrar') { digitos = digitos.slice(0, -1); pintar(); mensaje(''); }
            else if (accion === 'limpiar') { digitos = ''; pintar(); mensaje(''); }
            else agregar(accion);
            return;
        }

        var btn = e.target.closest ? e.target.closest('#btn-menu-acc') : null;
        if (!btn) return;
        var panel = document.getElementById('menu-acc-panel');
        var vaAAbrir = !panel || panel.hidden;
        if (!vaAAbrir) return;
        if (btn.dataset.pinOk === '1') {
            delete btn.dataset.pinOk;
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        abrir(function () {
            btn.dataset.pinOk = '1';
            btn.click();
        });
    }, true);

    document.addEventListener('keydown', function (e) {
        if (!abierto) return;
        if (e.key >= '0' && e.key <= '9') agregar(e.key);
        else if (e.key === 'Backspace') { digitos = digitos.slice(0, -1); pintar(); mensaje(''); }
        else if (e.key === 'Escape') cerrar();
    });
})();
