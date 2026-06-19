<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Estudiante</th>
                <th>Grado / Grupo</th>
                <th>Año</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($matriculas as $m)
            <tr id="fila-mat-{{ $m->id }}">
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:34px;height:34px;border-radius:50%;background:{{ $m->estudiante->color_avatar ?? '#2563EB' }};
                                    display:flex;align-items:center;justify-content:center;
                                    color:#fff;font-weight:700;font-size:.8rem;flex-shrink:0">
                            {{ $m->estudiante->iniciales ?? mb_substr($m->estudiante->nombre, 0, 2) }}
                        </div>
                        <span style="font-weight:600;color:#1E293B">{{ $m->estudiante->nombre }}</span>
                    </div>
                </td>
                <td style="color:#475569">
                    {{ $m->grado?->nombre ?? '—' }}
                    <span style="background:#F1F5F9;border-radius:4px;padding:1px 6px;font-size:.78rem;margin-left:4px">
                        {{ $m->grupo?->nombre ?? '—' }}
                    </span>
                </td>
                <td style="color:#64748B">{{ $m->anio_lectivo }}</td>
                <td style="color:#64748B;font-size:.83rem">
                    {{ $m->fecha_ingreso ? $m->fecha_ingreso->format('d/m/Y') : '—' }}
                </td>
                <td>
                    @php
                        $estadoMap = [
                            'activo'   => ['badge-green', 'Activo'],
                            'promovido'=> ['badge-blue',  'Promovido'],
                            'graduado' => ['badge-yellow','Graduado'],
                            'retirado' => ['badge-red',   'Retirado'],
                        ];
                        [$cls, $lbl] = $estadoMap[$m->estado] ?? ['badge-yellow', $m->estado];
                    @endphp
                    <span class="badge {{ $cls }}">{{ $lbl }}</span>
                </td>
                <td>
                    <div class="tabla-acciones">
                        <button class="btn-accion btn-editar"
                                onclick="abrirEditarMatricula({{ $m->id }})"
                                title="Cambiar grupo">
                            <i class="fa-solid fa-pencil"></i> Editar
                        </button>
                        <button class="btn-accion"
                                onclick="abrirEstadoMatricula({{ $m->id }}, '{{ $m->estado }}')"
                                title="Cambiar estado"
                                style="background:#F5F3FF;border:1px solid #DDD6FE;color:#5B21B6;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:.75rem">
                            <i class="fa-solid fa-arrow-right-arrow-left"></i>
                        </button>
                        <button class="btn-accion btn-eliminar"
                                onclick="eliminarMatricula({{ $m->id }}, '{{ addslashes($m->estudiante->nombre) }}')"
                                title="Eliminar matrícula">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="6" style="text-align:center;color:#94A3B8;padding:40px">
                    <i class="fas fa-graduation-cap" style="font-size:2rem;margin-bottom:8px;display:block;opacity:.4"></i>
                    Sin matrículas registradas
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $matriculas->links('vendor.pagination.proyecto') }}
