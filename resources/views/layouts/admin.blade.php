<!DOCTYPE html>
<html lang="es">

<head>
    @include('partials.staff._head', ['titleDefault' => 'Admin'])
</head>

<body>
    <aside class="sidebar">
        <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
                <a href="{{ route('admin.ambientes') }}"
                    class="{{ request()->routeIs('admin.ambientes*') ? 'active nav-link' : 'nav-link' }}">
                    <i class="fa-solid fa-house"></i> Ambientes
                </a>
            </li>
            @php
                $academico = request()->routeIs('admin.grupos*', 'admin.matriculas*', 'admin.cierre*');
            @endphp
            <li class="nav-item">
                <a href="#navAcademico" data-bs-toggle="collapse" aria-expanded="{{ $academico ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $academico ? '' : 'collapsed' }}"
                    style="cursor:pointer">
                    <i class="fa-solid fa-graduation-cap"></i>
                    <span>Matrículas</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
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
            @php
                $catalogo = request()->routeIs(
                    'admin.catalogo',
                    'admin.catalogo.*',
                    'admin.modulos.*',
                    'admin.ejes.*',
                    'admin.experiencias.*',
                );
            @endphp
            <li class="nav-item">
                <a href="#navCatalogo" data-bs-toggle="collapse" aria-expanded="{{ $catalogo ? 'true' : 'false' }}"
                    class="nav-link d-flex align-items-center gap-2 {{ $catalogo ? '' : 'collapsed' }}"
                    style="cursor:pointer">
                    <i class="fa-solid fa-book"></i>
                    <span>Catálogo</span>
                    <i class="fa-solid fa-chevron-down ms-auto chevron"></i>
                </a>
                <div class="collapse {{ $catalogo ? 'show' : '' }}" id="navCatalogo">
                    <ul class="nav flex-column" style="padding:2px 0 4px 0">
                        <li class="nav-item">
                            <a href="{{ route('admin.catalogo') }}"
                                class="{{ request()->routeIs('admin.catalogo', 'admin.catalogo.detalle', 'admin.catalogo.dba.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-book-open"></i> DBA
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.catalogo.modulos') }}"
                                class="{{ request()->routeIs('admin.catalogo.modulos', 'admin.modulos.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-cube"></i> Módulos
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.catalogo.ejes') }}"
                                class="{{ request()->routeIs('admin.catalogo.ejes', 'admin.ejes.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-diagram-project"></i> Ejes
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.catalogo.tematicas.index') }}"
                                class="{{ request()->routeIs('admin.catalogo.tematicas.*', 'admin.ejes.tematicas') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-layer-group"></i> Temáticas
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.catalogo.experiencias.index') }}"
                                class="{{ request()->routeIs('admin.catalogo.experiencias.*', 'admin.experiencias.*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-book-open-reader"></i> Experiencias
                            </a>
                        </li>
                    </ul>
                </div>
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
                $configuracion = request()->routeIs(
                    'admin.configuracion',
                    'admin.configuracion.update',
                    'admin.configuracion.logo',
                    'admin.configuracion.datos',
                    'admin.configuracion.cargar-municipios',
                    'admin.configuracion.perfil-aprendizaje*',
                    'admin.configuracion.perfil-aprendizaje-personalizado*',
                    'admin.configuracion.parametros-perfil*',
                );
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
                            <a href="{{ route('admin.configuracion') }}"
                                class="{{ request()->routeIs('admin.configuracion', 'admin.configuracion.update', 'admin.configuracion.logo', 'admin.configuracion.datos', 'admin.configuracion.cargar-municipios') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-school"></i> Institución
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.configuracion.perfil-aprendizaje.index') }}"
                                class="{{ request()->routeIs('admin.configuracion.perfil-aprendizaje.index', 'admin.configuracion.perfil-aprendizaje.orden', 'admin.configuracion.perfil-aprendizaje.estado') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-puzzle-piece"></i> Perfiles de Aprendizaje
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.configuracion.perfil-aprendizaje-personalizado.index') }}"
                                class="{{ request()->routeIs('admin.configuracion.perfil-aprendizaje-personalizado*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-puzzle-piece"></i> Perfiles de Aprendizaje Personalizados
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="{{ route('admin.configuracion.parametros-perfil.index') }}"
                                class="{{ request()->routeIs('admin.configuracion.parametros-perfil*') ? 'active nav-link' : 'nav-link' }}"
                                style="padding-left:42px;font-size:.85rem">
                                <i class="fa-solid fa-sliders"></i> Parámetros de adaptación
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
            @include('partials.nav-link-condiciones')
        </ul>
    </aside>
    @include('partials.sidebar-toggle', ['only' => 'backdrop'])
    @include('partials.staff._header', [
        'conInstitucion' => true,
        'clickUrlInstitucion' => route('admin.configuracion'),
        'usarFotoPerfil' => false,
        'conApellidoEnNombre' => false,
        'rutaPerfil' => route('admin.perfil'),
        'mostrarCambiarContrasena' => true,
    ])
    @include('perfil.cambiar_contrasena', ['rutaContrasena' => route('admin.perfil.contrasena')])
    <main class="main">
        <div class="content">
            @yield('content')
        </div>
    </main>
    @include('partials.staff._scripts')
</body>

</html>
