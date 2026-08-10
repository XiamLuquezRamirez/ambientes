@extends('layouts.admin')
@section('title', 'Ambientes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/ambientes.css') }}">
@endpush

@section('content')
    <div class="ambientes-page">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
            <div>
                <h1>Ambientes</h1>
                <p>{{ $ambientes->count() }} ambientes de aprendizaje en la red local</p>
            </div>
            <a href="{{ route('admin.matriculas.index') }}" class="btn btn-primary">
                <i class="fas fa-graduation-cap"></i> Matrículas
            </a>
        </div>

        <div class="ambientes-grid">
            @foreach ($ambientes as $amb)
                <div class="ambiente-card" data-id="{{ $amb->id }}" data-ip="{{ $amb->servidor_ip ?? '' }}"
                    data-cupo="{{ $amb->cupo_defecto }}">

                    {{-- Cabecera --}}
                    <div class="card-head">
                        <div class="card-icono" style="background:{{ $amb->color_hex }}22">{{ $amb->icono }}</div>
                        <div class="card-info">
                            <div class="card-nombre">{{ $amb->nombre }}</div>
                            <div class="card-ip">
                                <i class="fas fa-server" style="font-size:.65rem"></i>
                                <span class="card-ip-texto">{{ $amb->servidor_ip ?? 'Sin IP configurada' }}</span>
                                <span class="dot-conexion" id="dot-{{ $amb->id }}" title="Sin verificar"></span>
                            </div>
                        </div>
                        <button class="btn-menu" onclick="abrirMenu({{ $amb->id }})" title="Opciones">⋯</button>
                    </div>

                    {{-- Menú desplegable (sin cambios) --}}
                    <div class="dropdown-menu-card" id="menu-{{ $amb->id }}">
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
                        <div class="stat-cell">
                            <div class="stat-n">{{ $amb->grados_habilitados_count }}</div>
                            <div class="stat-l">Grados</div>
                        </div>
                        <div class="stat-cell">
                            <div class="stat-n">{{ $amb->estudiantes_count }}</div>
                            <div class="stat-l">Estudiantes</div>
                        </div>
                        <div class="stat-cell">
                            <div class="stat-n">{{ $amb->cargas_docente_count }}</div>
                            <div class="stat-l">Docentes</div>
                        </div>
                    </div>

                    {{-- Metadata --}}
                    <div class="card-footline">
                        <span class="footline-grados">
                            @forelse($amb->gradosHabilitados as $g)
                                {{ $g->nombre }}{{ !$loop->last ? ' · ' : '' }}
                            @empty
                                Sin grados habilitados
                            @endforelse
                        </span>
                        <span class="footline-meta">{{ $amb->modulos_activos_count }}/{{ $amb->modulos_count }} módulos · Cupo
                            {{ $amb->cupo_defecto }}</span>
                    </div>

                    {{-- Acciones --}}
                    <div class="card-actions">
                        <a href="{{ route('admin.ambientes.grados', $amb) }}" class="btn-accion btn-primaria"
                            style="background:{{ $amb->color_hex }}">
                            <i class="fas fa-layer-group"></i> Grados
                        </a>
                        <a href="{{ route('admin.ambientes.asignaciones', $amb) }}" class="btn-accion btn-secundaria">
                            <i class="fas fa-child"></i> Asignaciones
                        </a>
                    </div>

                </div>
            @endforeach
        </div>

        {{-- Modal: Cupo por defecto --}}
        <div class="modal fade modal-app" id="modalCupo" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
                    <div class="modal-header modal-header-azul">
                        <h5 class="modal-title"><i class="fas fa-users me-2"></i>Cupo por defecto</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding:22px">
                        <label class="form-label" style="font-weight:600;color:#1E293B">Estudiantes por grupo</label>
                        <input type="number" id="inputCupo" class="form-control" min="1" max="100"
                            placeholder="25">
                        <div class="campo-error" id="errCupo"></div>
                        <small class="text-muted d-block mt-1">Se usa al crear grupos sin especificar cupo.</small>
                    </div>
                    <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                        <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                            data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-primary" id="btnGuardarCupo" onclick="guardarCupo()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>

        {{-- Modal: Docentes del período --}}
        <div class="modal fade modal-app" id="modalDocentes" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
                    <div class="modal-header modal-header-azul">
                        <h5 class="modal-title" id="modalDocentesTitulo"><i
                                class="fas fa-chalkboard-teacher me-2"></i>Docentes del período</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding:22px;max-height:420px;overflow-y:auto">
                        <div id="listaDocentes">
                            <p class="text-center text-muted py-3">Cargando…</p>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                        <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>

        {{-- Modal: Módulos de contenido --}}
        <div class="modal fade modal-app" id="modalModulos" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
                    <div class="modal-header modal-header-azul">
                        <h5 class="modal-title" id="modalModulosTitulo"><i class="fas fa-cubes me-2"></i>Módulos de contenido
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding:22px;max-height:460px;overflow-y:auto">
                        <p style="font-size:.8rem;color:#64748B;margin-bottom:14px">
                            <strong>Activo:</strong> visible para docentes.
                            <strong>Visible:</strong> además visible para estudiantes.
                        </p>
                        <div id="listaModulos">
                            <p class="text-center text-muted py-3">Cargando…</p>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                        <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
