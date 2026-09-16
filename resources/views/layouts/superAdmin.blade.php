<!DOCTYPE html>
<html lang="es">

<head>
    @include('partials.staff._head', [
        'titleDefault' => 'Super Admin',
        'extraCss' => ['assets/css/panel/estudiantes.css'],
    ])
</head>

<body>
    <aside class="sidebar">
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('superadmin.principal') }}"
                    class="{{ request()->routeIs('superadmin.principal') ? 'active nav-link' : 'nav-link' }}">
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
                    class="{{ request()->routeIs('superadmin.administradores.*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-users"></i> Administradores
                </a>
            </li>
            @php
                $catalogo =
                    request()->routeIs(
                        'superadmin.catalogo',
                        'superadmin.catalogo.*',
                        'superadmin.modulos.*',
                        'superadmin.ejes.*',
                        'superadmin.catalogo.tematicas.*',
                        'superadmin.ejes.tematicas',
                    ) && !request()->routeIs('superadmin.catalogo.juegos', 'superadmin.juegos.*');
                $perfilesAprendizaje = request()->routeIs(
                    'superadmin.perfil-aprendizaje*',
                    'superadmin.perfil-aprendizaje-personalizado*',
                    'superadmin.parametros-perfil*',
                );
                $juegos = request()->routeIs('superadmin.catalogo_juegos.*');
            @endphp
            <li class="nav-item">
                <a href="#navCatalogo" data-bs-toggle="collapse" aria-expanded="{{ $catalogo ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $catalogo ? '' : 'collapsed' }}">
                    <i class="fa-solid fa-book"></i>
                    <span>Catálogo</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $catalogo ? 'show' : '' }}" id="navCatalogo">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo') }}"
                                class="{{ request()->routeIs('superadmin.catalogo', 'superadmin.catalogo.guardar', 'superadmin.catalogo.datos', 'superadmin.catalogo.actualizar', 'superadmin.catalogo.toggleActivo') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-book-open"></i> DBA
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo.modulos') }}"
                                class="{{ request()->routeIs('superadmin.catalogo.modulos', 'superadmin.modulos.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-cube"></i> Módulos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo.ejes') }}"
                                class="{{ request()->routeIs('superadmin.catalogo.ejes', 'superadmin.ejes.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-diagram-project"></i> Ejes
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo.tematicas.index') }}"
                                class="{{ request()->routeIs('superadmin.catalogo.tematicas.*', 'superadmin.ejes.tematicas') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-layer-group"></i> Temáticas
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo.experiencias.index') }}"
                                class="{{ request()->routeIs('superadmin.catalogo.experiencias.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-book-open-reader"></i> Experiencias
                            </a>
                        </li>
                    </ul>
                </div>
            </li>

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
                                <i class="fa-solid fa-puzzle-piece" style="font-size:.8em"></i> Perfiles de Aprendizaje
                                Globales
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.perfil-aprendizaje-personalizado.index') }}"
                                class="{{ request()->routeIs('superadmin.perfil-aprendizaje-personalizado*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-puzzle-piece" style="font-size:.8em"></i> Perfiles de
                                Aprendizaje
                                Personalizados Globales
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.parametros-perfil.index') }}"
                                class="{{ request()->routeIs('superadmin.parametros-perfil*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-sliders" style="font-size:.8em"></i> Parámetros por defecto
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
            @include('partials.nav-link-condiciones')
            <li class="nav-item">
                <a href="#navJuegos" data-bs-toggle="collapse" aria-expanded="{{ $juegos ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $juegos ? '' : 'collapsed' }}">
                    <i class="fa-solid fa-gamepad"></i>
                    <span>Catálogo de Juegos</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $juegos ? 'show' : '' }}" id="navJuegos">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo_juegos.index') }}"
                                class="{{ request()->routeIs('superadmin.catalogo_juegos.*') && !request()->routeIs('superadmin.catalogo_juegos.tipos.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-puzzle-piece" style="font-size:.8em"></i>
                                Juegos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('superadmin.catalogo_juegos.tipos.index') }}"
                                class="{{ request()->routeIs('superadmin.catalogo_juegos.tipos.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-gamepad" style="font-size:.8em"></i>
                                Tipos de Juegos
                            </a>
                        </li>
                    </ul>
                </div>
            </li>
        </ul>
    </aside>
    @include('partials.sidebar-toggle', ['only' => 'backdrop'])
    @include('partials.staff._header', [
        'conInstitucion' => false,
        'usarFotoPerfil' => true,
        'conApellidoEnNombre' => true,
        'rutaPerfil' => null,
        'mostrarCambiarContrasena' => false,
    ])
    <main class="main">
        <div class="content">
            @yield('content')
        </div>
    </main>
    @include('partials.staff._scripts')
</body>

</html>
