@extends('layouts.panel')
@section('title', 'Nuevo Estudiante')
@section('content')
    <div class="page-header">
        <div>
            <h1>Agregar estudiante a mi grupo</h1>
            <p style="color:#64748B">El ambiente, grado y grupo se asignan automáticamente desde tu contexto activo.</p>
        </div>
    </div>

    <div
        style="max-width:760px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:18px;padding:24px;box-shadow:0 10px 24px rgba(15,23,42,0.05)">
        <div
            style="margin-bottom:18px;padding:14px 16px;border-radius:12px;background:#EFF6FF;border:1px solid #BFDBFE;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
                <strong style="color:#1D4ED8">Contexto activo</strong>
                <div style="color:#334155;margin-top:4px">
                    @if ($carga)
                        {{ $carga->ambiente->nombre ?? 'Ambiente' }} · {{ $carga->grado->nombre ?? 'Grado' }} ·
                        {{ $carga->grupo->nombre ?? 'Grupo' }}
                    @else
                        No hay un grupo activo disponible.
                    @endif
                </div>
            </div>
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalBuscarEstudiantes">
                <i class="fas fa-search"></i> Buscar estudiante
            </button>
        </div>

        <form method="POST" action="{{ route('panel.estudiantes.store') }}">
            @csrf
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Nombre</label>
                    <input type="text" name="nombre" class="form-control" value="{{ old('nombre') }}" required
                        autofocus>
                </div>
                <div class="col-md-6 form-group">
                    <label>Apellido</label>
                    <input type="text" name="apellido" class="form-control" value="{{ old('apellido') }}">
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Iniciales (2-3 letras)</label>
                    <input type="text" name="iniciales" class="form-control" maxlength="3"
                        value="{{ old('iniciales') }}" required placeholder="EJ: VA">
                </div>
                <div class="col-md-6 form-group">
                    <label>Tipo de identificación</label>
                    <input type="text" name="tipo_identificacion" class="form-control"
                        value="{{ old('tipo_identificacion') }}">
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 form-group">
                    <label>Identificación</label>
                    <input type="text" name="identificacion" class="form-control" value="{{ old('identificacion') }}">
                </div>
                <div class="col-md-6 form-group">
                    <label>Sexo</label>
                    <input type="text" name="sexo" class="form-control" value="{{ old('sexo') }}">
                </div>
            </div>
            <div class="form-group">
                <label>Color de avatar (HEX)</label>
                <div style="display:flex;gap:10px;align-items:center">
                    <input type="color" name="color_avatar" value="{{ old('color_avatar', '#0F6E56') }}"
                        style="width:48px;height:40px;border:none;background:none;cursor:pointer;padding:0">
                    <input type="text" id="color-text" class="form-control" value="{{ old('color_avatar', '#0F6E56') }}"
                        style="flex:1" readonly>
                    <input type="hidden" name="color_avatar" id="color-hidden"
                        value="{{ old('color_avatar', '#0F6E56') }}">
                </div>
            </div>
            <div class="form-group">
                <label>Condición</label>
                <select name="condicion" class="form-control" required>
                    @foreach ($condiciones as $c)
                        <option value="{{ $c }}" {{ old('condicion') === $c ? 'selected' : '' }}>
                            {{ str_replace('_', ' ', $c) }}</option>
                    @endforeach
                </select>
            </div>
            @if ($errors->any())
                <div
                    style="background:rgba(220,38,38,0.15);border:1px solid #DC2626;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#FCA5A5;font-size:0.85rem">
                    @foreach ($errors->all() as $error)
                        <div>{{ $error }}</div>
                    @endforeach
                </div>
            @endif
            <div style="display:flex;gap:12px;margin-top:8px">
                <button type="submit" class="btn btn-primary">Crear y asignar</button>
                <a href="{{ route('panel.estudiantes') }}" class="btn btn-secondary">Cancelar</a>
            </div>
        </form>
    </div>

    <div class="modal fade" id="modalBuscarEstudiantes" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Buscar estudiante</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body">
                    <input type="text" id="buscar-estudiantes-input" class="form-control"
                        placeholder="Buscar por nombre o apellido" />
                    <div id="resultado-busqueda-estudiantes" style="margin-top:16px;display:grid;gap:10px;"></div>
                </div>
            </div>
        </div>
    </div>

    @push('scripts')
        <script>
            document.querySelector('input[type="color"]').addEventListener('input', function() {
                document.getElementById('color-text').value = this.value;
                document.getElementById('color-hidden').value = this.value;
            });

            let paginaBusqueda = 1;
            const inputBusqueda = document.getElementById('buscar-estudiantes-input');
            const resultados = document.getElementById('resultado-busqueda-estudiantes');

            function buscarEstudiantes(page = 1) {
                const q = inputBusqueda.value.trim();
                if (!q) {
                    resultados.innerHTML = '<div style="color:#64748B">Escribe el nombre o apellido para buscar.</div>';
                    return;
                }

                fetch(`/panel/estudiantes/buscar?q=${encodeURIComponent(q)}&page=${page}`)
                    .then(res => res.json())
                    .then(data => {
                        if (!data.data || data.data.length === 0) {
                            resultados.innerHTML = '<div style="color:#64748B">No se encontraron estudiantes.</div>';
                            return;
                        }

                        resultados.innerHTML = data.data.map(estudiante => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid #E2E8F0;border-radius:12px;background:#F8FAFC;">
                    <div>
                        <strong>${estudiante.nombre || ''} ${estudiante.apellido || ''}</strong>
                        <div style="color:#64748B;font-size:0.9rem">${estudiante.condicion || 'estandar'}</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="rellenarDatos('${estudiante.nombre || ''}', '${estudiante.apellido || ''}', '${estudiante.iniciales || ''}', '${estudiante.color_avatar || '#0F6E56'}', '${estudiante.condicion || 'estandar'}')">Usar</button>
                </div>
            `).join('');

                        if (data.pagination.last_page > 1) {
                            let paginacion = '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">';
                            for (let i = 1; i <= data.pagination.last_page; i++) {
                                paginacion +=
                                    `<button type="button" class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-secondary'}" onclick="buscarEstudiantes(${i})">${i}</button>`;
                            }
                            paginacion += '</div>';
                            resultados.insertAdjacentHTML('beforeend', paginacion);
                        }
                    });
            }

            window.rellenarDatos = function(nombre, apellido, iniciales, color, condicion) {
                document.querySelector('input[name="nombre"]').value = nombre;
                document.querySelector('input[name="apellido"]').value = apellido;
                document.querySelector('input[name="iniciales"]').value = iniciales;
                document.querySelector('input[name="color_avatar"]').value = color;
                document.getElementById('color-text').value = color;
                document.getElementById('color-hidden').value = color;
                document.querySelector('select[name="condicion"]').value = condicion;
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalBuscarEstudiantes'));
                if (modal) {
                    modal.hide();
                }
            };

            inputBusqueda.addEventListener('input', function() {
                buscarEstudiantes();
            });
        </script>
    @endpush
@endsection
