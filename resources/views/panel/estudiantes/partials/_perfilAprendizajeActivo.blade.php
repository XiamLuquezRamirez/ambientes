@if ($estudiante->perfilAprendizaje !== null && $estudiante->perfilAprendizaje->id != 1)
    <section class="c-card" style="border-color:{{ $estudiante->perfilAprendizaje->color_hex }};background:#{{ $estudiante->perfilAprendizaje->color_hex }}22;">
        <h3 class="ficha-section-title" style="color:{{ $estudiante->perfilAprendizaje->color_hex }};">
            <i class="fa-solid fa-layer-group me-1"></i> Perfil de aprendizaje: {{ $estudiante->perfilAprendizaje->nombre }}
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
