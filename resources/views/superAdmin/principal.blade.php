@extends('layouts.superAdmin')
@section('title', 'Principal')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/principal.css') }}">
@endpush

@section('content')
    <div class="sa-dashboard">

        <div class="page-header">
            <h1>Panel de Super Administrador</h1>
            <p>Resumen del sistema y acceso rápido a la gestión global de PedNia</p>
        </div>

        {{-- KPIs (también son atajos) --}}
        <div class="sa-kpi-grid">
            <a href="{{ route('superadmin.instituciones.index') }}" class="sa-kpi-card">
                <div class="sa-kpi-top">
                    <span class="sa-kpi-icon sa-kpi-icon--blue"><i class="fa-solid fa-university"></i></span>
                    <i class="fa-solid fa-arrow-right sa-kpi-arrow" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sa-kpi-label">Instituciones</div>
                    <div class="sa-kpi-value">{{ $stats['instituciones_total'] }}</div>
                    <div class="sa-kpi-meta">
                        <strong>{{ $stats['instituciones_activas'] }}</strong> activas ·
                        <strong>{{ $stats['instituciones_suspendidas'] }}</strong> suspendidas
                    </div>
                </div>
            </a>

            <a href="{{ route('superadmin.modulos.listar') }}" class="sa-kpi-card">
                <div class="sa-kpi-top">
                    <span class="sa-kpi-icon sa-kpi-icon--green"><i class="fa-solid fa-cube"></i></span>
                    <i class="fa-solid fa-arrow-right sa-kpi-arrow" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sa-kpi-label">Módulos oficiales</div>
                    <div class="sa-kpi-value">{{ $stats['modulos_oficiales_activos'] }}</div>
                    <div class="sa-kpi-meta">
                        de <strong>{{ $stats['modulos_oficiales'] }}</strong> en el catálogo
                    </div>
                </div>
            </a>

            <a href="{{ route('superadmin.ejes.listar') }}" class="sa-kpi-card">
                <div class="sa-kpi-top">
                    <span class="sa-kpi-icon sa-kpi-icon--amber"><i class="fa-solid fa-diagram-project"></i></span>
                    <i class="fa-solid fa-arrow-right sa-kpi-arrow" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sa-kpi-label">Ejes oficiales</div>
                    <div class="sa-kpi-value">{{ $stats['ejes_oficiales_activos'] }}</div>
                    <div class="sa-kpi-meta">
                        de <strong>{{ $stats['ejes_oficiales'] }}</strong> en el catálogo
                    </div>
                </div>
            </a>

            <a href="{{ route('superadmin.perfil-aprendizaje.index') }}" class="sa-kpi-card">
                <div class="sa-kpi-top">
                    <span class="sa-kpi-icon sa-kpi-icon--violet"><i class="fa-solid fa-puzzle-piece"></i></span>
                    <i class="fa-solid fa-arrow-right sa-kpi-arrow" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sa-kpi-label">Perfiles globales</div>
                    <div class="sa-kpi-value">{{ $stats['perfiles_globales_activos'] }}</div>
                    <div class="sa-kpi-meta">
                        activos de <strong>{{ $stats['perfiles_globales'] }}</strong> registrados
                    </div>
                </div>
            </a>

            <a href="{{ route('superadmin.perfil-aprendizaje-personalizado.index') }}" class="sa-kpi-card">
                <div class="sa-kpi-top">
                    <span class="sa-kpi-icon sa-kpi-icon--slate"><i class="fa-solid fa-brain"></i></span>
                    <i class="fa-solid fa-arrow-right sa-kpi-arrow" aria-hidden="true"></i>
                </div>
                <div>
                    <div class="sa-kpi-label">Perfiles personalizados</div>
                    <div class="sa-kpi-value">{{ $stats['perfiles_personalizados_activos'] }}</div>
                    <div class="sa-kpi-meta">
                        activos de <strong>{{ $stats['perfiles_personalizados'] }}</strong> globales
                    </div>
                </div>
            </a>
        </div>

        {{-- Resumen de ambientes --}}
        <section class="sa-section" aria-labelledby="sa-ambientes-title">
            <div class="sa-section-head">
                <div>
                    <h2 id="sa-ambientes-title">Ambientes del sistema</h2>
                    <p>Resumen del catálogo. Gestiona módulos y ejes desde Configuración.</p>
                </div>
                <a href="{{ route('superadmin.modulos.listar') }}" class="sa-section-link">
                    Ir a módulos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </div>

            <div class="sa-ambientes-grid">
                @forelse ($ambientes as $amb)
                    @php
                        $color = $amb->color_hex ?: '#64748B';
                        $modulosActivos = (int) $amb->modulos_oficiales_activos_count;
                        $modulosTotal = (int) $amb->modulos_oficiales_count;
                    @endphp
                    <a href="{{ route('superadmin.modulos.listar') }}" class="sa-ambiente-card"
                        title="Ver módulos de {{ $amb->nombre }}">
                        <div class="sa-ambiente-franja" style="background:{{ $color }}"></div>
                        <div class="sa-ambiente-body">
                            <div class="sa-ambiente-head">
                                <div class="sa-ambiente-icono" style="background:{{ $color }}22">
                                    {{ $amb->icono ?: '📦' }}
                                </div>
                                <div>
                                    <div class="sa-ambiente-nombre">{{ $amb->nombre }}</div>
                                    <div class="sa-ambiente-hint">Catálogo oficial</div>
                                </div>
                            </div>

                            <div class="sa-ambiente-stats">
                                <div class="sa-ambiente-stat">
                                    <span class="sa-ambiente-stat-label">
                                        <i class="fa-solid fa-cube" style="color:{{ $color }}"></i>
                                        Módulos oficiales
                                    </span>
                                    <span class="sa-ambiente-stat-value">{{ $modulosActivos }}/{{ $modulosTotal }}</span>
                                </div>
                            </div>

                            <div class="sa-ambiente-foot">
                                <span>Gestionar módulos</span>
                                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                            </div>
                        </div>
                    </a>
                @empty
                    <div class="sa-empty">
                        Aún no hay ambientes registrados en el sistema.
                    </div>
                @endforelse
            </div>
        </section>
    </div>
@endsection
