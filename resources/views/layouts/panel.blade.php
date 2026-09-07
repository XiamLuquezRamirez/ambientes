<!DOCTYPE html>
<html lang="es">

<head>
    @include('partials.staff._head', [
        'titleDefault' => 'Panel Docente',
        'extraCss' => ['assets/css/panel/estudiantes.css'],
    ])
</head>

<body>
    <aside class="sidebar">
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('panel.principal') }}"
                    class="{{ request()->routeIs('panel.principal') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Inicio
                </a>
            </li>
            @php
                $sinCargaAmbiente = !session('ambiente_nombre');
                $clsAmbiente = $sinCargaAmbiente ? ' nav-item--ambiente-bloqueado' : '';
                $catalogoActivo = request()->routeIs(
                    'panel.catalogo',
                    'panel.catalogo.detalle',
                    'panel.catalogo.modulos',
                    'panel.catalogo.ejes',
                    'panel.catalogo.tematicas',
                    'panel.catalogo.experiencias',
                    'panel.catalogo.experiencias.*',
                    'panel.ejes.*',
                    'panel.tematicas.*',
                    'panel.experiencias.*',
                    'panel.modulos.ejes',
                );
                $inclusionActivo = request()->routeIs(
                    'panel.inclusion',
                    'panel.inclusion.ajustes',
                    'panel.inclusion.perfil-aprendizaje',
                    'panel.inclusion.perfil-aprendizaje.estudiantes',
                    'panel.inclusion.perfil-aprendizaje-personalizado*',
                    'panel.inclusion.parametros-perfil*',
                );
            @endphp
            <li class="nav-item{{ $clsAmbiente }}">
                <a href="{{ route('panel.estudiantes') }}"
                    class="{{ request()->routeIs('panel.estudiantes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-child"></i> Estudiantes
                </a>
            </li>
            <li class="nav-item{{ $clsAmbiente }}">
                <a href="{{ route('panel.planeacion') }}"
                    class="{{ request()->routeIs('panel.planeacion*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-calendar-days"></i> Planeación
                </a>
            </li>
            <li class="nav-item{{ $clsAmbiente }}">
                <a href="{{ route('panel.portafolio') }}"
                    class="{{ request()->routeIs('panel.portafolio') || request()->routeIs('panel.portafolio.estudiante') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-folder-open"></i> Portafolios
                </a>
            </li>
            <li class="nav-item{{ $clsAmbiente }}">
                <a href="#navCatalogoPanel" data-bs-toggle="collapse"
                    aria-expanded="{{ $catalogoActivo ? 'true' : 'false' }}"
                    class="nav-link {{ $catalogoActivo ? '' : 'collapsed' }}" style="cursor:pointer">
                    <i class="fa-solid fa-book"></i>
                    <span>Catálogo</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $catalogoActivo ? 'show' : '' }}" id="navCatalogoPanel">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a href="{{ route('panel.catalogo') }}"
                                class="{{ request()->routeIs('panel.catalogo') || request()->routeIs('panel.catalogo.detalle') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-book-open"></i> DBA
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.catalogo.modulos') }}"
                                class="{{ request()->routeIs('panel.catalogo.modulos') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-cube"></i> Módulos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.catalogo.ejes') }}"
                                class="{{ request()->routeIs('panel.catalogo.ejes', 'panel.ejes.*', 'panel.modulos.ejes') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-diagram-project"></i> Ejes
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.catalogo.tematicas') }}"
                                class="{{ request()->routeIs('panel.catalogo.tematicas', 'panel.tematicas.*') && !request()->routeIs('panel.catalogo.experiencias.*', 'panel.experiencias.*') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-layer-group"></i> Temáticas
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.catalogo.experiencias.index') }}"
                                class="{{ request()->routeIs('panel.catalogo.experiencias.*', 'panel.experiencias.*') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-book-open-reader"></i> Experiencias
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
            <li class="nav-item{{ $clsAmbiente }}">
                <a href="#navInclusionPanel" data-bs-toggle="collapse"
                    aria-expanded="{{ $inclusionActivo ? 'true' : 'false' }}"
                    class="nav-link {{ $inclusionActivo ? '' : 'collapsed' }}" style="cursor:pointer">
                    <i class="fa-solid fa-universal-access"></i>
                    <span>Inclusión</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $inclusionActivo ? 'show' : '' }}" id="navInclusionPanel">
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a href="{{ route('panel.inclusion') }}"
                                class="{{ request()->routeIs('panel.inclusion') || request()->routeIs('panel.inclusion.ajustes') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-universal-access"></i> Inclusión
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.inclusion.perfil-aprendizaje') }}"
                                class="{{ request()->routeIs('panel.inclusion.perfil-aprendizaje') || request()->routeIs('panel.inclusion.perfil-aprendizaje.estudiantes') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-puzzle-piece"></i> Perfiles de Aprendizaje
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.inclusion.perfil-aprendizaje-personalizado') }}"
                                class="{{ request()->routeIs('panel.inclusion.perfil-aprendizaje-personalizado*') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-puzzle-piece"></i> Perfiles personalizados
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('panel.inclusion.parametros-perfil.index') }}"
                                class="{{ request()->routeIs('panel.inclusion.parametros-perfil*') ? 'active nav-link' : 'nav-link' }}">
                                <i class="fa-solid fa-sliders"></i> Parámetros de adaptación
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
            @include('partials.nav-link-condiciones')
            <li class="nav-item">
                <a href="{{ route('panel.clases') }}"
                    class="{{ request()->routeIs('panel.clases') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-chalkboard-user"></i> Clases
                </a>
            </li>
        </ul>
    </aside>
    @include('partials.sidebar-toggle', ['only' => 'backdrop'])
    @include('partials.staff._header', [
        'conInstitucion' => true,
        'usarFotoPerfil' => true,
        'conApellidoEnNombre' => false,
        'rutaPerfil' => route('panel.perfil'),
        'mostrarCambiarContrasena' => true,
    ])
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
    @include('partials.staff._scripts')
</body>

</html>
