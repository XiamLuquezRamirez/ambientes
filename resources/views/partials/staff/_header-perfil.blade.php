{{--
    Params:
      - $usuarioAuth, $nombreMostrar, $rolAuthLabel, $inicialesAuth
      - $usarFotoPerfil (bool)
      - $fotoUrlPublica (nullable)
      - $avatarColor (nullable; modo sin foto)
      - $rutaPerfil (nullable): si null, sin enlaces de perfil
      - $mostrarCambiarContrasena (bool, default false)
      - $rutaLogout (default docente.logout)
--}}
@php
    $usarFotoPerfil = $usarFotoPerfil ?? true;
    $mostrarCambiarContrasena = $mostrarCambiarContrasena ?? false;
    $rutaLogout = $rutaLogout ?? route('docente.logout');
    $rutaPerfil = $rutaPerfil ?? null;
@endphp
<div class="header-perfil" id="headerPerfil">
    @if ($usarFotoPerfil)
        <div class="avatar" id="headerAvatar">
            <img src="{{ $fotoUrlPublica ?? '' }}" alt="" id="headerAvatarImagen"
                class="avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}">
            <span id="headerAvatarIniciales" class="avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                {{ $inicialesAuth }}
            </span>
        </div>
    @else
        <div class="avatar" style="background: {{ $avatarColor }};">{{ $inicialesAuth }}</div>
    @endif
    <div class="header-user-info">
        <span class="header-user-nombre">{{ $nombreMostrar }}</span>
        <span class="header-user-rol">{{ $rolAuthLabel }}</span>
    </div>
    <span class="header-chevron">▾</span>
    <div class="header-dropdown">
        <div class="dropdown-user-card"
            @if ($rutaPerfil) onclick="window.location.href='{{ $rutaPerfil }}'" @endif>
            @if ($usarFotoPerfil)
                <div class="dropdown-avatar" id="dropdownAvatar">
                    <img src="{{ $fotoUrlPublica ?? '' }}" alt="" id="dropdownAvatarImagen"
                        class="avatar-img {{ $fotoUrlPublica ? '' : 'd-none' }}">
                    <span id="dropdownAvatarIniciales"
                        class="avatar-iniciales {{ $fotoUrlPublica ? 'd-none' : '' }}">
                        {{ $inicialesAuth }}
                    </span>
                </div>
            @else
                <div class="dropdown-avatar" style="background: {{ $avatarColor }};">{{ $inicialesAuth }}
                </div>
            @endif
            <div>
                <div class="dropdown-nombre">{{ $nombreMostrar }}</div>
                <div class="dropdown-email">{{ $usuarioAuth?->email }}</div>
                <span class="dropdown-rol">{{ $rolAuthLabel }}</span>
            </div>
        </div>
        @if ($rutaPerfil || $mostrarCambiarContrasena)
            <div class="dropdown-section">
                @if ($rutaPerfil)
                    <a href="{{ $rutaPerfil }}" class="dropdown-item">
                        <i class="fa-solid fa-user"></i>
                        Mi Perfil
                    </a>
                @endif
                @if ($mostrarCambiarContrasena)
                    <a href="#" class="dropdown-item" onclick="abrirModalCambiarContrasena(); return false;">
                        <i class="fa-solid fa-key"></i>
                        Cambiar contraseña
                    </a>
                @endif
            </div>
            <div class="dropdown-divider"></div>
        @endif
        <div class="dropdown-section">
            <form id="formCerrarSesion" method="POST" action="{{ $rutaLogout }}">
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
