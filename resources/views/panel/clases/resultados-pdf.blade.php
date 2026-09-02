<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Resultados de la clase</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #1F2937;
            font-size: 12px;
            line-height: 1.45;
        }

        h1 {
            font-size: 20px;
            margin: 0 0 4px;
            color: #111827;
        }

        .subtitle {
            color: #6B7280;
            margin-bottom: 18px;
        }

        .stats {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .stats td {
            border: 1px solid #E5E7EB;
            padding: 8px 10px;
            background: #F9FAFB;
            width: 25%;
        }

        .stats strong {
            display: block;
            font-size: 16px;
            color: #111827;
        }

        .student {
            margin-top: 18px;
            page-break-inside: avoid;
        }

        .student h2 {
            font-size: 14px;
            margin: 0 0 6px;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
        }

        .student-meta {
            color: #6B7280;
            font-size: 11px;
            margin-bottom: 8px;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
        }

        table.items th,
        table.items td {
            border: 1px solid #E5E7EB;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
        }

        table.items th {
            background: #F3F4F6;
            font-size: 11px;
        }

        .muted {
            color: #9CA3AF;
        }

        .empty {
            padding: 16px;
            text-align: center;
            color: #6B7280;
            border: 1px dashed #D1D5DB;
        }
    </style>
</head>

<body>
    <h1>Resultados de la clase</h1>
    <p class="subtitle">
        {{ $clase->nombre }}
        · {{ $clase->fecha?->format('d/m/Y') ?? 'Sin fecha' }}
        · {{ $carga->grado->nombre ?? '' }} {{ $carga->grupo->nombre ?? '' }}
        @if ($experienciaNombre)
            · {{ $experienciaNombre }}
        @endif
    </p>

    <table class="stats">
        <tr>
            <td>
                <strong>{{ $estadisticas['estudiantes_con_resultado'] }}/{{ $estadisticas['estudiantes_total'] }}</strong>
                Participación ({{ $estadisticas['participacion_pct'] }}%)
            </td>
            <td>
                <strong>{{ $estadisticas['registros_total'] }}</strong>
                Registros totales
            </td>
            <td>
                <strong>{{ $estadisticas['correctos'] }}</strong>
                Correctas
            </td>
            <td>
                <strong>{{ $estadisticas['incorrectos'] }}</strong>
                Incorrectas
            </td>
        </tr>
    </table>

    @forelse ($porEstudiante as $fila)
        @if ($fila['total'] === 0)
            @continue
        @endif
        @php
            $est = $fila['estudiante'];
            $nombre = trim(($est['nombre'] ?? '') . ' ' . ($est['apellido'] ?? ''));
        @endphp
        <div class="student">
            <h2>{{ $nombre !== '' ? $nombre : 'Estudiante #' . $est['id'] }}</h2>
            <p class="student-meta">
                {{ $fila['total'] }} registro(s)
                · {{ $fila['correctos'] }} correctas
                · {{ $fila['incorrectos'] }} incorrectas
                · {{ $fila['con_archivo'] }} con archivo
            </p>
            <table class="items">
                <thead>
                    <tr>
                        <th>Experiencia</th>
                        <th>Bloque</th>
                        <th>Resumen</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($fila['resultados'] as $resultado)
                        <tr>
                            <td>{{ $resultado->experiencia->nombre ?? '—' }}</td>
                            <td>
                                {{ $panelService->etiquetaTipoBloque($resultado->tipo_bloque, $resultado->bloque->datos ?? []) }}
                                @if ($resultado->bloque)
                                    #{{ $resultado->bloque->orden }}
                                @endif
                            </td>
                            <td>{{ $resumenes[$resultado->id] ?? '—' }}</td>
                            <td>{{ $panelService->etiquetaEstado($resultado->correcto) }}</td>
                            <td>{{ $resultado->creado_en?->format('d/m/Y H:i') ?? '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @empty
        <div class="empty">No hay resultados para exportar.</div>
    @endforelse

    @if ($porEstudiante->every(fn($f) => $f['total'] === 0))
        <div class="empty">Ningún estudiante tiene registros en esta clase todavía.</div>
    @endif
</body>

</html>
