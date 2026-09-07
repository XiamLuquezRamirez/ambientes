{{--
    Header staff completo (prepare + institución + perfil).
    Params:
      - conInstitucion (bool, default false)
      - clickUrlInstitucion (nullable)
      - usarFotoPerfil (bool, default true)
      - conApellidoEnNombre (bool, default false)
      - rutaPerfil (nullable)
      - mostrarCambiarContrasena (bool, default false)
      - rutaLogout (nullable → docente.logout)
--}}
@php
    use App\Models\User;
    use App\Models\Institucion;
    use App\Services\PerfilFotoService;

    $conInstitucion = $conInstitucion ?? false;
    $clickUrlInstitucion = $clickUrlInstitucion ?? null;
    $usarFotoPerfil = $usarFotoPerfil ?? true;
    $conApellidoEnNombre = $conApellidoEnNombre ?? false;
    $rutaPerfil = $rutaPerfil ?? null;
    $mostrarCambiarContrasena = $mostrarCambiarContrasena ?? false;
    $rutaLogout = $rutaLogout ?? route('docente.logout');

    $usuarioAuth = Auth::guard('docente')->user();
    if ($usuarioAuth instanceof User) {
        $usuarioAuth->loadMissing('docente');
    }

    $rolAuthLabel =
        [
            'admin' => 'Administrador',
            'docente' => 'Docente',
            'superAdmin' => 'Super Admin',
        ][$usuarioAuth->rol ?? ''] ?? ($usuarioAuth->rol ?? '');

    $nombreMostrar = $usuarioAuth?->nombre ?? '';
    if ($conApellidoEnNombre && $usuarioAuth?->apellido) {
        $nombreMostrar = trim($nombreMostrar . ' ' . $usuarioAuth->apellido);
    }

    $fotoUrlPublica = null;
    $avatarColor = null;
    $inicialesAuth = 'NN';

    if ($usarFotoPerfil) {
        $perfilFoto = app(PerfilFotoService::class);
        $inicialesAuth = $usuarioAuth instanceof User ? $perfilFoto->iniciales($usuarioAuth) : 'NN';
        $fotoUrlPublica =
            $usuarioAuth instanceof User ? $perfilFoto->urlPublica($usuarioAuth->docente?->foto_url) : null;
    } else {
        $partesNombre = array_values(array_filter(explode(' ', $usuarioAuth->nombre ?? '')));
        $inicialesAuth = mb_strtoupper(
            mb_substr($partesNombre[0] ?? '', 0, 1) . mb_substr($partesNombre[1] ?? '', 0, 1),
        );
        $avatarColor =
            '#' .
            substr(md5(($usuarioAuth->nombre ?? '') . '|' . ($usuarioAuth->apellido ?? '')), 0, 6);
    }

    $institucion = null;
    $logoUrl = null;
    $inicialesInstitucion = null;
    $lugarInstitucion = '';

    if ($conInstitucion) {
        $logoService = app(\App\Services\InstitucionLogoService::class);
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
    }
@endphp
<header class="header">
    @include('partials.header-start')
    <div class="header-institucion-container">
        @if ($conInstitucion)
            @include('partials.staff._header-institucion', [
                'institucion' => $institucion,
                'logoUrl' => $logoUrl,
                'inicialesInstitucion' => $inicialesInstitucion,
                'lugarInstitucion' => $lugarInstitucion,
                'clickUrl' => $clickUrlInstitucion,
            ])
        @endif
        @include('partials.staff._header-perfil', [
            'usuarioAuth' => $usuarioAuth,
            'nombreMostrar' => $nombreMostrar,
            'rolAuthLabel' => $rolAuthLabel,
            'inicialesAuth' => $inicialesAuth,
            'usarFotoPerfil' => $usarFotoPerfil,
            'fotoUrlPublica' => $fotoUrlPublica,
            'avatarColor' => $avatarColor,
            'rutaPerfil' => $rutaPerfil,
            'mostrarCambiarContrasena' => $mostrarCambiarContrasena,
            'rutaLogout' => $rutaLogout,
        ])
    </div>
</header>
