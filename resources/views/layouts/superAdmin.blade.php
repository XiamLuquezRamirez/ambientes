<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Super Admin') — PedNia</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/bootstrap/css/bootstrap.min.css') }}">
    <link rel="icon" href="{{ asset('assets/images/favicon.ico') }}">
    @stack('styles')
    @stack('head')
    <link rel="stylesheet" href="{{ asset('assets/css/sweetalert2.min.css') }}">
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <link rel="stylesheet" href="{{ asset('assets/css/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/perfil.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/panel/estudiantes.css') }}">
</head>

<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <span class="brand">
                <img src="{{ asset('assets/images/logo.png') }}" width="100" alt="PedNia"
                    style="width:100%;height:100%;object-fit:contain;filter: drop-shadow(0 0 0.5px rgba(238, 230, 230, 0.81));">
            </span>
        </div>
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('superadmin.principal') }}"
                    class="{{ request()->routeIs('superAdmin.principal') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Inicio
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('superadmin.instituciones.index') }}"
                    class="{{ request()->routeIs('superadmin.instituciones.index') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-university"></i> Instituciones
                </a>
            </li>
            <li class="nav-item">
                <a href="{{ route('superadmin.administradores.listar') }}"
                    class="{{ request()->routeIs('superadmin.administradores.index') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-users"></i> Administradores
                </a>
            </li>
            @php
                $perfilesAprendizaje = request()->routeIs(
                    'superadmin.perfil-aprendizaje*',
                    'superadmin.perfil-aprendizaje-personalizado*',
                );
            @endphp
            <li class="nav-item">
                <a href="#navPerfilesAprendizaje" data-bs-toggle="collapse"
                    aria-expanded="{{ $perfilesAprendizaje ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $perfilesAprendizaje ? '' : 'collapsed' }}">
                    <i class="fa-solid fa-brain"></i>
                    <span>Perfiles de Aprendizaje</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $perfilesAprendizaje ? 'show' : '' }}" id="navPerfilesAprendizaje">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('superadmin.perfil-aprendizaje.index') }}"
                                class="{{ request()->routeIs('superadmin.perfil-aprendizaje.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-layer-group" style="font-size:.8em"></i> Perfiles de Aprendizaje
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.perfil-aprendizaje-personalizado.index') }}"
                                class="{{ request()->routeIs('superadmin.perfil-aprendizaje-personalizado*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-list-check" style="font-size:.8em"></i> Perfiles de Aprendizaje
                                Personalizados Globales
                            </a>
                        </li>
                    </ul>
                </div>
            </li>

            @php
                $configuracion = request()->routeIs('superadmin.modulos.listar', 'superadmin.ejes.listar');
            @endphp
            <li class="nav-item">
                <a href="#navConfiguracion" data-bs-toggle="collapse"
                    aria-expanded="{{ $configuracion ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $configuracion ? '' : 'collapsed' }}"
                    style="cursor:pointer">
                    <i class="fa-solid fa-gear"></i>
                    <span>Configuración</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $configuracion ? 'show' : '' }}" id="navConfiguracion">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('superadmin.modulos.listar') }}"
                                class="{{ request()->routeIs('superadmin.modulos.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-cube"></i> Módulos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.ejes.listar') }}"
                                class="{{ request()->routeIs('superadmin.ejes.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-diagram-project"></i> Ejes
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
        </ul>
    </aside>
    @php
        use App\Models\User;
        use App\Services\PerfilFotoService;
        $usuarioAuth = Auth::guard('docente')->user();
        $perfilFoto = app(PerfilFotoService::class);
        if ($usuarioAuth instanceof User) {
            $usuarioAuth->loadMissing('docente');
        }
        $inicialesAuth = $usuarioAuth instanceof User ? $perfilFoto->iniciales($usuarioAuth) : 'NN';
        $fotoUrlPublica =
            $usuarioAuth instanceof User ? $perfilFoto->urlPublica($usuarioAuth->docente?->foto_url) : null;
        $rolAuthLabel =
            ['admin' => 'Administrador', 'docente' => 'Docente'][$usuarioAuth->rol ?? ''] ?? ($usuarioAuth->rol ?? '');
    @endphp
    <header class="header">
        <div class="header-perfil" id="headerPerfil">
            {{-- Chip visible siempre (foto o iniciales) --}}
            <div class="avatar" id="headerAvatar">
                <img src="{{ $fotoUrlPublica ?? '' }}" alt="" id="headerAvatarImagen"
                    class="avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}">
                <span id="headerAvatarIniciales" class="avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                    {{ $inicialesAuth }}
                </span>
            </div>
            <div class="header-user-info">
                <span class="header-user-nombre">{{ $usuarioAuth?->nombre . ' ' . $usuarioAuth?->apellido }}</span>
                <span class="header-user-rol">{{ $rolAuthLabel }}</span>
            </div>
            <span class="header-chevron">▾</span>
            {{-- Dropdown --}}
            <div class="header-dropdown">
                <div class="dropdown-user-card">
                    <div class="dropdown-avatar" id="dropdownAvatar">
                        <img src="{{ $fotoUrlPublica ?? '' }}" alt="" id="dropdownAvatarImagen"
                            class="avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}">
                        <span id="dropdownAvatarIniciales"
                            class="avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                            {{ $inicialesAuth }}
                        </span>
                    </div>
                    <div>
                        <div class="dropdown-nombre">{{ $usuarioAuth?->nombre . ' ' . $usuarioAuth?->apellido }}</div>
                        <div class="dropdown-email">{{ $usuarioAuth?->email }}</div>
                        <span class="dropdown-rol">{{ $rolAuthLabel }}</span>
                    </div>
                </div>
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
