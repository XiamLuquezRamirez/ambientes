<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Ambiente</th><th>Estado</th><th>Acciones</th>
            </tr>
        </thead>
        <tbody>
        @forelse($docentes as $d)
            <tr id="fila-{{ $d->id }}">
                <td style="font-weight:600;color:#1E293B">{{ $d->nombre }}</td>
                <td style="color:#64748B">{{ $d->email }}</td>
                <td>
                    <span class="badge badge-yellow">
                        {{ ['admin'=>'Administrador','docente_lider'=>'Docente Líder','docente_auxiliar'=>'Docente Auxiliar'][$d->rol] ?? $d->rol }}
                    </span>
                </td>
                <td>{{ $d->docente?->ambiente?->nombre ?? '—' }}</td>
                <td>
                    <span class="badge {{ $d->activo ? 'badge-green' : 'badge-red' }}">
                        {{ $d->activo ? 'Activo' : 'Inactivo' }}
                    </span>
                </td>
                <td>
                    <div class="tabla-acciones">
                        <a href="{{ route('admin.docentes.edit', $d->id) }}" class="btn-accion btn-editar">✏️ Editar</a>
                        <button type="button" class="btn-accion btn-eliminar"
                                data-id="{{ $d->id }}"
                                data-nombre="{{ e($d->nombre) }}">
                            🗑️ Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        @empty
            <tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">Sin docentes registrados</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
{{ $docentes->links('vendor.pagination.proyecto') }}
