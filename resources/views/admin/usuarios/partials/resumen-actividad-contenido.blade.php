@php
    $anio = $resumen['anio'] ?? date('Y');
    $cargas = $resumen['cargas'] ?? [];
    $totales = $resumen['totales'] ?? ['estudiantes' => 0, 'observaciones' => 0, 'asistencias' => 0];
    $tieneCarga = $resumen['tiene_carga'] ?? count($cargas) > 0;
    $userId = $usuario->id ?? null;
@endphp

<div class="resumen-actividad-docente">
  <p class="resumen-actividad-anio text-muted mb-3">
    <i class="fa-solid fa-calendar-days"></i> Año lectivo {{ $anio }}
  </p>

  <div class="resumen-actividad-stats">
    <div class="resumen-stat-card">
      <span class="resumen-stat-icon" style="background:#EFF6FF;color:#2563EB"><i class="fa-solid fa-user-graduate"></i></span>
      <div>
        <span class="resumen-stat-value">{{ number_format($totales['estudiantes'] ?? 0) }}</span>
        <span class="resumen-stat-label">Estudiantes a cargo</span>
      </div>
    </div>
    <div class="resumen-stat-card">
      <span class="resumen-stat-icon" style="background:#F0FDF4;color:#16A34A"><i class="fa-solid fa-clipboard-list"></i></span>
      <div>
        <span class="resumen-stat-value">{{ number_format($totales['observaciones'] ?? 0) }}</span>
        <span class="resumen-stat-label">Observaciones registradas</span>
      </div>
    </div>
    <div class="resumen-stat-card">
      <span class="resumen-stat-icon" style="background:#FFF7ED;color:#EA580C"><i class="fa-solid fa-clipboard-check"></i></span>
      <div>
        <span class="resumen-stat-value">{{ number_format($totales['asistencias'] ?? 0) }}</span>
        <span class="resumen-stat-label">Asistencias tomadas</span>
      </div>
    </div>
  </div>

  <h6 class="resumen-actividad-seccion-titulo mt-4 mb-2">Cargas activas</h6>

  @if ($tieneCarga)
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Ambiente</th>
            <th>Grado</th>
            <th>Grupo</th>
            <th style="text-align:center">Estudiantes</th>
          </tr>
        </thead>
        <tbody>
          @foreach ($cargas as $carga)
            <tr>
              <td>{{ $carga['ambiente'] ?? '—' }}</td>
              <td>{{ $carga['grado'] ?? '—' }}</td>
              <td>{{ $carga['grupo'] ?? '—' }}</td>
              <td style="text-align:center">{{ $carga['estudiantes'] ?? 0 }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>
  @else
    <div class="resumen-sin-carga text-center py-4">
      <i class="fa-solid fa-folder-open fa-2x text-muted mb-3 d-block"></i>
      <p class="text-muted mb-3">Este docente no tiene carga asignada para el año {{ $anio }}.</p>
      @if ($userId)
        <button type="button" class="btn btn-primary" onclick="abrirModalAsignarGrado({{ $userId }})">
          <i class="fa-solid fa-list"></i> Asignar grupo
        </button>
      @endif
    </div>
  @endif
</div>
