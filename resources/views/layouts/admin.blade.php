<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Admin') — Aulas Reggio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F172A; color: #F1F5F9; font-family: 'Nunito', sans-serif; min-height: 100vh; }

        /* Sidebar */
        .sidebar {
            position: fixed; top: 0; left: 0; width: 240px; height: 100vh;
            background: #111827; border-right: 1px solid #1F2937;
            display: flex; flex-direction: column; z-index: 100;
            overflow-y: auto;
        }
        .sidebar-logo {
            padding: 24px 20px 16px;
            border-bottom: 1px solid #1F2937;
        }
        .sidebar-logo .brand { font-family: 'Fredoka One', cursive; font-size: 1.4rem; color: #0F6E56; }
        .badge-admin {
            display: inline-block; background: #F59E0B; color: #1C0A00;
            font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
            border-radius: 99px; margin-left: 8px; vertical-align: middle;
            font-family: 'Nunito', sans-serif; letter-spacing: 0.05em;
        }
        .nav { flex: 1; padding: 12px 0; }
        .nav a {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 20px; color: #94A3B8;
            text-decoration: none; font-size: 0.9rem;
            transition: all 0.15s; border-left: 3px solid transparent;
        }
        .nav a:hover { color: #F1F5F9; background: #1F2937; }
        .nav a.active { color: #0F6E56; border-left-color: #0F6E56; background: #0D1F1A; font-weight: 600; }

        /* Header */
        .header {
            position: fixed; top: 0; left: 240px; right: 0; height: 60px;
            background: #1E293B; border-bottom: 1px solid #334155;
            display: flex; align-items: center; justify-content: flex-end;
            padding: 0 24px; gap: 16px; z-index: 99;
        }
        .header-user { font-size: 0.9rem; color: #94A3B8; }
        .btn-logout {
            background: transparent; border: 1px solid #334155; color: #94A3B8;
            padding: 6px 14px; border-radius: 6px; font-size: 0.8rem;
            cursor: pointer; font-family: 'Nunito', sans-serif;
            transition: all 0.15s;
        }
        .btn-logout:hover { border-color: #DC2626; color: #FCA5A5; }

        /* Main */
        .main { margin-left: 240px; padding-top: 60px; min-height: 100vh; }
        .content { padding: 32px; }

        /* Alerts */
        .alert-success { background: #0D2E1C; border: 1px solid #0F6E56; color: #6EE7B7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
        .alert-error { background: #2D0F0F; border: 1px solid #DC2626; color: #FCA5A5; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }

        /* Tables */
        .table-container { background: #1E293B; border-radius: 12px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #243447; padding: 12px 16px; text-align: left; font-size: 0.8rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 12px 16px; border-top: 1px solid #243447; font-size: 0.9rem; }
        tr:hover td { background: #243447; }

        /* Badges */
        .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
        .badge-green { background: #0D2E1C; color: #6EE7B7; }
        .badge-yellow { background: #2D2000; color: #FCD34D; }
        .badge-red { background: #2D0F0F; color: #FCA5A5; }

        /* Buttons */
        .btn { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-family: 'Nunito', sans-serif; cursor: pointer; border: none; text-decoration: none; transition: all 0.15s; }
        .btn-primary { background: #0F6E56; color: #F0FAF4; }
        .btn-primary:hover { background: #0a5441; }
        .btn-danger { background: transparent; border: 1px solid #DC2626; color: #FCA5A5; }
        .btn-danger:hover { background: #2D0F0F; }
        .btn-sm { padding: 4px 10px; font-size: 0.78rem; }

        /* Forms */
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.85rem; color: #94A3B8; margin-bottom: 6px; }
        .form-control {
            width: 100%; background: #1E293B; border: 1px solid #334155;
            border-radius: 8px; padding: 10px 14px; color: #F1F5F9;
            font-family: 'Nunito', sans-serif; font-size: 0.9rem; outline: none;
        }
        .form-control:focus { border-color: #0F6E56; }
        select.form-control { cursor: pointer; }

        /* Page header */
        .page-header { margin-bottom: 28px; }
        .page-header h1 { font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: #F1F5F9; }
        .page-header p { color: #64748B; margin-top: 4px; }

        @stack('styles')
    </style>
    @stack('head')
</head>
<body>
    <aside class="sidebar">
        <div class="sidebar-logo">
            <span class="brand">Aulas Reggio</span>
            <span class="badge-admin">ADMIN</span>
        </div>
        <nav class="nav">
            <a href="{{ route('admin.ambientes') }}" class="{{ request()->routeIs('admin.ambientes*') ? 'active' : '' }}">
                🌐 Ambientes
            </a>
            <a href="{{ route('admin.docentes') }}" class="{{ request()->routeIs('admin.docentes*') ? 'active' : '' }}">
                👩‍🏫 Docentes
            </a>
            <a href="{{ route('admin.estudiantes') }}" class="{{ request()->routeIs('admin.estudiantes*') ? 'active' : '' }}">
                🧒 Estudiantes
            </a>
            <a href="{{ route('admin.catalogo') }}" class="{{ request()->routeIs('admin.catalogo*') ? 'active' : '' }}">
                📚 Catálogo
            </a>
            <a href="{{ route('admin.sync-log') }}" class="{{ request()->routeIs('admin.sync-log*') ? 'active' : '' }}">
                🔄 Sync Log
            </a>
            <a href="{{ route('admin.reportes') }}" class="{{ request()->routeIs('admin.reportes*') ? 'active' : '' }}">
                📊 Reportes
            </a>
            <a href="{{ route('admin.configuracion') }}" class="{{ request()->routeIs('admin.configuracion*') ? 'active' : '' }}">
                ⚙️ Configuración
            </a>
            <a href="{{ route('admin.solicitudes') }}" class="{{ request()->routeIs('admin.solicitudes*') ? 'active' : '' }}">
                📋 Solicitudes
            </a>
        </nav>
    </aside>

    <header class="header">
        <span class="header-user">{{ Auth::guard('docente')->user()->nombre }}</span>
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
