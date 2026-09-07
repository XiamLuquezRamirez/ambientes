/**
 * Shell compartido de layouts staff (admin / panel / superAdmin).
 * Expone ajaxRequest y mostrarToast en window para las vistas de feature.
 */
(function () {
    'use strict';

    async function ajaxRequest(url, method, data) {
        method = method || 'GET';
        data = data === undefined ? null : data;
        try {
            var options = {
                method: method,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            };
            if (data !== null) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
            var response = await fetch(url, options);
            var json = await response.json();
            if (!response.ok) {
                return Object.assign({}, json, {
                    success: false,
                    errors: json.errors || {},
                    message: json.message || 'Error en la petición',
                });
            }
            return json;
        } catch (err) {
            console.error(err);
            return { success: false, message: 'Error de conexión' };
        }
    }

    function mostrarToast(tipo, mensaje) {
        var paleta = {
            success: { bg: '#ECFDF5', color: '#065F46', icon: '#059669' },
            error: { bg: '#FEF2F2', color: '#991B1B', icon: '#DC2626' },
            info: { bg: '#EFF6FF', color: '#1E40AF', icon: '#2563EB' },
        };
        var c = paleta[tipo] || paleta.info;
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: tipo,
            title: mensaje,
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            background: c.bg,
            color: c.color,
            iconColor: c.icon,
        });
    }

    function initCerrarSesion() {
        var form = document.getElementById('formCerrarSesion');
        if (!form) {
            return;
        }
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var self = this;
            Swal.fire({
                title: '¿Deseas cerrar tu sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Cerrar sesión',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#6B7280',
                reverseButtons: true,
            }).then(function (result) {
                if (result.isConfirmed) {
                    self.submit();
                }
            });
        });
    }

    function initDropdownPerfil() {
        var perfil = document.getElementById('headerPerfil');
        if (!perfil) {
            return;
        }
        perfil.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('open');
        });
        document.addEventListener('click', function () {
            perfil.classList.remove('open');
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                perfil.classList.remove('open');
            }
        });
    }

    window.ajaxRequest = ajaxRequest;
    window.mostrarToast = mostrarToast;

    document.addEventListener('DOMContentLoaded', function () {
        initCerrarSesion();
        initDropdownPerfil();
    });
})();
