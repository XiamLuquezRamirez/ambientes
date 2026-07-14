{{--
    Ficha completa del estudiante (panel docente).
    Controlador: EstudiantePanelController@verFicha
    Ruta: panel.estudiantes.show
--}}
@extends('layouts.panel')
@section('title', 'Ficha del estudiante')

@section('content')
    @php
        $condicionNombre = $estudiante->condicion_nombre;
        $estadoPin = $estadoPin ?? $estudiante->estado_pin;
        $estadoPinLabel = $estadoPinLabel ?? [
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
        $pinClase = [
            'sin_configurar' => 'ficha-pill--warn',
            'configurado' => 'ficha-pill--ok',
            'bloqueado' => 'ficha-pill--danger',
        ][$estadoPin] ?? 'ficha-pill--warn';
        $matricula = $matricula ?? $estudiante->matriculaActiva;
        $ambiente = $ambiente ?? null;
        $portafolioReciente = $portafolioReciente ?? collect();
        $observacionesRecientes = $observacionesRecientes ?? collect();
        $mostrarVerPiar = $mostrarVerPiar ?? ! $estudiante->condicion_es_estandar;
        $asistenciaHoy = $asistenciaHoy ?? null;
    @endphp

    <div class="ficha-page">
        <div class="page-header ficha-header">
            <div>
                <h1>{{ $estudiante->nombre_completo }}</h1>
                <p class="ficha-subtitle">Ficha completa del estudiante</p>
            </div>
            <a href="{{ route('panel.estudiantes') }}" class="btn btn-outline-secondary">
                <i class="fa-solid fa-arrow-left"></i> Volver a estudiantes
            </a>
        </div>

        @if (session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif
        @if (session('info'))
            <div class="alert alert-info">{{ session('info') }}</div>
        @endif
        @if ($errors->any())
            <div class="alert alert-danger">
                <ul class="mb-0">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        {{-- Datos personales --}}
        <section class="ficha-card">
            <div class="ficha-identity">
                @if ($estudiante->avatar_url)
                    <img src="{{ $estudiante->avatar_url }}" class="ficha-avatar" alt="{{ $estudiante->nombre_completo }}">
                @else
                    <div class="ficha-avatar ficha-avatar--initials" style="background: {{ $estudiante->color_avatar }}">
                        {{ $estudiante->iniciales }}
                    </div>
                @endif

                <div class="ficha-identity-body">
                    <h2>{{ $estudiante->nombre_completo }}</h2>
                    <div class="ficha-badges">
                        <span class="stu-badge stu-badge--condicion">{{ $condicionNombre }}</span>
                        <span class="stu-badge {{ $estudiante->activo ? 'stu-badge--activo' : 'stu-badge--inactivo' }}">
                            {{ $estudiante->estado_texto }}
                        </span>
                        @if ($estudiante->piar)
                            <span class="stu-badge stu-badge--piar">PIAR activo</span>
                        @elseif (!$estudiante->condicion_es_estandar)
                            <span class="stu-badge stu-badge--apoyo">PIAR pendiente</span>
                        @endif
                    </div>
                </div>
            </div>
        </section>

        {{-- Resumen: matrícula, PIN, PIAR --}}
        <section class="ficha-grid">
            <div class="ficha-card ficha-card--compact">
                <h3>Matrícula activa</h3>
                @if ($matricula)
                    <dl class="ficha-dl">
                        <div>
                            <dt>Ambiente</dt>
                            <dd>{{ $ambiente->nombre ?? 'Sin ambiente' }}</dd>
                        </div>
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

            <div class="ficha-card ficha-card--compact">
                <h3>Estado del PIN</h3>
                <span class="ficha-pill {{ $pinClase }}">{{ $estadoPinLabel }}</span>
            </div>

            <div class="ficha-card ficha-card--compact">
                <h3>PIAR</h3>
                <span class="ficha-pill {{ $estudiante->piar ? 'ficha-pill--ok' : 'ficha-pill--muted' }}">
                    {{ $estudiante->piar ? 'Activo' : 'Sin diligenciar' }}
                </span>
            </div>
        </section>

        {{-- Acciones --}}
        <section class="ficha-card">
            <h3 class="ficha-section-title">Acciones</h3>
            <div class="ficha-actions">
                <a href="{{ route('panel.estudiantes.pin', $estudiante) }}" class="btn btn-outline-primary">
                    <i class="fa-solid fa-key"></i> Configurar PIN
                </a>
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
                @if ($mostrarVerPiar)
                    <a href="{{ route('panel.estudiantes.piar', $estudiante) }}" class="btn btn-primary" target="_blank"
                        rel="noopener">
                        <i class="fa-solid fa-file-medical"></i> Ver PIAR
                    </a>
                @endif
            </div>
        </section>

        {{-- Actividad reciente --}}
        <section class="ficha-activity">
            <div class="ficha-card">
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

            <div class="ficha-card">
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
            <form method="POST" action="{{ route('panel.portafolio.observacion', $estudiante) }}" class="modal-content">
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
@endsection
