{{-- Modal: activar perfil de aprendizaje personalizado (panel docente) --}}
@php
    $condicionesTransitorias = $condicionesTransitorias ?? collect();
@endphp

<div class="modal fade" id="modalCondicionTransitoria" tabindex="-1" aria-labelledby="modalCondicionTransitoriaLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <form method="POST" action="{{ route('panel.estudiantes.perfil-aprendizaje-personalizado.activar', $estudiante) }}"
            class="modal-content" id="formCondicionTransitoria">
            @csrf
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fas fa-puzzle-piece text-white"></i></div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalCondicionTransitoriaLabel">Activar perfil de aprendizaje personalizado</h5>
                    <p class="modal-subtitle mb-0">Solo puede haber una activa por estudiante</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body" style="display:grid;gap:14px;">
                <div>
                    <label class="form-label fw-semibold" for="ct_select_trigger">Perfil de aprendizaje personalizado</label>
                    <input type="hidden" name="id_condicion_transitoria" id="id_condicion_transitoria" value="" required>

                    <div class="ct-select" id="ctSelect">
                        <button type="button" class="ct-select-trigger" id="ct_select_trigger">
                            <span class="ct-select-label is-placeholder" id="ctSelectLabel">Selecciona un perfil de aprendizaje…</span>
                            <i class="fa-solid fa-chevron-down ct-select-chevron"></i>
                        </button>

                        <div class="ct-select-panel">
                            <div class="ct-select-search">
                                <div class="ct-select-search-wrap">
                                    <i class="fa-solid fa-search"></i>
                                    <input type="text" id="ctBuscarCondicion" placeholder="Buscar por nombre o código…"
                                        autocomplete="off">
                                </div>
                            </div>
                            <div class="ct-select-list" id="ctSelectList">
                                @forelse ($condicionesTransitorias as $condicion)
                                    <button type="button" class="ct-select-option"
                                        data-id="{{ $condicion->id }}"
                                        data-label="{{ $condicion->etiqueta }}"
                                        data-codigo="{{ $condicion->codigo }}">
                                        <span class="ct-select-option-text">
                                            <strong>{{ $condicion->etiqueta }}</strong>
                                            <small>{{ $condicion->codigo }}</small>
                                        </span>
                                    </button>
                                @empty
                                    <div class="ct-select-empty">No hay perfiles de aprendizaje habilitados</div>
                                @endforelse
                                <div class="ct-select-empty" id="ctSelectEmpty" style="display:none">Sin resultados</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label for="observacion_ct" class="form-label fw-semibold">Observación</label>
                    <textarea name="observacion" id="observacion_ct" class="form-control" rows="4" required
                        minlength="20" maxlength="2000"
                        placeholder="Describe por qué se activa este perfil de aprendizaje personalizado…"></textarea>
                    <small class="text-muted">Mínimo 20 caracteres.</small>
                </div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnActivarPerfilAprendizajePersonalizado">
                    <i class="fa-solid fa-check"></i> Activar
                </button>
            </div>
        </form>
    </div>
</div>

@push('scripts')
    <script>
        (function() {
            const root = document.getElementById('ctSelect');
            if (!root) return;

            const trigger = document.getElementById('ct_select_trigger');
            const label = document.getElementById('ctSelectLabel');
            const hidden = document.getElementById('id_condicion_transitoria');
            const buscar = document.getElementById('ctBuscarCondicion');
            const empty = document.getElementById('ctSelectEmpty');
            const form = document.getElementById('formCondicionTransitoria');
            const options = () => Array.from(root.querySelectorAll('.ct-select-option'));

            function cerrar() {
                root.classList.remove('open');
            }

            function filtrar() {
                const q = (buscar.value || '').trim().toLowerCase();
                let visibles = 0;

                options().forEach((opt) => {
                    const texto = `${opt.dataset.label || ''} ${opt.dataset.codigo || ''}`.toLowerCase();
                    const match = !q || texto.includes(q);
                    opt.style.display = match ? '' : 'none';
                    if (match) visibles++;
                });

                if (empty) empty.style.display = visibles === 0 ? '' : 'none';
            }

            trigger?.addEventListener('click', (e) => {
                e.preventDefault();
                root.classList.toggle('open');
                if (root.classList.contains('open')) {
                    buscar.value = '';
                    filtrar();
                    setTimeout(() => buscar.focus(), 50);
                }
            });

            buscar?.addEventListener('input', filtrar);

            options().forEach((opt) => {
                opt.addEventListener('click', () => {
                    hidden.value = opt.dataset.id || '';
                    label.textContent = opt.dataset.label || 'Selecciona un perfil de aprendizaje…';
                    label.classList.toggle('is-placeholder', !opt.dataset.id);
                    options().forEach((o) => o.classList.remove('active'));
                    opt.classList.add('active');
                    cerrar();
                });
            });

            document.addEventListener('click', (e) => {
                if (!root.contains(e.target)) cerrar();
            });

            form?.addEventListener('submit', (e) => {
                if (!hidden.value) {
                    e.preventDefault();
                    trigger.style.borderColor = '#DC2626';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Selecciona un perfil de aprendizaje',
                        text: 'Debes elegir un perfil de aprendizaje personalizado antes de activarlo.',
                        confirmButtonColor: '#2563eb'
                    });
                }
            });

            document.getElementById('modalCondicionTransitoria')?.addEventListener('hidden.bs.modal', () => {
                cerrar();
                hidden.value = '';
                label.textContent = 'Selecciona un perfil de aprendizaje…';
                label.classList.add('is-placeholder');
                options().forEach((o) => o.classList.remove('active'));
                if (buscar) buscar.value = '';
                form?.reset();
                trigger.style.borderColor = '';
            });
        })();
    </script>
@endpush
