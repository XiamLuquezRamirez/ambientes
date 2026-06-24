@extends('layouts.admin')
@section('title', 'Asignaciones — ' . $ambiente->nombre)

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

    .modal-header-azul {
        background: linear-gradient(135deg, #1E3A8A, #2563EB);
        border-bottom: none;
        padding: 18px 22px;
    }

    .modal-header-azul .modal-title {
        font-family: 'Fredoka One', cursive;
        color: #fff;
        font-size: 1.1rem;
    }

    .modal-header-azul .btn-close {
        filter: brightness(0) invert(1);
        opacity: .75;
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
</style>
@endpush

@section('content')
{{-- Header --}}
<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap">
    <a href="{{ route('admin.ambientes') }}" class="btn btn-sm"
        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0">
        <i class="fas fa-arrow-left"></i> Volver
    </a>
    <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;
                 border-radius:99px;font-size:.88rem;font-weight:600;
                 background:{{ $ambiente->color_hex }}22;color:{{ $ambiente->color_hex }}">
       {{ $ambiente->icono }} {{ $ambiente->nombre }}
    </span>

    <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
        <label style="font-size:.82rem;color:#64748B;font-weight:600;white-space:nowrap">Año:</label>
        <select id="selectorAnio" class="form-select form-select-sm" style="width:100px"
            onchange="cambiarAnio(this.value)">
            @foreach(range(2024, date('Y') + 1) as $y)
            <option value="{{ $y }}" {{ $anio == $y ? 'selected' : '' }}>{{ $y }}</option>
            @endforeach
        </select>
    </div>

    <button class="btn btn-primary btn-sm" onclick="abrirModalAgregar()">
        <i class="fas fa-plus"></i> Agregar estudiantes
    </button>
</div>

<h2 style="font-size:1.05rem;font-weight:700;color:#1E293B;margin-bottom:4px">
    Estudiantes asignados · {{ $anio }}
</h2>
<p style="font-size:.82rem;color:#64748B;margin-bottom:20px">
    Estudiantes que participan en el ambiente {{ $ambiente->nombre }} durante {{ $anio }}.
</p>

{{-- Lista AJAX --}}
<div style="background:#fff;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden"
    id="contenedorLista">
    <p class="text-center text-muted py-4">
        <i class="fas fa-spinner fa-spin me-2"></i>Cargando…
    </p>
</div>

{{-- Modal: Agregar estudiantes --}}
<div class="modal fade" id="modalAgregar" tabindex="-1"
    data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title">
                    <i class="fas fa-child me-2"></i>Agregar al ambiente
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <div class="row">
                    <div class="col-md-8">
                        <input type="text" id="inputBuscarAgregar" class="form-control mb-3"
                            placeholder="Buscar estudiante…"
                            oninput="buscarParaAgregar()">
                    </div>
                    <div class="col-md-4">
                        <select id="selEdadAgregar" class="form-control" onchange="buscarParaAgregar()">
                            <option value="">Seleccionar rango de edad</option>
                            <option value="1-2">1-2 años</option>
                            <option value="3-4">3-4 años</option>
                            <option value="5-6">5-6 años</option>
                        </select>
                    </div>
                </div>
                <div id="listaBuscarAgregar"
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
                <button class="btn btn-primary" id="btnConfirmarAgregar"
                    onclick="confirmarAgregar()" disabled>
                    Asignar seleccionados
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Modal: Editar estado --}}
<div class="modal fade" id="modalEstadoEa" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title"><i class="fas fa-edit me-2"></i>Editar asignación</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <p id="ctxEstadoEa" style="font-size:.84rem;color:#64748B;margin-bottom:14px"></p>
                <div class="mb-3">
                    <label class="form-label" style="font-weight:600">Estado en el ambiente</label>
                    <select id="selEstadoEa" class="form-select">
                        <option value="activo">Activo</option>
                        <option value="restringido">Restringido</option>
                        <option value="adaptado">Adaptado</option>
                    </select>
                </div>
                <div class="mb-0">
                    <label class="form-label" style="font-weight:600">Observación (opcional)</label>
                    <textarea id="txtObsEa" class="form-control" rows="2" maxlength="500"
                        placeholder="Ej: Requiere adaptación del espacio…"></textarea>
                </div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnGuardarEstadoEa"
                    onclick="guardarEstadoEa()">Guardar</button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const AMBIENTE_ID = {{ (int) $ambiente->id }};
    const ANIO_LECTIVO = {{ (int) $anio }};
    const URL_TABLA = "{{ route('admin.ambientes.asignaciones.tabla', $ambiente) }}";
    const URL_BUSCAR = "{{ route('admin.ambientes.asignaciones.buscar', $ambiente) }}";
    const URL_STORE = "{{ route('admin.ambientes.asignaciones.asignar', $ambiente) }}";
    const URL_UPDATE = "{{ route('admin.ambientes.asignaciones.actualizar', [$ambiente, ':ea']) }}";
    const URL_DESTROY = "{{ route('admin.ambientes.asignaciones.quitar', [$ambiente, ':ea']) }}";
    const URL_GRADOS = "{{ route('admin.ambientes.grados', $ambiente) }}";

    /* ── AJAX helper ─────────────────────────────────────── */
    async function apiFetch(url, method = 'GET', body = null) {
        const opts = {
            method,
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
            },
        };
        if (body !== null) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        try {
            const res = await fetch(url, opts);
            return {
                status: res.status,
                data: await res.json()
            };
        } catch {
            return {
                status: 0,
                data: {
                    ok: false,
                    mensaje: 'Error de conexión.'
                }
            };
        }
    }

    /* ── Selector de año ─────────────────────────────────── */
    function cambiarAnio(anio) {
        window.location.href = `${window.location.pathname}?anio=${anio}`;
    }

    /* ── Cargar lista de asignaciones ────────────────────── */
    async function cargarLista() {
        const cont = document.getElementById('contenedorLista');
        const {
            data
        } = await apiFetch(`${URL_TABLA}?anio=${ANIO_LECTIVO}`);
        if (!data.ok) {
            cont.innerHTML = '<p class="text-center text-danger py-4">Error al cargar.</p>';
            return;
        }

        const asigs = data.asignaciones;
        if (!asigs.length) {
            cont.innerHTML = `
            <div style="text-align:center;padding:48px;color:#94A3B8">
                <i class="fas fa-child" style="font-size:2rem;opacity:.4;display:block;margin-bottom:10px"></i>
                Sin estudiantes asignados para ${ANIO_LECTIVO}
            </div>`;
            return;
        }

        const badgeClase = {
            activo: 'badge-activo',
            restringido: 'badge-restringido',
            adaptado: 'badge-adaptado'
        };
        const badgeTxt = {
            activo: 'Activo',
            restringido: 'Restringido',
            adaptado: 'Adaptado'
        };

        _eaData = {};
        cont.innerHTML = asigs.map(a => {
            _eaData[a.id] = { nombre: a.nombre, estado: a.estado, observacion: a.observacion };
            return `
            <div class="est-row" id="ea-row-${a.id}">
                <div class="avatar-est" style="background:${a.color_avatar}">
                    ${a.iniciales.substring(0,2).toUpperCase()}
                </div>
                <div style="flex:1;min-width:0">
                    <div class="est-nombre">${a.nombre}</div>
                    <div class="est-sub">${a.grado_grupo ?? 'Sin grupo asignado'}
                        ${a.observacion ? `· <em>${a.observacion}</em>` : ''}
                    </div>
                </div>
                <span class="est-estado-badge ${badgeClase[a.estado] ?? 'badge-activo'}">
                    ${badgeTxt[a.estado] ?? a.estado}
                </span>
                <div style="display:flex;gap:6px;flex-shrink:0;margin-left:8px">
                    <button class="btn-accion btn-editar"
                            onclick="abrirEditarEa(${a.id})"
                            title="Editar estado">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-accion btn-eliminar"
                            onclick="quitarEstudiante(${a.id})"
                            title="Quitar">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    /* ── Modal Agregar ───────────────────────────────────── */
    let _modalAgregarBS = null;
    let _selAgregar = new Set();
    let _todosAgregar = [];
    let _debBusq;

    function abrirModalAgregar() {
        _selAgregar.clear();
        _todosAgregar = [];
        document.getElementById('inputBuscarAgregar').value = '';
        document.getElementById('listaBuscarAgregar').innerHTML =
            '<p class="text-center text-muted py-3">Escribe para buscar…</p>';
        document.getElementById('btnConfirmarAgregar').disabled = true;
        actualizarContadorAgregar();

        if (!_modalAgregarBS)
            _modalAgregarBS = new bootstrap.Modal(document.getElementById('modalAgregar'));
        _modalAgregarBS.show();
        buscarParaAgregar('');
    }

    async function buscarParaAgregar() {
        clearTimeout(_debBusq);
        const termino = document.getElementById('inputBuscarAgregar').value;
        const edad = document.getElementById('selEdadAgregar').value;

        _debBusq = setTimeout(async () => {
            const {
                data
            } = await apiFetch(`${URL_BUSCAR}?anio=${ANIO_LECTIVO}&q=${encodeURIComponent(termino)}`);
            if (!data.ok) return;
                        _todosAgregar = data.estudiantes;
            _todosAgregar = _todosAgregar.map(e => ({
                ...e,
                edad: calcularEdad(e.fecha_nacimiento)
            }));

            if (edad) {
                _todosAgregar = _todosAgregar.filter(e => e.edad >= edad.split('-')[0] && e.edad <= edad.split('-')[1]);
            }
            renderBuscarLista();
        }, 250);
    }

    function calcularEdad(fechaNacimiento) {
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);

        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();

        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        return edad;
    }

    function renderBuscarLista() {
        const cont = document.getElementById('listaBuscarAgregar');
        if (!_todosAgregar.length) {
            cont.innerHTML = '<p class="text-center text-muted py-3">Sin resultados.</p>';
            return;
        }
        cont.innerHTML = _todosAgregar.map(e => `
        <label class="busq-fila ${_selAgregar.has(e.id) ? 'marcado' : ''}"
               data-id="${e.id}"
               onclick="seleccionarEstudiante(${e.id}, this)">
            <input type="checkbox" class="busq-check" ${_selAgregar.has(e.id) ? 'checked' : ''}
                   onclick="event.stopPropagation();seleccionarEstudiante(${e.id},this.closest('.busq-fila'))">
            <div class="avatar-est" style="background:${e.color_avatar};width:32px;height:32px;font-size:.75rem">
                ${e.iniciales.substring(0,2).toUpperCase()}
            </div>
            <div>
                <div style="font-weight:600;font-size:.88rem;color:#1E293B">${e.nombre} (${e.edad} años)</div>
                <div style="font-size:.75rem;color:#64748B">${e.grado_grupo ?? 'Sin grupo'}</div>
            </div>
        </label>
    `).join('');
    }

    function seleccionarEstudiante(id, fila) {
        const chk = fila.querySelector('.busq-check');
        if (_selAgregar.has(id)) {
            _selAgregar.delete(id);
            fila.classList.remove('marcado');
            if (chk) chk.checked = false;
        } else {
            _selAgregar.add(id);
            fila.classList.add('marcado');
            if (chk) chk.checked = true;
        }
        actualizarContadorAgregar();
    }

    function actualizarContadorAgregar() {
        const n = _selAgregar.size;
        document.getElementById('contadorAgregar').textContent = `${n} seleccionado(s)`;
        document.getElementById('btnConfirmarAgregar').disabled = n === 0;
    }

    async function confirmarAgregar() {
        const btn = document.getElementById('btnConfirmarAgregar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Asignando…';

        const {
            data
        } = await apiFetch(URL_STORE, 'POST', {
            estudiante_ids: [..._selAgregar],
            anio_lectivo: ANIO_LECTIVO,
        });

        btn.disabled = false;
        btn.innerHTML = 'Asignar seleccionados';

        if (data.ok) {
            _modalAgregarBS.hide();
            mostrarToast('success', data.mensaje);
            cargarLista();
        } else {
            mostrarToast('error', data.mensaje ?? 'Error al asignar.');
        }
    }

    /* ── Editar estado de asignación ─────────────────────── */
    let _modalEstadoEaBS = null,
        _eaEditId = null,
        _eaData   = {};

    function abrirEditarEa(id) {
        const d = _eaData[id];
        _eaEditId = id;
        document.getElementById('ctxEstadoEa').textContent = d.nombre;
        document.getElementById('selEstadoEa').value = d.estado;
        document.getElementById('txtObsEa').value = d.observacion ?? '';

        if (!_modalEstadoEaBS)
            _modalEstadoEaBS = new bootstrap.Modal(document.getElementById('modalEstadoEa'));
        _modalEstadoEaBS.show();
    }

    async function guardarEstadoEa() {
        const btn = document.getElementById('btnGuardarEstadoEa');
        btn.disabled = true;
        const url = URL_UPDATE.replace(':ea', _eaEditId);
        const {
            data
        } = await apiFetch(url, 'PATCH', {
            estado: document.getElementById('selEstadoEa').value,
            observacion: document.getElementById('txtObsEa').value || null,
        });
        btn.disabled = false;
        if (data.ok) {
            _modalEstadoEaBS.hide();
            mostrarToast('success', data.mensaje);
            cargarLista();
        } else {
            mostrarToast('error', data.mensaje ?? 'Error.');
        }
    }

    /* ── Quitar estudiante ───────────────────────────────── */
    async function quitarEstudiante(id) {
        const nombre = _eaData[id]?.nombre ?? '';
        const {
            isConfirmed
        } = await Swal.fire({
            title: '¿Quitar del ambiente?',
            text: `"${nombre}" no podrá acceder a este ambiente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#94A3B8',
        });
        if (!isConfirmed) return;

        const url = URL_DESTROY.replace(':ea', id);
        const {
            data
        } = await apiFetch(url, 'DELETE');
        if (data.ok) {
            const row = document.getElementById(`ea-row-${id}`);
            if (row) {
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                }, 200);
            }
            mostrarToast('success', data.mensaje);
        } else {
            mostrarToast('error', data.mensaje ?? 'Error.');
        }
    }

    document.addEventListener('DOMContentLoaded', cargarLista);
</script>
@endpush