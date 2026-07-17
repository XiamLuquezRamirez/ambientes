<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Reporte de Asistencia</title>

    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #1F2937;
            font-size: 13px;
            line-height: 20px;
        }

        .report-header {
            padding-bottom: 20px;
            border-bottom: 2px solid #E5E7EB;
            margin-bottom: 25px;
        }

        .report-title {
            font-size: 26px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 6px;
        }

        .report-subtitle {
            color: #6B7280;
            font-size: 14px;
        }

        .info-box {
            margin-top: 20px;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 18px;
            background: #F9FAFB;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-table td {
            padding: 6px 4px;
            vertical-align: top;
        }

        .info-label {
            font-weight: bold;
            color: #374151;
            width: 150px;
        }

        .summary {
            margin-top: 25px;
            margin-bottom: 30px;
        }

        .summary-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }

        .summary-table td {
            border: 1px solid #E5E7EB;
            text-align: center;
            padding: 12px;
        }

        .summary-number {
            font-size: 20px;
            font-weight: bold;
        }

        .summary-label {
            font-size: 11px;
            color: #6B7280;
        }

        .students-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .students-table th {
            background: #2563EB;
            color: white;
            padding: 10px;
            font-size: 12px;
        }

        .students-table td {
            border-bottom: 1px solid #E5E7EB;
            padding: 9px;
        }

        .text-center {
            text-align: center;
        }

        .excellent {
            color: #16A34A;
            font-weight: bold;
        }

        .acceptable {
            color: #D97706;
            font-weight: bold;
        }

        .warning {
            color: #DC2626;
            font-weight: bold;
        }

        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            border-top: 1px solid #E5E7EB;
            padding-top: 8px;
            text-align: center;
            font-size: 11px;
            color: #6B7280;
        }
    </style>

</head>

<body>

    <div class="report-header">

        <div class="report-title">
            Reporte de Asistencia
        </div>

        <div class="report-subtitle">
            Plataforma PedNia
        </div>

    </div>


    <div class="info-box">

        <table class="info-table">

            <tr>
                <td class="info-label">Docente</td>
                <td>{{ $carga->docente->user->nombre }} {{ $carga->docente->user->apellido }}</td>
            </tr>

            <tr>
                <td class="info-label">Ambiente</td>
                <td>{{ $carga->ambiente->nombre }}</td>
            </tr>

            <tr>
                <td class="info-label">Grado</td>
                <td>{{ $carga->grado->nombre }}</td>
            </tr>

            <tr>
                <td class="info-label">Grupo</td>
                <td>{{ $carga->grupo->nombre }}</td>
            </tr>

            <tr>
                <td class="info-label">Periodo</td>
                <td>
                    {{ \Carbon\Carbon::parse($desde)->format('d/m/Y') }}
                    -
                    {{ \Carbon\Carbon::parse($hasta)->format('d/m/Y') }}
                </td>
            </tr>

            <tr>
                <td class="info-label">Fecha de generación</td>
                <td>{{ now()->format('d/m/Y H:i') }}</td>
            </tr>

        </table>

    </div>


    <div class="summary">

        <div class="summary-title">
            Resumen General
        </div>

        <table class="summary-table">

            <tr>

                <td>
                    <div class="summary-number">
                        {{ count($reporte) }}
                    </div>

                    <div class="summary-label">
                        Estudiantes
                    </div>
                </td>

                <td>
                    <div class="summary-number">
                        {{ collect($reporte)->where('estado', 'Excelente')->count() }}
                    </div>

                    <div class="summary-label">
                        Excelente
                    </div>
                </td>

                <td>
                    <div class="summary-number">
                        {{ collect($reporte)->where('estado', 'Aceptable')->count() }}
                    </div>

                    <div class="summary-label">
                        Aceptable
                    </div>
                </td>

                <td>
                    <div class="summary-number">
                        {{ collect($reporte)->where('estado', 'Requiere seguimiento')->count() }}
                    </div>

                    <div class="summary-label">
                        Seguimiento
                    </div>
                </td>

            </tr>

        </table>

    </div>


    <table class="students-table">

        <thead>

            <tr>

                <th>#</th>

                <th>Estudiante</th>

                <th>Presentes</th>

                <th>Registros</th>

                <th>%</th>

                <th>Estado</th>

            </tr>

        </thead>

        <tbody>

            @foreach ($reporte as $estudiante)
                <tr>

                    <td class="text-center">
                        {{ $loop->iteration }}
                    </td>

                    <td>
                        {{ $estudiante['nombre'] }}
                    </td>

                    <td class="text-center">
                        {{ $estudiante['presentes'] }}
                    </td>

                    <td class="text-center">
                        {{ $estudiante['registradas'] }}
                    </td>

                    <td class="text-center">
                        {{ $estudiante['porcentaje'] }}%
                    </td>

                    <td class="text-center">

                        <span
                            class="@if ($estudiante['estado'] == 'Excelente') excellent
                            @elseif($estudiante['estado'] == 'Aceptable')
                                acceptable
                            @else
                                warning @endif">

                            {{ $estudiante['estado'] }}

                        </span>

                    </td>

                </tr>
            @endforeach

        </tbody>

    </table>


    <div class="footer">

        Reporte generado el
        {{ now()->format('d/m/Y H:i') }}

    </div>

</body>

</html>
