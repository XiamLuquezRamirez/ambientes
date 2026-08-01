<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Admin') — Aulas Reggio</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/bootstrap/css/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/perfil.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
    @stack('styles')
    @stack('head')
    <link rel="stylesheet" href="{{ asset('assets/css/sweetalert2.min.css') }}">
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
</head>

<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <span class="brand">
                <img src="{{ asset('assets/images/logo.png') }}" width="100" alt="PedNia"
                    style="width:100%;height:100%;object-fit:contain">
            </span>
        </div>
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('admin.ambientes') }}"
                    class="{{ request()->routeIs('admin.ambientes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Ambientes
                </a>
            </li>
            @php
            $academico = request()->routeIs('admin.grupos*','admin.matriculas*','admin.cierre*');
            @endphp          
            <li class="nav-item">
                <a href="#navAcademico" data-bs-toggle="collapse" aria-expanded="{{ $academico ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $academico ? 'active' : '' }}"
                    style="cursor:pointer">
                    <i class="fa-solid fa-graduation-cap"></i>
                    <span>Matrículas</span>
                    <i class="fa-solid fa-chevron-down ms-auto"
                        style="font-size:.65rem;transition:transform .2s;
                              {{ $academico ? 'transform:rotate(180deg)' : '' }}"></i>
                </a>
                <div class="collapse {{ $academico ? 'show' : '' }}" id="navAcademico">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('admin.grupos') }}"
                                class="{{ request()->routeIs('admin.grupos*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-layer-group" style="font-size:.8em"></i> Grupos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.matriculas.index') }}"
                                class="{{ request()->routeIs('admin.matriculas*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-list-check" style="font-size:.8em"></i> Lista
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.cierre.index') }}"
                                class="{{ request()->routeIs('admin.cierre*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-calendar-check" style="font-size:.8em"></i> Cierre de año
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.docentes') }}"
                    class="{{ request()->routeIs('admin.docentes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-user-graduate"></i> Docentes
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.estudiantes') }}"
                    class="{{ request()->routeIs('admin.estudiantes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-child"></i> Estudiantes
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.catalogo') }}"
                    class="{{ request()->routeIs('admin.catalogo*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-book"></i> Catálogo
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.sync-log') }}"
                    class="{{ request()->routeIs('admin.sync-log*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-sync"></i> Sync Log
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.reportes') }}"
                    class="{{ request()->routeIs('admin.reportes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-chart-line"></i> Reportes
                </a>
            </li>
            @php
            $configuracion = request()->routeIs('admin.configuracion*');
            @endphp          
            <li class="nav-item">
                <a href="#navConfiguracion" data-bs-toggle="collapse" aria-expanded="{{ $configuracion ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $configuracion ? 'active' : '' }}"
                    style="cursor:pointer">
                    <i class="fa-solid fa-gear"></i>
                    <span>Configuración</span>
                    <i class="fa-solid fa-chevron-down ms-auto"
                        style="font-size:.65rem;transition:transform .2s;
                              {{ $configuracion ? 'transform:rotate(180deg)' : '' }}"></i>
                </a>
                <div class="collapse {{ $configuracion ? 'show' : '' }}" id="navConfiguracion">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href=""
                                class="{{ request()->routeIs('admin.configuracion.institucion*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-school"></i> Institución
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.configuracion.condiciones.index') }}"
                                class="{{ request()->routeIs('admin.configuracion.condiciones.index', 'admin.configuracion.condiciones.orden', 'admin.configuracion.condiciones.estado') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-layer-group"></i> Condiciones
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.configuracion.condiciones-transitorias.index') }}"
                                class="{{ request()->routeIs('admin.configuracion.condiciones-transitorias*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-list-check"></i> Condiciones transitorias
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.usuarios') }}"
                    class="{{ request()->routeIs('admin.usuarios*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-users"></i> Usuarios
                </a>
            </li>
        </ul>
    </aside>

    @php
        $usuarioAuth = Auth::guard('docente')->user();
        $partesNombre = array_values(array_filter(explode(' ', $usuarioAuth->nombre)));
        $inicialesAuth = mb_strtoupper(
            mb_substr($partesNombre[0] ?? '', 0, 1) . mb_substr($partesNombre[1] ?? '', 0, 1),
        );
        $rolAuthLabel = ['admin' => 'Administrador', 'docente' => 'Docente'][$usuarioAuth->rol] ?? $usuarioAuth->rol;
        $avatarColor = '#' . substr(md5($usuarioAuth->nombre . '|' . $usuarioAuth->apellido), 0, 6);
    @endphp
    <header class="header">
        <div class="header-perfil" id="headerPerfil">

            {{-- Chip visible siempre --}}
            <div class="avatar" style="background: {{ $avatarColor }};">{{ $inicialesAuth }}</div>
            <div class="header-user-info">
                <span class="header-user-nombre">{{ $usuarioAuth->nombre }}</span>
                <span class="header-user-rol">{{ $rolAuthLabel }}</span>
            </div>
            <span class="header-chevron">▾</span>

            {{-- Dropdown --}}
            <div class="header-dropdown">

                <div class="dropdown-user-card" onclick="window.location.href='{{ route('admin.perfil') }}'">
                    <div class="dropdown-avatar" style="background: {{ $avatarColor }};">{{ $inicialesAuth }}</div>
                    <div>
                        <div class="dropdown-nombre">{{ $usuarioAuth->nombre }}</div>
                        <div class="dropdown-email">{{ $usuarioAuth->email }}</div>
                        <span class="dropdown-rol">{{ $rolAuthLabel }}</span>
                    </div>
                </div>

                <div class="dropdown-section">
                    <a href="{{ route('admin.perfil') }}" class="dropdown-item">
                        <i class="fa-solid fa-user"></i>
                        Mi Perfil
                    </a>
                    <a href="#" class="dropdown-item" onclick="abrirModalCambiarContrasena(); return false;">
                        <i class="fa-solid fa-key"></i>
                        Cambiar contraseña
                    </a>
                </div>

                <div class="dropdown-divider"></div>

                <div class="dropdown-section">
                    <form id="formCerrarSesion" method="POST" action="{{ route('docente.logout') }}">
                        @csrf
                        <button type="submit" class="dropdown-item dropdown-item-danger">
                            <span class="dropdown-item-icon">
                                <i class="fa-solid fa-right-from-bracket"></i>
                            </span>
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </header>

    @include('perfil.cambiar_contrasena', ['rutaContrasena' => route('admin.perfil.contrasena')])

    <main class="main">
        <div class="content">
            @yield('content')
        </div>
    </main>
    <script src="{{ asset('assets/css/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('assets/js/sweetalert.js') }}"></script>
    <script>
        /* ── Cerrar sesión ────────────────────────────────────── */
        document.getElementById('formCerrarSesion').addEventListener('submit', function(e) {
            e.preventDefault();

            Swal.fire({
                title: '¿Deseas cerrar tu sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Cerrar sesión',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#6B7280',
                reverseButtons: true,
            }).then((result) => {
                if (result.isConfirmed) {
                    this.submit();
                }
            });
        });
        /* ── Utilidades globales AJAX ────────────────────────────── */
        async function ajaxRequest(url, method = 'GET', data = null) {
            try {
                const options = {
                    method,
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                };
                if (data !== null) {
                    options.headers['Content-Type'] = 'application/json';
                    options.body = JSON.stringify(data);
                }
                const response = await fetch(url, options);
                const json = await response.json();
                if (!response.ok) {
                    return {
                        success: false,
                        errors: json.errors ?? {},
                        message: json.message ?? 'Error en la petición'
                    };
                }
                return json;
            } catch (err) {
                console.error(err);
                return {
                    success: false,
                    message: 'Error de conexión'
                };
            }
        }

        /* ── Chevron sidebar group ───────────────────────────────── */
        document.addEventListener('DOMContentLoaded', function() {
            const collapseEl = document.getElementById('navAcademico');
            const chevron = document.getElementById('chevronAcad');
            if (collapseEl && chevron) {
                collapseEl.addEventListener('show.bs.collapse', () => chevron.style.transform = 'rotate(180deg)');
                collapseEl.addEventListener('hide.bs.collapse', () => chevron.style.transform = 'rotate(0deg)');
            }
        });

        /* ── Dropdown de perfil ──────────────────────────────────── */
        document.addEventListener('DOMContentLoaded', function() {
            const perfil = document.getElementById('headerPerfil');
            if (!perfil) return;
            perfil.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('open');
            });
            document.addEventListener('click', function() {
                perfil.classList.remove('open');
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') perfil.classList.remove('open');
            });
        });

        function mostrarToast(tipo, mensaje) {
            const paleta = {
                success: {
                    bg: '#ECFDF5',
                    color: '#065F46',
                    icon: '#059669'
                },
                error: {
                    bg: '#FEF2F2',
                    color: '#991B1B',
                    icon: '#DC2626'
                },
                info: {
                    bg: '#EFF6FF',
                    color: '#1E40AF',
                    icon: '#2563EB'
                },
            };
            const c = paleta[tipo] ?? paleta.info;
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
                iconColor: c.icon
            });
        }
    </script>
    @if (session('success'))
        <script>
            document.addEventListener('DOMContentLoaded', () => mostrarToast('success', @json(session('success'))));
        </script>
    @endif
    @if (session('error'))
        <script>
            document.addEventListener('DOMContentLoaded', () => mostrarToast('error', @json(session('error'))));
        </script>
    @endif
    @if (session('info'))
        <script>
            document.addEventListener('DOMContentLoaded', () => mostrarToast('info', @json(session('info'))));
        </script>
    @endif
    @stack('scripts')
</body>

</html>
