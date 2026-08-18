<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Panel Docente') — PedNia</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/bootstrap/css/bootstrap.min.css') }}">
    <link rel="icon" href="{{ asset('assets/images/favicon.ico') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/sweetalert2.min.css') }}">
    <script src="{{ asset('assets/js/jquery-4.0.0.min.js') }}"></script>
    <link rel="stylesheet" href="{{ asset('assets/css/index.css') }}">
    @include('partials.sidebar-init')
    <link rel="stylesheet" href="{{ asset('assets/css/perfil.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/panel/estudiantes.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/info-condiciones/index.css') }}">
    @stack('styles')
    @stack('head')
</head>

<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <span class="brand">
                <img src="{{ asset('assets/images/logo.png') }}" alt="PedNia" class="sidebar-brand-img"
                    style="filter: drop-shadow(0 0 0.5px rgba(238, 230, 230, 0.81));">
            </span>
            @include('partials.sidebar-toggle', ['only' => 'button'])
        </div>
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('panel.principal') }}"
                    class="{{ request()->routeIs('panel.principal') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Inicio
                </a>
            </li>
            <div id="menu-lateral-ambiente">
                <li class="nav-item">
                    <a href="{{ route('panel.estudiantes') }}"
                        class="{{ request()->routeIs('panel.estudiantes*') ? 'active nav-link' : 'nav-link' }}">
                        <i class="fa-solid fa-child"></i> Estudiantes
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('panel.planeacion') }}"
                        class="{{ request()->routeIs('panel.planeacion*') ? 'active nav-link' : 'nav-link' }}">
                        <i class="fa-solid fa-calendar-days"></i> Planeación
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('panel.portafolio') }}"
                        class="{{ request()->routeIs('panel.portafolio') || request()->routeIs('panel.portafolio.estudiante') ? 'active nav-link' : 'nav-link' }}">
                        <i class="fa-solid fa-folder-open"></i> Portafolios
                    </a>
                </li>
                @php
                    $catalogoActivo = request()->routeIs(
                        'panel.catalogo',
                        'panel.catalogo.detalle',
                        'panel.catalogo.modulos',
                        'panel.catalogo.ejes',
                        'panel.catalogo.tematicas',
                        'panel.ejes.*',
                        'panel.tematicas.*',
                        'panel.experiencias.*',
                        'panel.modulos.ejes',
                    );
                @endphp
                <li class="nav-item">
                    <a href="#navCatalogoPanel" data-bs-toggle="collapse"
                        aria-expanded="{{ $catalogoActivo ? 'true' : 'false' }}"
                        class="nav-link d-flex align-items-center gap-2 {{ $catalogoActivo ? '' : 'collapsed' }}"
                        style="cursor:pointer">
                        <i class="fa-solid fa-book"></i>
                        <span>Catálogo</span>
                        <i class="fa-solid fa-chevron-down ms-auto chevron" id="chevronCatalogoPanel"></i>
                    </a>
                    <div class="collapse {{ $catalogoActivo ? 'show' : '' }}" id="navCatalogoPanel">
                        <ul class="nav flex-column" style="padding:2px 0 4px 0">
                            <li class="nav-item">
                                <a href="{{ route('panel.catalogo') }}"
                                    class="{{ request()->routeIs('panel.catalogo') || request()->routeIs('panel.catalogo.detalle') ? 'active nav-link' : 'nav-link' }}"
                                    style="padding-left:42px;font-size:.85rem">
                                    <i class="fa-solid fa-book-open"></i> DBA
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="{{ route('panel.catalogo.modulos') }}"
                                    class="{{ request()->routeIs('panel.catalogo.modulos') ? 'active nav-link' : 'nav-link' }}"
                                    style="padding-left:42px;font-size:.85rem">
                                    <i class="fa-solid fa-cube"></i> Módulos
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="{{ route('panel.catalogo.ejes') }}"
                                    class="{{ request()->routeIs('panel.catalogo.ejes', 'panel.ejes.*', 'panel.modulos.ejes') ? 'active nav-link' : 'nav-link' }}"
                                    style="padding-left:42px;font-size:.85rem">
                                    <i class="fa-solid fa-diagram-project"></i> Ejes
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="{{ route('panel.catalogo.tematicas') }}"
                                    class="{{ request()->routeIs('panel.catalogo.tematicas', 'panel.tematicas.*', 'panel.experiencias.*') ? 'active nav-link' : 'nav-link' }}"
                                    style="padding-left:42px;font-size:.85rem">
                                    <i class="fa-solid fa-layer-group"></i> Temáticas
                                </a>
                            </li>
                        </ul>
                    </div>
                </li>
                <li class="nav-item">
                    <a href="{{ route('panel.inclusion') }}"
                        class="{{ request()->routeIs('panel.inclusion') || request()->routeIs('panel.inclusion.ajustes') ? 'active nav-link' : 'nav-link' }}">
                        <i class="fa-solid fa-universal-access"></i> Inclusión
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('panel.inclusion.perfil-aprendizaje') }}"
                        class="{{ request()->routeIs('panel.inclusion.perfil-aprendizaje') || request()->routeIs('panel.inclusion.perfil-aprendizaje.estudiantes') ? 'active nav-link' : 'nav-link' }}"
                        style="padding-left:2.1rem;font-size:.92rem">
                        <i class="fa-solid fa-puzzle-piece"></i> Perfiles de Aprendizaje
                    </a>
                </li>
                <li class="nav-item">
                    <a href="{{ route('panel.inclusion.perfil-aprendizaje-personalizado') }}"
                        class="{{ request()->routeIs('panel.inclusion.perfil-aprendizaje-personalizado*') ? 'active nav-link' : 'nav-link' }}"
                        style="padding-left:2.1rem;font-size:.92rem">
                        <i class="fa-solid fa-puzzle-piece"></i> Perfiles de Aprendizaje Personalizados
                    </a>
                </li>
            </div>
            @include('partials.nav-link-condiciones')
        </ul>
    </aside>
    @include('partials.sidebar-toggle', ['only' => 'backdrop'])
    @php
        use App\Models\User;
        use App\Services\PerfilFotoService;
        use App\Models\Institucion;
        $usuarioAuth = Auth::guard('docente')->user();
        $perfilFoto = app(PerfilFotoService::class);
        $logoService = app(\App\Services\InstitucionLogoService::class);
        if ($usuarioAuth instanceof User) {
            $usuarioAuth->loadMissing('docente');
        }
        $inicialesAuth = $usuarioAuth instanceof User ? $perfilFoto->iniciales($usuarioAuth) : 'NN';
        $fotoUrlPublica =
            $usuarioAuth instanceof User ? $perfilFoto->urlPublica($usuarioAuth->docente?->foto_url) : null;
        $rolAuthLabel =
            ['admin' => 'Administrador', 'docente' => 'Docente'][$usuarioAuth->rol ?? ''] ?? ($usuarioAuth->rol ?? '');
        $institucionId = session('institucion_id') ?? $usuarioAuth?->institucion_id;
        $institucion = $institucionId ? Institucion::find($institucionId) : null;
        $logoUrl = $institucion ? $logoService->urlPublica($institucion->logo) : null;
        $inicialesInstitucion = $institucion ? $logoService->iniciales($institucion) : null;
        $lugarInstitucion = $institucion
            ? trim(
                collect([$institucion->municipio, $institucion->departamento])
                    ->filter()
                    ->implode(', '),
            )
            : '';
    @endphp
    <header class="header">
        @if ($institucion)
            <div class="header-institucion" title="{{ $institucion->nombre }}">
                <div class="header-institucion-logo" aria-hidden="true">
                    <img src="{{ $logoUrl ?? '' }}" alt=""
                        class="header-institucion-img {{ $logoUrl ? '' : 'd-none' }}"
                        onerror="this.classList.add('d-none');var f=this.nextElementSibling;if(f)f.classList.remove('d-none');">
                    <span class="header-institucion-fallback {{ $logoUrl ? 'd-none' : '' }}">
                        {{ $inicialesInstitucion }}
                    </span>
                </div>
                <div class="header-institucion-meta">
                    <span class="header-institucion-nombre">{{ $institucion->nombre }}</span>
                    @if ($lugarInstitucion !== '')
                        <span class="header-institucion-lugar">{{ $lugarInstitucion }}</span>
                    @endif
                </div>
            </div>
        @endif
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
                <span class="header-user-nombre">{{ $usuarioAuth?->nombre }}</span>
                <span class="header-user-rol">{{ $rolAuthLabel }}</span>
            </div>
            <span class="header-chevron">▾</span>
            {{-- Dropdown --}}
            <div class="header-dropdown">
                <div class="dropdown-user-card" onclick="window.location.href='{{ route('panel.perfil') }}'">
                    <div class="dropdown-avatar" id="dropdownAvatar">
                        <img src="{{ $fotoUrlPublica ?? '' }}" alt="" id="dropdownAvatarImagen"
                            class="avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}">
                        <span id="dropdownAvatarIniciales"
                            class="avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                            {{ $inicialesAuth }}
                        </span>
                    </div>
                    <div>
                        <div class="dropdown-nombre">{{ $usuarioAuth?->nombre }}</div>
                        <div class="dropdown-email">{{ $usuarioAuth?->email }}</div>
                        <span class="dropdown-rol">{{ $rolAuthLabel }}</span>
                    </div>
                </div>
                <div class="dropdown-section">
                    <a href="{{ route('panel.perfil') }}" class="dropdown-item">
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
    @include('perfil.cambiar_contrasena', ['rutaContrasena' => route('panel.perfil.contrasena')])
    <main class="main">
        <div class="content">
            <div class="page-header students-header">
                <strong style="font-size: 1.6rem; display: none;" id="txt-seleccionar-ambiente">
                    Selecciona un ambiente para comenzar.
                </strong>
                <h1 id="txt-trabajando-en-ambiente">
                    Trabajando en el ambiente
                    {{ session('ambiente_nombre') }}
                </h1>
                @if (request()->routeIs('panel.principal'))
                    <button class="btn btn-primary float-end" id="btn-volver-ambientes" style="display: none;">
                        <i class="fas fa-arrow-left"></i> Volver a seleccionar ambiente
                    </button>
                @endif
            </div>
            @yield('content')
        </div>
    </main>
    @include('partials.info-condiciones.embed')
    <script src="{{ asset('assets/css/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('assets/js/sidebar-toggle.js') }}"></script>
    <script src="{{ asset('assets/js/info-condiciones/index.js') }}"></script>
    <script src="{{ asset('assets/js/sweetalert.js') }}"></script>
    <script>
        const cargaAcademicaActiva = @json(session('ambiente_nombre'));
        const menuLateralAmbiente = document.getElementById('menu-lateral-ambiente');
        if (!cargaAcademicaActiva) {
            menuLateralAmbiente.style.pointerEvents = 'none';
        }
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
        /* ── Chevron sidebar Catálogo ─────────────────────────────── */
        document.addEventListener('DOMContentLoaded', function() {
            const collapseEl = document.getElementById('navCatalogoPanel');
            const chevron = document.getElementById('chevronCatalogoPanel');
            if (collapseEl && chevron) {
                collapseEl.addEventListener('show.bs.collapse', () => chevron.style.transform = 'rotate(180deg)');
                collapseEl.addEventListener('hide.bs.collapse', () => chevron.style.transform = 'rotate(0deg)');
                if (collapseEl.classList.contains('show')) {
                    chevron.style.transform = 'rotate(180deg)';
                }
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
