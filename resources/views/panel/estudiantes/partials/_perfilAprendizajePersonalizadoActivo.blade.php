@if ($perfilAprendizajePersonalizadoActiva ?? null)
    <section class="c-card" style="border-color:#FDBA74;background:#FFF7ED;">
        <h3 class="ficha-section-title" style="color:#C2410C;">
            <i class="fa-solid fa-puzzle-piece me-1"></i> Perfil de aprendizaje personalizado activo
        </h3>
        <dl class="ficha-dl">
            <div>
                <dt>Perfil de aprendizaje</dt>
                <dd>{{ $perfilAprendizajePersonalizadoActiva->perfilAprendizajePersonalizado?->etiqueta ?? '—' }}</dd>
            </div>
            <div>
                <dt>Activada</dt>
                <dd>{{ $perfilAprendizajePersonalizadoActiva->fecha_activacion?->format('d/m/Y H:i') ?? '—' }}</dd>
            </div>
            <div>
                <dt>Docente</dt>
                <dd>
                    {{ trim(($perfilAprendizajePersonalizadoActiva->docente?->user?->nombre ?? '') . ' ' . ($perfilAprendizajePersonalizadoActiva->docente?->user?->apellido ?? '')) ?: '—' }}
                </dd>
            </div>
        </dl>
        <p class="mb-0 mt-2" style="color:#9A3412;font-size:.92rem;">
            {{ $perfilAprendizajePersonalizadoActiva->observacion }}
        </p>
    </section>
@endif
