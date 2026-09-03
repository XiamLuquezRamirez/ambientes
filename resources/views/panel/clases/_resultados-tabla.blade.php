<div class="table-container">
    <table>
        <thead>
            <tr>
                @if ($mostrarEstudiante ?? false)
                    <th>Estudiante</th>
                @endif
                @if ($mostrarExperiencia ?? true)
                    <th>Experiencia</th>
                @endif
                <th>Bloque</th>
                <th>Resumen</th>
                <th>Estado</th>
                <th>Archivo</th>
                <th>Fecha</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($resultados as $resultado)
                @include('panel.clases._resultado-fila', [
                    'resultado' => $resultado,
                    'resumenes' => $resumenes,
                    'panelService' => $panelService,
                    'mostrarEstudiante' => $mostrarEstudiante ?? false,
                    'mostrarExperiencia' => $mostrarExperiencia ?? true,
                    'mostrarMiniatura' => $mostrarMiniatura ?? false,
                ])
            @empty
                <tr>
                    <td colspan="{{ ($mostrarEstudiante ?? false) ? 7 : 6 }}" style="text-align:center;color:#64748B;padding:28px">
                        {{ $mensajeVacio ?? 'Aún no hay resultados registrados para esta clase.' }}
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>
