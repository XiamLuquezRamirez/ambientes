@extends('layouts.superAdmin')
@section('title', 'Principal')

@section('content')
    <div class="page-header">
        <h1>Panel de Super Administrador</h1>
        <p style="font-size: 1.2rem;">Dashboard principal</p>
    </div>

    <div class="ambientes-grid">
        @foreach ($ambientes as $amb)
            <div class="ambiente-card" data-id="{{ $amb->id }}" data-ip="{{ $amb->servidor_ip ?? '' }}"
                data-cupo="{{ $amb->cupo_defecto }}">

                <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

                {{-- Cabecera --}}
                <div class="card-head">
                    <div class="card-icono" style="background:{{ $amb->color_hex }}22">{{ $amb->icono }}</div>
                    <div class="card-info">
                        <div class="card-nombre">{{ $amb->nombre }}</div>
                        <div class="card-ip">
                            <i class="fas fa-server" style="font-size:.7rem"></i>
                            <span class="card-ip-texto">{{ $amb->servidor_ip ?? 'Sin IP configurada' }}</span>
                        </div>
                    </div>
                    {{-- <button class="btn-menu" onclick="abrirMenu({{ $amb->id }})" title="Opciones">⋯</button> --}}
                </div>

                {{-- Menú desplegable --}}
                <div class="dropdown-menu-card" id="menu-{{ $amb->id }}">
                    <button onclick="abrirModalIp({{ $amb->id }})">
                        <i class="fas fa-network-wired"></i> Editar IP del servidor
                    </button>
                    <button onclick="abrirModalCupo({{ $amb->id }})">
                        <i class="fas fa-users"></i> Configurar cupo por defecto
                    </button>
                    <div class="dropdown-sep"></div>
                    <button onclick="abrirModalDocentes({{ $amb->id }}, '{{ addslashes($amb->nombre) }}')">
                        <i class="fas fa-chalkboard-teacher"></i>
                        Ver docentes
                        <span
                            style="margin-left:auto;color:#94A3B8;font-size:.78rem">{{ $amb->cargas_docente_count }}</span>
                    </button>
                    <button onclick="abrirModalModulos({{ $amb->id }}, '{{ addslashes($amb->nombre) }}')">
                        <i class="fas fa-cubes"></i>
                        Gestionar módulos
                        <span
                            style="margin-left:auto;color:#94A3B8;font-size:.78rem">{{ $amb->modulos_activos_count }}/{{ $amb->modulos_count }}</span>
                    </button>
                    <div class="dropdown-sep"></div>
                    <button onclick="verificarConexion({{ $amb->id }})">
                        <i class="fas fa-wifi"></i> Verificar conexión
                    </button>
                </div>

                {{-- Estadísticas --}}
                <div class="card-stats">
                    <span class="badge-stat bs-azul">
                        <i class="fas fa-cube"></i> {{ $amb->modulos_activos_count }}/{{ $amb->modulos_count }}
                        módulos activos
                    </span>


                </div>
                <div class="card-meta">
                    <span><i class="fas fa-cube"></i> Vacio</span>
                </div>

                {{-- Footer --}}
                <div class="card-footer-amb">
                    <div class="grados-lista">

                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">

                    </div>
                </div>

            </div>
        @endforeach
    </div>

@endsection
