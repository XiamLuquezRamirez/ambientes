<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Panel Docente') — Aulas Reggio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
    @php
        $docenteActual = Auth::guard('docente')->user();
        $colorAmbiente = $docenteActual?->ambiente?->color_hex ?? '#0F6E56';
        $nombreAmbiente = $docenteActual?->ambiente?->nombre ?? 'Panel';
        $iconoAmbiente  = $docenteActual?->ambiente?->icono ?? '🏫';
    @endphp
    <style>
        :root { --color-ambiente: {{ $colorAmbiente }}; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060C0A; color: #F0FAF4; font-family: 'Nunito', sans-serif; min-height: 100vh; }

        .sidebar {
            position: fixed; top: 0; left: 0; width: 240px; height: 100vh;
            background: #0F172A; border-right: 1px solid rgba(255,255,255,0.08);
            display: flex; flex-direction: column; z-index: 100; overflow-y: auto;
        }
        .sidebar-logo { padding: 24px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .sidebar-logo .brand { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: var(--color-ambiente); }
        .amb-badge {
            display: flex; align-items: center; gap: 6px; margin-top: 6px;
            font-size: 0.8rem; color: #94A3B8;
        }
        .nav { flex: 1; padding: 12px 0; }
        .nav a {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 20px; color: #94A3B8;
            text-decoration: none; font-size: 0.9rem;
            transition: all 0.15s; border-left: 3px solid transparent;
        }
        .nav a:hover { color: #F0FAF4; background: rgba(255,255,255,0.05); }
        .nav a.active { color: var(--color-ambiente); border-left-color: var(--color-ambiente); background: rgba(var(--color-ambiente-rgb, 15,110,86), 0.1); font-weight: 600; }

        .header {
            position: fixed; top: 0; left: 240px; right: 0; height: 60px;
            background: #0F172A; border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex; align-items: center; justify-content: flex-end;
            padding: 0 24px; gap: 16px; z-index: 99;
        }
        .header-info { text-align: right; }
        .header-info .name { font-size: 0.9rem; color: #F0FAF4; font-weight: 600; }
        .header-info .rol { font-size: 0.75rem; color: #64748B; }
        .btn-logout {
            background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #94A3B8;
            padding: 6px 14px; border-radius: 6px; font-size: 0.8rem;
            cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.15s;
        }
        .btn-logout:hover { border-color: #DC2626; color: #FCA5A5; }

        .main { margin-left: 240px; padding-top: 60px; min-height: 100vh; }
        .content { padding: 32px; }

        .alert-success { background: rgba(15,110,86,0.15); border: 1px solid var(--color-ambiente); color: #6EE7B7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
        .alert-error { background: rgba(220,38,38,0.15); border: 1px solid #DC2626; color: #FCA5A5; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }

        .table-container { background: #0F172A; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: rgba(255,255,255,0.04); padding: 10px 16px; text-align: left; font-size: 0.78rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.88rem; }
        tr:hover td { background: rgba(255,255,255,0.03); }

        .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
        .badge-green { background: rgba(15,110,86,0.2); color: #6EE7B7; }
        .badge-yellow { background: rgba(245,158,11,0.2); color: #FCD34D; }
        .badge-red { background: rgba(220,38,38,0.2); color: #FCA5A5; }

        .btn { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-family: 'Nunito', sans-serif; cursor: pointer; border: none; text-decoration: none; transition: all 0.15s; }
        .btn-primary { background: var(--color-ambiente); color: #F0FAF4; }
        .btn-primary:hover { filter: brightness(0.85); }
        .btn-secondary { background: rgba(255,255,255,0.08); color: #F0FAF4; }
        .btn-secondary:hover { background: rgba(255,255,255,0.12); }
        .btn-sm { padding: 4px 10px; font-size: 0.78rem; }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.85rem; color: #94A3B8; margin-bottom: 6px; }
        .form-control {
            width: 100%; background: #1E293B; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; padding: 10px 14px; color: #F0FAF4;
            font-family: 'Nunito', sans-serif; font-size: 0.9rem; outline: none;
        }
        .form-control:focus { border-color: var(--color-ambiente); }

        .page-header { margin-bottom: 28px; }
        .page-header h1 { font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: #F0FAF4; }
        .page-header p { color: #64748B; margin-top: 4px; }
    </style>
    @stack('head')
</head>
<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <div class="brand">Aulas Reggio</div>
            <div class="amb-badge">{{ $iconoAmbiente }} {{ $nombreAmbiente }}</div>
        </div>
        <nav class="nav">
            <a href="{{ route('panel.estudiantes') }}" class="{{ request()->routeIs('panel.estudiantes*') ? 'active' : '' }}">
                🧒 Estudiantes
            </a>
            <a href="{{ route('panel.planeacion') }}" class="{{ request()->routeIs('panel.planeacion*') ? 'active' : '' }}">
                📅 Planeación
            </a>
            <a href="{{ route('panel.sesion') }}" class="{{ request()->routeIs('panel.sesion*') ? 'active' : '' }}">
                👁️ Monitor Sesión
            </a>
            <a href="{{ route('panel.portafolio') }}" class="{{ request()->routeIs('panel.portafolio*') ? 'active' : '' }}">
                📁 Portafolios
            </a>
            <a href="{{ route('panel.inclusion') }}" class="{{ request()->routeIs('panel.inclusion*') ? 'active' : '' }}">
                ♿ Inclusión
            </a>
        </nav>
    </aside>

    <header class="header">
        <div class="header-info">
            <div class="name">{{ $docenteActual?->nombre }}</div>
            <div class="rol">{{ str_replace('_', ' ', $docenteActual?->rol ?? '') }}</div>
        </div>
        <form method="POST" action="{{ route('docente.logout') }}" style="display:inline">
            @csrf
            <button type="submit" class="btn-logout">Cerrar Sesión</button>
        </form>
    </header>

    <main class="main">
        <div class="content">
            @if(session('success'))
                <div class="alert-success">{{ session('success') }}</div>
            @endif
            @if(session('error'))
                <div class="alert-error">{{ session('error') }}</div>
            @endif
            @yield('content')
        </div>
    </main>

    @stack('scripts')
</body>
</html>
