@extends('layouts.admin')
@section('title', 'Cierre de Año Lectivo')

@push('styles')
<style>
    /* ── Wizard indicator ─────────────────────────────── */
    .wizard-bar {
        display: flex;
        align-items: center;
        margin-bottom: 32px;
    }

    .wz-step {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .wz-circle {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: .9rem;
        flex-shrink: 0;
        transition: all .25s;
    }

    .wz-circle.pend {
        background: #E2E8F0;
        color: #94A3B8;
    }

    .wz-circle.on {
        background: #2563EB;
        color: #fff;
        box-shadow: 0 0 0 4px #BFDBFE;
    }

    .wz-circle.done {
        background: #22C55E;
        color: #fff;
    }

    .wz-label {
        font-size: .8rem;
        font-weight: 600;
        color: #94A3B8;
        transition: color .2s;
        white-space: nowrap;
    }

    .wz-label.on {
        color: #1E293B;
    }

    .wz-label.done {
        color: #16A34A;
    }

    .wz-line {
        flex: 1;
        height: 2px;
        background: #E2E8F0;
        margin: 0 10px;
        transition: background .3s;
    }

    .wz-line.done {
        background: #22C55E;
    }

    /* ── Cards ─────────────────────────────────────────── */
    .c-card {
        background: #fff;
        border: 1px solid #E2E8F0;
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 0;
    }

    .c-head {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 22px;
    }

    .c-head-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: .95rem;
        flex-shrink: 0;
    }

    /* ── Student rows (paso 2) ──────────────────────────── */
    .est-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 14px;
        border-bottom: 1px solid #F1F5F9;
        cursor: pointer;
        transition: background .1s;
        user-select: none;
    }

    .est-row:last-child {
        border-bottom: none;
    }

    .est-row:hover {
        background: #F8FAFC;
    }

    .est-row.marcado {
        background: #EFF6FF;
    }

    .est-chk {
        width: 16px;
        height: 16px;
        accent-color: #2563EB;
        flex-shrink: 0;
    }

    .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: .8rem;
        flex-shrink: 0;
    }

    .est-nom {
        font-weight: 600;
        color: #1E293B;
        font-size: .9rem;
    }

    /* ── Student mini (paso 3) ──────────────────────────── */
    .est-mini {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 14px;
        border-bottom: 1px solid #F8FAFC;
    }

    .est-mini:last-child {
        border-bottom: none;
    }

    /* ── Dest summary ───────────────────────────────────── */
    .dest-resumen {
        background: #F0FDF4;
        border: 1px solid #BBF7D0;
        border-radius: 10px;
        padding: 14px 16px;
        font-size: .84rem;
        color: #166534;
        display: none;
        margin-top: 14px;
    }

    /* ── Result ─────────────────────────────────────────── */
    .result-wrap {
        text-align: center;
        padding: 52px 24px;
    }

    .result-ico {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        background: #ECFDF5;
        color: #059669;
        font-size: 2rem;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .result-tit {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 8px;
    }

    .result-det {
        font-size: .88rem;
        color: #64748B;
        margin-bottom: 32px;
        line-height: 1.6;
    }

    /* ── Nav buttons ────────────────────────────────────── */
    .wizard-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
    }

    .btn-volver {
        background: #F1F5F9;
        color: #475569;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 8px 18px;
        font-size: .88rem;
        cursor: pointer;
        font-family: 'Nunito', sans-serif;
        font-weight: 600;
        transition: all .15s;
    }

    .btn-volver:hover {
        background: #E2E8F0;
    }

    /* ── Responsive paso 3 ──────────────────────────────── */
    .p3-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    @media (max-width:860px) {
        .p3-grid {
            grid-template-columns: 1fr;
        }
    }

    .campo-error {
        font-size: .76rem;
        color: #DC2626;
        margin-top: 3px;
        min-height: 16px;
    }
</style>
@endpush

@section('content')

{{-- PAGE HEADER --}}
<div class="page-header" style="margin-bottom:28px">
    <div>
        <h1>Cierre de Año Lectivo</h1>
        <p>Promover, graduar o retirar estudiantes y crear matrículas para el siguiente año.</p>
    </div>
</div>

{{-- WIZARD INDICATOR --}}
<div class="wizard-bar">
    <div class="wz-step">
        <div class="wz-circle on" id="wc1">1</div>
        <span class="wz-label on" id="wl1">Configurar</span>
    </div>
    <div class="wz-line" id="wln1"></div>
    <div class="wz-step">
        <div class="wz-circle pend" id="wc2">2</div>
        <span class="wz-label" id="wl2">Estudiantes</span>
    </div>
    <div class="wz-line" id="wln2"></div>
    <div class="wz-step">
        <div class="wz-circle pend" id="wc3">3</div>
        <span class="wz-label" id="wl3">Confirmar</span>
    </div>
</div>

{{-- ══════════════════════════════════════════
     PASO 1 — Configurar
══════════════════════════════════════════ --}}
<div id="paso1">
    <div class="c-card">
        <div class="c-head">
            <div class="c-head-icon" style="background:#EFF6FF;color:#2563EB">
                <i class="fas fa-cog"></i>
            </div>
            Parámetros del cierre
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
            <div>
                <label class="form-label" style="font-weight:600">Año lectivo</label>
                <select id="p1Anio" class="form-select" onchange="cargarGrupos()">
                    @foreach(range($anioInicio, $anioActual) as $y)
                    <option value="{{ $y }}" {{ $y == $anioActual ? 'selected' : '' }}>
                        {{ $y }}
                    </option>
                    @endforeach
                </select>



            </div>
            <div>
                <label class="form-label" style="font-weight:600">Grupo</label>
                <select id="p1Grupo" class="form-select">
                    <option value="">Cargando…</option>
                </select>
                <div class="campo-error" id="errP1Grupo"></div>
            </div>
            <div>
                <label class="form-label" style="font-weight:600">Nuevo estado</label>
                <select id="p1Estado" class="form-select">
                    <option value="promovido">Promovido (pasa al siguiente año)</option>
                    <option value="graduado">Graduado (egresa del programa)</option>
                    <option value="retirado">Retirado</option>
                </select>
            </div>
        </div>

        <div style="margin-top:24px;text-align:right">
            <button class="btn btn-primary" id="btnVerEst" onclick="verEstudiantes()">
                Ver estudiantes <i class="fas fa-arrow-right ms-1"></i>
            </button>
        </div>
    </div>
</div>

{{-- ══════════════════════════════════════════
     PASO 2 — Seleccionar estudiantes
══════════════════════════════════════════ --}}
<div id="paso2" style="display:none">
    <div class="c-card">
        <div class="c-head">
            <div class="c-head-icon" style="background:#EFF6FF;color:#2563EB">
                <i class="fas fa-users"></i>
            </div>
            <div style="flex:1">
                <div id="p2Titulo">Estudiantes del grupo</div>
                <div id="p2Sub" style="font-size:.78rem;font-weight:400;color:#64748B"></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-left:auto">
                <span id="p2Cont" style="font-size:.82rem;color:#64748B">0 seleccionados</span>
                <button class="btn btn-sm"
                    style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;white-space:nowrap"
                    id="btnToggleAll" onclick="toggleTodosP2()">
                    Todos
                </button>
            </div>
        </div>

        <div id="listaP2"
            style="border:1px solid #E2E8F0;border-radius:12px;max-height:440px;overflow-y:auto">
            <p class="text-center text-muted py-4">
                <i class="fas fa-spinner fa-spin me-2"></i>Cargando…
            </p>
        </div>
    </div>

    <div class="wizard-nav">
        <button class="btn-volver" onclick="irPaso(1)">
            <i class="fas fa-arrow-left me-1"></i> Volver
        </button>
        <button class="btn btn-primary" id="btnA3" onclick="irPaso(3)" disabled>
            Siguiente <i class="fas fa-arrow-right ms-1"></i>
        </button>
    </div>
</div>

{{-- ══════════════════════════════════════════
     PASO 3 — Confirmar / Destino
══════════════════════════════════════════ --}}
<div id="paso3" style="display:none">
    <div class="p3-grid">

        {{-- Lista de seleccionados --}}
        <div class="c-card">
            <div class="c-head">
                <div class="c-head-icon" style="background:#F1F5F9;color:#475569">
                    <i class="fas fa-list-check"></i>
                </div>
                <span id="p3TituloLista">Estudiantes seleccionados</span>
            </div>
            <div id="listaP3"
                style="border:1px solid #E2E8F0;border-radius:10px;
                        max-height:400px;overflow-y:auto">
            </div>
        </div>

        {{-- Panel derecho: destino (promovido) o confirmación --}}
        <div class="c-card" id="p3Panel">
            {{-- contenido dinámico según estado --}}
        </div>

    </div>

    <div class="wizard-nav">
        <button class="btn-volver" onclick="irPaso(2)">
            <i class="fas fa-arrow-left me-1"></i> Volver
        </button>
        <button class="btn btn-primary" id="btnConfirmar" onclick="confirmarCierre()" disabled>
            <i class="fas fa-check me-1"></i> Confirmar cierre
        </button>
    </div>
</div>

{{-- ══════════════════════════════════════════
     RESULTADO
══════════════════════════════════════════ --}}
<div id="pasoRes" style="display:none">
    <div class="c-card result-wrap">
        <div class="result-ico"><i class="fas fa-check"></i></div>
        <div class="result-tit">Cierre aplicado correctamente</div>
        <div class="result-det" id="resDet"></div>
        <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn-volver" onclick="nuevoCierre()">
                <i class="fas fa-rotate-left me-1"></i> Nuevo cierre
            </button>
            <a href="{{ route('admin.matriculas.index') }}" class="btn btn-primary">
                <i class="fas fa-graduation-cap me-1"></i> Ver matrículas
            </a>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script>
    const URL_GRUPOS_CIERRE = "{{ route('admin.cierre.grupos') }}";
    const URL_EST_CIERRE = "{{ route('admin.cierre.estudiantes') }}";
    const URL_APLICAR_CIERRE = "{{ route('admin.cierre.aplicar') }}";
    const URL_GRUPOS_DISP = "{{ route('admin.matriculas.grupos') }}";

    /* ── State ──────────────────────────────────────── */
    let _anio = {{ date('Y') }};
    let _grupoId = null;
    let _grupoLabel = '';
    let _estado = 'promovido';
    let _ests = []; // [{matricula_id, nombre, iniciales, color_avatar}]
    let _sel = new Set(); // matricula_ids seleccionadas
    let _grados = []; // grados destino
    let _grupoDestId = null;
    let _anioDestino = {{ date('Y') + 1 }};

    /* ── AJAX helper ────────────────────────────────── */
    async function api(url, method = 'GET', body = null) {
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
            const r = await fetch(url, opts);
            return {
                status: r.status,
                data: await r.json()
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

    /* ── Wizard indicator ───────────────────────────── */
    function indicador(paso) {
        [1, 2, 3].forEach(n => {
            const c = document.getElementById(`wc${n}`);
            const l = document.getElementById(`wl${n}`);
            if (n < paso) {
                c.className = 'wz-circle done';
                c.innerHTML = '<i class="fas fa-check"></i>';
                l.className = 'wz-label done';
            } else if (n === paso) {
                c.className = 'wz-circle on';
                c.innerHTML = n;
                l.className = 'wz-label on';
            } else {
                c.className = 'wz-circle pend';
                c.innerHTML = n;
                l.className = 'wz-label';
            }
        });
        document.getElementById('wln1').className = 'wz-line' + (paso > 1 ? ' done' : '');
        document.getElementById('wln2').className = 'wz-line' + (paso > 2 ? ' done' : '');
    }

    /* ── Navigation ─────────────────────────────────── */
    const PASOS = ['paso1', 'paso2', 'paso3', 'pasoRes'];

    async function irPaso(n) {
        PASOS.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.style.display = (i + 1 === n) ? '' : 'none';
        });
        indicador(n);
        if (n === 2) renderP2();
        if (n === 3) await renderP3();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /* ══════════════════════════════════════════════════
       PASO 1
    ══════════════════════════════════════════════════ */
    async function cargarGrupos() {
        _anio = parseInt(document.getElementById('p1Anio').value);
        const sel = document.getElementById('p1Grupo');
        sel.innerHTML = '<option value="">Cargando…</option>';
        const {
            data
        } = await api(`${URL_GRUPOS_CIERRE}?anio=${_anio}`);
        if (!data.ok || !data.grupos.length) {
            sel.innerHTML = '<option value="">Sin grupos con alumnos activos</option>';
            return;
        }
        sel.innerHTML = '<option value="">— Seleccionar grupo —</option>' +
            data.grupos.map(g => `<option value="${g.id}">${g.label}</option>`).join('');
    }

    async function verEstudiantes() {
        const grupoSel = document.getElementById('p1Grupo');
        const errEl = document.getElementById('errP1Grupo');

        _grupoId = parseInt(grupoSel.value);
        _grupoLabel = grupoSel.selectedOptions[0]?.text ?? '';
        _estado = document.getElementById('p1Estado').value;
        _anio = parseInt(document.getElementById('p1Anio').value);

        if (!_grupoId) {
            errEl.textContent = 'Selecciona un grupo.';
            return;
        }
        errEl.textContent = '';

        const btn = document.getElementById('btnVerEst');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Cargando…';

        const {
            data
        } = await api(`${URL_EST_CIERRE}?anio=${_anio}&grupo_id=${_grupoId}`);

        btn.disabled = false;
        btn.innerHTML = 'Ver estudiantes <i class="fas fa-arrow-right ms-1"></i>';

        if (!data.ok) {
            mostrarToast('error', data.mensaje ?? 'Error.');
            return;
        }
        if (!data.estudiantes.length) {
            mostrarToast('info', 'No hay estudiantes activos en este grupo.');
            return;
        }

        _ests = data.estudiantes;
        _ests = _ests.map(e => ({
            ...e,
            edad: calcularEdad(e.fecha_nacimiento)
        }));

        console.log(_ests);
        _sel = new Set(_ests.map(e => e.matricula_id)); // todos seleccionados por defecto
        irPaso(2);
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

    /* ══════════════════════════════════════════════════
       PASO 2 — Lista estudiantes
    ══════════════════════════════════════════════════ */
    const ESTADO_BADGE = {
        promovido: {
            bg: '#EFF6FF',
            color: '#1D4ED8',
            txt: 'Promovido'
        },
        graduado: {
            bg: '#FEF3C7',
            color: '#92400E',
            txt: 'Graduado'
        },
        retirado: {
            bg: '#FEF2F2',
            color: '#991B1B',
            txt: 'Retirado'
        },
    };

    function renderP2() {
        const b = ESTADO_BADGE[_estado];
        document.getElementById('p2Titulo').textContent = _grupoLabel;
        document.getElementById('p2Sub').innerHTML =
            `Nuevo estado: <span style="background:${b.bg};color:${b.color};
            padding:1px 10px;border-radius:99px;font-size:.72rem;font-weight:700">
            ${b.txt}</span> · Año ${_anio}`;

        document.getElementById('listaP2').innerHTML = _ests.map(e => `
        <label class="est-row ${_sel.has(e.matricula_id) ? 'marcado' : ''}"
               onclick="toggleEst(${e.matricula_id}, this)">
            <input type="checkbox" class="est-chk"
                   ${_sel.has(e.matricula_id) ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleEst(${e.matricula_id}, this.closest('.est-row'))">
            <div class="avatar" style="background:${e.color_avatar}">
                ${e.iniciales.substring(0,2).toUpperCase()}
            </div>
            <span class="est-nom">${e.nombre} (${e.edad} años)</span>
        </label>
    `).join('');

        actualizarContP2();
    }

    function toggleEst(id, fila) {
        const chk = fila.querySelector('.est-chk');
        if (_sel.has(id)) {
            _sel.delete(id);
            fila.classList.remove('marcado');
            if (chk) chk.checked = false;
        } else {
            _sel.add(id);
            fila.classList.add('marcado');
            if (chk) chk.checked = true;
        }
        actualizarContP2();
    }

    function toggleTodosP2() {
        const todos = _ests.every(e => _sel.has(e.matricula_id));
        _ests.forEach(e => {
            if (todos) _sel.delete(e.matricula_id);
            else _sel.add(e.matricula_id);
        });
        renderP2();
    }

    function actualizarContP2() {
        const n = _sel.size,
            tot = _ests.length;
        document.getElementById('p2Cont').textContent = `${n} de ${tot} seleccionados`;
        document.getElementById('btnA3').disabled = n === 0;
        document.getElementById('btnToggleAll').textContent =
            _ests.every(e => _sel.has(e.matricula_id)) ? 'Ninguno' : 'Todos';
    }

    /* ══════════════════════════════════════════════════
       PASO 3 — Confirmar
    ══════════════════════════════════════════════════ */
    async function renderP3() {
        const selEsts = _ests.filter(e => _sel.has(e.matricula_id));

        document.getElementById('p3TituloLista').textContent =
            `Estudiantes seleccionados (${selEsts.length})`;

        document.getElementById('listaP3').innerHTML = selEsts.map(e => `
        <div class="est-mini">
            <div class="avatar" style="background:${e.color_avatar};width:30px;height:30px;font-size:.72rem">
                ${e.iniciales.substring(0,2).toUpperCase()}
            </div>
            <span style="font-size:.87rem;font-weight:600;color:#1E293B">${e.nombre} (${e.edad} años)</span>
        </div>
    `).join('');

        const panel = document.getElementById('p3Panel');
        const btn = document.getElementById('btnConfirmar');
        btn.disabled = true;
        _grupoDestId = null;

        if (_estado === 'promovido') {
            _anioDestino = _anio + 1;
            const aniosOpts = [_anio, _anio + 1, _anio + 2]
                .map(y => `<option value="${y}" ${y === _anioDestino ? 'selected' : ''}>${y}</option>`)
                .join('');

            panel.innerHTML = `
            <div class="c-head">
                <div class="c-head-icon" style="background:#F0FDF4;color:#16A34A">
                    <i class="fas fa-arrow-trend-up"></i>
                </div>
                Matrícula para el siguiente año
            </div>
            <div class="mb-3">
                <label class="form-label" style="font-weight:600">Año lectivo destino</label>
                <select id="p3AnioD" class="form-select" onchange="cambiarAnioD()">
                    ${aniosOpts}
                </select>
            </div>
            <div class="mb-3">
                <label class="form-label" style="font-weight:600">Grado destino</label>
                <select id="p3Grado" class="form-select" onchange="cargarGruposD()">
                    <option value="">Cargando…</option>
                </select>
            </div>
            <div class="mb-3" id="p3GrupoWrap" style="display:none">
                <label class="form-label" style="font-weight:600">Grupo destino</label>
                <select id="p3Grupo" class="form-select" onchange="actualizarResumen()">
                    <option value="">— Seleccionar grupo —</option>
                </select>
            </div>
            <div class="dest-resumen" id="destResumen"></div>
        `;
            await cargarGradosD();
        } else {
            // Graduado o retirado — sin grupo destino
            const estadoTxt = _estado === 'graduado' ? 'graduados' : 'retirados';
            const icono = _estado === 'graduado' ? 'fa-graduation-cap' : 'fa-door-open';
            const [bg, border, color] = _estado === 'graduado' ? ['#FEF3C7', '#FCD34D', '#92400E'] : ['#FEF2F2', '#FECACA', '#991B1B'];

            panel.innerHTML = `
            <div class="c-head">
                <div class="c-head-icon" style="background:${bg};color:${color}">
                    <i class="fas ${icono}"></i>
                </div>
                Confirmación
            </div>
            <div style="background:${bg};border:1px solid ${border};border-radius:12px;
                        padding:18px;font-size:.88rem;color:${color};line-height:1.7">
                <i class="fas fa-info-circle me-2"></i>
                Los <strong>${selEsts.length} estudiante(s)</strong> listados serán marcados
                como <strong>${estadoTxt}</strong>, con fecha de egreso de hoy
                (<strong>{{ now()->format('d/m/Y') }}</strong>).
                <br><br>
                No se crearán nuevas matrículas para el año siguiente.
            </div>
        `;
            btn.disabled = false;
        }
    }

    /* ── Destino (promovido) ─────────────────────────── */
    async function cargarGradosD() {
        _anioDestino = parseInt(document.getElementById('p3AnioD')?.value ?? (_anio + 1));
        _grupoDestId = null;
        document.getElementById('btnConfirmar').disabled = true;

        const gradoSel = document.getElementById('p3Grado');
        if (!gradoSel) return;
        gradoSel.innerHTML = '<option value="">Cargando…</option>';

        const grupoW = document.getElementById('p3GrupoWrap');
        const resumen = document.getElementById('destResumen');
        if (grupoW) grupoW.style.display = 'none';
        if (resumen) resumen.style.display = 'none';

        const {
            data
        } = await api(`${URL_GRUPOS_DISP}?anio=${_anioDestino}`);
        if (!data.ok) {
            gradoSel.innerHTML = '<option value="">Error al cargar grados</option>';
            return;
        }
        _grados = data.grados;
        gradoSel.innerHTML = '<option value="">— Seleccionar grado —</option>' +
            _grados.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
    }

    async function cambiarAnioD() {
        await cargarGradosD();
    }

    function cargarGruposD() {
        const gradoId = parseInt(document.getElementById('p3Grado').value);
        const grupoW = document.getElementById('p3GrupoWrap');
        const resumen = document.getElementById('destResumen');
        _grupoDestId = null;
        document.getElementById('btnConfirmar').disabled = true;
        if (resumen) resumen.style.display = 'none';

        if (!gradoId) {
            if (grupoW) grupoW.style.display = 'none';
            return;
        }

        const grado = _grados.find(g => g.id === gradoId);
        if (!grado || !grado.grupos.length) {
            if (grupoW) grupoW.style.display = 'none';
            return;
        }

        const sel = document.getElementById('p3Grupo');
        sel.innerHTML = '<option value="">— Seleccionar grupo —</option>' +
            grado.grupos.map(g =>
                `<option value="${g.id}">Grupo ${g.nombre} · ${g.cupo_disponible}/${g.cupo_maximo} cupos</option>`
            ).join('');
        if (grupoW) grupoW.style.display = '';
    }

    function actualizarResumen() {
        const gradoId = parseInt(document.getElementById('p3Grado').value);
        const grupoId = parseInt(document.getElementById('p3Grupo').value);
        const resumen = document.getElementById('destResumen');
        _grupoDestId = null;
        document.getElementById('btnConfirmar').disabled = true;

        if (!gradoId || !grupoId) {
            if (resumen) resumen.style.display = 'none';
            return;
        }

        const grado = _grados.find(g => g.id === gradoId);
        const grupo = grado?.grupos.find(g => g.id === grupoId);
        if (!grado || !grupo) {
            if (resumen) resumen.style.display = 'none';
            return;
        }

        _grupoDestId = grupoId;
        const n = _sel.size;
        const sinCupo = grupo.cupo_disponible < n;

        resumen.style.display = '';
        resumen.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        <strong>${n}</strong> estudiante(s) se matricularán en
        <strong>${grado.nombre} — Grupo ${grupo.nombre}</strong>,
        año <strong>${_anioDestino}</strong>.
        ${sinCupo
            ? `<br><br><i class="fas fa-exclamation-triangle me-1"
               style="color:#B45309"></i><span style="color:#B45309">
               Solo hay ${grupo.cupo_disponible} cupo(s) disponibles — algunos podrían
               quedar sin matrícula.</span>`
            : ''}
    `;
        document.getElementById('btnConfirmar').disabled = false;
    }

    /* ══════════════════════════════════════════════════
       CONFIRMAR
    ══════════════════════════════════════════════════ */
    async function confirmarCierre() {
        const estadoTxt = {
            promovido: 'promovidos',
            graduado: 'graduados',
            retirado: 'retirados'
        } [_estado];
        const {
            isConfirmed
        } = await Swal.fire({
            title: '¿Confirmar cierre?',
            html: `<strong>${_sel.size}</strong> estudiante(s) serán marcados como
               <strong>${estadoTxt}</strong>.<br>Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#94A3B8',
        });
        if (!isConfirmed) return;

        const btn = document.getElementById('btnConfirmar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aplicando…';

        const payload = {
            matricula_ids: [..._sel],
            estado: _estado
        };
        if (_estado === 'promovido') {
            payload.grupo_destino_id = _grupoDestId;
            payload.anio_destino = _anioDestino;
        }

        const {
            data
        } = await api(URL_APLICAR_CIERRE, 'POST', payload);

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check me-1"></i> Confirmar cierre';

        if (data.ok) {
            mostrarResultado(data.mensaje);
        } else {
            mostrarToast('error', data.mensaje ?? 'Error al aplicar el cierre.');
        }
    }

    function mostrarResultado(msg) {
        PASOS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        // Todas las líneas verdes
        [1, 2, 3].forEach(n => {
            const c = document.getElementById(`wc${n}`);
            c.className = 'wz-circle done';
            c.innerHTML = '<i class="fas fa-check"></i>';
            document.getElementById(`wl${n}`).className = 'wz-label done';
        });
        document.getElementById('wln1').className = 'wz-line done';
        document.getElementById('wln2').className = 'wz-line done';

        document.getElementById('resDet').textContent = msg;
        document.getElementById('pasoRes').style.display = '';
    }

    /* ── Reset ───────────────────────────────────────── */
    function nuevoCierre() {
        _ests = [];
        _sel.clear();
        _grados = [];
        _grupoDestId = null;
        PASOS.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        document.getElementById('paso1').style.display = '';
        indicador(1);
        document.getElementById('p1Grupo').innerHTML = '<option value="">Cargando…</option>';
        cargarGrupos();
    }

    /* ── Init ────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', cargarGrupos);
</script>
@endpush