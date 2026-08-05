{{-- Ficha completa del estudiante (panel docente).
    Controlador: EstudiantePanelController@verFicha
    Ruta: panel.estudiantes.show --}}
@extends('layouts.panel')
@section('title', 'Ficha del estudiante')

@php
    $perfilAprendizajeNombre = $estudiante->perfilAprendizaje?->nombre ?? 'Estándar';
    $requiereApoyo = in_array(strtolower((string) $estudiante->requiere_apoyo), ['si', 'sí', '1', 'true'], true);
@endphp

@section('content')
    @php
        $perfilAprendizajeNombre = $estudiante->perfilAprendizaje_nombre;
        $estadoPin = $estadoPin ?? $estudiante->estado_pin;
        $estadoPinLabel =
            $estadoPinLabel ??
            [
                'sin_configurar' => 'Sin configurar',
                'configurado' => 'Configurado',
                'bloqueado' => 'Bloqueado',
            ][$estadoPin];
        $tiposPortafolio = [
            'foto' => 'Foto',
            'audio' => 'Audio',
            'emocion' => 'Emoción',
            'resultado' => 'Resultado',
        ];
        $pinClase =
            [
                'sin_configurar' => 'ficha-pill--warn',
                'configurado' => 'ficha-pill--ok',
                'bloqueado' => 'ficha-pill--danger',
            ][$estadoPin] ?? 'ficha-pill--warn';
        $matricula = $matricula ?? $estudiante->matriculaActiva;
        $ambiente = $ambiente ?? null;
        $portafolioReciente = $portafolioReciente ?? collect();
        $observacionesRecientes = $observacionesRecientes ?? collect();
        $mostrarVerPiar = $mostrarVerPiar ?? !$estudiante->perfil_aprendizaje_es_estandar;
        $asistenciaHoy = $asistenciaHoy ?? null;
    @endphp

    <div class="ficha-page">

        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
            <div>
                <p style= "font-size: 1.2rem;">Ficha completa del estudiante</p>
            </div>
            <a href="javascript:window.history.back()" class="btn btn-primary">
                <i class="fas fa-arrow-left me-1"></i> Volver
            </a>
        </div>
        @if (session('success'))
            <script>
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: @json(session('success')),
                    confirmButtonColor: '#2563eb'
                });
            </script>
        @endif

        @if (session('info'))
            <script>
                Swal.fire({
                    icon: 'info',
                    title: 'Información',
                    text: @json(session('info')),
                    confirmButtonColor: '#2563eb'
                });
            </script>
        @endif

        @if ($errors->any())
            <script>
                Swal.fire({
                    icon: 'error',
                    title: 'Se encontraron errores',
                    html: `{!! implode('<br>', $errors->all()) !!}`,
                    confirmButtonColor: '#dc3545'
                });
            </script>
        @endif

        {{-- Datos personales --}}
        <section class="c-card">
            <div class="ficha-identity">
                @if ($estudiante->avatar_url)
                    <img src="{{ $estudiante->avatar_url }}" class="ficha-avatar" alt="{{ $estudiante->nombre_completo }}">
                @else
                    <div class="ficha-avatar ficha-avatar--initials" style="background: {{ $estudiante->color_avatar }}">
                        {{ $estudiante->iniciales }}
                    </div>
                @endif

                <div class="ficha-identity-body">
                    <h1 style="font-family: var(--font-display); font-size: 1.8rem; color: var(--color-primary-dark);">
                        {{ $estudiante->nombre_completo }}</h1>
                    <div class="ficha-badges">
                        @if ($estudiante->perfilAprendizaje->id == 1)
                            <span class="stu-badge stu-badge--perfil-aprendizaje">
                               Perfil: {{ $estudiante->perfilAprendizaje->nombre }}
                            </span>
                        @endif
                        <span class="stu-badge {{ $estudiante->activo ? 'stu-badge--activo' : 'stu-badge--inactivo' }}">
                            {{ $estudiante->estado_texto }}
                        </span>
                        @if ($estudiante->piar !== null && $estudiante->piar->paso == '8')
                            <span class="stu-badge stu-badge--piar">PIAR Activo</span>
                        @elseif ($estudiante->piar !== null && $estudiante->piar->paso < '8')
                            <span class="stu-badge stu-badge--piar-incompleto">PIAR Incompleto</span>
                        @elseif ($estudiante->piar == null && $requiereApoyo)
                            <span class="stu-badge stu-badge--piar-sin">Sin PIAR</span>
                        @endif

                        @if ($requiereApoyo)
                            <span class="stu-badge stu-badge--apoyo">Apoyo pedagógico</span>
                        @endif
                    </div>
                </div>
            </div>
        </section>

        <div id="fichaPerfilPersonalizadoActivo">
            @include('panel.estudiantes.partials._perfilAprendizajePersonalizadoActivo')
        </div>

        @if ($estudiante->perfilAprendizaje !== null && $estudiante->perfilAprendizaje->id != 1)
            <section class="c-card" style="border-color:{{ $estudiante->perfilAprendizaje->color_hex }};background:#{{ $estudiante->perfilAprendizaje->color_hex }}22;">
                <h3 class="ficha-section-title" style="color:{{ $estudiante->perfilAprendizaje->color_hex }};">
                    <i class="fa-solid fa-puzzle-piece me-1"></i> Perfil de aprendizaje: {{ $estudiante->perfilAprendizaje->nombre }}
                </h3>
                <dl class="ficha-dl">   
                    <div>
                        <dt>Código</dt>
                        <dd>{{ $estudiante->perfilAprendizaje->codigo }}</dd>
                    </div>
                    <div>
                        <dt>Descripción</dt>
                        <dd>{{ $estudiante->perfilAprendizaje->descripcion_corta }}</dd>
                    </div>
                </dl>
            </section>
        @endif

        {{-- Acciones --}}
        <section class="c-card">
            <h3 class="ficha-section-title">Acciones</h3>
            <div class="ficha-actions">
                @if ($estudiante->configuracionPin == null)
                    <button type="button" onclick="abrirModalConfigurarPin({{ $estudiante->id }})"
                        class="btn btn-outline-primary">
                        <i class="fa-solid fa-key"></i> Configurar PIN
                    </button>
                @endif
                <a href="{{ route('panel.portafolio.estudiante', $estudiante) }}" class="btn btn-outline-primary">
                    <i class="fa-solid fa-folder-open"></i> Ver portafolio completo
                </a>
                <button type="button" class="btn btn-outline-primary" data-bs-toggle="modal"
                    data-bs-target="#modalObservacionFicha">
                    <i class="fa-solid fa-comment"></i> Agregar observación
                </button>
                <form method="POST" action="{{ route('panel.estudiantes.asistencia', $estudiante) }}"
                    class="ficha-action-form">
                    @csrf
                    <button type="submit" class="btn btn-outline-primary"
                        @if ($asistenciaHoy?->presente) disabled title="Ya registrada hoy" @endif>
                        <i class="fa-solid fa-calendar-check"></i>
                        {{ $asistenciaHoy?->presente ? 'Asistencia ya registrada' : 'Registrar asistencia puntual' }}
                    </button>
                </form>
                @php
                    $clase = null;
                    $texto = null;
                    $ruta = null;

                    if ($requiereApoyo) {
                        if ($estudiante->piar) {
                            if ($estudiante->piar->paso < 8) {
                                $clase = 'btn btn-primary';
                                $texto = 'PIAR incompleto';
                                $ruta = route('admin.estudiantes.diligenciar-piar', [
                                    'idEstudiante' => $estudiante->id,
                                    'tipo' => 'nuevo',
                                ]);
                            } elseif ($estudiante->piar->paso == 8) {
                                $clase = 'btn btn-primary';
                                $texto = 'Ver PIAR';
                                $ruta = route('admin.piar.exportar', [
                                    'idEstudiante' => $estudiante->id,
                                ]);
                            }
                        } else {
                            $clase = 'btn btn-primary';
                            $texto = 'Diligenciar PIAR';
                            $ruta = route('admin.estudiantes.diligenciar-piar', [
                                'idEstudiante' => $estudiante->id,
                                'tipo' => 'nuevo',
                            ]);
                        }
                    }
                @endphp

                @if ($ruta)
                    <a class="{{ $clase }}" href="{{ $ruta }}" title="{{ $texto }}">
                        <i class="fa-solid fa-file-medical"></i> {{ $texto }}
                    </a>
                @endif

                <span id="fichaAccionesPerfilPersonalizado">
                    @include('panel.estudiantes.partials._accionesPerfilAprendizajePersonalizado')
                </span>
            </div>
        </section>

        @php
            $historialPerfilesAprendizajePersonalizado = $historialPerfilesAprendizajePersonalizado ?? collect();
        @endphp

        {{-- Resumen: matrícula, PIN, PIAR --}}
        <div class="c-card shadow-sm mt-2">
            <div class="c-head bg-white">
                <ul class="nav nav-tabs" id="perfilTabs">
                    <li class="nav-item">
                        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabResumen">
                            <i class="fa-solid fa-book me-2"></i>
                            Matrícula activa
                        </button>
                    </li>

                    <li class="nav-item">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabAsistencia">
                            <i class="fa-solid fa-calendar-check me-2"></i>
                            Asistencia
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabAmbientes">
                            <i class="fa-solid fa-house me-2"></i>
                            Ambientes
                        </button>
                    </li>
                    @include('panel.estudiantes.partials._tabNavPerfilAprendizajePersonalizado')
                </ul>
            </div>

            <div class="card-body">
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="tabResumen">
                        @if ($matricula)
                            <dl class="ficha-dl">
                                <div>
                                    <dt>Grado</dt>
                                    <dd>{{ $matricula->grado->nombre ?? 'Sin grado' }}</dd>
                                </div>
                                <div>
                                    <dt>Grupo</dt>
                                    <dd>{{ $matricula->grupo->nombre ?? 'Sin grupo' }}</dd>
                                </div>
                                <div>
                                    <dt>Año lectivo</dt>
                                    <dd>{{ $matricula->anio_lectivo }}</dd>
                                </div>
                            </dl>
                        @else
                            <p class="ficha-empty">Sin matrícula activa este año.</p>
                        @endif
                    </div>
                    <div class="tab-pane fade" id="tabAsistencia">

                        <div class="attendance-summary">

                            <div class="attendance-summary__header">
                                <span>Asistencia del periodo</span>

                                <strong>
                                    {{ $resumenAsistencia['porcentaje'] }}%
                                </strong>
                            </div>

                            <div class="progress">
                                <div class="progress-bar {{ $resumenAsistencia['alerta'] ? 'bg-danger' : 'bg-success' }}"
                                    style="width: {{ $resumenAsistencia['porcentaje'] }}%">
                                </div>
                            </div>

                            <small>
                                {{ $resumenAsistencia['presentes'] }} presentes ·
                                {{ $resumenAsistencia['ausentes'] }} ausentes
                            </small>

                        </div>
                        @if ($resumenAsistencia['alerta'])
                            <div class="alert alert-warning mt-3">

                                <i class="fa-solid fa-triangle-exclamation"></i>

                                <strong>Asistencia baja.</strong>

                                El estudiante registra una asistencia del

                                <strong>{{ $resumenAsistencia['porcentaje'] }}%</strong>

                                durante el periodo evaluado.

                            </div>
                        @endif
                        <hr>
                        @if ($historialAsistencia->isNotEmpty())
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($historialAsistencia as $registro)
                                            <tr>
                                                <td>
                                                    {{ $registro['fecha']->format('d/m/Y') }}
                                                </td>
                                                <td>
                                                    @switch($registro['estado'])
                                                        @case('presente')
                                                            <span class="estado-asistencia estado-asistencia--presente">
                                                                <span class="estado-dot"></span>
                                                                Presente
                                                            </span>
                                                        @break

                                                        @case('ausente')
                                                            <span class="estado-asistencia estado-asistencia--ausente">
                                                                <span class="estado-dot"></span>
                                                                Ausente
                                                            </span>
                                                        @break

                                                        @default
                                                            <span class="estado-asistencia estado-asistencia--sin">
                                                                <span class="estado-dot"></span>
                                                                Sin registro
                                                            </span>
                                                    @endswitch
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @else
                            <p class="ficha-empty">
                                No hay información de asistencia.
                            </p>

                        @endif

                    </div>
                    <div class="tab-pane fade" id="tabAmbientes">
                        <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
                        <p class="ficha-section-title">Ambientes que estan a su cargo y a los que esta asignado este
                            estudiante</p>
                        <p class="text-muted">Si desea cambiar el estado de un ambiente, por favor, use el checkbox
                            correspondiente.</p>
                        <hr>
                        @if ($ambientesEstudiante->isNotEmpty())
                            @foreach ($ambientesEstudiante as $ambiente)
                                <div class="c-card-ambiente shadow-sm mt-2">
                                    <div class="card-body">
                                        <div class="card-body-content">
                                            <div class="card-icono"
                                                style="background:{{ $ambiente->ambiente->color_hex }}22">
                                                {{ $ambiente->ambiente->icono }}</div>
                                            <strong>Ambiente {{ $ambiente->ambiente->nombre }}</strong>
                                        </div>
                                        <div class="d-flex justify-content-center align-items-center">
                                            <div class="form-check form-switch">
                                                <input
                                                    onchange="cambiarEstadoEstudianteAmbiente({{ $ambiente->ambiente_id }},{{ $estudiante->id }}, '{{ $ambiente->ambiente->nombre }}', this)"
                                                    {{ $ambiente->activo == 1 ? 'checked' : '' }} class="form-check-input"
                                                    type="checkbox" role="switch" id="flexSwitchCheckDefault">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        @else
                            <p class="ficha-empty">Sin ambientes asignados este año.</p>
                        @endif
                    </div>
                    <div class="tab-pane fade" id="tabPerfilesAprendizajePersonalizado" role="tabpanel"
                        aria-labelledby="fichaTabNavPerfilPersonalizado">
                        @include('panel.estudiantes.partials._historialPerfilesAprendizajePersonalizado')
                    </div>
                </div>
            </div>
        </div>   

        {{-- Actividad reciente --}}
        <section class="ficha-activity">
            <div class="c-card">
                <h3 class="ficha-section-title">Últimas entradas del portafolio</h3>
                @forelse ($portafolioReciente as $entrada)
                    <div class="ficha-activity-row">
                        <span
                            class="ficha-activity-type">{{ $tiposPortafolio[$entrada->tipo_registro] ?? ucfirst($entrada->tipo_registro) }}</span>
                        <span class="ficha-activity-date">
                            {{ $entrada->creado_en ? \Carbon\Carbon::parse($entrada->creado_en)->format('d/m/Y H:i') : '—' }}
                        </span>
                    </div>
                @empty
                    <p class="ficha-empty">Sin entradas recientes en el portafolio.</p>
                @endforelse
            </div>

            <div class="c-card">
                <h3 class="ficha-section-title">Últimas observaciones</h3>
                @forelse ($observacionesRecientes as $obs)
                    <div class="ficha-activity-row ficha-activity-row--stack">
                        <div class="ficha-activity-meta">
                            <span class="ficha-activity-type">{{ ucfirst($obs->tipo) }}</span>
                            <span class="ficha-activity-date">{{ $obs->created_at?->format('d/m/Y H:i') ?? '—' }}</span>
                        </div>
                        <p class="ficha-activity-text">{{ \Illuminate\Support\Str::limit($obs->contenido, 140) }}</p>
                    </div>
                @empty
                    <p class="ficha-empty">Sin observaciones registradas.</p>
                @endforelse
            </div>
        </section>
    </div>

    {{-- Modal observación --}}
    <div class="modal fade" id="modalObservacionFicha" tabindex="-1" aria-labelledby="modalObservacionFichaLabel"
        aria-hidden="true">
        <div class="modal-dialog">
            <form method="POST" action="{{ route('panel.portafolio.observacion', $estudiante) }}"
                class="modal-content">
                @csrf
                <div class="modal-header">
                    <h5 class="modal-title" id="modalObservacionFichaLabel">Agregar observación</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body" style="display:grid;gap:12px;">
                    <div>
                        <label for="tipo_obs" class="form-label">Tipo</label>
                        <select name="tipo" id="tipo_obs" class="form-select" required>
                            <option value="general">General</option>
                            <option value="logro">Logro</option>
                        </select>
                    </div>
                    <div>
                        <label for="contenido_obs" class="form-label">Contenido</label>
                        <textarea name="contenido" id="contenido_obs" class="form-control" rows="4" required maxlength="2000"
                            placeholder="Describe la observación..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>

    @include('panel.estudiantes.modalConfigurarPin')
    @if ($estudiante->piar == null)
        @include('panel.estudiantes.modalActivarPerfilAprendizajePersonalizado')
    @endif
    @include('partials.perfil-aprendizaje-personalizado.modal-desactivar')

    @push('scripts')
        <script>
            const URL_ESTUDIANTES = "{{ route('panel.estudiantes.guardar') }}";
            var pin = [];
            var idContainerPin = 'configuracion_pin_docente';
            var idEstudianteConfigurarPin = 0;
        </script>
        <script src="{{ asset('assets/js/panel/estudiante_index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/pin.js') }}"></script>
        <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
        <script>
            window.URL_FICHA_FRAGMENTOS_PERFIL_PERSONALIZADO = @json(route('panel.estudiantes.perfil-aprendizaje-personalizado.fragmentos', $estudiante));
            @if ($estudiante->piar == null)
                window.URL_FICHA_ACTIVAR_PERFIL_PERSONALIZADO = @json(route('panel.estudiantes.perfil-aprendizaje-personalizado.activar', $estudiante));
            @endif
            window.CT_EST_URL_DESASOCIAR = (id) => @json(url('panel/inclusion/perfil-aprendizaje-personalizado/asignaciones')) + `/${id}/desasociar`;
        </script>
        <script src="{{ asset('assets/js/panel/ficha-perfil-aprendizaje-personalizado.js') }}"></script>
        <script src="{{ asset('assets/js/perfiles-aprendizaje/estudiantes-asociados-perfil-aprendizaje-personalizado.js') }}"></script>
    @endpush
@endsection
