<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Admin') — Aulas Reggio</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/bootstrap/css/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/index.css') }}">
    @stack('styles')
    @stack('head')
    <link rel="stylesheet" href="{{ asset('assets/css/sweetalert2.min.css') }}">
</head>

<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <span class="brand">Aulas Reggio</span>
            <span class="badge-admin">ADMIN</span>
        </div>
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('admin.ambientes') }}"
                    class="{{ request()->routeIs('admin.ambientes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Ambientes
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.grupos') }}"
                    class="{{ request()->routeIs('admin.grupos*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-layer-group"></i> Grupos
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.matriculas.index') }}"
                    class="{{ request()->routeIs('admin.matriculas*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-graduation-cap"></i> Matrículas
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('admin.cierre.index') }}"
                    class="{{ request()->routeIs('admin.cierre*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-calendar-check"></i> Cierre de año
                </a>
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
            <li class="nav-item">
                <a href="{{ route('admin.configuracion') }}"
                    class="{{ request()->routeIs('admin.configuracion*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-gear"></i> Configuración
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
        $rolAuthLabel =
            ['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'][
                $usuarioAuth->rol
            ] ?? $usuarioAuth->rol;
    @endphp
    <header class="header">
        <div class="header-perfil" id="headerPerfil">

            {{-- Chip visible siempre --}}
            <div class="avatar">{{ $inicialesAuth }}</div>
            <div class="header-user-info">
                <span class="header-user-nombre">{{ $usuarioAuth->nombre }}</span>
                <span class="header-user-rol">{{ $rolAuthLabel }}</span>
            </div>
            <span class="header-chevron">▾</span>

            {{-- Dropdown --}}
            <div class="header-dropdown">

                <div class="dropdown-user-card">
                    <div class="dropdown-avatar">{{ $inicialesAuth }}</div>
                    <div>
                        <div class="dropdown-nombre">{{ $usuarioAuth->nombre }}</div>
                        <div class="dropdown-email">{{ $usuarioAuth->email }}</div>
                        <span class="dropdown-rol">{{ $rolAuthLabel }}</span>
                    </div>
                </div>

                <div class="dropdown-section">
                    <a href="#" class="dropdown-item">
                        <span class="dropdown-item-icon">👤</span>
                        Mi Perfil
                    </a>
                    <a href="#" class="dropdown-item">
                        <span class="dropdown-item-icon">🔑</span>
                        Cambiar Contraseña
                    </a>
                </div>

                <div class="dropdown-divider"></div>

                <div class="dropdown-section">
                    <form method="POST" action="{{ route('docente.logout') }}">
                        @csrf
                        <button type="submit" class="dropdown-item dropdown-item-danger">
                            <span class="dropdown-item-icon">🚪</span>
                            Cerrar Sesión
                        </button>
                    </form>
                </div>

            </div>
        </div>
    </header>

    <main class="main">
        <div class="content">
            @yield('content')
        </div>
    </main>
    <script src="{{ asset('assets/css/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('assets/js/sweetalert.js') }}"></script>
    <script>
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
