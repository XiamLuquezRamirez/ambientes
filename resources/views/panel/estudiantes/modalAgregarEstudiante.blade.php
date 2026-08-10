@push('styles')
    <style>
        .est-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #F1F5F9;
            transition: background .1s;
        }

        .est-row:last-child {
            border-bottom: none;
        }

        .est-row:hover {
            background: #F8FAFC;
        }

        .avatar-est {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 700;
            font-size: .82rem;
            flex-shrink: 0;
        }

        .est-nombre {
            font-weight: 600;
            color: #1E293B;
            font-size: .9rem;
        }

        .est-sub {
            font-size: .76rem;
            color: #64748B;
        }

        .est-estado-badge {
            font-size: .72rem;
            padding: 2px 10px;
            border-radius: 99px;
            font-weight: 600;
        }

        .badge-activo {
            background: #ECFDF5;
            color: #065F46;
        }

        .badge-restringido {
            background: #FEF3C7;
            color: #92400E;
        }

        .badge-adaptado {
            background: #EFF6FF;
            color: #1E40AF;
        }

        .busq-fila {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            cursor: pointer;
            border-bottom: 1px solid #F1F5F9;
            transition: background .1s;
        }

        .busq-fila:hover {
            background: #F8FAFC;
        }

        .busq-fila.marcado {
            background: #EFF6FF;
        }

        .busq-check {
            width: 16px;
            height: 16px;
            accent-color: #2563EB;
            flex-shrink: 0;
        }

        .btn-agregar-estudiante {
            background: rgb(37, 179, 235);
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 1rem;
        }
    </style>
@endpush
<div class="modal fade modal-app" id="modalAgregarEstudiante" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon">
                    <i class="fa-solid fa-user-plus text-white"></i>
                </div>
                <div>
                    <h5 class="modal-title">
                        Agregar estudiante
                    </h5>
                    <p class="modal-subtitle mb-0" style="font-size: 1rem;">
                        Selecciona los estudiantes que deseas agregar al ambiente
                    </p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <div class="row">
                    <div class="col-md-5">
                        <input type="text" id="inputBuscarAgregar" class="form-control mb-3"
                            placeholder="Buscar estudiante…" oninput="buscarParaAgregar()">
                    </div>
                    <div class="col-md-4">
                        <select id="selEdadAgregar" class="form-control" onchange="buscarParaAgregar()">
                            <option value="">Seleccionar rango de edad</option>
                            <option value="1-2">1-2 años</option>
                            <option value="3-4">3-4 años</option>
                            <option value="5-6">5-6 años</option>
                        </select>
                    </div>
                    <!-- seleccionar todos estudiantes del grado y grupo -->
                    <div class="col-md-3">
                        <button type="button" class="btn"
                            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;white-space:nowrap"
                            id="btnToggleTodos" onclick="seleccionarTodosEstudiantes()">
                            Seleccionar todos
                        </button>
                    </div>
                </div>
                <div id="listaEstudiantes"
                    style="border:1px solid #E2E8F0;border-radius:10px;
                            max-height:300px;overflow-y:auto;min-height:60px">
                    <p class="text-center text-muted py-3">Escribe para buscar…</p>
                </div>
                <div style="margin-top:10px;font-size:.82rem;color:#64748B" id="contadorAgregar">
                    0 seleccionados
                </div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnConfirmarAgregar" onclick="confirmarAgregar()" disabled>
                    Agregar seleccionados
                </button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        let _todosEstudiantes = [];
        let _estudiantes = [];
        let _selAgregar = new Set();
        let _debBusq;

        const URL_BUSCAR =
            "{{ route('panel.estudiantes.obtenerEstudiantes', [':ambiente', ':grado', ':grupo']) }}";
        const URL_STORE = "{{ route('panel.estudiantes.agregar', [':ambiente']) }}";

        async function cargarEstudiantes() {

            const GRADO_ID = {{ (int) session('grado_id') }};
            const GRUPO_ID = {{ (int) session('grupo_id') }};
            const AMBIENTE_ID = {{ (int) session('ambiente_id') }};

            const url = URL_BUSCAR
                .replace(':ambiente', AMBIENTE_ID)
                .replace(':grado', GRADO_ID)
                .replace(':grupo', GRUPO_ID);

            try {

                const response = await fetch(url);
                const data = await response.json();

                if (!data.success) {
                    _todosEstudiantes = [];
                    _estudiantes = [];
                    renderEstudiantesLista();
                    return;
                }

                _todosEstudiantes = data.data;
                filtrarEstudiantes();

            } catch (e) {

                console.error(e);

                _todosEstudiantes = [];
                _estudiantes = [];
                renderEstudiantesLista();

            }
        }

        function filtrarEstudiantes() {

            const termino = document
                .getElementById('inputBuscarAgregar')
                .value
                .trim()
                .toLowerCase();

            const edad = document
                .getElementById('selEdadAgregar')
                .value;

            _estudiantes = [..._todosEstudiantes];

            if (termino) {
                _estudiantes = _estudiantes.filter(e =>
                    e.nombre.toLowerCase().includes(termino)
                );
            }

            if (edad) {
                const [min, max] = edad.split('-').map(Number);
                _estudiantes = _estudiantes.filter(e =>
                    e.edad >= min &&
                    e.edad <= max
                );
            }
            renderEstudiantesLista();
        }


        function buscarParaAgregar() {

            clearTimeout(_debBusq);

            _debBusq = setTimeout(() => {
                filtrarEstudiantes();
            }, 250);

        }

        function renderEstudiantesLista() {
            const cont = document.getElementById('listaEstudiantes');
            if (!_estudiantes.length) {
                cont.innerHTML = '<p class="text-center text-muted py-3">Sin resultados.</p>';
                return;
            }
            cont.innerHTML = _estudiantes.map(e => `
        <label class="busq-fila ${_selAgregar.has(e.id) ? 'marcado' : ''}"
               data-id="${e.id}"
               onclick="seleccionarEstudiante(${e.id}, this)">
            <input type="checkbox" class="busq-check" ${_selAgregar.has(e.id) ? 'checked' : ''}
                   onclick="event.stopPropagation();seleccionarEstudiante(${e.id},this.closest('.busq-fila'))">
            <div class="avatar-est" style="background:${e.color_avatar};width:32px;height:32px;font-size:.75rem">
               ${
e.avatar_url
? `<img src="${e.avatar_url}"
    class="avatar-est"
    style="width:32px;height:32px;border-radius:50%;object-fit:cover;"
    alt="${e.nombre}">`
: `<div class="avatar-est"
    style="background:${e.color_avatar};width:32px;height:32px;font-size:.75rem">
    ${e.iniciales}
    </div>`
}
</div>
<div>
                <div style="font-weight:600;font-size:.88rem;color:#1E293B">${e.nombre} (${e.edad} años)</div>
                <div style="font-size:.75rem;color:#64748B">${e.grado_grupo ?? 'Sin grupo'}</div>
            </div>
        </label>
    `).join('');
        }


        function seleccionarTodosEstudiantes() {

            const filas = document.querySelectorAll('.busq-fila');

            const seleccionar = _selAgregar.size !== filas.length;

            filas.forEach(fila => {

                const id = Number(fila.dataset.id);
                const chk = fila.querySelector('.busq-check');

                if (seleccionar) {
                    _selAgregar.add(id);
                    fila.classList.add('marcado');
                    chk.checked = true;
                } else {
                    _selAgregar.delete(id);
                    fila.classList.remove('marcado');
                    chk.checked = false;
                }

            });

            document.getElementById('btnToggleTodos').textContent =
                seleccionar ? 'Deseleccionar todos' : 'Seleccionar todos';

            actualizarContadorAgregar();
        }

        function seleccionarEstudiante(id, fila) {
            id = Number(id);
            const chk = fila.querySelector('.busq-check');
            if (_selAgregar.has(id)) {
                _selAgregar.delete(id);
                fila.classList.remove('marcado');
                chk.checked = false;
            } else {
                _selAgregar.add(id);
                fila.classList.add('marcado');
                chk.checked = true;
            }
            actualizarContadorAgregar();
        }

        function actualizarContadorAgregar() {

            const n = _selAgregar.size;
            const total = document.querySelectorAll('.busq-fila').length;

            document.getElementById('contadorAgregar').textContent =
                `${n} seleccionado(s)`;

            document.getElementById('btnConfirmarAgregar').disabled = n === 0;

            document.getElementById('btnToggleTodos').textContent =
                n === total && total > 0 ?
                'Deseleccionar todos' :
                'Seleccionar todos';
        }


        async function confirmarAgregar() {

            const btn = document.getElementById('btnConfirmarAgregar');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Asignando...';

            try {
                const AMBIENTE_ID = {{ (int) session('ambiente_id') }};
                const ANIO_LECTIVO = {{ (int) date('Y') }};

                const response = await fetch(URL_STORE.replace(':ambiente', AMBIENTE_ID), {

                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        estudiante_ids: [..._selAgregar],
                        ambiente_id: AMBIENTE_ID,
                        anio_lectivo: ANIO_LECTIVO
                    })
                });
                const data = await response.json();
                if (data.success) {
                    bootstrap.Modal.getInstance(
                        document.getElementById('modalAgregarEstudiante')
                    ).hide();
                    mostrarToast('success', data.message);
                    aplicarFiltrosEstudiantes();
                } else {
                    mostrarToast('error', data.message);
                }
            } catch (e) {
                console.error(e);
                mostrarToast('error', 'Ocurrió un error.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Asignar seleccionados';
            }
        }

        function cerrarModalAgregarEstudiante() {
            $('#modalAgregarEstudiante').modal('hide');
        }
    </script>
@endpush
