@push('scripts')
    <script>
        $(document).on("click", ".tblm-button", function (e) {
            e.stopPropagation();
            const $menu = $(this).next(".tblm-menu");
            const abierto = $menu.hasClass("tblm-show");
            $(".tblm-menu").removeClass("tblm-show tblm-up tblm-left");

            if (abierto) {
                return;
            }

            $menu.addClass("tblm-show");

            requestAnimationFrame(() => {
                const rect = $menu[0].getBoundingClientRect();

                if (rect.bottom > window.innerHeight - 10) {
                    $menu.addClass("tblm-up");
                }

                if (rect.right > window.innerWidth - 10) {
                    $menu.addClass("tblm-left");
                }
            });
        });

        $(document).on("click", function () {
            $(".tblm-menu").removeClass("tblm-show tblm-up tblm-left");
        });

        $(document).on("click", ".tblm-menu", function (e) {
            e.stopPropagation();
            if ($(e.target).closest("a, button, .tblm-item").length) {
                $(this).removeClass("tblm-show tblm-up tblm-left");
            }
        });
    </script>
@endpush
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Avatar</th>
                <th>Nombre</th>
                <th>Grado</th>
                <th>Perfil de Aprendizaje</th>
                <th>Edad</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
            </tr>
        </thead>
        <tbody>
            @forelse($estudiantes as $e)
                <tr id="fila-{{ $e->id }}">
                    <td>
                        @if($e->avatar)
                            <div class="avatar-iniciales" style="background-color:{{ $e->color_avatar }}">
                                <img src="{{ asset('storage/' . $e->avatar) }}" alt="{{ $e->nombre }}" class="avatar-img">
                            </div>
                        @else
                            <div class="avatar-iniciales" style="background-color:{{ $e->color_avatar }}">{{ $e->iniciales }}</div>
                        @endif
                    </td>
                    <td style="text-transform: capitalize;">{{ $e->nombre }} {{ $e->apellido }}</td>
                    <td>{{ $e->grado?->nombre }}</td>
                    <td>{{ $e->condicion?->nombre }}</td>
                    <td>{{ $e->edad ? $e->edad . ' Años' : 'N/A' }}</td>
                    <td>
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="form-check form-switch">
                                <input onchange="cambiarEstadoEstudiante('{{ $e->id }}', this)" {{ $e->activo == 1 ? 'checked' : '' }} class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault">
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="tblm-container">
                            <button class="tblm-button">
                                <i class="fa-solid fa-ellipsis"></i>
                            </button>
                            <div class="tblm-menu p2">
                                <a href="#" onclick="abrirModalEditarEstudiante('{{ $e->id }}')" class="btn-accion btn-editar tblm-item">
                                    <i class="fa-solid fa-pencil"></i>
                                    Editar
                                </a>
                                @if($e->requiere_apoyo == "si" && $e->piar == null)
                                    <a href="{{ route('admin.estudiantes.diligenciar-piar', ['idEstudiante' => $e->id, 'tipo' => 'nuevo']) }}" class="btn-accion btn-warning tblm-item">
                                        <i class="fa-solid fa-file-pen"></i>
                                        Diligenciar PIAR
                                    </a>
                                @elseif($e->piar != null && ($e->piar->paso > 0 && $e->piar->paso < 8))
                                    <a href="{{ route('admin.estudiantes.diligenciar-piar', ['idEstudiante' => $e->id, 'tipo' => 'nuevo']) }}" class="btn-accion btn-warning tblm-item">
                                        <i class="fa-solid fa-file-pen"></i>
                                        Completar PIAR
                                    </a>
                                @elseif($e->piar != null && $e->piar->paso == 8)
                                    <a href="{{ route('admin.estudiantes.diligenciar-piar', ['idEstudiante' => $e->id, 'tipo' => 'actualizar']) }}" class="btn-accion btn-info tblm-item">
                                        <i class="fa-solid fa-file-pen"></i>
                                        Actualizar PIAR
                                    </a>
                                @endif
                                @if($e->configuracionPin != null)
                                    <button type="button" class="btn-accion btn-outline-success tblm-item" onclick="confirmarRestablecerPin('{{ $e->id }}')">
                                        <i class="fa-solid fa-key"></i>
                                       restablecer PIN
                                    </button>
                                @endif
                                <button type="button" class="btn-accion btn-eliminar tblm-item" onclick="confirmarEliminacionEstudiante('{{ $e->id }}', '{{ $e->nombre }}')">
                                    <i class="fa-solid fa-trash-can"></i>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align:center;color:#94A3B8;padding:32px">Sin estudiantes registrados
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
{{ $estudiantes->links('vendor.pagination.proyecto') }}